"""Azure OpenAI LLM integration for step extraction and filtering."""

from __future__ import annotations

import json
import logging
import uuid

from openai import AzureOpenAI

from app.config import settings
from app.models import Step

logger = logging.getLogger(__name__)

_client: AzureOpenAI | None = None


def _get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
    return _client


# ── Prompts ──────────────────────────────────────────────────────────────────

_SYSTEM_EXTRACT = """\
You are an expert board-game analyst. Given the raw text of a board-game rulebook, \
extract every discrete setup instruction in chronological order.

Rules:
- Include ONLY setup instructions (what to do before the first turn).
- Exclude gameplay rules, victory conditions, flavor text, and component lists \
  that are not actionable setup steps.
- Each step must be a short, self-contained instruction.

Respond with a JSON array of objects: [{"id": "<uuid>", "text": "<instruction>"}]
Return ONLY the JSON array — no markdown fences, no commentary.
"""

_SYSTEM_FILTER = """\
You are an expert board-game analyst. Given a JSON array of setup steps, classify \
each step as a "key" step or not.

A key step is one that is:
- Non-obvious, complex, or easily forgotten
- Involves specific quantities, card names, board positions, or conditional logic
- Would likely be missed by a player who has not read the rules recently

A step is NOT key if it is intuitive common sense (e.g., "unfold the board", \
"each player picks a color").

Respond with a JSON array of objects: \
[{"id": "<same-id>", "text": "<same-text>", "isKey": true/false}]
Return ONLY the JSON array — no markdown fences, no commentary.
"""


def _call_llm(system: str, user: str) -> str:
    """Send a chat completion request and return the assistant content."""
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT,
        temperature=0.2,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content or ""


def _parse_json_array(raw: str) -> list[dict]:
    """Attempt to parse *raw* as a JSON array, stripping markdown fences if present."""
    text = raw.strip()
    if text.startswith("```"):
        # Strip ```json ... ```
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


# ── Public API ───────────────────────────────────────────────────────────────

def extract_all_steps(raw_text: str) -> tuple[list[Step], str]:
    """Return (list_of_steps, raw_llm_response) from rulebook text."""
    logger.info("LLM: extracting all steps (%d chars of input)", len(raw_text))
    raw = _call_llm(_SYSTEM_EXTRACT, raw_text)
    try:
        items = _parse_json_array(raw)
    except (json.JSONDecodeError, ValueError):
        logger.warning("LLM returned malformed JSON – retrying once")
        raw = _call_llm(_SYSTEM_EXTRACT, raw_text)
        items = _parse_json_array(raw)  # let it raise on second failure

    steps = [
        Step(id=item.get("id", str(uuid.uuid4())), text=item["text"])
        for item in items
    ]
    logger.info("LLM: extracted %d steps", len(steps))
    return steps, raw


def classify_key_steps(all_steps: list[Step]) -> tuple[list[Step], str]:
    """Return (key_steps_only, raw_llm_response)."""
    payload = json.dumps([s.model_dump() for s in all_steps])
    logger.info("LLM: classifying key steps (%d steps)", len(all_steps))
    raw = _call_llm(_SYSTEM_FILTER, payload)
    try:
        items = _parse_json_array(raw)
    except (json.JSONDecodeError, ValueError):
        logger.warning("LLM returned malformed JSON – retrying once")
        raw = _call_llm(_SYSTEM_FILTER, payload)
        items = _parse_json_array(raw)

    key_steps = [
        Step(id=item["id"], text=item["text"])
        for item in items
        if item.get("isKey", False)
    ]
    logger.info("LLM: %d / %d steps classified as key", len(key_steps), len(all_steps))
    return key_steps, raw
