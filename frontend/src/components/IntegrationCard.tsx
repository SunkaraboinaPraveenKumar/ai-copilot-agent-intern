import React, { useState } from 'react';
import { DivideIcon as LucideIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useIntegrations } from '../contexts/IntegrationsContext';

interface IntegrationCardProps {
  integration: {
    id: string;
    name: string;
    icon: typeof LucideIcon;
    description: string;
    connected: boolean;
  };
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const { connectIntegration, disconnectIntegration } = useIntegrations();
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    if (integration.connected) {
      disconnectIntegration(integration.id);
    } else {
      if (integration.id === 'jira') {
        setShowJiraModal(true);
      } else {
        connectIntegration(integration.id);
      }
    }
  };

  const handleJiraConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Call new API function to send credentials to backend
      await connectIntegration('jira', { domain: jiraDomain, email: jiraEmail, token: jiraToken });
      setShowJiraModal(false);
      setJiraDomain('');
      setJiraEmail('');
      setJiraToken('');
    } catch (err: any) {
      // Try to extract backend error message
      let message = 'Failed to connect Jira. Please check your credentials.';
      if (err?.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
            <integration.icon className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{integration.name}</h4>
            <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              {integration.connected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Not connected</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleToggle}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              integration.connected
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {integration.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
      {/* Jira Connect Modal */}
      {integration.id === 'jira' && showJiraModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowJiraModal(false)}>&times;</button>
            <h3 className="text-lg font-semibold mb-4">Connect to Jira</h3>
            <form onSubmit={handleJiraConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jira Domain</label>
                <input type="text" className="w-full border rounded px-3 py-2" value={jiraDomain} onChange={e => setJiraDomain(e.target.value)} placeholder="https://yourcompany.atlassian.net" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border rounded px-3 py-2" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">API Token</label>
                <input type="password" className="w-full border rounded px-3 py-2" value={jiraToken} onChange={e => setJiraToken(e.target.value)} required />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors" disabled={isSubmitting}>
                {isSubmitting ? 'Connecting...' : 'Connect'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}