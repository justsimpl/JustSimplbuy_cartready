"""
Redis Caching Module
- Product data caching
- Session storage
- Rate limiting
"""
import redis.asyncio as redis
import json
import os
from datetime import datetime, timezone
from typing import Optional, Any
import hashlib
import logging

logger = logging.getLogger(__name__)

# Redis connection settings
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

# Cache TTL settings (in seconds)
PRODUCT_CACHE_TTL = 300  # 5 minutes for product data
PRODUCT_LIST_CACHE_TTL = 120  # 2 minutes for product lists
SESSION_TTL = 86400  # 24 hours for sessions
RATE_LIMIT_WINDOW = 60  # 1 minute window for rate limiting

# Rate limit settings
DEFAULT_RATE_LIMIT = 100  # requests per minute for authenticated users
ANONYMOUS_RATE_LIMIT = 30  # requests per minute for anonymous users
ADMIN_RATE_LIMIT = 200  # requests per minute for admin users

# Redis key prefixes
PREFIX_PRODUCT = "product:"
PREFIX_PRODUCT_LIST = "products:"
PREFIX_SESSION = "session:"
PREFIX_RATE_LIMIT = "rate:"
PREFIX_USER_SESSION = "user_session:"


class RedisCache:
    """Async Redis cache manager"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Initialize Redis connection"""
        if not self._connected:
            try:
                self.redis = redis.from_url(
                    REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                await self.redis.ping()
                self._connected = True
                logger.info("Redis connected successfully")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Caching disabled.")
                self._connected = False
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            self._connected = False
    
    def is_connected(self) -> bool:
        return self._connected and self.redis is not None
    
    # ============ PRODUCT CACHING ============
    
    async def get_product(self, product_id: str) -> Optional[dict]:
        """Get cached product by ID"""
        if not self.is_connected():
            return None
        try:
            data = await self.redis.get(f"{PREFIX_PRODUCT}{product_id}")
            if data:
                logger.debug(f"Cache HIT: product {product_id}")
                return json.loads(data)
            logger.debug(f"Cache MISS: product {product_id}")
            return None
        except Exception as e:
            logger.error(f"Redis get_product error: {e}")
            return None
    
    async def set_product(self, product_id: str, product_data: dict):
        """Cache a product"""
        if not self.is_connected():
            return
        try:
            await self.redis.setex(
                f"{PREFIX_PRODUCT}{product_id}",
                PRODUCT_CACHE_TTL,
                json.dumps(product_data)
            )
            logger.debug(f"Cached product {product_id}")
        except Exception as e:
            logger.error(f"Redis set_product error: {e}")
    
    async def get_product_list(self, cache_key: str) -> Optional[dict]:
        """Get cached product list by search params"""
        if not self.is_connected():
            return None
        try:
            data = await self.redis.get(f"{PREFIX_PRODUCT_LIST}{cache_key}")
            if data:
                logger.debug(f"Cache HIT: product list {cache_key[:30]}...")
                return json.loads(data)
            logger.debug(f"Cache MISS: product list {cache_key[:30]}...")
            return None
        except Exception as e:
            logger.error(f"Redis get_product_list error: {e}")
            return None
    
    async def set_product_list(self, cache_key: str, products_data: dict):
        """Cache a product list"""
        if not self.is_connected():
            return
        try:
            await self.redis.setex(
                f"{PREFIX_PRODUCT_LIST}{cache_key}",
                PRODUCT_LIST_CACHE_TTL,
                json.dumps(products_data)
            )
            logger.debug(f"Cached product list {cache_key[:30]}...")
        except Exception as e:
            logger.error(f"Redis set_product_list error: {e}")
    
    async def invalidate_product(self, product_id: str):
        """Invalidate a product cache"""
        if not self.is_connected():
            return
        try:
            await self.redis.delete(f"{PREFIX_PRODUCT}{product_id}")
            # Also invalidate all product lists (they might contain this product)
            keys = await self.redis.keys(f"{PREFIX_PRODUCT_LIST}*")
            if keys:
                await self.redis.delete(*keys)
            logger.debug(f"Invalidated product cache {product_id}")
        except Exception as e:
            logger.error(f"Redis invalidate_product error: {e}")
    
    @staticmethod
    def generate_product_list_key(
        query: Optional[str] = None,
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        sort_by: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> str:
        """Generate a cache key for product list queries"""
        params = f"q={query}:cat={category}:minp={min_price}:maxp={max_price}:minr={min_rating}:sort={sort_by}:p={page}:l={limit}"
        return hashlib.md5(params.encode()).hexdigest()
    
    # ============ SESSION STORAGE ============
    
    async def create_session(self, user_id: str, session_data: dict) -> str:
        """Create a new session for user"""
        if not self.is_connected():
            return ""
        try:
            session_id = hashlib.sha256(
                f"{user_id}:{datetime.now(timezone.utc).isoformat()}".encode()
            ).hexdigest()[:32]
            
            session_data["user_id"] = user_id
            session_data["created_at"] = datetime.now(timezone.utc).isoformat()
            session_data["last_activity"] = datetime.now(timezone.utc).isoformat()
            
            # Store session
            await self.redis.setex(
                f"{PREFIX_SESSION}{session_id}",
                SESSION_TTL,
                json.dumps(session_data)
            )
            
            # Store user -> session mapping (for logout all devices)
            await self.redis.sadd(f"{PREFIX_USER_SESSION}{user_id}", session_id)
            await self.redis.expire(f"{PREFIX_USER_SESSION}{user_id}", SESSION_TTL)
            
            logger.info(f"Created session {session_id[:8]}... for user {user_id[:8]}...")
            return session_id
        except Exception as e:
            logger.error(f"Redis create_session error: {e}")
            return ""
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data"""
        if not self.is_connected():
            return None
        try:
            data = await self.redis.get(f"{PREFIX_SESSION}{session_id}")
            if data:
                session = json.loads(data)
                # Update last activity
                session["last_activity"] = datetime.now(timezone.utc).isoformat()
                await self.redis.setex(
                    f"{PREFIX_SESSION}{session_id}",
                    SESSION_TTL,
                    json.dumps(session)
                )
                return session
            return None
        except Exception as e:
            logger.error(f"Redis get_session error: {e}")
            return None
    
    async def delete_session(self, session_id: str, user_id: Optional[str] = None):
        """Delete a session"""
        if not self.is_connected():
            return
        try:
            # Get user_id from session if not provided
            if not user_id:
                session = await self.get_session(session_id)
                if session:
                    user_id = session.get("user_id")
            
            await self.redis.delete(f"{PREFIX_SESSION}{session_id}")
            
            if user_id:
                await self.redis.srem(f"{PREFIX_USER_SESSION}{user_id}", session_id)
            
            logger.info(f"Deleted session {session_id[:8]}...")
        except Exception as e:
            logger.error(f"Redis delete_session error: {e}")
    
    async def delete_all_user_sessions(self, user_id: str):
        """Delete all sessions for a user (logout from all devices)"""
        if not self.is_connected():
            return
        try:
            session_ids = await self.redis.smembers(f"{PREFIX_USER_SESSION}{user_id}")
            for session_id in session_ids:
                await self.redis.delete(f"{PREFIX_SESSION}{session_id}")
            await self.redis.delete(f"{PREFIX_USER_SESSION}{user_id}")
            logger.info(f"Deleted all sessions for user {user_id[:8]}...")
        except Exception as e:
            logger.error(f"Redis delete_all_user_sessions error: {e}")
    
    async def get_active_sessions_count(self, user_id: str) -> int:
        """Get count of active sessions for a user"""
        if not self.is_connected():
            return 0
        try:
            return await self.redis.scard(f"{PREFIX_USER_SESSION}{user_id}")
        except Exception as e:
            logger.error(f"Redis get_active_sessions_count error: {e}")
            return 0
    
    # ============ RATE LIMITING ============
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit: Optional[int] = None,
        window: int = RATE_LIMIT_WINDOW
    ) -> tuple[bool, int, int]:
        """
        Check if request is within rate limit.
        Returns: (allowed: bool, remaining: int, reset_time: int)
        """
        if not self.is_connected():
            return True, limit or DEFAULT_RATE_LIMIT, window
        
        if limit is None:
            limit = DEFAULT_RATE_LIMIT
        
        try:
            key = f"{PREFIX_RATE_LIMIT}{identifier}"
            current_time = int(datetime.now(timezone.utc).timestamp())
            window_start = current_time - window
            
            # Use sorted set for sliding window rate limiting
            pipe = self.redis.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            # Count current requests in window
            pipe.zcard(key)
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            # Set expiry
            pipe.expire(key, window)
            
            results = await pipe.execute()
            current_count = results[1]
            
            allowed = current_count < limit
            remaining = max(0, limit - current_count - 1) if allowed else 0
            
            # Calculate reset time
            oldest = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                reset_time = int(oldest[0][1]) + window - current_time
            else:
                reset_time = window
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {identifier}")
            
            return allowed, remaining, reset_time
        except Exception as e:
            logger.error(f"Redis rate_limit error: {e}")
            return True, limit, window
    
    async def get_rate_limit_status(self, identifier: str, limit: int = DEFAULT_RATE_LIMIT) -> dict:
        """Get current rate limit status for an identifier"""
        if not self.is_connected():
            return {"limit": limit, "remaining": limit, "reset": 0}
        
        try:
            key = f"{PREFIX_RATE_LIMIT}{identifier}"
            current_time = int(datetime.now(timezone.utc).timestamp())
            window_start = current_time - RATE_LIMIT_WINDOW
            
            # Clean and count
            await self.redis.zremrangebyscore(key, 0, window_start)
            current_count = await self.redis.zcard(key)
            
            remaining = max(0, limit - current_count)
            
            oldest = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                reset_time = int(oldest[0][1]) + RATE_LIMIT_WINDOW - current_time
            else:
                reset_time = RATE_LIMIT_WINDOW
            
            return {
                "limit": limit,
                "remaining": remaining,
                "reset": max(0, reset_time),
                "used": current_count
            }
        except Exception as e:
            logger.error(f"Redis get_rate_limit_status error: {e}")
            return {"limit": limit, "remaining": limit, "reset": 0, "used": 0}
    
    # ============ CACHE STATS ============
    
    async def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        if not self.is_connected():
            return {"connected": False}
        
        try:
            info = await self.redis.info("stats")
            memory = await self.redis.info("memory")
            
            product_keys = await self.redis.keys(f"{PREFIX_PRODUCT}*")
            product_list_keys = await self.redis.keys(f"{PREFIX_PRODUCT_LIST}*")
            session_keys = await self.redis.keys(f"{PREFIX_SESSION}*")
            rate_limit_keys = await self.redis.keys(f"{PREFIX_RATE_LIMIT}*")
            
            return {
                "connected": True,
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "memory_used": memory.get("used_memory_human", "0B"),
                "cached_products": len(product_keys),
                "cached_product_lists": len(product_list_keys),
                "active_sessions": len(session_keys),
                "rate_limit_entries": len(rate_limit_keys)
            }
        except Exception as e:
            logger.error(f"Redis get_cache_stats error: {e}")
            return {"connected": True, "error": str(e)}


# Global cache instance
cache = RedisCache()
