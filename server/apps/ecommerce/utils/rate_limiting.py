from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from apps.accounts.models import User


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self._requests: Dict[int, Dict[str, Any]] = {}
    
    def check_rate_limit(self, user: User, endpoint: str) -> None:
        """Check if user has exceeded rate limit"""
        now = datetime.utcnow()
        user_key = user.id
        
        # Rate limits by subscription tier
        limits = {
            "free": {"requests_per_minute": 10, "requests_per_hour": 100},
            "starter": {"requests_per_minute": 50, "requests_per_hour": 1000},
            "pro": {"requests_per_minute": 200, "requests_per_hour": 5000},
            "enterprise": {"requests_per_minute": 1000, "requests_per_hour": 20000}
        }
        
        # Get user's subscription plan, default to free
        plan = getattr(user, 'subscription_plan', 'free')
        if plan not in limits:
            plan = 'free'
        
        user_limits = limits[plan]
        
        if user_key not in self._requests:
            self._requests[user_key] = {
                "minute_requests": [],
                "hour_requests": []
            }
        
        user_requests = self._requests[user_key]
        
        # Clean old requests
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)
        
        user_requests["minute_requests"] = [
            req_time for req_time in user_requests["minute_requests"] 
            if req_time > minute_ago
        ]
        user_requests["hour_requests"] = [
            req_time for req_time in user_requests["hour_requests"] 
            if req_time > hour_ago
        ]
        
        # Check limits
        if len(user_requests["minute_requests"]) >= user_limits["requests_per_minute"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {user_limits['requests_per_minute']} requests per minute for {plan} plan"
            )
        
        if len(user_requests["hour_requests"]) >= user_limits["requests_per_hour"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {user_limits['requests_per_hour']} requests per hour for {plan} plan"
            )
        
        # Record this request
        user_requests["minute_requests"].append(now)
        user_requests["hour_requests"].append(now)


# Global rate limiter instance
rate_limiter = RateLimiter()