import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  thread_id: string;
  context_used: boolean;
}

export interface TaskSummary {
  total_tasks: number;
  urgent_tasks: number;
  overdue_tasks: number;
  completed_this_week: number;
  upcoming_deadlines: Array<{
    title: string;
    due_date: string;
    source: string;
    priority: string;
  }>;
}

export interface IntegrationStatus {
  service: string;
  connected: boolean;
  last_sync?: string;
  error?: string;
}

// Auth API
export const authAPI = {
  initiateGoogleAuth: () => api.get('/auth/google'),
  exchangeToken: (token: string) => api.post('/auth/token', { token }),
  logout: () => api.post('/auth/logout'),
};

// Chat API
export const chatAPI = {
  sendMessage: (messages: ChatMessage[], threadId?: string, includeContext = true) =>
    api.post<ChatResponse>('/chat/', {
      messages,
      thread_id: threadId,
      include_context: includeContext,
    }),
  
  getConversations: () => api.get('/chat/conversations'),
  
  getConversationMessages: (threadId: string) =>
    api.get(`/chat/conversations/${threadId}/messages`),
};

// Integrations API
export const integrationsAPI = {
  getStatus: () => api.get<IntegrationStatus[]>('/integrations/status'),
  
  getGoogleData: (service: 'gmail' | 'calendar' | 'drive' | 'sheets' | 'slides' | 'forms') =>
    api.get(`/integrations/google/data?service=${service}`),
  
  getJiraData: (dataType: 'issues' | 'projects' = 'issues') =>
    api.get(`/integrations/jira/data?data_type=${dataType}`),
  
  disconnectGoogle: () => api.post('/integrations/google/disconnect'),
  
  syncAll: () => api.get('/integrations/sync'),

  connectJira: (credentials: { domain: string; email: string; token: string }) =>
    api.post('/integrations/jira/connect', credentials),
};

// Tasks API
export const tasksAPI = {
  getSummary: () => api.get<TaskSummary>('/tasks/summary'),
  
  getAnalysis: () => api.get('/tasks/analysis'),
  
  getWeeklySummary: () => api.get('/tasks/weekly-summary'),
  
  getAllTasks: () => api.get('/tasks/all'),
};

export default api;