"""CRUD endpoints for saved sessions under /api/sessions."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException

from app.config import get_sessions_status
from app.models import SaveSessionRequest, SessionData, SessionSummary
from app.services import cosmos_db

logger = logging.getLogger(__name__)
router = APIRouter()


def _ensure_sessions_available() -> None:
    status = get_sessions_status()
    if not status["available"]:
        raise HTTPException(status_code=503, detail=str(status["reason"]))


@router.get("", response_model=list[SessionSummary])
async def list_sessions():
    """Return all saved session summaries."""
    _ensure_sessions_available()
    return cosmos_db.list_sessions()


@router.get("/{session_id}", response_model=SessionData)
async def get_session(session_id: str):
    """Load a single session by ID."""
    _ensure_sessions_available()
    doc = cosmos_db.get_session(session_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return doc


@router.post("", response_model=SessionData, status_code=201)
async def create_session(body: SaveSessionRequest):
    """Save a new session."""
    _ensure_sessions_available()
    data = body.model_dump()
    data["id"] = str(uuid.uuid4())
    saved = cosmos_db.save_session(data)
    return saved


@router.put("/{session_id}", response_model=SessionData)
async def update_session(session_id: str, body: SaveSessionRequest):
    """Update an existing session."""
    _ensure_sessions_available()
    existing = cosmos_db.get_session(session_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    data = body.model_dump()
    data["id"] = session_id
    saved = cosmos_db.save_session(data)
    return saved


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str):
    """Delete a session."""
    _ensure_sessions_available()
    deleted = cosmos_db.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
