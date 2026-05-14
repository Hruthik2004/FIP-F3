"""
Provider API Routes — CRUD, search, and AI enrichment.
"""
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func, or_, and_
from db.database import get_db
from models import Provider, ProviderStatus
from schemas import ProviderOut, ProviderListOut, ProviderSearch
from core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/providers", tags=["Providers"])


def _apply_filters(q, search: ProviderSearch):
    """Apply search filters to query."""
    if search.query:
        q = q.where(or_(
            Provider.name.ilike(f"%{search.query}%"),
            Provider.city.ilike(f"%{search.query}%"),
            Provider.state.ilike(f"%{search.query}%"),
            Provider.description.ilike(f"%{search.query}%"),
        ))
    if search.city:
        q = q.where(Provider.city.ilike(f"%{search.city}%"))
    if search.state:
        q = q.where(Provider.state.ilike(f"%{search.state}%"))
    if search.min_price is not None:
        q = q.where(Provider.avg_price >= search.min_price)
    if search.max_price is not None:
        q = q.where(Provider.avg_price <= search.max_price)
    if search.min_rating is not None:
        q = q.where(Provider.rating >= search.min_rating)
    if search.ai_verified is not None:
        q = q.where(Provider.ai_verified == search.ai_verified)
    if search.service_type:
        q = q.where(Provider.services.cast(str).ilike(f"%{search.service_type}%"))
    return q


def _apply_sort(q, sort_by: str, sort_dir: str):
    col_map = {
        "name": Provider.name,
        "rating": Provider.rating,
        "avg_price": Provider.avg_price,
        "created_at": Provider.created_at,
        "scraped_at": Provider.scraped_at,
        "data_confidence": Provider.data_confidence,
    }
    col = col_map.get(sort_by, Provider.created_at)
    return q.order_by(asc(col) if sort_dir == "asc" else desc(col))


@router.get("", response_model=ProviderListOut)
async def list_providers(
    query: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    service_type: Optional[str] = None,
    ai_verified: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    search = ProviderSearch(
        query=query, city=city, state=state,
        min_price=min_price, max_price=max_price,
        min_rating=min_rating, service_type=service_type,
        ai_verified=ai_verified, page=page, page_size=page_size,
        sort_by=sort_by, sort_dir=sort_dir,
    )

    base_q = select(Provider).where(Provider.status == ProviderStatus.ACTIVE)
    base_q = _apply_filters(base_q, search)

    # Count
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginated data
    data_q = _apply_sort(base_q, sort_by, sort_dir)
    data_q = data_q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(data_q)
    providers = result.scalars().all()

    return ProviderListOut(
        items=[ProviderOut.model_validate(p) for p in providers],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


@router.get("/search", response_model=ProviderListOut)
async def search_providers(
    q: str = Query(..., min_length=1),
    page: int = 1,
    page_size: int = 12,
    db: AsyncSession = Depends(get_db),
):
    """Full-text search across providers."""
    search = ProviderSearch(query=q, page=page, page_size=page_size)
    return await list_providers(
        query=q, page=page, page_size=page_size, db=db
    )


@router.get("/{provider_id}", response_model=ProviderOut)
async def get_provider(provider_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single provider by ID or slug."""
    result = await db.execute(
        select(Provider).where(
            or_(Provider.id == provider_id, Provider.slug == provider_id)
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return ProviderOut.model_validate(provider)


@router.post("/{provider_id}/enrich")
async def enrich_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Trigger AI re-enrichment for a provider."""
    from ai.service import get_ai_service
    from datetime import datetime

    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    ai_svc = get_ai_service()
    data = {
        "name": provider.name, "city": provider.city, "state": provider.state,
        "services": provider.services, "avg_price": provider.avg_price,
        "rating": provider.rating, "reviews": provider.reviews,
        "description": provider.description, "pricing_data": provider.pricing_data,
    }
    enrichment = await ai_svc.enrich_provider(data)

    provider.ai_summary = enrichment.get("ai_summary")
    provider.ai_market_position = enrichment.get("ai_market_position")
    provider.ai_tags = enrichment.get("ai_tags", [])
    provider.data_confidence = enrichment.get("data_confidence")
    provider.enrichment_score = enrichment.get("enrichment_score")
    provider.sentiment_score = enrichment.get("sentiment_analysis")
    provider.ai_verified = True
    provider.last_enriched_at = datetime.utcnow()

    await db.commit()
    return {"status": "enriched", "provider_id": provider_id, "result": enrichment}


@router.delete("/{provider_id}", status_code=204)
async def delete_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider.status = ProviderStatus.INACTIVE
    await db.commit()


@router.get("/stats/summary")
async def providers_summary(db: AsyncSession = Depends(get_db)):
    """Quick stats for dashboard."""
    total = (await db.execute(select(func.count(Provider.id)))).scalar() or 0
    verified = (await db.execute(
        select(func.count(Provider.id)).where(Provider.ai_verified == True)
    )).scalar() or 0
    avg_price = (await db.execute(select(func.avg(Provider.avg_price)))).scalar()
    avg_rating = (await db.execute(select(func.avg(Provider.rating)))).scalar()

    return {
        "total": total,
        "ai_verified": verified,
        "avg_price": round(float(avg_price), 2) if avg_price else None,
        "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
    }
