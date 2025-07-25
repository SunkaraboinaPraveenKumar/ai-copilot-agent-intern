import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestAuth:
    def test_google_auth_endpoint(self):
        """Test Google OAuth initiation"""
        response = client.get("/auth/google")
        assert response.status_code == 200
        assert "auth_url" in response.json()
    
    @patch('services.google_service.GoogleService')
    def test_google_callback_success(self, mock_google_service):
        """Test successful Google OAuth callback"""
        # Mock Google service
        mock_service = MagicMock()
        mock_service.exchange_code_for_tokens.return_value = {
            "access_token": "test_token",
            "refresh_token": "refresh_token",
            "expires_at": "2024-12-31T23:59:59"
        }
        mock_service.get_user_info.return_value = {
            "id": "123",
            "email": "test@example.com",
            "name": "Test User"
        }
        mock_google_service.return_value = mock_service
        
        response = client.get("/auth/google/callback?code=test_code")
        assert response.status_code == 200
    
    def test_token_exchange_invalid(self):
        """Test token exchange with invalid token"""
        response = client.post("/auth/token", json={"token": "invalid_token"})
        assert response.status_code == 401
    
    def test_logout(self):
        """Test logout endpoint"""
        response = client.post("/auth/logout")
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"