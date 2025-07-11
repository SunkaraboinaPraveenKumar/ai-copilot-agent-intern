import { Calendar, Mail, GitBranch, FileText, Clock, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (action: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const actions = [
    {
      icon: Calendar,
      label: 'Show my schedule',
      action: 'What\'s on my calendar for today?',
      color: 'bg-blue-500',
    },
    {
      icon: Mail,
      label: 'Check emails',
      action: 'Show me my unread emails',
      color: 'bg-green-500',
    },
    {
      icon: GitBranch,
      label: 'JIRA tasks',
      action: 'What are my assigned JIRA tickets?',
      color: 'bg-purple-500',
    },
    {
      icon: Clock,
      label: 'Deadlines',
      action: 'What tasks are due this week?',
      color: 'bg-red-500',
    },
    {
      icon: TrendingUp,
      label: 'Weekly summary',
      action: 'Give me a summary of this week\'s progress',
      color: 'bg-yellow-500',
    },
    {
      icon: FileText,
      label: 'Recent documents',
      action: 'Show me my recent Google Drive files',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onActionClick(action.action)}
          className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
        >
          <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
            <action.icon className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-900 text-center">{action.label}</span>
        </button>
      ))}
    </div>
  );
}