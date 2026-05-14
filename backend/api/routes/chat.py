"""
AI Chat Routes — RAG-style assistant powered by OpenAI + provider DB context.
"""
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from db.database import get_db
from models import ChatSession, ChatMessage, Provider
from schemas import ChatMessageIn, ChatMessageOut, ChatSessionOut, ChatResponse
from core.security import get_current_user
from ai.service import get_ai_service, build_provider_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["AI Assistant"])


async def _get_provider_context(db: AsyncSession, query: str, limit: int = 20) -> str:
    """Fetch relevant providers from DB to build RAG context."""
    from sqlalchemy import or_, func
    q = select(Provider).where(Provider.status == "active")

    # Simple keyword filter against query
    keywords = [w for w in query.lower().split() if len(w) > 3]
    if keywords:
        conditions = [Provider.name.ilike(f"%{kw}%") for kw in keywords[:3]]
        conditions += [Provider.state.ilike(f"%{kw}%") for kw in keywords[:3]]
        conditions += [Provider.city.ilike(f"%{kw}%") for kw in keywords[:3]]
        q = q.where(or_(*conditions))

    q = q.order_by(desc(Provider.data_confidence)).limit(limit)
    result = await db.execute(q)
    providers = result.scalars().all()

    # If no keyword match, just get latest enriched
    if not providers:
        q2 = select(Provider).where(Provider.ai_verified == True).limit(limit)
        result2 = await db.execute(q2)
        providers = result2.scalars().all()

    return build_provider_context([
        {
            "name": p.name, "city": p.city, "state": p.state,
            "avg_price": p.avg_price, "rating": p.rating,
            "services": p.services, "ai_summary": p.ai_summary,
        }
        for p in providers
    ])


@router.post("/message", response_model=ChatResponse)
async def send_message(
    payload: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["sub"]

    # Get or create session
    session_id = payload.session_id
    if session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=payload.content[:60] + "..." if len(payload.content) > 60 else payload.content,
        )
        db.add(session)
        await db.flush()
        session_id = session.id

    # Save user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)

    # Get session history
    hist_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .limit(10)
    )
    history = [{"role": m.role, "content": m.content} for m in hist_result.scalars().all()]

    # Build context from DB
    context = await _get_provider_context(db, payload.content)

    # Call AI
    ai_svc = get_ai_service()
    ai_result = await ai_svc.chat(
        messages=[{"role": "user", "content": payload.content}],
        provider_context=context,
        session_history=history,
    )

    # Save assistant message
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=ai_result["content"],
        sources=ai_result.get("sources", []),
        tokens_used=ai_result.get("tokens_used"),
    )
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(
        session_id=session_id,
        message=ChatMessageOut.model_validate(assistant_msg),
        context_used=ai_result.get("sources", []),
    )


@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user["sub"])
        .order_by(desc(ChatSession.created_at))
        .limit(20)
    )
    sessions = result.scalars().all()
    return [ChatSessionOut.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=ChatSessionOut)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user["sub"],
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionOut.model_validate(session)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user["sub"],
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
