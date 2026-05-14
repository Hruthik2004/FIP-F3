# Deploying Funeral Intel to Railway

## One-Click Deploy (Recommended)

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Connect your GitHub account and select this repository
4. Railway auto-detects the `railway.toml` and builds automatically
5. Once deployed, your app is live at `https://your-app.railway.app`

## Manual Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (run from repo root)
railway init

# Deploy
railway up

# Open your deployed app
railway open
```

## Environment Variables on Railway

Set these in Railway Dashboard → Your Service → Variables:

| Variable               | Description                              | Required |
|------------------------|------------------------------------------|----------|
| `VITE_GOOGLE_CLIENT_ID`| Google OAuth Client ID for real Google login | Optional |
| `VITE_API_URL`         | URL of your Python backend (if deployed) | Optional |

### Getting a Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web Application
4. Add Authorized Origins: `https://your-app.railway.app`
5. Add Authorized Redirect URIs: `https://your-app.railway.app`
6. Copy the Client ID → paste into Railway env var

## What Works Without a Backend

The app works **fully client-side** — no backend required:
- ✅ User authentication (stored in browser localStorage)
- ✅ Web scraping (via CORS proxies)
- ✅ CSV/XLSX/JSON file import
- ✅ Provider marketplace (localStorage)
- ✅ Enrichment pipeline (client-side processing)
- ✅ Analytics (computed from local data)
- ✅ Profile settings (persisted in localStorage)

## Custom Domain

1. Railway Dashboard → Your Service → Settings → Domains
2. Add your domain and follow DNS instructions

## Troubleshooting

**App shows blank page after deploy:**
- Check Railway build logs for errors
- Ensure `npm run build` succeeds locally first

**Google login not working:**
- Add `VITE_GOOGLE_CLIENT_ID` env var
- Add your Railway URL to Google OAuth authorized origins

**Scraping fails on some sites:**
- Some sites block CORS proxies — this is expected
- The scraper tries 3 different proxies as fallbacks
