"""
All database models for the Funeral Intelligence Platform.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Text, Float, Integer, Boolean, DateTime, ForeignKey,
    JSON, Enum as SAEnum, Index, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base
import enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class ScrapeStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class ProviderStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


# ─── User ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.ANALYST)
    organization: Mapped[Optional[str]] = mapped_column(String(255))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    region_of_interest: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scrape_jobs: Mapped[List["ScrapeJob"]] = relationship("ScrapeJob", back_populates="user")
    chat_sessions: Mapped[List["ChatSession"]] = relationship("ChatSession", back_populates="user")


# ─── Provider ─────────────────────────────────────────────────────────────────

class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    slug: Mapped[Optional[str]] = mapped_column(String(500), unique=True, index=True)

    # Contact
    website: Mapped[Optional[str]] = mapped_column(String(500))
    phone: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255))

    # Location
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20))
    country: Mapped[Optional[str]] = mapped_column(String(100), default="US")
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)

    # Business info
    description: Mapped[Optional[str]] = mapped_column(Text)
    services: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    service_types: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # Pricing
    avg_price: Mapped[Optional[float]] = mapped_column(Float)
    min_price: Mapped[Optional[float]] = mapped_column(Float)
    max_price: Mapped[Optional[float]] = mapped_column(Float)
    pricing_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Ratings & Reviews
    rating: Mapped[Optional[float]] = mapped_column(Float)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    reviews: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float)

    # AI Enrichment
    ai_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text)
    ai_market_position: Mapped[Optional[str]] = mapped_column(String(100))
    ai_tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    data_confidence: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    enrichment_score: Mapped[Optional[float]] = mapped_column(Float, default=0.0)

    # Meta
    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[ProviderStatus] = mapped_column(SAEnum(ProviderStatus), default=ProviderStatus.ACTIVE)
    images: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    social_links: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Timestamps
    scraped_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_enriched_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scrape_job_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("scrape_jobs.id"))
    scrape_job: Mapped[Optional["ScrapeJob"]] = relationship("ScrapeJob", back_populates="providers")

    __table_args__ = (
        Index("ix_providers_city_state", "city", "state"),
        Index("ix_providers_rating", "rating"),
        Index("ix_providers_avg_price", "avg_price"),
    )


# ─── Scrape Job ───────────────────────────────────────────────────────────────

class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    job_type: Mapped[str] = mapped_column(String(100), default="standard")  # standard, bulk, scheduled
    status: Mapped[ScrapeStatus] = mapped_column(SAEnum(ScrapeStatus), default=ScrapeStatus.QUEUED)

    # Progress
    progress: Mapped[int] = mapped_column(Integer, default=0)
    records_found: Mapped[int] = mapped_column(Integer, default=0)
    records_saved: Mapped[int] = mapped_column(Integer, default=0)
    records_failed: Mapped[int] = mapped_column(Integer, default=0)
    throughput: Mapped[int] = mapped_column(Integer, default=0)  # records/min

    # Execution
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    execution_logs: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    estimated_completion: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    user: Mapped["User"] = relationship("User", back_populates="scrape_jobs")
    providers: Mapped[List["Provider"]] = relationship("Provider", back_populates="scrape_job")


# ─── Import Batch ────────────────────────────────────────────────────────────

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    source_type: Mapped[str] = mapped_column(String(100))  # csv, json, xlsx, api
    filename: Mapped[Optional[str]] = mapped_column(String(500))
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    processed_records: Mapped[int] = mapped_column(Integer, default=0)
    failed_records: Mapped[int] = mapped_column(Integer, default=0)
    health_score: Mapped[Optional[float]] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="processing")
    error_log: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))


# ─── AI Insight ──────────────────────────────────────────────────────────────

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("providers.id"))
    insight_type: Mapped[str] = mapped_column(String(100))  # market, pricing, sentiment, competitive
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── Chat Session ─────────────────────────────────────────────────────────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    user: Mapped["User"] = relationship("User", back_populates="chat_sessions")
    messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("chat_sessions.id"))
    role: Mapped[str] = mapped_column(String(20))  # user / assistant / system
    content: Mapped[str] = mapped_column(Text)
    sources: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")


# ─── Analytics Snapshot ───────────────────────────────────────────────────────

class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    snapshot_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    total_providers: Mapped[int] = mapped_column(Integer, default=0)
    total_scrape_jobs: Mapped[int] = mapped_column(Integer, default=0)
    records_enriched: Mapped[int] = mapped_column(Integer, default=0)
    avg_accuracy: Mapped[Optional[float]] = mapped_column(Float)
    active_jobs: Mapped[int] = mapped_column(Integer, default=0)
    regional_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    service_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    price_trends: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
