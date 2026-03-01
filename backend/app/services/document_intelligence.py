"""Azure AI Document Intelligence integration.

Calls the prebuilt-read model to extract text (with layout) from an uploaded PDF.
"""

from __future__ import annotations

import asyncio
import logging

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

from app.config import settings

logger = logging.getLogger(__name__)

_client: DocumentIntelligenceClient | None = None


def _get_client() -> DocumentIntelligenceClient:
    global _client
    if _client is None:
        _client = DocumentIntelligenceClient(
            endpoint=settings.DOCUMENT_INTELLIGENCE_ENDPOINT,
            credential=AzureKeyCredential(settings.DOCUMENT_INTELLIGENCE_KEY),
        )
    return _client


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from *pdf_bytes* using Document Intelligence prebuilt-read.

    Returns the concatenated page content as a single string.
    """
    client = _get_client()

    logger.info("Calling Document Intelligence (prebuilt-read) – %d bytes", len(pdf_bytes))

    # The SDK expects the model id followed by the document bytes as the request body.
    poller = client.begin_analyze_document("prebuilt-read", body=pdf_bytes)
    result = poller.result()

    pages_text: list[str] = []
    for page in result.pages:
        lines = [line.content for line in (page.lines or [])]
        pages_text.append("\n".join(lines))

    full_text = "\n\n".join(pages_text)
    logger.info("Extraction complete – %d characters across %d pages", len(full_text), len(result.pages))
    return full_text


async def extract_text_from_multiple_pdfs(
    files: list[tuple[str, bytes]],
) -> dict[str, str]:
    """Extract text from multiple PDFs concurrently.

    *files* is a list of ``(label, pdf_bytes)`` tuples.
    Returns ``{label: extracted_text}`` preserving the input order.
    """
    tasks = [extract_text_from_pdf(pdf_bytes) for _label, pdf_bytes in files]
    results = await asyncio.gather(*tasks)
    return {label: text for (label, _bytes), text in zip(files, results)}
