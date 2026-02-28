"""POST /api/extract — upload a PDF, get back all steps + key steps."""

from __future__ import annotations

import logging

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models import ExtractResponse
from app.services import document_intelligence, llm

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/extract", response_model=ExtractResponse)
async def extract_steps(file: UploadFile = File(...)):
    """Accept a PDF upload and return extracted + classified setup steps."""

    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 25 MB size limit.")

    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Extract text via Document Intelligence
    try:
        raw_text = await document_intelligence.extract_text_from_pdf(pdf_bytes)
    except Exception as exc:
        logger.exception("Document Intelligence failed")
        raise HTTPException(status_code=502, detail=f"PDF extraction failed: {exc}") from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from this PDF. It may be image-only or corrupted.",
        )

    # 2. LLM – extract all steps
    try:
        all_steps, raw_llm_all = llm.extract_all_steps(raw_text)
    except Exception as exc:
        logger.exception("LLM extraction failed")
        raise HTTPException(status_code=502, detail=f"LLM step extraction failed: {exc}") from exc

    # 3. LLM – classify key steps
    try:
        key_steps, raw_llm_key = llm.classify_key_steps(all_steps)
    except Exception as exc:
        logger.exception("LLM classification failed")
        raise HTTPException(status_code=502, detail=f"LLM key-step classification failed: {exc}") from exc

    return ExtractResponse(
        allSteps=all_steps,
        keySteps=key_steps,
        rawExtraction=raw_text,
        rawLlmAllSteps=raw_llm_all,
        rawLlmKeySteps=raw_llm_key,
    )
