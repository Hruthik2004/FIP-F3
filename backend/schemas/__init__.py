"""
Pydantic schemas for API request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8)
    organization: Optional[str] = None
    title: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization: Optional[str] = None
    title: Optional[str] = None
    region_of_interest: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    organization: Optional[str] = None
    title: Optional[str] = None
    region_of_interest: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Provider Schemas ────────────────────────────────────────────────────────

class PricingItem(BaseModel):
    service: str
    provider_price: Optional[float] = None
    market_avg: Optional[float] = None
    deviation: Optional[float] = None

class ProviderOut(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    services: Optional[List[str]] = []
    service_types: Optional[List[str]] = []
    avg_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    pricing_data: Optional[Dict[str, Any]] = {}
    rating: Optional[float] = None
    review_count: Optional[int] = 0
    sentiment_score: Optional[float] = None
    ai_verified: bool = False
    ai_summary: Optional[str] = None
    ai_market_position: Optional[str] = None
    ai_tags: Optional[List[str]] = []
    data_confidence: Optional[float] = None
    source_url: Optional[str] = None
    status: str = "active"
    scraped_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ProviderListOut(BaseModel):
    items: List[ProviderOut]
    total: int
    page: int
    page_size: int
    total_pages: int

class ProviderSearch(BaseModel):
    query: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None
    service_type: Optional[str] = None
    ai_verified: Optional[bool] = None
    page: int = 1
    page_size: int = 12
    sort_by: str = "created_at"
    sort_dir: str = "desc"


# ─── Scrape Job Schemas ──────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL to scrape")
    name: Optional[str] = None
    job_type: str = "standard"
    config: Optional[Dict[str, Any]] = {}

class BulkScrapeRequest(BaseModel):
    urls: List[str] = Field(..., min_length=1, max_length=100)
    job_type: str = "bulk"
    config: Optional[Dict[str, Any]] = {}

class ScrapeJobOut(BaseModel):
    id: str
    name: str
    url: str
    job_type: str
    status: str
    progress: int
    records_found: int
    records_saved: int
    records_failed: int
    throughput: int
    error_message: Optional[str] = None
    execution_logs: Optional[List[Dict]] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ScrapeLogEntry(BaseModel):
    timestamp: str
    status: str  # success, warning, error, info
    uri: str
    entity: str
    accuracy: int
    message: Optional[str] = None


# ─── Import Schemas ───────────────────────────────────────────────────────────

class ImportBatchOut(BaseModel):
    id: str
    name: str
    source_type: str
    filename: Optional[str] = None
    total_records: int
    processed_records: int
    failed_records: int
    health_score: Optional[float] = None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Chat Schemas ─────────────────────────────────────────────────────────────

class ChatMessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None

class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[str]] = []
    tokens_used: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ChatSessionOut(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: datetime
    messages: List[ChatMessageOut] = []
    model_config = {"from_attributes": True}

class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessageOut
    context_used: Optional[List[str]] = []


# ─── Analytics Schemas ────────────────────────────────────────────────────────

class KPIOut(BaseModel):
    total_providers: int
    total_scrape_jobs: int
    active_jobs: int
    records_enriched: int
    avg_accuracy: float
    ai_insights_count: int
    providers_this_week: int
    success_rate: float

class TrendPoint(BaseModel):
    label: str
    value: float
    secondary: Optional[float] = None

class AnalyticsOut(BaseModel):
    kpis: KPIOut
    acquisition_trends: List[TrendPoint]
    cohort_breakdown: List[Dict[str, Any]]
    drift_alerts: List[Dict[str, Any]]
    regional_data: List[Dict[str, Any]]
    top_providers: List[ProviderOut]
