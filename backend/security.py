"""
Production security helpers: headers, auth rate limits, and config validation.
"""
import logging
import os
import time
from collections import defaultdict
from typing import Dict, List, Tuple

from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

IS_PRODUCTION = os.environ.get("ENV", "development").lower() == "production"
DEFAULT_JWT_SECRET = "pricewise-secret-key-2024"

AUTH_RATE_LIMIT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
}
AUTH_RATE_LIMIT = int(os.environ.get("AUTH_RATE_LIMIT", "10"))
AUTH_RATE_WINDOW = int(os.environ.get("AUTH_RATE_WINDOW", "900"))  # 15 minutes

FALLBACK_RATE_LIMIT = int(os.environ.get("FALLBACK_RATE_LIMIT", "60"))
FALLBACK_RATE_WINDOW = int(os.environ.get("FALLBACK_RATE_WINDOW", "60"))


def validate_startup_config(jwt_secret: str) -> None:
    """Fail fast when production is misconfigured."""
    if IS_PRODUCTION and (not jwt_secret or jwt_secret == DEFAULT_JWT_SECRET):
        raise RuntimeError(
            "JWT_SECRET must be set to a strong random value in production"
        )


def get_allowed_origins() -> List[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if IS_PRODUCTION:
        return [origin for origin in origins if origin != "*"]
    return origins or ["*"]


def get_allowed_hosts() -> List[str]:
    raw = os.environ.get("ALLOWED_HOSTS", "")
    hosts = [host.strip() for host in raw.split(",") if host.strip()]
    if hosts:
        return hosts
    if IS_PRODUCTION:
        return ["api.instabooks.digital", "*.up.railway.app"]
    return ["*"]


def allow_public_registration() -> bool:
    default = "false" if IS_PRODUCTION else "true"
    value = os.environ.get("ALLOW_PUBLIC_REGISTRATION", default)
    return value.lower() in ("1", "true", "yes")


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(char.isalpha() for char in password) or not any(char.isdigit() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one letter and one number",
        )


class InMemoryRateLimiter:
    """Sliding-window rate limiter used when Redis is unavailable."""

    def __init__(self) -> None:
        self._events: Dict[str, List[float]] = defaultdict(list)

    def check(self, identifier: str, limit: int, window: int) -> Tuple[bool, int, int]:
        now = time.time()
        window_start = now - window
        events = [timestamp for timestamp in self._events[identifier] if timestamp > window_start]
        allowed = len(events) < limit
        if allowed:
            events.append(now)
        self._events[identifier] = events
        remaining = max(0, limit - len(events)) if allowed else 0
        reset_time = int(window - (now - events[0])) if events else window
        return allowed, remaining, max(1, reset_time)


auth_rate_limiter = InMemoryRateLimiter()
fallback_rate_limiter = InMemoryRateLimiter()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "0"
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Always-on brute-force protection for authentication endpoints."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path not in AUTH_RATE_LIMIT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        identifier = f"auth:{client_ip}:{request.url.path}"
        allowed, remaining, reset_time = auth_rate_limiter.check(
            identifier, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW
        )

        if not allowed:
            return Response(
                content='{"detail":"Too many authentication attempts. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(reset_time),
                    "X-RateLimit-Limit": str(AUTH_RATE_LIMIT),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(AUTH_RATE_LIMIT)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        return response
