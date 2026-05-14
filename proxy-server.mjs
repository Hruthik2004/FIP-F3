/**
 * Standalone Scraping Proxy Server
 * Run this alongside your built React app for production deployments.
 * 
 * Usage:
 *   node proxy-server.mjs
 * 
 * Or via package.json: "proxy": "node proxy-server.mjs"
 * 
 * Railway: Set start command to run BOTH the proxy and serve the frontend.
 */

import http from 'http';
import { URL } from 'url';

const PORT = process.env.PROXY_PORT || 3001;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

async function fetchPage(targetUrl) {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const urlsToTry = [targetUrl];

  // Add variants
  if (targetUrl.startsWith('https://')) urlsToTry.push(targetUrl.replace('https://', 'http://'));
  const parsed = new URL(targetUrl);
  if (!parsed.hostname.startsWith('www.')) {
    urlsToTry.push(targetUrl.replace(parsed.hostname, 'www.' + parsed.hostname));
  }

  for (const url of urlsToTry) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();
      if (html && html.length > 300) return { html, url, ok: true };
    } catch { continue; }
  }
  return { ok: false, error: 'All fetch attempts failed' };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const target = reqUrl.searchParams.get('url');

  if (reqUrl.pathname !== '/scrape-proxy' || !target) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'Usage: /scrape-proxy?url=https://...' }));
  }

  try {
    const result = await fetchPage(target);
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`🔍 Scraping proxy running on http://localhost:${PORT}`);
  console.log(`   Usage: http://localhost:${PORT}/scrape-proxy?url=https://funeralhome.com`);
});
