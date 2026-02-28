"""Pydantic models for request / response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Step models ──────────────────────────────────────────────────────────────

class Step(BaseModel):
    id: str
    text: str


class ClassifiedStep(BaseModel):
    id: str
    text: str
    isKey: bool = Field(alias="isKey")

    model_config = {"populate_by_name": True}


# ── Extraction request / response ────────────────────────────────────────────

class ExtractResponse(BaseModel):
    allSteps: list[Step]
    keySteps: list[Step]
    rawExtraction: str = ""
    rawLlmAllSteps: str = ""
    rawLlmKeySteps: str = ""


# ── Session models ───────────────────────────────────────────────────────────

class SessionSummary(BaseModel):
    id: str
    name: str


class SessionData(BaseModel):
    id: str = ""
    name: str
    allSteps: list[Step]
    keySteps: list[Step]
    rawExtraction: str = ""
    rawLlmAllSteps: str = ""
    rawLlmKeySteps: str = ""


class SaveSessionRequest(BaseModel):
    name: str
    allSteps: list[Step]
    keySteps: list[Step]
    rawExtraction: str = ""
    rawLlmAllSteps: str = ""
    rawLlmKeySteps: str = ""
