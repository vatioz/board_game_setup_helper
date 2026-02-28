"""CRUD endpoints for saved sessions under /api/sessions."""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, HTTPException

from app.models import SessionSummary, SessionData, SaveSessionRequest
from app.services import cosmos_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[SessionSummary])
async def list_sessions():
    """Return all saved session summaries."""
    return cosmos_db.list_sessions()


@router.get("/{session_id}", response_model=SessionData)
async def get_session(session_id: str):
    """Load a single session by ID."""
    doc = cosmos_db.get_session(session_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return doc


@router.post("", response_model=SessionData, status_code=201)
async def create_session(body: SaveSessionRequest):
    """Save a new session."""
    data = body.model_dump()
    data["id"] = str(uuid.uuid4())
    saved = cosmos_db.save_session(data)
    return saved


@router.put("/{session_id}", response_model=SessionData)
async def update_session(session_id: str, body: SaveSessionRequest):
    """Update an existing session."""
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
    deleted = cosmos_db.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
