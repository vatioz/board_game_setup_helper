"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (one level above backend/)
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)


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
