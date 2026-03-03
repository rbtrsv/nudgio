from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
import json
import hashlib


class InMemoryCache:
    """Simple in-memory cache for recommendations"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
        key_data = f"{prefix}:" + ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        if key in self._cache:
            entry = self._cache[key]
            if datetime.utcnow() < entry["expires_at"]:
                return entry["data"]
            else:
                # Remove expired entry
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl_minutes: int = 60) -> None:
        """Set cached value with TTL"""
        expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
        self._cache[key] = {
            "data": value,
            "expires_at": expires_at,
            "created_at": datetime.utcnow()
        }
    
    def delete(self, key: str) -> None:
        """Delete cached entry"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cached entries"""
        self._cache.clear()
    
    def get_recommendations(
        self, 
        connection_id: int, 
        rec_type: str, 
        **params
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached recommendations"""
        key = self._generate_key(
            f"recs_{rec_type}", 
            connection_id=connection_id,
            **params
        )
        return self.get(key)
    
    def set_recommendations(
        self, 
        connection_id: int, 
        rec_type: str, 
        recommendations: List[Dict[str, Any]],
        ttl_minutes: int = 60,
        **params
    ) -> None:
        """Cache recommendations"""
        key = self._generate_key(
            f"recs_{rec_type}", 
            connection_id=connection_id,
            **params
        )
        self.set(key, recommendations, ttl_minutes)


# Global cache instance
cache = InMemoryCache()