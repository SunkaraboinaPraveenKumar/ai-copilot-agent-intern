from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from datetime import datetime
import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import get_db, User, Conversation, Message, UserToken
from services.llm_service import LLMService
from services.google_service import GoogleService
from services.jira_service import JiraService
from services.auth_service import verify_token

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials if credentials else None
        logging.info(f"[chat] Received token: {token}")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")
        payload = verify_token(token)
        logging.info(f"[chat] Token payload: {payload}")
        return payload
    except Exception as e:
        logging.error(f"[chat] Token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    thread_id: Optional[str] = None
    include_context: bool = True

class ChatResponse(BaseModel):
    message: str
    thread_id: str
    context_used: bool

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Main chat endpoint"""
    try:
        if not current_user:
            logging.error("[chat] current_user is None")
            raise HTTPException(status_code=401, detail="Not authenticated")
        # Get user from database
        user = db.query(User).filter(User.id == int(current_user["sub"])).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate thread_id if not provided
        thread_id = request.thread_id or f"user_{user.id}_{int(datetime.now().timestamp())}"
        
        # Get or create conversation
        conversation = db.query(Conversation).filter(
            Conversation.thread_id == thread_id
        ).first()
        
        if not conversation:
            conversation = Conversation(
                user_id=user.id,
                thread_id=thread_id,
                title=request.messages[0].content[:50] + "..." if request.messages else "New Chat"
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Store user message
        if request.messages:
            user_message = Message(
                conversation_id=conversation.id,
                content=request.messages[-1].content,
                role="user"
            )
            db.add(user_message)
            db.commit()
        
        # Gather context from integrations if requested
        context = {}
        context_used = False
        
        if request.include_context:
            context = await _gather_user_context(user, db)
            context_used = bool(context)
        
        # Initialize LLM service
        llm_service = LLMService()
        
        # Convert messages to dict format
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Add logging before LLM call
        logging.info(f"[chat] messages_dict: {messages_dict}")
        logging.info(f"[chat] context: {context}")
        logging.info(f"[chat] thread_id: {thread_id}")

        # Get AI response
        ai_response = await llm_service.chat(
            messages=messages_dict,
            thread_id=thread_id,
            context=context
        )
        
        # Store AI response
        ai_message = Message(
            conversation_id=conversation.id,
            content=ai_response,
            role="assistant",
            message_metadata=json.dumps({"context_used": context_used}) if context_used else None
        )
        db.add(ai_message)
        db.commit()
        
        return ChatResponse(
            message=ai_response,
            thread_id=thread_id,
            context_used=context_used
        )
        
    except Exception as e:
        logging.error(f"[chat] Exception: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )

@router.get("/conversations")
async def get_conversations(
    current_user: dict = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Get user's conversation history"""
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conversations = db.query(Conversation).filter(
        Conversation.user_id == user.id
    ).order_by(Conversation.updated_at.desc()).limit(20).all()
    
    return [
        {
            "id": conv.id,
            "thread_id": conv.thread_id,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at
        }
        for conv in conversations
    ]

@router.get("/conversations/{thread_id}/messages")
async def get_conversation_messages(
    thread_id: str,
    current_user: dict = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Get messages from a specific conversation"""
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conversation = db.query(Conversation).filter(
        Conversation.thread_id == thread_id,
        Conversation.user_id == user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.asc()).all()
    
    return [
        {
            "id": msg.id,
            "content": msg.content,
            "role": msg.role,
            "created_at": msg.created_at,
            "metadata": json.loads(msg.message_metadata) if msg.message_metadata else None
        }
        for msg in messages
    ]

async def _gather_user_context(user: User, db: Session) -> Dict[str, Any]:
    """Gather context from user's integrated services"""
    context = {}
    
    try:
        # Get user's Google token
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
            
            # Fetch Gmail messages
            try:
                emails = google_service.get_gmail_messages(google_token.access_token, max_results=10)
                context["emails"] = emails
            except Exception as e:
                print(f"Failed to fetch emails: {e}")
            
            # Fetch Calendar events
            try:
                events = google_service.get_calendar_events(google_token.access_token, days_ahead=7)
                context["events"] = events
            except Exception as e:
                print(f"Failed to fetch calendar events: {e}")
            
            # Fetch Drive files
            try:
                files = google_service.get_drive_files(google_token.access_token, max_results=10)
                context["files"] = files
            except Exception as e:
                print(f"Failed to fetch drive files: {e}")
        
        # Get JIRA issues
        try:
            jira_service = JiraService()
            if jira_service.test_connection():
                issues = jira_service.get_user_issues(max_results=15)
                context["issues"] = issues
        except Exception as e:
            print(f"Failed to fetch JIRA issues: {e}")
    
    except Exception as e:
        print(f"Error gathering context: {e}")
    
    return context