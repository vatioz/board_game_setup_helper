"""Azure Cosmos DB integration for session persistence."""

from __future__ import annotations

import logging
from typing import Any

from azure.cosmos import CosmosClient, PartitionKey, exceptions

from app.config import settings

logger = logging.getLogger(__name__)

_container = None


def _get_container():
    """Lazily initialise the Cosmos DB container reference (creates DB/container if missing)."""
    global _container
    if _container is None:
        client = CosmosClient(settings.COSMOSDB_ENDPOINT, credential=settings.COSMOSDB_KEY)
        database = client.create_database_if_not_exists(id=settings.COSMOSDB_DATABASE)
        _container = database.create_container_if_not_exists(
            id=settings.COSMOSDB_CONTAINER,
            partition_key=PartitionKey(path="/id"),
        )
    return _container


# ── CRUD ─────────────────────────────────────────────────────────────────────

def list_sessions() -> list[dict[str, str]]:
    """Return ``[{id, name}]`` for every saved session."""
    container = _get_container()
    items = container.query_items(
        query="SELECT c.id, c.name FROM c",
        enable_cross_partition_query=True,
    )
    return [{"id": item["id"], "name": item["name"]} for item in items]


def get_session(session_id: str) -> dict[str, Any] | None:
    """Return full session document or *None* if not found."""
    container = _get_container()
    try:
        return container.read_item(item=session_id, partition_key=session_id)
    except exceptions.CosmosResourceNotFoundError:
        return None


def save_session(data: dict[str, Any]) -> dict[str, Any]:
    """Upsert a session document. *data* must contain ``id``."""
    container = _get_container()
    logger.info("Saving session %s (%s)", data.get("id"), data.get("name"))
    return container.upsert_item(body=data)


def delete_session(session_id: str) -> bool:
    """Delete a session; return True if deleted, False if not found."""
    container = _get_container()
    try:
        container.delete_item(item=session_id, partition_key=session_id)
        logger.info("Deleted session %s", session_id)
        return True
    except exceptions.CosmosResourceNotFoundError:
        return False
