import logging
import sys
from datetime import datetime
from fastapi import Request
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path} from {request.client.host}")
    
    response = await call_next(request)
    
    # Log response
    process_time = (datetime.now() - start_time).total_seconds()
    logger.info(f"Response: {response.status_code} in {process_time:.3f}s")
    
    return response

def log_error(error: Exception, context: str = ""):
    logger.error(f"Error in {context}: {str(error)}", exc_info=True)

def log_user_action(user_id: str, action: str, details: dict = None):
    log_data = {
        "user_id": user_id,
        "action": action,
        "timestamp": datetime.now().isoformat(),
        "details": details or {}
    }
    logger.info(f"User Action: {json.dumps(log_data)}")