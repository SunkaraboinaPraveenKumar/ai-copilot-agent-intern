from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import verify_token

from database import get_db, User, UserToken, JiraCredential
from services.google_service import GoogleService
from services.jira_service import JiraService
from services.llm_service import LLMService

router = APIRouter()

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials if credentials else None
        logging.info(f"[tasks] Received token: {token}")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")
        payload = verify_token(token)
        logging.info(f"[tasks] Token payload: {payload}")
        return payload
    except Exception as e:
        logging.error(f"[tasks] Token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

class TaskSummary(BaseModel):
    total_tasks: int
    urgent_tasks: int
    overdue_tasks: int
    completed_this_week: int
    upcoming_deadlines: List[Dict[str, Any]]

class TaskAnalysis(BaseModel):
    priority_tasks: List[Dict[str, Any]]
    upcoming_deadlines: List[Dict[str, Any]]
    overdue_items: List[Dict[str, Any]]
    recommendations: List[str]
    time_blocks: List[Dict[str, Any]]

@router.get("/summary", response_model=TaskSummary)
async def get_task_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive task summary"""
    if not current_user:
        logging.error("[tasks] current_user is None")
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        logging.error(f"[tasks] User not found for sub: {current_user.get('sub')}")
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Gather data from all sources
        all_tasks = await _gather_all_tasks(user, db)
        
        # Calculate summary metrics
        total_tasks = len(all_tasks)
        urgent_tasks = len([t for t in all_tasks if t.get('priority') == 'high' or t.get('urgent', False)])
        
        # Check for overdue tasks
        now = datetime.now()
        overdue_tasks = 0
        upcoming_deadlines = []
        
        for task in all_tasks:
            due_date_str = task.get('due_date') or task.get('start') or task.get('end')
            if due_date_str:
                try:
                    # Parse various date formats
                    if 'T' in due_date_str:
                        due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                    else:
                        due_date = datetime.fromisoformat(due_date_str)
                    
                    if due_date < now:
                        overdue_tasks += 1
                    elif due_date < now + timedelta(days=7):
                        upcoming_deadlines.append({
                            'title': task.get('title') or task.get('summary', 'Untitled'),
                            'due_date': due_date_str,
                            'source': task.get('source'),
                            'priority': task.get('priority', 'medium')
                        })
                except:
                    continue
        
        # Sort upcoming deadlines by date
        upcoming_deadlines.sort(key=lambda x: x['due_date'])
        
        # Calculate tasks completed this week
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        completed_this_week = len([
            t for t in all_tasks 
            if t.get('status', '').lower() in ['done', 'completed', 'resolved', 'closed'] 
            and t.get('completed_date') 
            and datetime.fromisoformat(t.get('completed_date').replace('Z', '+00:00')) >= week_start
        ])
        
        return TaskSummary(
            total_tasks=total_tasks,
            urgent_tasks=urgent_tasks,
            overdue_tasks=overdue_tasks,
            completed_this_week=completed_this_week,
            upcoming_deadlines=upcoming_deadlines[:10]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate task summary: {str(e)}"
        )

@router.get("/analysis", response_model=TaskAnalysis)
async def get_task_analysis(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        logging.error("[tasks] current_user is None")
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        logging.error(f"[tasks] User not found for sub: {current_user.get('sub')}")
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Gather data from all sources
        emails, events, issues = await _gather_raw_data(user, db)
        
        # Use LLM to analyze tasks
        llm_service = LLMService()
        analysis = llm_service.analyze_tasks(emails, events, issues)
        
        # Structure the response
        if isinstance(analysis, dict):
            return TaskAnalysis(
                priority_tasks=analysis.get('priority_tasks', []),
                upcoming_deadlines=analysis.get('upcoming_deadlines', []),
                overdue_items=analysis.get('overdue_items', []),
                recommendations=analysis.get('recommendations', []),
                time_blocks=analysis.get('time_blocks', [])
            )
        else:
            # Fallback if LLM returns text
            return TaskAnalysis(
                priority_tasks=[],
                upcoming_deadlines=[],
                overdue_items=[],
                recommendations=[analysis],
                time_blocks=[]
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze tasks: {str(e)}"
        )

@router.get("/weekly-summary")
async def get_weekly_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        logging.error("[tasks] current_user is None")
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        logging.error(f"[tasks] User not found for sub: {current_user.get('sub')}")
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Gather data from all sources
        emails, events, issues = await _gather_raw_data(user, db)
        
        # Generate summary using LLM
        llm_service = LLMService()
        summary = llm_service.summarize_week(emails, events, issues)
        
        return {
            "summary": summary,
            "generated_at": datetime.now().isoformat(),
            "data_sources": {
                "emails": len(emails),
                "events": len(events),
                "issues": len(issues)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate weekly summary: {str(e)}"
        )

@router.get("/all")
async def get_all_tasks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        logging.error("[tasks] current_user is None")
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        logging.error(f"[tasks] User not found for sub: {current_user.get('sub')}")
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        tasks = await _gather_all_tasks(user, db)
        return {"tasks": tasks, "total": len(tasks)}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tasks: {str(e)}"
        )

async def _gather_all_tasks(user: User, db: Session) -> List[Dict[str, Any]]:
    """Gather tasks from all integrated sources"""
    all_tasks = []
    
    # Get Google data
    google_token = db.query(UserToken).filter(
        UserToken.user_id == user.id,
        UserToken.service == "google"
    ).first()
    
    if google_token:
        google_service = GoogleService()
        
        # Refresh token if needed
        if google_token.expires_at and google_token.expires_at < datetime.now():
            if google_token.refresh_token:
                new_tokens = google_service.refresh_access_token(google_token.refresh_token)
                google_token.access_token = new_tokens["access_token"]
                google_token.expires_at = new_tokens["expires_at"]
                db.commit()
        
        try:
            # Calendar events as tasks
            events = google_service.get_calendar_events(google_token.access_token, days_ahead=14)
            for event in events:
                # For events that have ended, use end date as completion date
                now = datetime.now()
                event_end = datetime.fromisoformat(event['end'].replace('Z', '+00:00')) if 'end' in event else None
                completed_date = event_end.isoformat() if event_end and event_end < now else None
                
                all_tasks.append({
                    'id': event['id'],
                    'title': event['title'],
                    'description': event['description'],
                    'start': event['start'],
                    'end': event['end'],
                    'source': 'calendar',
                    'type': 'event',
                    'urgent': 'urgent' in event['title'].lower() or 'asap' in event['title'].lower(),
                    'status': 'completed' if completed_date else 'pending',
                    'completed_date': completed_date
                })
        except Exception as e:
            print(f"Failed to fetch calendar events: {e}")
    
    # Get JIRA issues
    try:
        jira_cred = db.query(JiraCredential).filter(JiraCredential.user_id == user.id).first()
        if jira_cred:
            jira_service = JiraService(jira_cred.domain, jira_cred.email, jira_cred.api_token)
            if jira_service.test_connection():
                issues = jira_service.get_user_issues(max_results=50)
                for issue in issues:
                    priority_map = {'Highest': 'high', 'High': 'high', 'Medium': 'medium', 'Low': 'low', 'Lowest': 'low'}
                    status = issue['status'].lower()
                    completed_date = issue.get('resolution_date') if status in ['done', 'completed', 'resolved', 'closed'] else None
                    
                    all_tasks.append({
                        'id': issue['key'],
                        'title': issue['summary'],
                        'description': issue['description'],
                        'status': status,
                        'priority': priority_map.get(issue['priority'], 'medium'),
                        'due_date': issue['due_date'],
                        'source': 'jira',
                        'type': 'issue',
                        'project': issue['project'],
                        'url': issue['url'],
                        'completed_date': completed_date
                    })
    except Exception as e:
        print(f"Failed to fetch JIRA issues: {e}")
    
    return all_tasks

async def _gather_raw_data(user: User, db: Session):
    """Gather raw data from all sources for LLM processing"""
    emails, events, issues = [], [], []
    
    # Get Google data
    google_token = db.query(UserToken).filter(
        UserToken.user_id == user.id,
        UserToken.service == "google"
    ).first()
    
    if google_token:
        google_service = GoogleService()
        
        # Refresh token if needed
        if google_token.expires_at and google_token.expires_at < datetime.now():
            if google_token.refresh_token:
                new_tokens = google_service.refresh_access_token(google_token.refresh_token)
                google_token.access_token = new_tokens["access_token"]
                google_token.expires_at = new_tokens["expires_at"]
                db.commit()
        
        try:
            emails = google_service.get_gmail_messages(google_token.access_token, max_results=20)
            events = google_service.get_calendar_events(google_token.access_token, days_ahead=14)
        except Exception as e:
            print(f"Failed to fetch Google data: {e}")
    
    # Get JIRA issues
    try:
        jira_cred = db.query(JiraCredential).filter(JiraCredential.user_id == user.id).first()
        if jira_cred:
            jira_service = JiraService(jira_cred.domain, jira_cred.email, jira_cred.api_token)
            if jira_service.test_connection():
                issues = jira_service.get_user_issues(max_results=30)
    except Exception as e:
        print(f"Failed to fetch JIRA issues: {e}")
    
    return emails, events, issues