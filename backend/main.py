from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging

from routers import auth, chat, integrations, tasks
from database import engine, Base
from services.auth_service import verify_token
from middleware.rate_limiting import rate_limit_middleware
from middleware.logging import log_requests
from middleware.security import security_middleware
from utils.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
    api_error_handler,
    APIError
)
from utils.health_check import router as health_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="AI Copilot Backend",
    description="AI-powered copilot for managing tasks, emails, and projects",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# Add middleware (order matters!)
app.add_middleware(BaseHTTPMiddleware, dispatch=security_middleware)
# app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)
app.add_middleware(BaseHTTPMiddleware, dispatch=log_requests)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Security
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    try:
        token = credentials.credentials if credentials else None
        logging.info(f"Received token: {token}")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        payload = verify_token(token)
        logging.info(f"Token payload: {payload}")
        return payload
    except Exception as e:
        logging.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(chat.router, prefix="/chat", tags=["chat"], dependencies=[Depends(get_current_user)])
app.include_router(integrations.router, prefix="/integrations", tags=["integrations"], dependencies=[Depends(get_current_user)])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"], dependencies=[Depends(get_current_user)])

@app.get("/")
async def root():
    return {
        "message": "AI Copilot Backend API", 
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "disabled"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)