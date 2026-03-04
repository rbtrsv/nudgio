"""
Nudgio Utils — Recommendation Cache

Caches recommendation results to avoid re-querying platform APIs on every request.

Two backends:
- "memory" — Python dict with TTL (development, single worker)
- "dragonfly" — DragonflyDB/Redis via redis.asyncio (production, multi-worker)

Switch backend by changing CACHE_BACKEND constant below.
"""

from typing import Any, Dict, List
from datetime import datetime, timezone, timedelta
from abc import ABC, abstractmethod
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

# ==========================================
# Cache Backend Configuration
# ==========================================

# "memory" for development, "dragonfly" for production
CACHE_BACKEND = "memory"
DRAGONFLY_URL = "redis://localhost:6379"


# ==========================================
# Abstract Base Class
# ==========================================

class CacheBackend(ABC):
    """Abstract cache backend interface"""

    @abstractmethod
    async def get(self, key: str) -> Any | None:
        """Get cached value by key. Returns None if not found or expired."""
        ...

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set cached value with TTL in seconds."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a cached entry by key."""
        ...

    @abstractmethod
    async def clear(self) -> None:
        """Clear all cached entries."""
        ...


# ==========================================
# In-Memory Backend (Development)
# ==========================================

class InMemoryCacheBackend(CacheBackend):
    """
    Python dict with TTL expiration.
    Single worker only — cache is lost on restart.
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    async def get(self, key: str) -> Any | None:
        """Get cached value. Removes entry if expired."""
        if key in self._cache:
            entry = self._cache[key]
            if datetime.now(timezone.utc) < entry["expires_at"]:
                return entry["data"]
            else:
                # Remove expired entry
                del self._cache[key]
        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set cached value with TTL in seconds."""
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        self._cache[key] = {
            "data": value,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }

    async def delete(self, key: str) -> None:
        """Delete cached entry."""
        if key in self._cache:
            del self._cache[key]

    async def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()


# ==========================================
# DragonflyDB Backend (Production)
# ==========================================

class DragonflyCacheBackend(CacheBackend):
    """
    DragonflyDB/Redis backend via redis.asyncio.
    Multi-worker safe — shared state across processes.
    Uses JSON serialization for stored values.
    """

    def __init__(self, url: str):
        import redis.asyncio as aioredis
        self._redis = aioredis.from_url(url, decode_responses=True)

    async def get(self, key: str) -> Any | None:
        """Get cached value from DragonflyDB. Returns None if not found or expired."""
        try:
            raw = await self._redis.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.error(f"Cache GET failed for key '{key}': {e}")
            return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set cached value in DragonflyDB with TTL via SETEX."""
        try:
            serialized = json.dumps(value)
            await self._redis.setex(key, ttl_seconds, serialized)
        except Exception as e:
            logger.error(f"Cache SET failed for key '{key}': {e}")

    async def delete(self, key: str) -> None:
        """Delete cached entry from DragonflyDB."""
        try:
            await self._redis.delete(key)
        except Exception as e:
            logger.error(f"Cache DELETE failed for key '{key}': {e}")

    async def clear(self) -> None:
        """Flush all keys from DragonflyDB. Use with caution in production."""
        try:
            await self._redis.flushdb()
        except Exception as e:
            logger.error(f"Cache CLEAR failed: {e}")


# ==========================================
# Factory + Global Instance
# ==========================================

def _create_cache() -> CacheBackend:
    """Create cache backend based on CACHE_BACKEND constant."""
    if CACHE_BACKEND == "dragonfly":
        return DragonflyCacheBackend(DRAGONFLY_URL)
    return InMemoryCacheBackend()


# Global cache instance — import and use directly
cache = _create_cache()


# ==========================================
# Helper Functions
# ==========================================

def _generate_key(prefix: str, **kwargs) -> str:
    """Generate a deterministic cache key from prefix and parameters."""
    key_data = f"{prefix}:" + ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
    return hashlib.md5(key_data.encode()).hexdigest()


async def get_cached_recommendations(
    connection_id: int,
    rec_type: str,
    **params
) -> List[Dict[str, Any]] | None:
    """
    Get cached recommendations for a connection + recommendation type.

    Args:
        connection_id: Connection ID
        rec_type: Recommendation type (e.g. "bestseller", "cross_sell")
        **params: Additional parameters that affect cache key (e.g. product_id, limit)

    Returns:
        Cached recommendation list, or None if not cached
    """
    key = _generate_key(f"recs_{rec_type}", connection_id=connection_id, **params)
    return await cache.get(key)


async def set_cached_recommendations(
    connection_id: int,
    rec_type: str,
    recommendations: List[Dict[str, Any]],
    ttl_seconds: int = 3600,
    **params
) -> None:
    """
    Cache recommendations for a connection + recommendation type.

    Args:
        connection_id: Connection ID
        rec_type: Recommendation type (e.g. "bestseller", "cross_sell")
        recommendations: List of recommendation dicts to cache
        ttl_seconds: Cache TTL in seconds (default 1 hour)
        **params: Additional parameters that affect cache key (e.g. product_id, limit)
    """
    key = _generate_key(f"recs_{rec_type}", connection_id=connection_id, **params)
    await cache.set(key, recommendations, ttl_seconds)
