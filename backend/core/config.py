from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Funeral Intelligence Platform"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/funeral_intel"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    OPENAI_API_KEY: str = ""
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    MAX_CONCURRENT_SCRAPES: int = 5
    SCRAPE_TIMEOUT: int = 30
    USE_PLAYWRIGHT: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
