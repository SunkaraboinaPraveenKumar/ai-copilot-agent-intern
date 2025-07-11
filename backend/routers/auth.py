from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import timedelta
import os

from database import get_db, User, UserToken
from services.auth_service import create_access_token
from services.google_service import GoogleService

router = APIRouter()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class TokenRequest(BaseModel):
    token: str

@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    google_service = GoogleService()
    auth_url = google_service.get_authorization_url()
    return RedirectResponse(auth_url)

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        google_service = GoogleService()
        
        # Exchange code for tokens
        tokens = google_service.exchange_code_for_tokens(code)
        
        # Get user info
        user_info = google_service.get_user_info(tokens["access_token"])
        
        # Find or create user
        user = db.query(User).filter(User.google_id == user_info["id"]).first()
        if not user:
            user = User(
                email=user_info["email"],
                name=user_info["name"],
                google_id=user_info["id"]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Store/update Google tokens
        google_token = db.query(UserToken).filter(
            UserToken.user_id == user.id,
            UserToken.service == "google"
        ).first()
        
        if google_token:
            google_token.access_token = tokens["access_token"]
            google_token.refresh_token = tokens.get("refresh_token")
            google_token.expires_at = tokens["expires_at"]
        else:
            google_token = UserToken(
                user_id=user.id,
                service="google",
                access_token=tokens["access_token"],
                refresh_token=tokens.get("refresh_token"),
                expires_at=tokens["expires_at"]
            )
            db.add(google_token)
        
        db.commit()
        
        # Create JWT token
        access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")))
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        # Redirect to frontend with token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?token={access_token}"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/token", response_model=TokenResponse)
async def get_token(data: TokenRequest, db: Session = Depends(get_db)):
    """Exchange token for user info (for frontend)"""
    try:
        from services.auth_service import verify_token
        token = data.token
        payload = verify_token(token)
        
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "name": user.name
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}