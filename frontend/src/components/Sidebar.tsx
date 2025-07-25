import { useState } from 'react';
import { X, Calendar, Mail, FileText, GitBranch, Settings, LogOut, Shield, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIntegrations } from '../contexts/IntegrationsContext';
import { IntegrationCard } from './IntegrationCard';
import { TaskSummary } from './TaskSummary';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { integrations } = useIntegrations();
  const [activeTab, setActiveTab] = useState<'integrations' | 'tasks' | 'settings'>('integrations');

  const googleIntegrations = [
    { id: 'gmail', name: 'Gmail', icon: Mail, description: 'Access your emails and notifications', connected: integrations.gmail },
    { id: 'calendar', name: 'Calendar', icon: Calendar, description: 'Manage your schedule and events', connected: integrations.calendar },
    { id: 'drive', name: 'Google Drive', icon: FileText, description: 'Access your documents and files', connected: integrations.drive },
    { id: 'forms', name: 'Google Forms', icon: FileText, description: 'Access and manage your forms', connected: integrations.forms },
    { id: 'slides', name: 'Google Slides', icon: FileText, description: 'View and manage presentations', connected: integrations.slides },
    { id: 'sheets', name: 'Google Sheets', icon: FileText, description: 'Work with spreadsheets', connected: integrations.sheets },
  ];

  const jiraIntegrations = [
    { id: 'jira', name: 'JIRA', icon: GitBranch, description: 'Track your issues and projects', connected: integrations.jira },
    { id: 'confluence', name: 'Confluence', icon: FileText, description: 'Access your team documentation', connected: integrations.confluence },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'integrations', label: 'Integrations', icon: Activity },
          { id: 'tasks', label: 'Tasks', icon: GitBranch },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4 mx-auto mb-1" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'integrations' && (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Google Suite</h3>
              <div className="space-y-2">
                {googleIntegrations.map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Atlassian</h3>
              <div className="space-y-2">
                {jiraIntegrations.map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-4">
            <TaskSummary />
          </div>
        )}

        {/* {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">AI Model</h3>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Llama 3.3 70B (Groq)</option>
                <option>GPT-4o Mini</option>
                <option>Claude 3.5 Sonnet</option>
              </select>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Response Style</h3>
              <div className="space-y-2">
                {['Concise', 'Detailed', 'Casual', 'Professional'].map((style) => (
                  <label key={style} className="flex items-center">
                    <input
                      type="radio"
                      name="style"
                      value={style.toLowerCase()}
                      className="mr-2"
                    />
                    {style}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Notifications</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  Task deadline reminders
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  Email notifications
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Weekly summaries
                </label>
              </div>
            </div>
          </div>
        )} */}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}