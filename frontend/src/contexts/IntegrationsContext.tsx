import React, { createContext, useContext, useState, useEffect } from 'react';
import { integrationsAPI, IntegrationStatus } from '../services/api';

interface Integrations {
  gmail: boolean;
  calendar: boolean;
  drive: boolean;
  jira: boolean;
  confluence: boolean;
  sheets?: boolean;
  slides?: boolean;
  forms?: boolean;
}

interface IntegrationsContextType {
  integrations: Integrations;
  integrationStatus: IntegrationStatus[];
  connectIntegration: (id: string, credentials?: { domain: string; email: string; token: string }) => Promise<void>;
  disconnectIntegration: (id: string) => void;
  refreshStatus: () => Promise<void>;
  syncAll: () => Promise<void>;
  isLoading: boolean;
  jiraIssues: any[];
  jiraProjects: any[];
  fetchJiraIssues: () => Promise<void>;
  fetchJiraProjects: () => Promise<void>;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const [integrations, setIntegrations] = useState<Integrations>({
    gmail: false,
    calendar: false,
    drive: false,
    jira: false,
    confluence: false,
    sheets: false,
    slides: false,
    forms: false,
  });
  
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jiraIssues, setJiraIssues] = useState<any[]>([]);
  const [jiraProjects, setJiraProjects] = useState<any[]>([]);

  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const response = await integrationsAPI.getStatus();
      setIntegrationStatus(response.data);
      
      // Update integrations state based on status
      const newIntegrations: Integrations = {
        gmail: false,
        calendar: false,
        drive: false,
        jira: false,
        confluence: false,
        sheets: false,
        slides: false,
        forms: false,
      };

      response.data.forEach(status => {
        if (status.service === 'google' && status.connected) {
          newIntegrations.gmail = true;
          newIntegrations.calendar = true;
          newIntegrations.drive = true;
          newIntegrations.sheets = true;
          newIntegrations.slides = true;
          newIntegrations.forms = true;
        } else if (status.service === 'jira' && status.connected) {
          newIntegrations.jira = true;
          newIntegrations.confluence = true; // Assume confluence if JIRA is connected
        }
      });

      setIntegrations(newIntegrations);
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectIntegration = async (id: string, credentials?: { domain: string; email: string; token: string }) => {
    if (id === 'gmail' || id === 'calendar' || id === 'drive') {
      // Redirect to Google OAuth
      try {
        const response = await integrationsAPI.getGoogleData('gmail'); // This will trigger auth if needed
        await refreshStatus();
      } catch (error) {
        // If auth is needed, the API will handle the redirect
        console.log('Google auth required');
      }
    } else if (id === 'jira' && credentials) {
      // Send credentials to backend
      await integrationsAPI.connectJira(credentials);
      await refreshStatus();
    } else {
      // For other integrations, just update local state
      setIntegrations(prev => ({ ...prev, [id]: true }));
    }
  };

  const disconnectIntegration = async (id: string) => {
    if (id === 'gmail' || id === 'calendar' || id === 'drive') {
      try {
        await integrationsAPI.disconnectGoogle();
        await refreshStatus();
      } catch (error) {
        console.error('Failed to disconnect Google:', error);
      }
    } else {
      setIntegrations(prev => ({ ...prev, [id]: false }));
    }
  };

  const syncAll = async () => {
    setIsLoading(true);
    try {
      await integrationsAPI.syncAll();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to sync integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJiraIssues = async () => {
    setIsLoading(true);
    try {
      const response = await integrationsAPI.getJiraData('issues');
      setJiraIssues(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch Jira issues:', error);
      setJiraIssues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJiraProjects = async () => {
    setIsLoading(true);
    try {
      const response = await integrationsAPI.getJiraData('projects');
      setJiraProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch Jira projects:', error);
      setJiraProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IntegrationsContext.Provider value={{ 
      integrations, 
      integrationStatus,
      connectIntegration, 
      disconnectIntegration,
      refreshStatus,
      syncAll,
      isLoading,
      jiraIssues,
      jiraProjects,
      fetchJiraIssues,
      fetchJiraProjects
    }}>
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  const context = useContext(IntegrationsContext);
  if (context === undefined) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider');
  }
  return context;
}