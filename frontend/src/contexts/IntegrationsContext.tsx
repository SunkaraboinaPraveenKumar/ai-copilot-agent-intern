import React, { createContext, useContext, useState, useEffect } from 'react';
import { integrationsAPI, IntegrationStatus } from '../services/api';

interface Integrations {
  gmail: boolean;
  calendar: boolean;
  drive: boolean;
  forms: boolean;
  slides: boolean;
  sheets: boolean;
  jira: boolean;
  confluence: boolean;
}

interface GoogleServiceData {
  forms: any[];
  slides: any[];
  sheets: any[];
  gmail: any[];
  calendar: any[];
  drive: any[];
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
  googleData: GoogleServiceData;
  fetchJiraIssues: () => Promise<void>;
  fetchJiraProjects: () => Promise<void>;
  fetchGoogleService: (service: keyof GoogleServiceData) => Promise<void>;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const [integrations, setIntegrations] = useState<Integrations>({
    gmail: false,
    calendar: false,
    drive: false,
    forms: false,
    slides: false,
    sheets: false,
    jira: false,
    confluence: false,
  });
  
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jiraIssues, setJiraIssues] = useState<any[]>([]);
  const [jiraProjects, setJiraProjects] = useState<any[]>([]);
  const [googleData, setGoogleData] = useState<GoogleServiceData>({
    forms: [],
    slides: [],
    sheets: [],
    gmail: [],
    calendar: [],
    drive: [],
  });

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
        forms: false,
        slides: false,
        sheets: false,
        jira: false,
        confluence: false,
      };

      response.data.forEach(status => {
        if (status.service === 'google' && status.connected) {
          newIntegrations.gmail = true;
          newIntegrations.calendar = true;
          newIntegrations.drive = true;
          newIntegrations.forms = true;
          newIntegrations.slides = true;
          newIntegrations.sheets = true;
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
    if (['gmail', 'calendar', 'drive', 'forms', 'slides', 'sheets'].includes(id)) {
      try {
        await integrationsAPI.getGoogleData(id as keyof GoogleServiceData);
        await refreshStatus();
      } catch (error) {
        console.log('Google auth required');
      }
    } else if (id === 'jira' && credentials) {
      await integrationsAPI.connectJira(credentials);
      await refreshStatus();
    } else {
      setIntegrations(prev => ({ ...prev, [id]: true }));
    }
  };

  const disconnectIntegration = async (id: string) => {
    if (['gmail', 'calendar', 'drive', 'forms', 'slides', 'sheets'].includes(id)) {
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

  const fetchGoogleService = async (service: keyof GoogleServiceData) => {
    setIsLoading(true);
    try {
      const response = await integrationsAPI.getGoogleData(service);
      setGoogleData(prev => ({
        ...prev,
        [service]: response?.data?.data || []
      }));
      console.log(`Fetched ${service} data:`, response?.data?.data);
    } catch (error) {
      console.error(`Failed to fetch Google ${service} data:`, error);
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
      googleData,
      fetchJiraIssues,
      fetchJiraProjects,
      fetchGoogleService
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