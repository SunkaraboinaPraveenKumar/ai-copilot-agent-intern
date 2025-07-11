# AI Copilot Backend

FastAPI backend with Google Suite and JIRA integration, powered by Groq LLaMA for intelligent task management.

## Features

- **Google Suite Integration**: Gmail, Calendar, Drive access via OAuth 2.0
- **JIRA Integration**: Issue tracking and project management
- **AI Chat Interface**: Groq LLaMA-powered conversational AI
- **Task Management**: Unified view across all platforms
- **Real-time Context**: AI responses include live data from integrations
- **Conversation Memory**: Persistent chat history per user

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

#### LLM Configuration
- `GROQ_API_KEY`: Get from [Groq Console](https://console.groq.com/)

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: Gmail, Calendar, Drive
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:8000/auth/google/callback`
6. Set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

#### JIRA Configuration
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create API token
3. Set:
   - `JIRA_SERVER`: https://your-domain.atlassian.net
   - `JIRA_EMAIL`: your-email@example.com
   - `JIRA_API_TOKEN`: your-api-token

#### Security
- `SECRET_KEY`: Generate with `openssl rand -hex 32`

### 3. Database Setup

The app uses SQLite by default. Tables are created automatically on startup.

For production, update `DATABASE_URL` to PostgreSQL:
```
DATABASE_URL=postgresql://user:password@localhost/copilot
```

### 4. Run Development Server

```bash
python run.py
```

Server runs on `http://localhost:8000`

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/token` - Exchange token for user info
- `POST /auth/logout` - Logout

### Chat
- `POST /chat/` - Send chat message
- `GET /chat/conversations` - Get conversation history
- `GET /chat/conversations/{thread_id}/messages` - Get conversation messages

### Integrations
- `GET /integrations/status` - Get integration status
- `GET /integrations/google/data` - Fetch Google data
- `GET /integrations/jira/data` - Fetch JIRA data
- `POST /integrations/google/disconnect` - Disconnect Google
- `GET /integrations/sync` - Sync all integrations

### Tasks
- `GET /tasks/summary` - Get task summary
- `GET /tasks/analysis` - Get AI task analysis
- `GET /tasks/weekly-summary` - Get weekly summary
- `GET /tasks/all` - Get all tasks

## Architecture

### Services
- **GoogleService**: Handles OAuth and API calls to Google services
- **JiraService**: Manages JIRA REST API interactions
- **LLMService**: Groq LLaMA integration with conversation memory
- **AuthService**: JWT token management

### Database Models
- **User**: User profiles and authentication
- **UserToken**: OAuth tokens for external services
- **Conversation**: Chat conversation threads
- **Message**: Individual chat messages

### LLM Integration
- Uses LangChain + LangGraph for conversation flow
- Context-aware responses using live data
- Conversation memory with token limit management
- Groq LLaMA 3.3 70B model for high-quality responses

## Deployment

### Local Development
```bash
python run.py
```

### Production (Docker)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production
- Set all required environment variables
- Use PostgreSQL for database
- Configure Redis for session storage
- Set up proper CORS origins

## Security Considerations

- OAuth tokens are encrypted in database
- JWT tokens for API authentication
- CORS configured for frontend domain
- Rate limiting recommended for production
- HTTPS required for OAuth callbacks

## Troubleshooting

### Google OAuth Issues
- Verify redirect URI matches exactly
- Check API quotas in Google Console
- Ensure required scopes are enabled

### JIRA Connection Issues
- Verify API token is valid
- Check JIRA server URL format
- Ensure user has required permissions

### LLM Issues
- Verify Groq API key is valid
- Check API quotas and rate limits
- Monitor token usage for context trimming

## Development

### Adding New Integrations
1. Create service class in `services/`
2. Add database models if needed
3. Create router in `routers/`
4. Update context gathering in chat service

### Testing
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## License

MIT License - see LICENSE file for details.