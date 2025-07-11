import React from 'react';
import { DivideIcon as LucideIcon, CheckCircle, AlertCircle, Settings } from 'lucide-react';
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

  const handleToggle = () => {
    if (integration.connected) {
      disconnectIntegration(integration.id);
    } else {
      connectIntegration(integration.id);
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
    </div>
  );
}