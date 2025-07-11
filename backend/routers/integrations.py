from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import logging

from database import get_db, User, UserToken
from services.google_service import GoogleService
from services.jira_service import JiraService
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import verify_token

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials if credentials else None
        logging.info(f"[integrations] Received token: {token}")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")
        payload = verify_token(token)
        logging.info(f"[integrations] Token payload: {payload}")
        return payload
    except Exception as e:
        logging.error(f"[integrations] Token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

router = APIRouter()

class IntegrationStatus(BaseModel):
    service: str
    connected: bool
    last_sync: str = None
    error: str = None

@router.get("/status")
async def get_integration_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[IntegrationStatus]:
    """Get status of all integrations"""
    if not current_user:
        logging.error("[integrations] current_user is None")
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        logging.error(f"[integrations] User not found for sub: {current_user.get('sub')}")
        raise HTTPException(status_code=404, detail="User not found")
    
    statuses = []
    
    # Check Google integration
    google_token = db.query(UserToken).filter(
        UserToken.user_id == user.id,
        UserToken.service == "google"
    ).first()
    
    google_status = IntegrationStatus(
        service="google",
        connected=bool(google_token and google_token.access_token),
        last_sync=google_token.created_at.isoformat() if google_token else None
    )
    statuses.append(google_status)
    
    # Check JIRA integration
    try:
        jira_service = JiraService()
        jira_connected = jira_service.test_connection()
        jira_status = IntegrationStatus(
            service="jira",
            connected=jira_connected,
            last_sync=datetime.now().isoformat() if jira_connected else None
        )
    except Exception as e:
        jira_status = IntegrationStatus(
            service="jira",
            connected=False,
            error=str(e)
        )
    
    statuses.append(jira_status)
    
    return statuses

@router.get("/google/data")
async def get_google_data(
    service: str,  # 'gmail', 'calendar', 'drive'
    current_user: dict = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Fetch data from Google services"""
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    google_token = db.query(UserToken).filter(
        UserToken.user_id == user.id,
        UserToken.service == "google"
    ).first()
    
    if not google_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    
    google_service = GoogleService()
    
    # Refresh token if needed
    if google_token.expires_at and google_token.expires_at < datetime.now():
        if google_token.refresh_token:
            new_tokens = google_service.refresh_access_token(google_token.refresh_token)
            google_token.access_token = new_tokens["access_token"]
            google_token.expires_at = new_tokens["expires_at"]
            db.commit()
        else:
            raise HTTPException(status_code=401, detail="Token expired, re-authentication required")
    
    try:
        if service == "gmail":
            data = google_service.get_gmail_messages(google_token.access_token)
        elif service == "calendar":
            data = google_service.get_calendar_events(google_token.access_token)
        elif service == "drive":
            data = google_service.get_drive_files(google_token.access_token)
        else:
            raise HTTPException(status_code=400, detail="Invalid service")
        
        return {"service": service, "data": data}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch {service} data: {str(e)}"
        )

@router.get("/jira/data")
async def get_jira_data(
    data_type: str = "issues",  # 'issues', 'projects'
    current_user: dict = Depends(lambda: None)
):
    """Fetch data from JIRA"""
    try:
        jira_service = JiraService()
        
        if data_type == "issues":
            data = jira_service.get_user_issues()
        elif data_type == "projects":
            data = jira_service.get_projects()
        else:
            raise HTTPException(status_code=400, detail="Invalid data type")
        
        return {"data_type": data_type, "data": data}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch JIRA {data_type}: {str(e)}"
        )

@router.post("/google/disconnect")
async def disconnect_google(
    current_user: dict = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Disconnect Google integration"""
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    google_token = db.query(UserToken).filter(
        UserToken.user_id == user.id,
        UserToken.service == "google"
    ).first()
    
    if google_token:
        db.delete(google_token)
        db.commit()
    
    return {"message": "Google integration disconnected"}

@router.get("/sync")
async def sync_all_integrations(
    current_user: dict = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Sync data from all connected integrations"""
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    sync_results = {}
    
    # Sync Google data
    google_token = db.query(UserToken).filter(
        UserToken.user_id == user.id,
        UserToken.service == "google"
    ).first()
    
    if google_token:
        try:
            google_service = GoogleService()
            
            # Refresh token if needed
            if google_token.expires_at and google_token.expires_at < datetime.now():
                if google_token.refresh_token:
                    new_tokens = google_service.refresh_access_token(google_token.refresh_token)
                    google_token.access_token = new_tokens["access_token"]
                    google_token.expires_at = new_tokens["expires_at"]
                    db.commit()
            
            emails = google_service.get_gmail_messages(google_token.access_token, max_results=5)
            events = google_service.get_calendar_events(google_token.access_token, days_ahead=3)
            files = google_service.get_drive_files(google_token.access_token, max_results=5)
            
            sync_results["google"] = {
                "status": "success",
                "emails": len(emails),
                "events": len(events),
                "files": len(files)
            }
        except Exception as e:
            sync_results["google"] = {"status": "error", "error": str(e)}
    else:
        sync_results["google"] = {"status": "not_connected"}
    
    # Sync JIRA data
    try:
        jira_service = JiraService()
        if jira_service.test_connection():
            issues = jira_service.get_user_issues(max_results=10)
            sync_results["jira"] = {
                "status": "success",
                "issues": len(issues)
            }
        else:
            sync_results["jira"] = {"status": "connection_failed"}
    except Exception as e:
        sync_results["jira"] = {"status": "error", "error": str(e)}
    
    return {"sync_results": sync_results, "timestamp": datetime.now().isoformat()}