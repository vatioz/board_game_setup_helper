"""Azure OpenAI LLM integration for step extraction and filtering."""

from __future__ import annotations

import json
import logging
import re
import uuid
from collections.abc import Callable

from openai import AzureOpenAI

from app.config import get_extraction_status, settings
from app.models import Step

logger = logging.getLogger(__name__)

_client: AzureOpenAI | None = None


class InvalidLLMResponse(ValueError):
    """A model response failed structural or semantic validation."""


class LLMResponseError(ValueError):
    """An invalid model response after the single permitted retry."""

    def __init__(self, reason: str, raw_response: str) -> None:
        self.raw_response = raw_response
        super().__init__(f"{reason}; raw response: {raw_response}")


def _get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        status = get_extraction_status()
        if not status["available"]:
            raise RuntimeError(str(status["reason"]))
        _client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
    return _client


# ── Prompts ──────────────────────────────────────────────────────────────────

_SYSTEM_EXTRACT = """\
You are an expert board-game analyst. Given the raw text of one or more \
board-game rulebooks (base game and/or expansions), extract every discrete \
setup instruction in chronological order.

The text may contain sections from multiple documents, separated by markers \
like "=== [Document Name] ===". Use these markers to determine the "source" \
of each step — i.e. which document the step came from.

Rules:
- Include ONLY setup instructions (what to do before the first turn).
- Exclude gameplay rules, victory conditions, flavor text, and component lists \
  that are not actionable setup steps.
- Each step must be a short, self-contained instruction.
- If an expansion modifies or overrides a base game step, include only the \
  expansion's version and note the source.
- Order steps logically: base-game setup first, then expansion additions.

Respond with a JSON array of objects: \
[{"id": "<uuid>", "text": "<instruction>", "source": "<document name>"}]
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
[{"id": "<same-id>", "text": "<same-text>", "source": "<same-source>", "isKey": true/false}]
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


def _parse_json_array(raw: str) -> list[dict[str, object]]:
    """Parse an array of objects, accepting JSON markdown fences."""
    text = raw.strip()
    opening = re.match(r"^```(?:json)?[ \t]*(?:\r?\n|(?=[\[{]))", text, re.IGNORECASE)
    if opening:
        text = text[opening.end() :].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    items = json.loads(text)
    if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
        raise InvalidLLMResponse("Expected a JSON array of objects")
    return items


def _validated_response(
    system: str,
    user: str,
    validate: Callable[[list[dict[str, object]]], list[Step]],
) -> tuple[list[Step], str]:
    for attempt in range(2):
        raw = _call_llm(system, user)
        try:
            return validate(_parse_json_array(raw)), raw
        except (json.JSONDecodeError, InvalidLLMResponse) as exc:
            if attempt == 1:
                raise LLMResponseError(str(exc), raw) from exc
            logger.warning("LLM returned an invalid response; retrying once")
    raise AssertionError("unreachable")


def _extracted_steps(items: list[dict[str, object]]) -> list[Step]:
    steps: list[Step] = []
    seen: set[str] = set()
    for item in items:
        step_id = item.get("id", str(uuid.uuid4()))
        text = item.get("text")
        source = item.get("source", "")
        if not isinstance(step_id, str) or not step_id:
            raise InvalidLLMResponse("Each extracted step needs a nonempty string ID")
        if not isinstance(text, str) or not text.strip() or not isinstance(source, str):
            raise InvalidLLMResponse(
                "Each extracted step needs text and a string source"
            )
        if step_id in seen:
            raise InvalidLLMResponse(f"Duplicate extracted step ID: {step_id}")
        seen.add(step_id)
        steps.append(Step(id=step_id, text=text, source=source))
    return steps


def _build_combined_text(extractions: dict[str, str]) -> str:
    """Concatenate per-document texts with labelled boundary markers."""
    sections: list[str] = []
    for label, text in extractions.items():
        sections.append(f"=== [{label}] ===\n{text}")
    return "\n\n".join(sections)


# ── Public API ───────────────────────────────────────────────────────────────


def extract_all_steps(raw_text: str | dict[str, str]) -> tuple[list[Step], str]:
    """Return (list_of_steps, raw_llm_response) from rulebook text.

    *raw_text* can be a plain string (single PDF, backward compat) or a
    ``{label: text}`` dict for multi-PDF extraction.
    """
    if isinstance(raw_text, dict):
        combined = _build_combined_text(raw_text)
    else:
        combined = raw_text

    logger.info("LLM: extracting all steps (%d chars of input)", len(combined))
    steps, raw = _validated_response(_SYSTEM_EXTRACT, combined, _extracted_steps)
    logger.info("LLM: extracted %d steps", len(steps))
    return steps, raw


def classify_key_steps(all_steps: list[Step]) -> tuple[list[Step], str]:
    """Return (key_steps_only, raw_llm_response)."""
    by_id = {step.id: step for step in all_steps}
    if len(by_id) != len(all_steps):
        raise ValueError("All steps must have unique IDs")

    def validate(items: list[dict[str, object]]) -> list[Step]:
        selected: list[Step] = []
        seen: set[str] = set()
        for item in items:
            step_id = item.get("id")
            is_key = item.get("isKey")
            if not isinstance(step_id, str) or step_id not in by_id:
                raise InvalidLLMResponse(
                    "Classification contains a missing or unknown step ID"
                )
            if step_id in seen:
                raise InvalidLLMResponse(f"Duplicate classified step ID: {step_id}")
            if not isinstance(is_key, bool):
                raise InvalidLLMResponse(
                    f"Classification for {step_id} needs a boolean isKey"
                )
            seen.add(step_id)
            if is_key:
                selected.append(by_id[step_id])
        if len(seen) != len(by_id):
            raise InvalidLLMResponse("Classification does not cover every input step")
        return selected

    payload = json.dumps([s.model_dump() for s in all_steps])
    logger.info("LLM: classifying key steps (%d steps)", len(all_steps))
    key_steps, raw = _validated_response(_SYSTEM_FILTER, payload, validate)
    logger.info("LLM: %d / %d steps classified as key", len(key_steps), len(all_steps))
    return key_steps, raw
