from fastapi import APIRouter
from sqlalchemy import text
from database import SessionLocal
from services.google_service import GoogleService
from services.jira_service import JiraService
from services.llm_service import LLMService
import os
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {}
    }
    
    # Database check
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["services"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["services"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # LLM service check
    try:
        if os.getenv("GROQ_API_KEY"):
            health_status["services"]["llm"] = {"status": "configured"}
        else:
            health_status["services"]["llm"] = {"status": "not_configured"}
    except Exception as e:
        health_status["services"]["llm"] = {"status": "error", "error": str(e)}
    
    # Google integration check
    try:
        google_configured = all([
            os.getenv("GOOGLE_CLIENT_ID"),
            os.getenv("GOOGLE_CLIENT_SECRET")
        ])
        health_status["services"]["google"] = {
            "status": "configured" if google_configured else "not_configured"
        }
    except Exception as e:
        health_status["services"]["google"] = {"status": "error", "error": str(e)}
    
    # JIRA integration check
    try:
        jira_configured = all([
            os.getenv("JIRA_SERVER"),
            os.getenv("JIRA_EMAIL"),
            os.getenv("JIRA_API_TOKEN")
        ])
        health_status["services"]["jira"] = {
            "status": "configured" if jira_configured else "not_configured"
        }
    except Exception as e:
        health_status["services"]["jira"] = {"status": "error", "error": str(e)}
    
    return health_status

@router.get("/health/live")
async def liveness_check():
    """Simple liveness check for load balancers"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}

@router.get("/health/ready")
async def readiness_check():
    """Readiness check for deployments"""
    try:
        # Check if essential services are ready
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        return {"status": "ready", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}, 503