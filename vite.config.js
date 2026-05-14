import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─── Vite Scraping Proxy Plugin ───────────────────────────────────────────────
// This runs server-side (Node.js) so it has NO CORS restrictions.
// Browser calls GET /scrape-proxy?url=https://... → Node fetches → returns HTML
function scrapingProxyPlugin() {
  return {
    name: 'scraping-proxy',
    configureServer(server) {
      server.middlewares.use('/scrape-proxy', async (req, res) => {
        const urlObj = new URL(req.url, 'http://localhost');
        const target = urlObj.searchParams.get('url');

        if (!target) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing url param' }));
        }

        // CORS headers so the browser can read the response
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          return res.end();
        }

        // Rotate user agents for better success rate
        const agents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        ];
        const ua = agents[Math.floor(Math.random() * agents.length)];

        // Try HTTPS then HTTP
        const urlsToTry = [target];
        if (target.startsWith('https://')) urlsToTry.push(target.replace('https://', 'http://'));
        if (!target.includes('://www.')) {
          const wwwUrl = target.replace('://', '://www.');
          urlsToTry.push(wwwUrl);
          if (wwwUrl.startsWith('https://')) urlsToTry.push(wwwUrl.replace('https://', 'http://'));
        }

        for (const tryUrl of urlsToTry) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(tryUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1',
              },
              redirect: 'follow',
            });

            clearTimeout(timeout);

            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('html') && !contentType.includes('text')) continue;

            const html = await response.text();
            if (!html || html.length < 200) continue;

            // Reject obvious bot-detection pages
            const lower = html.toLowerCase();
            if (
              (lower.includes('access denied') && html.length < 3000) ||
              lower.includes('enable javascript') && html.length < 2000 ||
              lower.includes('cf-browser-verification')
            ) continue;

            res.writeHead(200);
            res.end(JSON.stringify({ html, url: tryUrl, ok: true }));
            return;

          } catch (err) {
            // Try next URL variant
            continue;
          }
        }

        // All attempts failed
        res.writeHead(200);
        res.end(JSON.stringify({ ok: false, error: 'All fetch attempts failed' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), scrapingProxyPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons:  ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
});
