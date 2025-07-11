import os
from typing import List, Dict, Any
from jira import JIRA
from jira.exceptions import JIRAError
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

class JiraService:
    def __init__(self):
        self.server = os.getenv("JIRA_SERVER")
        self.email = os.getenv("JIRA_EMAIL")
        self.api_token = os.getenv("JIRA_API_TOKEN")
        
        if not all([self.server, self.email, self.api_token]):
            raise ValueError("JIRA configuration is incomplete")
        
        self.auth = HTTPBasicAuth(self.email, self.api_token)
        self.base_url = f"{self.server}/rest/api/3"

    def test_connection(self) -> bool:
        """Test JIRA connection"""
        try:
            response = requests.get(
                f"{self.base_url}/myself",
                auth=self.auth,
                timeout=10
            )
            return response.status_code == 200
        except Exception:
            return False

    def get_user_issues(self, username: str = None, max_results: int = 20) -> List[Dict[str, Any]]:
        """Get issues assigned to the user"""
        try:
            if not username:
                # Get current user
                user_response = requests.get(
                    f"{self.base_url}/myself",
                    auth=self.auth
                )
                if user_response.status_code == 200:
                    username = user_response.json().get('accountId')
                else:
                    raise Exception("Failed to get current user")

            # JQL query for user's issues
            jql = f'assignee = "{username}" AND status != Done ORDER BY updated DESC'
            
            payload = {
                'jql': jql,
                'maxResults': max_results,
                'fields': [
                    'key', 'summary', 'status', 'priority', 'assignee',
                    'reporter', 'created', 'updated', 'duedate',
                    'description', 'project', 'issuetype'
                ]
            }
            
            response = requests.post(
                f"{self.base_url}/search",
                json=payload,
                auth=self.auth
            )
            
            if response.status_code != 200:
                raise Exception(f"JIRA API error: {response.status_code}")
            
            data = response.json()
            issues = data.get('issues', [])
            
            formatted_issues = []
            for issue in issues:
                fields = issue['fields']
                
                formatted_issues.append({
                    'key': issue['key'],
                    'id': issue['id'],
                    'summary': fields.get('summary', ''),
                    'description': fields.get('description', {}).get('content', [{}])[0].get('content', [{}])[0].get('text', '') if fields.get('description') else '',
                    'status': fields.get('status', {}).get('name', ''),
                    'priority': fields.get('priority', {}).get('name', 'None'),
                    'assignee': fields.get('assignee', {}).get('displayName', 'Unassigned') if fields.get('assignee') else 'Unassigned',
                    'reporter': fields.get('reporter', {}).get('displayName', 'Unknown') if fields.get('reporter') else 'Unknown',
                    'project': fields.get('project', {}).get('name', ''),
                    'issue_type': fields.get('issuetype', {}).get('name', ''),
                    'created': fields.get('created', ''),
                    'updated': fields.get('updated', ''),
                    'due_date': fields.get('duedate', ''),
                    'url': f"{self.server}/browse/{issue['key']}"
                })
            
            return formatted_issues
            
        except Exception as error:
            raise Exception(f"Failed to fetch JIRA issues: {str(error)}")

    def get_project_issues(self, project_key: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """Get issues from a specific project"""
        try:
            jql = f'project = "{project_key}" ORDER BY updated DESC'
            
            payload = {
                'jql': jql,
                'maxResults': max_results,
                'fields': [
                    'key', 'summary', 'status', 'priority', 'assignee',
                    'created', 'updated', 'duedate', 'project'
                ]
            }
            
            response = requests.post(
                f"{self.base_url}/search",
                json=payload,
                auth=self.auth
            )
            
            if response.status_code != 200:
                raise Exception(f"JIRA API error: {response.status_code}")
            
            data = response.json()
            return self._format_issues(data.get('issues', []))
            
        except Exception as error:
            raise Exception(f"Failed to fetch project issues: {str(error)}")

    def search_issues(self, jql: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """Search issues using JQL"""
        try:
            payload = {
                'jql': jql,
                'maxResults': max_results,
                'fields': [
                    'key', 'summary', 'status', 'priority', 'assignee',
                    'created', 'updated', 'duedate', 'project'
                ]
            }
            
            response = requests.post(
                f"{self.base_url}/search",
                json=payload,
                auth=self.auth
            )
            
            if response.status_code != 200:
                raise Exception(f"JIRA API error: {response.status_code}")
            
            data = response.json()
            return self._format_issues(data.get('issues', []))
            
        except Exception as error:
            raise Exception(f"Failed to search JIRA issues: {str(error)}")

    def get_projects(self) -> List[Dict[str, Any]]:
        """Get available projects"""
        try:
            response = requests.get(
                f"{self.base_url}/project",
                auth=self.auth
            )
            
            if response.status_code != 200:
                raise Exception(f"JIRA API error: {response.status_code}")
            
            projects = response.json()
            
            formatted_projects = []
            for project in projects:
                formatted_projects.append({
                    'id': project['id'],
                    'key': project['key'],
                    'name': project['name'],
                    'description': project.get('description', ''),
                    'lead': project.get('lead', {}).get('displayName', 'Unknown'),
                    'url': project.get('self', '')
                })
            
            return formatted_projects
            
        except Exception as error:
            raise Exception(f"Failed to fetch JIRA projects: {str(error)}")

    def _format_issues(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format issues for consistent output"""
        formatted_issues = []
        for issue in issues:
            fields = issue['fields']
            
            formatted_issues.append({
                'key': issue['key'],
                'id': issue['id'],
                'summary': fields.get('summary', ''),
                'status': fields.get('status', {}).get('name', ''),
                'priority': fields.get('priority', {}).get('name', 'None'),
                'assignee': fields.get('assignee', {}).get('displayName', 'Unassigned') if fields.get('assignee') else 'Unassigned',
                'project': fields.get('project', {}).get('name', ''),
                'created': fields.get('created', ''),
                'updated': fields.get('updated', ''),
                'due_date': fields.get('duedate', ''),
                'url': f"{self.server}/browse/{issue['key']}"
            })
        
        return formatted_issues