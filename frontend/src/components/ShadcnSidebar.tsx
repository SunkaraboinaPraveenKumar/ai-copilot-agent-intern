import { useState } from "react";
import { 
  Calendar, 
  Mail, 
  FileText, 
  GitBranch, 
  LogOut, 
  Activity, 
  Target,
  Sparkles,
  Minimize2,
  Table,
  Presentation,
  FormInput
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useIntegrations } from "../contexts/IntegrationsContext";
import { IntegrationCard } from "./IntegrationCard";
import { TaskSummary } from "./TaskSummary";
import { TaskList } from "./TaskList";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function ShadcnSidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { integrations } = useIntegrations();
  const [activeTab, setActiveTab] = useState<'integrations' | 'tasks'>('integrations');

  const googleIntegrations = [
    { 
      id: 'gmail', 
      name: 'Gmail', 
      icon: Mail, 
      description: 'Access your emails and notifications', 
      connected: integrations.gmail,
      status: integrations.gmail ? 'Connected' : 'Disconnected',
      color: integrations.gmail ? 'text-green-600' : 'text-red-600'
    },
    { 
      id: 'calendar', 
      name: 'Calendar', 
      icon: Calendar, 
      description: 'Manage your schedule and events', 
      connected: integrations.calendar,
      status: integrations.calendar ? 'Connected' : 'Disconnected',
      color: integrations.calendar ? 'text-green-600' : 'text-red-600'
    },
    { 
      id: 'drive', 
      name: 'Google Drive', 
      icon: FileText, 
      description: 'Access your documents and files', 
      connected: integrations.drive,
      status: integrations.drive ? 'Connected' : 'Disconnected',
      color: integrations.drive ? 'text-green-600' : 'text-red-600'
    },
    {
      id: 'forms',
      name: 'Google Forms',
      icon: FormInput,
      description: 'Access your forms and responses',
      connected: integrations.forms,
      status: integrations.forms ? 'Connected' : 'Disconnected',
      color: integrations.forms ? 'text-green-600' : 'text-red-600'
    },
    {
      id: 'slides',
      name: 'Google Slides',
      icon: Presentation,
      description: 'Access your presentations',
      connected: integrations.slides,
      status: integrations.slides ? 'Connected' : 'Disconnected',
      color: integrations.slides ? 'text-green-600' : 'text-red-600'
    },
    {
      id: 'sheets',
      name: 'Google Sheets',
      icon: Table,
      description: 'Access your spreadsheets',
      connected: integrations.sheets,
      status: integrations.sheets ? 'Connected' : 'Disconnected',
      color: integrations.sheets ? 'text-green-600' : 'text-red-600'
    }
  ];

  const jiraIntegrations = [
    { 
      id: 'jira', 
      name: 'JIRA', 
      icon: GitBranch, 
      description: 'Track your issues and projects', 
      connected: integrations.jira,
      status: integrations.jira ? 'Connected' : 'Disconnected',
      color: integrations.jira ? 'text-green-600' : 'text-red-600'
    }
  ];

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 lg:static lg:inset-0 shadow-lg lg:shadow-none`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Minimize2 className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        {/* User Profile */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-lg">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{user?.name || 'User'}</h3>
              <p className="text-sm text-gray-600 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {[
            { id: 'integrations', label: 'Integrations', icon: Activity },
            { id: 'tasks', label: 'Tasks', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'integrations' | 'tasks')}
                className={`flex-1 flex flex-col items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 mb-1" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                  Google Suite
                </h3>
                <div className="space-y-2">
                  {googleIntegrations.map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <GitBranch className="h-4 w-4 mr-2 text-purple-500" />
                  Atlassian
                </h3>
                <div className="space-y-2">
                  {jiraIntegrations.map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'tasks' && (
            <>
              <TaskSummary />
              <div className="mt-6">
                <TaskList />
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShadcnSidebar;