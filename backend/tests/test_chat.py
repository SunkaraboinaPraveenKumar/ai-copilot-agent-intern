import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestChat:
    @patch('services.auth_service.verify_token')
    @patch('services.llm_service.LLMService')
    def test_chat_endpoint(self, mock_llm_service, mock_verify_token):
        """Test chat endpoint with valid authentication"""
        # Mock authentication
        mock_verify_token.return_value = {"sub": "1", "email": "test@example.com"}
        
        # Mock LLM service
        mock_llm = MagicMock()
        mock_llm.chat.return_value = "Hello! How can I help you today?"
        mock_llm_service.return_value = mock_llm
        
        headers = {"Authorization": "Bearer test_token"}
        payload = {
            "messages": [{"role": "user", "content": "Hello"}],
            "include_context": True
        }
        
        response = client.post("/chat/", json=payload, headers=headers)
        assert response.status_code == 200
        assert "message" in response.json()
        assert "thread_id" in response.json()
    
    def test_chat_unauthorized(self):
        """Test chat endpoint without authentication"""
        payload = {
            "messages": [{"role": "user", "content": "Hello"}]
        }
        
        response = client.post("/chat/", json=payload)
        assert response.status_code == 401
    
    @patch('services.auth_service.verify_token')
    def test_get_conversations(self, mock_verify_token):
        """Test getting conversation history"""
        mock_verify_token.return_value = {"sub": "1", "email": "test@example.com"}
        
        headers = {"Authorization": "Bearer test_token"}
        response = client.get("/chat/conversations", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)