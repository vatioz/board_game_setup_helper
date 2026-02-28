"""FastAPI application entry point.

Serves the React SPA from ``static/`` and mounts the REST API under ``/api``.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.routers import extract, sessions

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Board Game Setup Helper",
    version="1.0.0",
)

# CORS – relaxed for local dev; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ───────────────────────────────────────────────────────────────
app.include_router(extract.router, prefix="/api")
app.include_router(sessions.router, prefix="/api/sessions")

# ── SPA static files ────────────────────────────────────────────────────────
_static_dir = Path(__file__).resolve().parent.parent / "static"

if _static_dir.is_dir():
    # Serve assets (JS, CSS, images) under /assets
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all: serve index.html for any non-API route (SPA client routing)."""
        file = _static_dir / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_static_dir / "index.html")
else:
    logger.warning(
        "Static directory %s not found – SPA will not be served. "
        "Build the frontend first: cd frontend && npm run build",
        _static_dir,
    )
