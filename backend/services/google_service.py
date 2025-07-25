import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json
from dotenv import load_dotenv

load_dotenv()

class GoogleService:
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid',
            'https://www.googleapis.com/auth/presentations.readonly',
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/forms.responses.readonly'
        ]

    def get_authorization_url(self) -> str:
        """Generate Google OAuth authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        return authorization_url

    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "expires_at": credentials.expiry
        }

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        
        credentials.refresh(Request())
        
        return {
            "access_token": credentials.token,
            "expires_at": credentials.expiry
        }

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user profile information"""
        credentials = Credentials(token=access_token)
        service = build('oauth2', 'v2', credentials=credentials)
        
        try:
            user_info = service.userinfo().get().execute()
            return user_info
        except HttpError as error:
            raise Exception(f"Failed to get user info: {error}")

    def get_gmail_messages(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent Gmail messages"""
        credentials = Credentials(token=access_token)
        service = build('gmail', 'v1', credentials=credentials)
        
        try:
            # Get message IDs
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q='is:unread'
            ).execute()
            
            messages = results.get('messages', [])
            
            # Get message details
            detailed_messages = []
            for message in messages:
                msg = service.users().messages().get(
                    userId='me',
                    id=message['id'],
                    format='full'
                ).execute()
                
                # Extract relevant information
                headers = msg['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                
                # Get message body
                body = self._extract_message_body(msg['payload'])
                
                detailed_messages.append({
                    'id': msg['id'],
                    'subject': subject,
                    'sender': sender,
                    'date': date,
                    'body': body[:500] + '...' if len(body) > 500 else body,
                    'unread': 'UNREAD' in msg.get('labelIds', [])
                })
            
            return detailed_messages
            
        except HttpError as error:
            raise Exception(f"Failed to fetch Gmail messages: {error}")

    def get_calendar_events(self, access_token: str, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """Fetch upcoming calendar events"""
        credentials = Credentials(token=access_token)
        service = build('calendar', 'v3', credentials=credentials)
        
        try:
            # Calculate time range
            now = datetime.utcnow()
            time_min = now.isoformat() + 'Z'
            time_max = (now + timedelta(days=days_ahead)).isoformat() + 'Z'
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                maxResults=20,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            formatted_events = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                
                formatted_events.append({
                    'id': event['id'],
                    'title': event.get('summary', 'No Title'),
                    'description': event.get('description', ''),
                    'start': start,
                    'end': end,
                    'location': event.get('location', ''),
                    'attendees': [attendee.get('email') for attendee in event.get('attendees', [])]
                })
            
            return formatted_events
            
        except HttpError as error:
            raise Exception(f"Failed to fetch calendar events: {error}")

    def get_drive_files(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent Google Drive files"""
        credentials = Credentials(token=access_token)
        service = build('drive', 'v3', credentials=credentials)
        
        try:
            results = service.files().list(
                pageSize=max_results,
                orderBy='modifiedTime desc',
                fields="files(id,name,mimeType,modifiedTime,webViewLink,size)"
            ).execute()
            
            files = results.get('files', [])
            
            formatted_files = []
            for file in files:
                formatted_files.append({
                    'id': file['id'],
                    'name': file['name'],
                    'type': file['mimeType'],
                    'modified': file['modifiedTime'],
                    'link': file['webViewLink'],
                    'size': file.get('size', '0')
                })
            
            return formatted_files
            
        except HttpError as error:
            raise Exception(f"Failed to fetch Drive files: {error}")

    def get_sheets_files(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent Google Sheets files"""
        try:
            credentials = Credentials(token=access_token)
            service = build('drive', 'v3', credentials=credentials)
            
            # First verify we can access the Drive API
            about = service.about().get(fields="user").execute()
            if not about:
                raise Exception("Failed to verify Drive API access")
            
            # Then fetch sheets files
            results = service.files().list(
                pageSize=max_results,
                orderBy='modifiedTime desc',
                q="mimeType='application/vnd.google-apps.spreadsheet'",
                fields="files(id,name,mimeType,modifiedTime,webViewLink,size,permissions)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            files = results.get('files', [])
            if not files:
                return []  # Return empty list instead of raising exception for no files
                
            formatted_files = []
            for file in files:
                formatted_files.append({
                    'id': file['id'],
                    'name': file['name'],
                    'type': file['mimeType'],
                    'modified': file['modifiedTime'],
                    'link': file['webViewLink'],
                    'size': file.get('size', '0'),
                    'accessible': True  # If we can see it, we can access it
                })
            return formatted_files
            
        except HttpError as error:
            if error.resp.status == 403:
                raise Exception("Access denied. Please check your Google Sheets permissions.")
            elif error.resp.status == 401:
                raise Exception("Authentication failed. Please reconnect your Google account.")
            else:
                raise Exception(f"Failed to fetch Sheets files: {str(error)}")
        except Exception as e:
            raise Exception(f"Unexpected error fetching Sheets files: {str(e)}")

    def get_slides_files(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent Google Slides files"""
        credentials = Credentials(token=access_token)
        service = build('drive', 'v3', credentials=credentials)
        try:
            results = service.files().list(
                pageSize=max_results,
                orderBy='modifiedTime desc',
                q="mimeType='application/vnd.google-apps.presentation'",
                fields="files(id,name,mimeType,modifiedTime,webViewLink,size)"
            ).execute()
            files = results.get('files', [])
            formatted_files = []
            for file in files:
                formatted_files.append({
                    'id': file['id'],
                    'name': file['name'],
                    'type': file['mimeType'],
                    'modified': file['modifiedTime'],
                    'link': file['webViewLink'],
                    'size': file.get('size', '0')
                })
            return formatted_files
        except HttpError as error:
            raise Exception(f"Failed to fetch Slides files: {error}")

    def get_forms_files(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent Google Forms (responses)"""
        credentials = Credentials(token=access_token)
        service = build('drive', 'v3', credentials=credentials)
        try:
            results = service.files().list(
                pageSize=max_results,
                orderBy='modifiedTime desc',
                q="mimeType='application/vnd.google-apps.form'",
                fields="files(id,name,mimeType,modifiedTime,webViewLink,size)"
            ).execute()
            files = results.get('files', [])
            formatted_files = []
            for file in files:
                formatted_files.append({
                    'id': file['id'],
                    'name': file['name'],
                    'type': file['mimeType'],
                    'modified': file['modifiedTime'],
                    'link': file['webViewLink'],
                    'size': file.get('size', '0')
                })
            return formatted_files
        except HttpError as error:
            raise Exception(f"Failed to fetch Forms files: {error}")

    def _extract_message_body(self, payload: Dict[str, Any]) -> str:
        """Extract text body from Gmail message payload"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body']['data']
                    body = self._decode_base64(data)
                    break
        elif payload['mimeType'] == 'text/plain':
            data = payload['body']['data']
            body = self._decode_base64(data)
        
        return body

    def _decode_base64(self, data: str) -> str:
        """Decode base64 encoded string"""
        import base64
        return base64.urlsafe_b64decode(data).decode('utf-8')