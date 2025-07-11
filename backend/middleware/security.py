from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import re
from typing import List

class SecurityMiddleware:
    def __init__(self):
        self.blocked_patterns = [
            r'<script.*?>.*?</script>',  # XSS
            r'javascript:',              # XSS
            r'on\w+\s*=',               # Event handlers
            r'union\s+select',          # SQL injection
            r'drop\s+table',            # SQL injection
            r'insert\s+into',           # SQL injection
        ]
        self.max_request_size = 10 * 1024 * 1024  # 10MB
    
    def sanitize_input(self, text: str) -> str:
        """Basic input sanitization"""
        if not isinstance(text, str):
            return text
        
        # Remove potentially dangerous patterns
        for pattern in self.blocked_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def validate_request_size(self, request: Request) -> bool:
        """Check request size"""
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > self.max_request_size:
            return False
        return True

security = SecurityMiddleware()

async def security_middleware(request: Request, call_next):
    # Check request size
    if not security.validate_request_size(request):
        return JSONResponse(
            status_code=413,
            content={"detail": "Request too large"}
        )
    
    # Add security headers to response
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response