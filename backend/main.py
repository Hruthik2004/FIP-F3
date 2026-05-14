"""
Funeral Intelligence Platform — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from core.config import settings
from db.database import init_db
from api.routes.auth import router as auth_router
from api.routes.scraper import router as scraper_router
from api.routes.providers import router as providers_router
from api.routes.chat import router as chat_router
from api.routes.analytics import analytics_router, import_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Funeral Intelligence Platform...")
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"DB init failed (running without DB): {e}")
    yield
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-Powered Funeral Industry Intelligence Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth_router, prefix="/api")
app.include_router(scraper_router, prefix="/api")
app.include_router(providers_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(import_router, prefix="/api")


@app.get("/")
async def root():
    return {"service": settings.APP_NAME, "version": "1.0.0", "status": "running", "docs": "/docs"}

@app.get("/health")
async def health():
    import datetime
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
