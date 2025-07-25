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
            'https://www.googleapis.com/auth/forms.responses.readonly',
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/presentations.readonly',
            'openid'
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
            include_granted_scopes='true'
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

    def get_calendar_events(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Get user's Google Calendar events"""
        try:
            credentials = Credentials(access_token)
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get the upcoming events
            now = datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
            events_result = service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=max_results,
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
                    'summary': event.get('summary', 'No Title'),
                    'description': event.get('description', ''),
                    'start': start,
                    'end': end,
                    'location': event.get('location', ''),
                    'attendees': [
                        {'email': attendee.get('email'), 'name': attendee.get('displayName')}
                        for attendee in event.get('attendees', [])
                    ],
                    'hangoutLink': event.get('hangoutLink', ''),
                    'status': event.get('status', ''),
                    'html_link': event.get('htmlLink', '')
                })
            
            return formatted_events
            
        except HttpError as error:
            print(f"Error accessing Google Calendar: {error}")
            raise error

    def get_files(self, access_token: str, max_results: int = 30) -> List[Dict[str, Any]]:
        """Get user's Google Drive files"""
        try:
            credentials = Credentials(access_token)
            service = build('drive', 'v3', credentials=credentials)
            
            # Call the Drive v3 API
            results = service.files().list(
                pageSize=max_results,
                fields="files(id, name, mimeType, createdTime, modifiedTime, webViewLink, size, parents, shared)",
                orderBy="modifiedTime desc"
            ).execute()
            
            files = results.get('files', [])
            formatted_files = []
            
            for file in files:
                formatted_files.append({
                    'id': file.get('id'),
                    'name': file.get('name'),
                    'type': file.get('mimeType'),
                    'created_time': file.get('createdTime'),
                    'modified_time': file.get('modifiedTime'),
                    'url': file.get('webViewLink'),
                    'size': file.get('size'),
                    'shared': file.get('shared', False),
                    'parents': file.get('parents', [])
                })
            
            return formatted_files
            
        except HttpError as error:
            print(f"Error accessing Google Drive: {error}")
            raise error

    def get_emails(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Get user's Gmail messages"""
        try:
            credentials = Credentials(access_token)
            service = build('gmail', 'v1', credentials=credentials)
            
            # Get list of messages
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q='is:unread'  # Only get unread messages
            ).execute()
            
            messages = results.get('messages', [])
            formatted_emails = []
            
            for msg in messages:
                # Get full message details
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                
                # Extract headers
                headers = message['payload']['headers']
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
                from_email = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown Sender')
                date = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')
                
                # Extract message body
                body = ''
                if 'parts' in message['payload']:
                    for part in message['payload']['parts']:
                        if part['mimeType'] == 'text/plain':
                            if 'data' in part['body']:
                                body = self._decode_base64(part['body']['data'])
                            elif 'attachmentId' in part['body']:
                                attachment = service.users().messages().attachments().get(
                                    userId='me',
                                    messageId=msg['id'],
                                    id=part['body']['attachmentId']
                                ).execute()
                                if 'data' in attachment:
                                    body = self._decode_base64(attachment['data'])
                elif 'body' in message['payload'] and 'data' in message['payload']['body']:
                    body = self._decode_base64(message['payload']['body']['data'])
                
                formatted_emails.append({
                    'id': msg['id'],
                    'threadId': message['threadId'],
                    'subject': subject,
                    'from': from_email,
                    'date': date,
                    'snippet': message.get('snippet', ''),
                    'body': body,
                    'labels': message['labelIds']
                })
            
            return formatted_emails
            
        except HttpError as error:
            print(f"Error accessing Gmail: {error}")
            raise error

    def get_form_responses(self, access_token: str, form_id: str) -> List[Dict[str, Any]]:
        """Get responses for a specific Google Form"""
        try:
            credentials = Credentials(access_token)
            service = build('forms', 'v1', credentials=credentials)
            
            # Get form responses
            responses = service.forms().responses().list(formId=form_id).execute()
            
            formatted_responses = []
            for response in responses.get('responses', []):
                answer_data = {}
                for answer in response.get('answers', {}).values():
                    if 'textAnswers' in answer:
                        answer_data[answer.get('questionId', '')] = answer['textAnswers'].get('answers', [{}])[0].get('value', '')
                    elif 'choiceAnswers' in answer:
                        answer_data[answer.get('questionId', '')] = [choice.get('value', '') for choice in answer['choiceAnswers'].get('answers', [])]
                
                formatted_responses.append({
                    'response_id': response.get('responseId', ''),
                    'created_time': response.get('createTime', ''),
                    'last_modified': response.get('lastSubmittedTime', ''),
                    'answers': answer_data
                })
            
            return formatted_responses
            
        except HttpError as error:
            print(f"Error accessing Form responses: {error}")
            raise error

    def get_forms(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Get user's Google Forms"""
        try:
            credentials = Credentials(access_token)
            service = build('forms', 'v1', credentials=credentials)
            
            # List forms owned by the user
            forms = service.forms().list(pageSize=max_results).execute()
            
            formatted_forms = []
            for form in forms.get('forms', []):
                try:
                    # Get detailed form info
                    form_details = service.forms().get(formId=form['formId']).execute()
                    formatted_forms.append({
                        'id': form['formId'],
                        'title': form_details.get('info', {}).get('title', 'Untitled Form'),
                        'description': form_details.get('info', {}).get('description', ''),
                        'url': form_details.get('responderUri', ''),
                        'created_time': form_details.get('info', {}).get('createdTime', ''),
                        'modified_time': form_details.get('info', {}).get('modifiedTime', ''),
                        'response_count': form_details.get('responseCount', 0)
                    })
                except Exception as e:
                    print(f"Error getting form details: {e}")
                    continue
            
            return formatted_forms
            
        except HttpError as error:
            print(f"Error accessing Google Forms: {error}")
            raise error

    def get_slides(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Get user's Google Slides presentations"""
        try:
            credentials = Credentials(access_token)
            drive_service = build('drive', 'v3', credentials=credentials)
            slides_service = build('slides', 'v1', credentials=credentials)
            
            # Search for Google Slides files
            results = drive_service.files().list(
                q="mimeType='application/vnd.google-apps.presentation'",
                pageSize=max_results,
                fields="files(id, name, description, createdTime, modifiedTime, webViewLink)"
            ).execute()
            
            presentations = []
            for item in results.get('files', []):
                try:
                    # Get presentation details
                    presentation = slides_service.presentations().get(
                        presentationId=item['id']
                    ).execute()
                    
                    presentations.append({
                        'id': item['id'],
                        'title': item['name'],
                        'description': item.get('description', ''),
                        'url': item['webViewLink'],
                        'created_time': item['createdTime'],
                        'modified_time': item['modifiedTime'],
                        'page_count': len(presentation.get('slides', [])),
                        'thumbnail_url': f"https://drive.google.com/thumbnail?id={item['id']}"
                    })
                except Exception as e:
                    print(f"Error getting presentation details: {e}")
                    continue
            
            return presentations
            
        except HttpError as error:
            print(f"Error accessing Google Slides: {error}")
            raise error

    def get_sheets(self, access_token: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Get user's Google Sheets spreadsheets"""
        try:
            credentials = Credentials(access_token)
            drive_service = build('drive', 'v3', credentials=credentials)
            sheets_service = build('sheets', 'v4', credentials=credentials)
            
            # Search for Google Sheets files
            results = drive_service.files().list(
                q="mimeType='application/vnd.google-apps.spreadsheet'",
                pageSize=max_results,
                fields="files(id, name, description, createdTime, modifiedTime, webViewLink)"
            ).execute()
            
            spreadsheets = []
            for item in results.get('files', []):
                try:
                    # Get spreadsheet details
                    spreadsheet = sheets_service.spreadsheets().get(
                        spreadsheetId=item['id']
                    ).execute()
                    
                    spreadsheets.append({
                        'id': item['id'],
                        'title': item['name'],
                        'description': item.get('description', ''),
                        'url': item['webViewLink'],
                        'created_time': item['createdTime'],
                        'modified_time': item['modifiedTime'],
                        'sheet_count': len(spreadsheet.get('sheets', [])),
                        'thumbnail_url': f"https://drive.google.com/thumbnail?id={item['id']}"
                    })
                except Exception as e:
                    print(f"Error getting spreadsheet details: {e}")
                    continue
            
            return spreadsheets
            
        except HttpError as error:
            print(f"Error accessing Google Sheets: {error}")
            raise error

    def get_sheet_data(self, access_token: str, spreadsheet_id: str, range_name: str) -> Dict[str, Any]:
        """Get data from a specific range in a Google Sheet"""
        try:
            credentials = Credentials(access_token)
            service = build('sheets', 'v4', credentials=credentials)
            
            # Get the sheet data
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return {'values': [], 'rowCount': 0, 'columnCount': 0}

            return {
                'values': values,
                'rowCount': len(values),
                'columnCount': len(values[0]) if values else 0
            }
            
        except HttpError as error:
            print(f"Error accessing Sheet data: {error}")
            raise error

    def get_slide_content(self, access_token: str, presentation_id: str) -> Dict[str, Any]:
        """Get detailed content of a Google Slides presentation"""
        try:
            credentials = Credentials(access_token)
            service = build('slides', 'v1', credentials=credentials)
            
            # Get the presentation content
            presentation = service.presentations().get(
                presentationId=presentation_id
            ).execute()
            
            slides_content = []
            for slide in presentation.get('slides', []):
                slide_content = {
                    'page_id': slide.get('objectId', ''),
                    'page_number': len(slides_content) + 1,
                    'elements': []
                }
                
                # Extract text elements from the slide
                for element in slide.get('pageElements', []):
                    if 'shape' in element and 'text' in element['shape']:
                        text_content = ''
                        for textElement in element['shape']['text'].get('textElements', []):
                            if 'textRun' in textElement:
                                text_content += textElement['textRun'].get('content', '')
                        
                        if text_content.strip():
                            slide_content['elements'].append({
                                'type': 'text',
                                'content': text_content
                            })
                
                slides_content.append(slide_content)
            
            return {
                'presentation_id': presentation_id,
                'title': presentation.get('title', ''),
                'slides': slides_content
            }
            
        except HttpError as error:
            print(f"Error accessing Slides content: {error}")
            raise error