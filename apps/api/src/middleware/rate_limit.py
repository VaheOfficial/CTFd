from fastapi import HTTPException, status
from typing import Callable, Any
import redis
import os
from datetime import datetime, timedelta
from ..utils.logging import get_logger

logger = get_logger(__name__)

class RateLimiter:
    def __init__(self):
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.logger = get_logger(__name__)

    def _get_redis(self) -> redis.Redis:
        return redis.from_url(self.redis_url)

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> bool:
        """Check if the rate limit has been exceeded"""
        try:
            r = self._get_redis()
            pipe = r.pipeline()
            
            now = datetime.utcnow().timestamp()
            window_start = now - window_seconds
            
            # Remove old entries
            pipe.zremrangebyscore(key, '-inf', window_start)
            # Add current request
            pipe.zadd(key, {str(now): now})
            # Count requests in window
            pipe.zcard(key)
            # Set expiry on key
            pipe.expire(key, window_seconds)
            
            _, _, count, _ = pipe.execute()
            
            self.logger.info(
                "Rate limit check",
                key=key,
                count=count,
                max_requests=max_requests,
                window_seconds=window_seconds
            )
            
            return count <= max_requests
            
        except Exception as e:
            self.logger.error("Rate limit check failed", error=str(e))
            # If Redis fails, allow the request
            return True

def create_rate_limiter(
    max_requests: int,
    window_seconds: int = 60,
    key_prefix: str = "rate_limit"
) -> Callable:
    """Create a rate limiter decorator"""
    rate_limiter = RateLimiter()
    
    async def rate_limit_decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs) -> Any:
            # Get user ID from kwargs
            user = kwargs.get('current_user')
            if not user:
                return await func(*args, **kwargs)
            
            key = f"{key_prefix}:{user.id}"
            
            if not await rate_limiter.check_rate_limit(key, max_requests, window_seconds):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds."
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    
    return rate_limit_decorator
