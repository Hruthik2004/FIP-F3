"""
Funeral Intelligence Platform — Improved Scraping Engine
Accurate, reliable, and efficient data extraction with deduplication.
"""
import asyncio
import re
import json
import logging
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List, Set
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
]

# ─── Prioritised CSS selectors (most specific first) ──────────────────────────
SELECTORS = {
    "name": [
        '[itemprop="name"]', '[itemtype*="LocalBusiness"] h1',
        'h1.business-name', '.company-name', '#business-name',
        '[property="og:site_name"]', 'meta[name="application-name"]',
        '.funeral-home-name', '.provider-name', 'header h1', 'h1',
    ],
    "phone": [
        'a[href^="tel:"]', '[itemprop="telephone"]',
        '[class*="phone"]', '[class*="tel"]', '.contact-phone',
    ],
    "email": [
        'a[href^="mailto:"]', '[itemprop="email"]',
        '[class*="email"]', '.contact-email',
    ],
    "address": [
        '[itemprop="streetAddress"]', '[itemtype*="PostalAddress"]',
        '[itemprop="address"]', '.address', '[class*="address"]', 'address',
    ],
    "description": [
        '[itemprop="description"]', 'meta[name="description"]',
        'meta[property="og:description"]', '.about-text',
        '.hero-description', '.company-description', '#about p',
    ],
    "services": [
        '[itemprop="hasOfferCatalog"] li', '.services-list li',
        '.service-item', '[class*="service"] li', '.offerings li',
    ],
    "rating": [
        '[itemprop="ratingValue"]', '.rating-value',
        '[class*="rating"] [class*="value"]',
    ],
    "website": [
        'link[rel="canonical"]', 'meta[property="og:url"]',
    ],
}

PHONE_RE = re.compile(r'(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}')
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b')
PRICE_RE = re.compile(r'\$[\d,]+(?:\.\d{2})?')
SEEN_HASHES: Set[str] = set()  # In-memory dedup store


def _url_hash(url: str) -> str:
    return hashlib.md5(url.strip().rstrip('/').lower().encode()).hexdigest()


def _clean(text: str) -> str:
    """Remove extra whitespace and common boilerplate."""
    return re.sub(r'\s+', ' ', text).strip()


def _first_match(soup: BeautifulSoup, selectors: List[str]) -> Optional[str]:
    """Return the first non-empty text match from a list of CSS selectors."""
    for sel in selectors:
        try:
            el = soup.select_one(sel)
            if el:
                val = el.get('content') or el.get('href') or el.get_text(' ', strip=True)
                val = _clean(val)
                if val and len(val) > 1:
                    return val
        except Exception:
            continue
    return None


def _extract_phone(soup: BeautifulSoup, raw_html: str) -> Optional[str]:
    """Extract phone using selectors first, then regex fallback."""
    # Try structured selectors
    tel_link = soup.select_one('a[href^="tel:"]')
    if tel_link:
        phone = tel_link.get('href', '').replace('tel:', '').strip()
        if phone:
            return phone

    itemprop = soup.select_one('[itemprop="telephone"]')
    if itemprop:
        val = itemprop.get('content') or itemprop.get_text(strip=True)
        if val:
            return _clean(val)

    # Regex fallback on raw HTML
    matches = PHONE_RE.findall(raw_html)
    # Deduplicate and return most frequent
    if matches:
        from collections import Counter
        return Counter(matches).most_common(1)[0][0]
    return None


def _extract_email(soup: BeautifulSoup, raw_html: str) -> Optional[str]:
    """Extract email using selectors first, then regex."""
    mailto = soup.select_one('a[href^="mailto:"]')
    if mailto:
        email = mailto.get('href', '').replace('mailto:', '').split('?')[0].strip()
        if email and EMAIL_RE.match(email):
            return email

    matches = EMAIL_RE.findall(raw_html)
    # Filter out common false positives
    filtered = [e for e in matches if not any(x in e.lower() for x in ['example.', 'test@', '.png', '.jpg', '.gif'])]
    return filtered[0] if filtered else None


def _extract_prices(soup: BeautifulSoup, raw_html: str) -> List[str]:
    """Extract price mentions with deduplication."""
    prices = list(set(PRICE_RE.findall(raw_html)))
    return sorted(prices, key=lambda p: int(p.replace('$','').replace(',','')))[:10]


def _extract_services(soup: BeautifulSoup) -> List[str]:
    """Extract service names with deduplication and normalisation."""
    seen = set()
    services = []
    for sel in SELECTORS["services"]:
        for el in soup.select(sel):
            text = _clean(el.get_text(' ', strip=True))
            norm = text.lower()
            if text and len(text) > 2 and len(text) < 100 and norm not in seen:
                seen.add(norm)
                services.append(text)
        if services:
            break
    return services[:15]


def _extract_name(soup: BeautifulSoup, url: str) -> str:
    """Extract business name with intelligent fallbacks."""
    # Try OG tags first (most reliable)
    og_site = soup.select_one('meta[property="og:site_name"]')
    if og_site and og_site.get('content'):
        return _clean(og_site['content'])

    # Try structured data
    for sel in SELECTORS["name"]:
        el = soup.select_one(sel)
        if el:
            val = el.get('content') or el.get_text(' ', strip=True)
            val = _clean(val)
            # Skip generic names
            if val and len(val) > 2 and val.lower() not in ('home', 'index', 'welcome'):
                return val

    # Fallback: derive from URL
    domain = urlparse(url).netloc.replace('www.', '')
    return domain.split('.')[0].replace('-', ' ').replace('_', ' ').title()


async def fetch_html(url: str, timeout: int = 25) -> Optional[str]:
    """Fetch HTML with retry and exponential backoff."""
    import random
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=timeout,
                headers=headers,
                verify=False,
            ) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.text
                elif response.status_code in (429, 503):
                    await asyncio.sleep(2 ** attempt)
        except Exception as e:
            logger.warning(f"Fetch attempt {attempt + 1} failed for {url}: {e}")
            if attempt < 2:
                await asyncio.sleep(1.5 ** attempt)
    return None


def scrape_page(html: str, url: str) -> Dict[str, Any]:
    """
    Parse HTML and extract structured funeral home data.
    Returns clean, deduplicated fields.
    """
    soup = BeautifulSoup(html, 'html.parser')

    # Remove noise elements
    for tag in soup.select('script, style, noscript, nav, footer, .cookie-banner, #cookie-notice, .popup'):
        tag.decompose()

    raw_text = soup.get_text(' ')

    # ── Core fields ──────────────────────────────────────────────────────────
    name = _extract_name(soup, url)
    phone = _extract_phone(soup, raw_text)
    email = _extract_email(soup, raw_text)
    description = _first_match(soup, SELECTORS["description"])
    rating_raw = _first_match(soup, SELECTORS["rating"])

    # Address: try structured, fallback to regex
    address_el = soup.select_one('[itemprop="address"], [itemtype*="PostalAddress"]')
    if address_el:
        address = _clean(address_el.get_text(' ', strip=True))
    else:
        address = _first_match(soup, SELECTORS["address"])

    # Rating normalisation
    rating = None
    if rating_raw:
        try:
            r = float(re.sub(r'[^\d.]', '', rating_raw))
            rating = round(min(max(r, 0), 5), 1)
        except ValueError:
            pass

    # Services
    services = _extract_services(soup)

    # Prices
    prices = _extract_prices(soup, raw_text)

    # Website canonical
    canonical = None
    canon_el = soup.select_one('link[rel="canonical"]')
    if canon_el:
        canonical = canon_el.get('href')

    # City/State from address
    city, state = None, None
    if address:
        state_match = re.search(r'\b([A-Z]{2})\s+\d{5}', address)
        if state_match:
            state = state_match.group(1)
        city_match = re.search(r'([A-Za-z\s]+),\s*[A-Z]{2}', address)
        if city_match:
            city = city_match.group(1).strip()

    return {
        "name": name,
        "url": canonical or url,
        "website": canonical or url,
        "phone": phone,
        "email": email,
        "address": address,
        "city": city,
        "state": state,
        "description": description[:500] if description else None,
        "services": services,
        "prices": prices,
        "rating": rating,
        "scraped_at": datetime.utcnow().isoformat(),
        "accuracy_score": _compute_accuracy(name, phone, email, address, services),
    }


def _compute_accuracy(name, phone, email, address, services) -> float:
    """Compute a simple data completeness/accuracy score (0-100)."""
    score = 0
    if name: score += 30
    if phone: score += 25
    if email: score += 20
    if address: score += 15
    if services: score += 10
    return score


async def scrape_url(url: str, deduplicate: bool = True) -> Optional[Dict[str, Any]]:
    """
    Full scrape pipeline: fetch → parse → deduplicate → return.
    Returns None if URL was already scraped (dedup) or fetch failed.
    """
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    url_id = _url_hash(url)

    if deduplicate and url_id in SEEN_HASHES:
        logger.info(f"Skipping duplicate URL: {url}")
        return None

    html = await fetch_html(url)
    if not html:
        logger.warning(f"Failed to fetch: {url}")
        return {"url": url, "error": "fetch_failed", "scraped_at": datetime.utcnow().isoformat()}

    result = scrape_page(html, url)

    if deduplicate:
        SEEN_HASHES.add(url_id)

    return result


async def scrape_bulk(urls: List[str], concurrency: int = 5, delay_ms: int = 500) -> List[Dict[str, Any]]:
    """
    Scrape multiple URLs with controlled concurrency and rate limiting.
    Automatically deduplicates URLs before scraping.
    """
    # Deduplicate URL list
    seen = set()
    unique_urls = []
    for url in urls:
        h = _url_hash(url)
        if h not in seen:
            seen.add(h)
            unique_urls.append(url)

    logger.info(f"Scraping {len(unique_urls)} unique URLs (removed {len(urls) - len(unique_urls)} dupes)")

    semaphore = asyncio.Semaphore(concurrency)
    results = []

    async def scrape_with_limit(url: str) -> Optional[Dict[str, Any]]:
        async with semaphore:
            result = await scrape_url(url)
            await asyncio.sleep(delay_ms / 1000)
            return result

    tasks = [scrape_with_limit(url) for url in unique_urls]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in raw_results:
        if isinstance(r, dict):
            results.append(r)
        elif isinstance(r, Exception):
            logger.error(f"Scrape error: {r}")

    return results
