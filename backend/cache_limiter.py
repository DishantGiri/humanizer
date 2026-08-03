"""
Redis Caching and Rate Limiting Layer.
Supports Redis server with automatic thread-safe in-memory fallback if Redis is unavailable.
"""

import os
import time
import json
import hashlib
import logging
from typing import Optional, Any, Dict

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis_client = None
_in_memory_cache: Dict[str, Dict[str, Any]] = {}
_in_memory_rate_limits: Dict[str, list] = {}

def get_redis_client():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis
        client = redis.Redis.from_url(REDIS_URL, socket_timeout=2)
        client.ping()
        _redis_client = client
        logger.info("Connected to Redis at %s", REDIS_URL)
        return _redis_client
    except Exception as e:
        logger.info("Redis unavailable (%s). Using thread-safe in-memory cache/rate-limiter.", e)
        _redis_client = None
        return None


def get_cached_rewrite(input_text: str, mode: str, level: int) -> Optional[str]:
    """
    Check if a rewrite for (input_text, mode, level) exists in cache.
    """
    key_src = f"{input_text.strip()}:{mode}:{level}"
    key = "rewrite:" + hashlib.sha256(key_src.encode('utf-8')).hexdigest()

    r = get_redis_client()
    if r is not None:
        try:
            cached = r.get(key)
            if cached:
                return cached.decode('utf-8')
        except Exception as e:
            logger.warning("Redis read error: %s", e)

    # In-memory fallback
    now = time.time()
    if key in _in_memory_cache:
        item = _in_memory_cache[key]
        if item["expires_at"] > now:
            return item["value"]
        else:
            del _in_memory_cache[key]

    return None


def set_cached_rewrite(input_text: str, mode: str, level: int, rewritten_text: str, ttl_seconds: int = 86400) -> None:
    """
    Store rewrite result in cache (TTL 24 hours).
    """
    if not rewritten_text or not rewritten_text.strip():
        return

    key_src = f"{input_text.strip()}:{mode}:{level}"
    key = "rewrite:" + hashlib.sha256(key_src.encode('utf-8')).hexdigest()

    r = get_redis_client()
    if r is not None:
        try:
            r.setex(key, ttl_seconds, rewritten_text)
            return
        except Exception as e:
            logger.warning("Redis write error: %s", e)

    # In-memory fallback
    _in_memory_cache[key] = {
        "value": rewritten_text,
        "expires_at": time.time() + ttl_seconds
    }


def is_rate_limited(user_identifier: str, limit: int = 30, window_seconds: int = 60) -> bool:
    """
    Sliding window rate-limiter for API users.
    Returns True if user exceeds limit within window_seconds.
    """
    now = time.time()
    key = f"ratelimit:{user_identifier}"

    r = get_redis_client()
    if r is not None:
        try:
            pipe = r.pipeline()
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window_seconds)
            results = pipe.execute()
            request_count = results[2]
            return request_count > limit
        except Exception as e:
            logger.warning("Redis rate limit error: %s", e)

    # In-memory fallback
    timestamps = _in_memory_rate_limits.get(key, [])
    timestamps = [t for t in timestamps if t > now - window_seconds]
    timestamps.append(now)
    _in_memory_rate_limits[key] = timestamps

    return len(timestamps) > limit
