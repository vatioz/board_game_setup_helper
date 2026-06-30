"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (one level above backend/)
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)


def _is_blank(value: str) -> bool:
    return not value.strip()


class Settings:
    """Simple settings bag – reads from env on import."""

    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_DEPLOYMENT: str = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-52")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2025-04-01-preview")

    # Azure AI Document Intelligence
    DOCUMENT_INTELLIGENCE_ENDPOINT: str = os.getenv("DOCUMENT_INTELLIGENCE_ENDPOINT", "")
    DOCUMENT_INTELLIGENCE_KEY: str = os.getenv("DOCUMENT_INTELLIGENCE_KEY", "")

    # Azure Cosmos DB
    COSMOSDB_ENDPOINT: str = os.getenv("COSMOSDB_ENDPOINT", "")
    COSMOSDB_KEY: str = os.getenv("COSMOSDB_KEY", "")
    COSMOSDB_DATABASE: str = os.getenv("COSMOSDB_DATABASE", "board_game_setup")
    COSMOSDB_CONTAINER: str = os.getenv("COSMOSDB_CONTAINER", "sessions")

    # App
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")


settings = Settings()


def _build_feature_status(missing: list[str], unavailable_message: str) -> dict[str, bool | str]:
    if not missing:
        return {"available": True, "reason": ""}
    missing_list = ", ".join(missing)
    return {
        "available": False,
        "reason": f"{unavailable_message} Missing settings: {missing_list}.",
    }


def get_extraction_status() -> dict[str, bool | str]:
    missing: list[str] = []

    if _is_blank(settings.DOCUMENT_INTELLIGENCE_ENDPOINT):
        missing.append("DOCUMENT_INTELLIGENCE_ENDPOINT")
    if _is_blank(settings.DOCUMENT_INTELLIGENCE_KEY):
        missing.append("DOCUMENT_INTELLIGENCE_KEY")
    if _is_blank(settings.AZURE_OPENAI_ENDPOINT):
        missing.append("AZURE_OPENAI_ENDPOINT")
    if _is_blank(settings.AZURE_OPENAI_API_KEY):
        missing.append("AZURE_OPENAI_API_KEY")
    if _is_blank(settings.AZURE_OPENAI_DEPLOYMENT):
        missing.append("AZURE_OPENAI_DEPLOYMENT")

    return _build_feature_status(
        missing,
        "Extraction is unavailable because Azure AI Document Intelligence and Azure OpenAI are not fully configured.",
    )


def get_sessions_status() -> dict[str, bool | str]:
    missing: list[str] = []

    if _is_blank(settings.COSMOSDB_ENDPOINT):
        missing.append("COSMOSDB_ENDPOINT")
    if _is_blank(settings.COSMOSDB_KEY):
        missing.append("COSMOSDB_KEY")
    if _is_blank(settings.COSMOSDB_DATABASE):
        missing.append("COSMOSDB_DATABASE")
    if _is_blank(settings.COSMOSDB_CONTAINER):
        missing.append("COSMOSDB_CONTAINER")

    return _build_feature_status(
        missing,
        "Saved sessions are unavailable because Azure Cosmos DB is not fully configured.",
    )


def get_app_status() -> dict[str, dict[str, bool | str]]:
    return {
        "extraction": get_extraction_status(),
        "sessions": get_sessions_status(),
    }
