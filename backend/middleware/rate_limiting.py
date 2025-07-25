from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import time
from collections import defaultdict
from typing import Dict, List
import asyncio

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.limits = {
            "chat": {"requests": 10, "window": 60},  # 10 requests per minute
            "auth": {"requests": 5, "window": 300},   # 5 requests per 5 minutes
            "integrations": {"requests": 20, "window": 60}  # 20 requests per minute
        }
    
    def is_allowed(self, client_ip: str, endpoint_type: str) -> bool:
        now = time.time()
        limit_config = self.limits.get(endpoint_type, {"requests": 100, "window": 60})
        
        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < limit_config["window"]
        ]
        
        # Check if limit exceeded
        if len(self.requests[client_ip]) >= limit_config["requests"]:
            return False
        
        # Add current request
        self.requests[client_ip].append(now)
        return True

rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    path = request.url.path
    
    # Determine endpoint type
    endpoint_type = "default"
    if "/chat" in path:
        endpoint_type = "chat"
    elif "/auth" in path:
        endpoint_type = "auth"
    elif "/integrations" in path:
        endpoint_type = "integrations"
    
    if not rate_limiter.is_allowed(client_ip, endpoint_type):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."}
        )
    
    response = await call_next(request)
    return response