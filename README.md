# 🏛 Funeral Intelligence Platform — Production Build

## Quick Start (Frontend)
```bash
npm install
npm run dev
# → http://localhost:5173  (login with any email/password)
```

## Quick Start (Backend)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL and OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | JWT login |
| POST | /api/auth/register | Register user |
| POST | /api/scraper/start | Start scrape job |
| POST | /api/scraper/bulk | Bulk scrape URLs |
| GET | /api/scraper/jobs | List all jobs |
| GET | /api/providers | List providers (filterable) |
| GET | /api/providers/:id | Provider detail |
| POST | /api/providers/:id/enrich | Re-enrich with AI |
| POST | /api/chat/message | AI chat with RAG |
| GET | /api/analytics | Full analytics data |
| POST | /api/import/upload | Upload CSV/XLSX/JSON |

## Scraper Usage
The scraper works without any config — just POST a URL:
```json
POST /api/scraper/start
{"url": "https://example-funeral-home.com", "name": "My Job"}
```

## OpenAI Integration
Add your key to backend/.env:
```
OPENAI_API_KEY=sk-...
```
Falls back to intelligent mock responses when key is absent.
