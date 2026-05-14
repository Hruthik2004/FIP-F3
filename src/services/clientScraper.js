/**
 * Client-Side Scraper
 *
 * PRIMARY:  Calls /scrape-proxy (Vite server plugin) — Node.js fetches server-side, NO CORS.
 * FALLBACK: 8 public CORS proxy services tried in parallel batches.
 *
 * Only the scraping fetch layer changes — all parsing + storage logic is identical.
 */

// ─── Regex patterns ───────────────────────────────────────────────────────────
const PHONE_RE = /(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)?\d{3}[\s.\-]?\d{4}/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;
const PRICE_RE = /\$[\d,]+(?:\.\d{2})?/g;
const ADDR_RE  = /\d+\s+[A-Za-z][A-Za-z0-9\s,\.#\-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Highway|Hwy)[\s,\.]+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/i;

const SERVICE_KEYWORDS = [
  'Traditional Burial','Direct Cremation','Cremation Services','Burial',
  'Memorial Service','Graveside Service','Pre-Planning','Pre-Need',
  'Green Burial','Eco Burial','Natural Burial','Veteran Services',
  'Funeral Service','Viewing','Visitation','Celebration of Life',
  'Reception','Body Donation','Immediate Burial','Aquamation',
  'Alkaline Hydrolysis','Scattering','Cremation & Burial','Embalming',
];

// ─── PUBLIC CORS PROXY FALLBACKS (tried if local proxy unavailable) ───────────
const CORS_PROXIES = [
  (url) => ({
    endpoint: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`,
    parse: async (r) => { const d = await r.json(); return d?.contents || null; },
  }),
  (url) => ({
    endpoint: `https://corsproxy.io/?${encodeURIComponent(url)}`,
    parse: async (r) => r.text(),
  }),
  (url) => ({
    endpoint: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    parse: async (r) => r.text(),
  }),
  (url) => ({
    endpoint: `https://thingproxy.freeboard.io/fetch/${url}`,
    parse: async (r) => r.text(),
  }),
  (url) => ({
    endpoint: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    parse: async (r) => r.text(),
  }),
  (url) => ({
    endpoint: `https://cors.eu.org/${url}`,
    parse: async (r) => r.text(),
  }),
  (url) => ({
    endpoint: `https://www.whateverorigin.org/get?url=${encodeURIComponent(url)}&callback=`,
    parse: async (r) => { const t = await r.text(); try { return JSON.parse(t).contents; } catch { return t; } },
  }),
  (url) => ({
    endpoint: `https://proxy.cors.sh/${url}`,
    parse: async (r) => r.text(),
    headers: { 'x-cors-api-key': 'temp_key' },
  }),
];

// ─── STRATEGY 1: Local Vite proxy (server-side fetch, no CORS) ───────────────
async function fetchViaLocalProxy(url) {
  try {
    const res = await fetch(`/scrape-proxy?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.ok && data?.html && data.html.length > 300) return data.html;
    return null;
  } catch {
    return null;
  }
}

// ─── STRATEGY 2: Public CORS proxies in parallel batches ─────────────────────
async function fetchViaCORSProxies(url) {
  const cleanUrl = url.replace(/\/$/, '');
  const BATCH = 3;

  for (let i = 0; i < CORS_PROXIES.length; i += BATCH) {
    const group = CORS_PROXIES.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      group.map(async (builder) => {
        const { endpoint, parse, headers = {} } = builder(cleanUrl);
        const res = await fetch(endpoint, {
          signal: AbortSignal.timeout(12000),
          headers: { 'Accept': 'text/html,application/json,*/*', ...headers },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await parse(res);
        if (!html || html.length < 300) throw new Error('Empty/short response');
        const lower = html.toLowerCase();
        if (lower.includes('access denied') && html.length < 3000) throw new Error('Access denied');
        return html;
      })
    );

    const winner = results.find(r => r.status === 'fulfilled' && r.value);
    if (winner) return winner.value;
  }
  return null;
}

// ─── STRATEGY 3: Google AMP cache ────────────────────────────────────────────
async function fetchViaAMPCache(url) {
  try {
    const domain   = new URL(url).hostname.replace(/\./g, '-');
    const path     = url.replace(/^https?:\/\//, '');
    const ampUrl   = `https://${domain}.cdn.ampproject.org/v/s/${path}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(ampUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    const d   = await res.json();
    if (d?.contents && d.contents.length > 300) return d.contents;
    return null;
  } catch { return null; }
}

// ─── Synthetic record from URL only (last resort) ─────────────────────────────
function buildFromURL(url) {
  const parsed    = new URL(url);
  const domain    = parsed.hostname.replace('www.', '');
  const rawName   = domain.split('.')[0].replace(/[-_]/g, ' ');
  const name      = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const stateHint = url.match(/\/([A-Z]{2})\//)?.[1] || null;

  return {
    id: 'prov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name, url, website: url,
    phone: null, email: null, address: null,
    city: null, state: stateHint, zip: null,
    description: null, services: [], prices: [], avg_price: null,
    rating: null, socials: {},
    ai_verified: false, accuracy_score: 5, partial: true,
    scraped_at: new Date().toISOString(),
  };
}

// ─── HTML Parser ──────────────────────────────────────────────────────────────
function parseHTML(html, url) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');

  // Strip noise
  for (const sel of ['script','style','noscript','iframe',
    '.cookie-banner','[class*="cookie"]','[class*="popup"]',
    '[class*="modal"]','[class*="overlay"]','[id*="chat"]']) {
    try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
  }

  const bodyText = doc.body?.innerText || doc.body?.textContent || '';
  const rawHTML  = html;

  // NAME
  let name = '';
  const nameTries = [
    () => doc.querySelector('meta[property="og:site_name"]')?.content,
    () => doc.querySelector('[itemtype*="LocalBusiness"] [itemprop="name"]')?.textContent,
    () => doc.querySelector('[itemtype*="FuneralHome"] [itemprop="name"]')?.textContent,
    () => doc.querySelector('.business-name,.company-name,.site-name,.logo-text')?.textContent,
    () => doc.querySelector('header h1,.header h1')?.textContent,
    () => doc.querySelector('h1')?.textContent,
    () => doc.querySelector('meta[property="og:title"]')?.content?.split(/[\|\-–]/)[0],
    () => doc.querySelector('title')?.textContent?.split(/[\|\-–]/)[0],
  ];
  for (const fn of nameTries) {
    try {
      const v = fn()?.trim().replace(/\s+/g, ' ');
      if (v && v.length > 2 && v.length < 120 &&
          !/(home page|welcome|index)/i.test(v)) { name = v; break; }
    } catch {}
  }
  if (!name || name.length < 2) {
    const domain = new URL(url).hostname.replace('www.', '');
    name = domain.split('.')[0].replace(/[-_]/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // PHONE
  let phone = null;
  const telLink = doc.querySelector('a[href^="tel:"]');
  if (telLink) {
    phone = telLink.getAttribute('href').replace('tel:', '').replace(/[^\d+\-() ]/g, '').trim();
  } else {
    const phones = [...new Set((bodyText.match(PHONE_RE) || []).map(p => p.trim()))]
      .filter(p => p.replace(/\D/g, '').length >= 10);
    phone = phones[0] || null;
  }

  // EMAIL
  let email = null;
  const mailtoLink = doc.querySelector('a[href^="mailto:"]');
  if (mailtoLink) {
    email = mailtoLink.getAttribute('href').replace('mailto:', '').split('?')[0].trim();
  } else {
    const emails = [...new Set((rawHTML.match(EMAIL_RE) || []))]
      .filter(e => !/(example|test|noreply|sentry|\.png|\.jpg)/i.test(e));
    email = emails[0] || null;
  }

  // ADDRESS
  let address = null;
  const addrEl = doc.querySelector(
    '[itemprop="streetAddress"],[itemprop="address"],[itemtype*="PostalAddress"],' +
    '.address,.location-address,[class*="address"],[class*="location"] address,address'
  );
  if (addrEl) {
    address = addrEl.textContent.replace(/\s+/g, ' ').trim().slice(0, 200);
  } else {
    const m = bodyText.match(ADDR_RE);
    if (m) address = m[0].replace(/\s+/g, ' ').trim();
  }

  // CITY / STATE / ZIP
  let city = null, state = null, zip = null;
  city  = doc.querySelector('[itemprop="addressLocality"]')?.textContent?.trim() || null;
  state = doc.querySelector('[itemprop="addressRegion"]')?.textContent?.trim()?.toUpperCase().slice(0, 2) || null;
  zip   = doc.querySelector('[itemprop="postalCode"]')?.textContent?.trim() || null;

  if (!state && address) {
    const m = address.match(/,\s*([A-Z]{2})\s+(\d{5})/);
    if (m) { state = m[1]; zip = zip || m[2]; }
    const c = address.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/);
    if (c && !city) city = c[1].trim();
  }
  if (!state) {
    const geo = doc.querySelector('meta[name="geo.region"]')?.content;
    if (geo) state = geo.replace('US-', '').trim().slice(0, 2);
  }

  // DESCRIPTION
  let description = null;
  for (const sel of [
    'meta[name="description"]', 'meta[property="og:description"]',
    '[itemprop="description"]', '.about-text', '.about-us p', '.hero-description',
  ]) {
    try {
      const el = doc.querySelector(sel);
      const v  = el?.getAttribute('content') || el?.textContent;
      if (v?.trim().length > 30) { description = v.trim().slice(0, 400); break; }
    } catch {}
  }

  // SERVICES
  const services = SERVICE_KEYWORDS.filter(kw =>
    bodyText.toLowerCase().includes(kw.toLowerCase())
  );
  doc.querySelectorAll('.services li,.service-list li,[class*="service"] li,.offerings li')
    .forEach(el => {
      const t = el.textContent.trim();
      if (t.length > 3 && t.length < 60 && !services.includes(t)) services.push(t);
    });

  // PRICES
  const prices = [...new Set(bodyText.match(PRICE_RE) || [])]
    .map(p => parseInt(p.replace(/[$,]/g, '')))
    .filter(p => p >= 300 && p <= 100000)
    .sort((a, b) => a - b).slice(0, 8);
  const avg_price = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : null;

  // RATING
  let rating = null;
  for (const sel of ['[itemprop="ratingValue"]','[class*="rating"] [class*="value"]','[data-rating]']) {
    try {
      const el = doc.querySelector(sel);
      if (el) {
        const v = parseFloat(el.getAttribute('content') || el.getAttribute('data-rating') || el.textContent);
        if (!isNaN(v) && v >= 1 && v <= 5) { rating = Math.round(v * 10) / 10; break; }
      }
    } catch {}
  }

  // SOCIALS
  const socials = {};
  doc.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (/facebook\.com\/(?!sharer)/.test(href) && !socials.facebook) socials.facebook = href;
    else if (/instagram\.com\//.test(href) && !socials.instagram)    socials.instagram = href;
    else if (/twitter\.com\/|x\.com\//.test(href) && !socials.twitter) socials.twitter = href;
    else if (/linkedin\.com\//.test(href) && !socials.linkedin)      socials.linkedin = href;
  });

  // ACCURACY SCORE
  let score = 0;
  if (name && name.length > 3) score += 20;
  if (phone)                    score += 22;
  if (email)                    score += 18;
  if (address)                  score += 15;
  if (services.length > 0)      score += 12;
  if (description)              score += 8;
  if (avg_price)                score += 3;
  if (rating)                   score += 2;

  return {
    id: 'prov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name, url, website: url,
    phone, email, address, city, state, zip,
    description,
    services: [...new Set(services)].slice(0, 20),
    prices, avg_price, rating, socials,
    ai_verified: score >= 55,
    accuracy_score: score,
    scraped_at: new Date().toISOString(),
  };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function scrapeURL(url, { onProgress } = {}) {
  if (!url.startsWith('http')) url = 'https://' + url;

  let html  = null;
  let usedUrl = url;

  // ── Strategy 1: Local Vite proxy (works during `npm run dev`) ──
  onProgress?.('Connecting via local proxy...');
  html = await fetchViaLocalProxy(url);
  if (html) { onProgress?.('Page fetched via local proxy ✓'); }

  // ── Strategy 2: Try www. variant via local proxy ──
  if (!html) {
    const parsed = new URL(url);
    if (!parsed.hostname.startsWith('www.')) {
      const wwwUrl = url.replace(parsed.hostname, 'www.' + parsed.hostname);
      onProgress?.('Trying www. variant...');
      html = await fetchViaLocalProxy(wwwUrl);
      if (html) usedUrl = wwwUrl;
    }
  }

  // ── Strategy 3: HTTP fallback via local proxy ──
  if (!html && url.startsWith('https://')) {
    const httpUrl = url.replace('https://', 'http://');
    onProgress?.('Trying HTTP variant...');
    html = await fetchViaLocalProxy(httpUrl);
    if (html) usedUrl = httpUrl;
  }

  // ── Strategy 4: Public CORS proxies ──
  if (!html) {
    onProgress?.('Local proxy failed, trying public CORS proxies...');
    html = await fetchViaCORSProxies(url);
    if (html) onProgress?.('Fetched via public CORS proxy ✓');
  }

  // ── Strategy 5: AMP cache ──
  if (!html) {
    onProgress?.('Trying Google AMP cache...');
    html = await fetchViaAMPCache(url);
    if (html) onProgress?.('Fetched via AMP cache ✓');
  }

  // ── All failed: return partial ──
  if (!html) {
    const partial = buildFromURL(url);
    return {
      success: false, partial: true, data: partial,
      error: 'Could not fetch page — site may block external requests. Basic info extracted from URL.',
    };
  }

  onProgress?.('Extracting data from page...');
  const data = parseHTML(html, usedUrl);

  return { success: true, data };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const PROVIDERS_KEY = 'fi_providers';
const JOBS_KEY      = 'fi_scrape_jobs';

export function saveProvider(provider) {
  const all = loadProviders();
  const deduped = all.filter(p => {
    try {
      return new URL(p.url || '').hostname.replace('www.', '') !==
             new URL(provider.url || '').hostname.replace('www.', '');
    } catch { return p.id !== provider.id; }
  });
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify([provider, ...deduped]));
}

export function loadProviders() {
  try { return JSON.parse(localStorage.getItem(PROVIDERS_KEY) || '[]'); }
  catch { return []; }
}

export function deleteProvider(id) {
  const updated = loadProviders().filter(p => p.id !== id);
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(updated));
  return updated;
}

export function clearProviders() { localStorage.removeItem(PROVIDERS_KEY); }

export function saveJob(job) {
  const jobs = loadJobs();
  const idx  = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs[idx] = job; else jobs.unshift(job);
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.slice(0, 100)));
  return job;
}

export function loadJobs() {
  try { return JSON.parse(localStorage.getItem(JOBS_KEY) || '[]'); }
  catch { return []; }
}

export function clearJob(id) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(loadJobs().filter(j => j.id !== id)));
}
