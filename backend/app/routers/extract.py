"""POST /api/extract — upload one or more PDFs, get back all steps + key steps."""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.models import ExtractResponse
from app.services import document_intelligence, llm

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 25 * 1024 * 1024       # 25 MB per file
MAX_TOTAL_SIZE = 100 * 1024 * 1024     # 100 MB aggregate


def _default_label(filename: str | None) -> str:
    """Derive a human-friendly label from a filename."""
    if not filename:
        return "Document"
    return os.path.splitext(filename)[0]


@router.post("/extract", response_model=ExtractResponse)
async def extract_steps(
    files: list[UploadFile] = File(...),
    labels: str = Form(""),
):
    """Accept one or more PDF uploads and return extracted + classified setup steps.

    ``labels`` is an optional comma-separated string of display names matching
    each uploaded file (e.g. ``"Base Game,Expansion 1"``).  When omitted the
    filenames are used as labels.
    """

    if not files:
        raise HTTPException(status_code=400, detail="At least one PDF file is required.")

    # Parse labels — fall back to filenames
    label_list = [l.strip() for l in labels.split(",") if l.strip()] if labels else []
    if len(label_list) < len(files):
        label_list.extend(
            _default_label(f.filename) for f in files[len(label_list):]
        )

    # Validate each file and read bytes
    file_data: list[tuple[str, bytes]] = []
    total_size = 0
    for idx, upload in enumerate(files):
        if upload.content_type not in ("application/pdf",):
            raise HTTPException(
                status_code=400,
                detail=f"File '{upload.filename}' is not a PDF.",
            )
        pdf_bytes = await upload.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"File '{upload.filename}' is empty.",
            )
        if len(pdf_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{upload.filename}' exceeds the 25 MB size limit.",
            )
        total_size += len(pdf_bytes)
        if total_size > MAX_TOTAL_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Total upload size exceeds the 100 MB limit.",
            )
        file_data.append((label_list[idx], pdf_bytes))

    # 1. Extract text via Document Intelligence (concurrently for all PDFs)
    try:
        extractions = await document_intelligence.extract_text_from_multiple_pdfs(file_data)
    except Exception as exc:
        logger.exception("Document Intelligence failed")
        raise HTTPException(status_code=502, detail=f"PDF extraction failed: {exc}") from exc

    # Check that at least one PDF produced text
    if not any(t.strip() for t in extractions.values()):
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from the uploaded PDF(s). They may be image-only or corrupted.",
        )

    # 2. LLM – extract all steps (single call with combined text)
    try:
        all_steps, raw_llm_all = llm.extract_all_steps(extractions)
    except Exception as exc:
        logger.exception("LLM extraction failed")
        raise HTTPException(status_code=502, detail=f"LLM step extraction failed: {exc}") from exc

    # 3. LLM – classify key steps
    try:
        key_steps, raw_llm_key = llm.classify_key_steps(all_steps)
    except Exception as exc:
        logger.exception("LLM classification failed")
        raise HTTPException(status_code=502, detail=f"LLM key-step classification failed: {exc}") from exc

    # Build backward-compat rawExtraction (flat concatenation)
    raw_extraction_flat = "\n\n".join(extractions.values())

    return ExtractResponse(
        allSteps=all_steps,
        keySteps=key_steps,
        rawExtraction=raw_extraction_flat,
        rawExtractions=extractions,
        rawLlmAllSteps=raw_llm_all,
        rawLlmKeySteps=raw_llm_key,
    )
