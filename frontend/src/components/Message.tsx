import { Bot, User, Calendar, Mail, GitBranch, Clock, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: {
    id: string;
    content: string;
    type: 'user' | 'assistant';
    timestamp: Date;
    attachments?: Array<{
      type: 'calendar' | 'email' | 'task';
      title: string;
      description: string;
      status?: string;
      dueDate?: string;
    }>;
  };
}

export function Message({ message }: MessageProps) {
  const isAssistant = message.type === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`flex space-x-3 max-w-[80%] ${isAssistant ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
            : 'bg-gradient-to-r from-green-400 to-blue-500'
        }`}>
          {isAssistant ? (
            <Bot className="h-4 w-4 text-white" />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`${isAssistant ? 'bg-gray-50' : 'bg-gradient-to-r from-blue-500 to-purple-600'} rounded-2xl px-4 py-3`}>
          <ReactMarkdown>
            {message.content}
          </ReactMarkdown>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="bg-white bg-opacity-80 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-1">
                    {attachment.type === 'calendar' && <Calendar className="h-4 w-4 text-blue-600" />}
                    {attachment.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                    {attachment.type === 'task' && <GitBranch className="h-4 w-4 text-purple-600" />}
                    <span className="text-sm font-medium text-gray-900">{attachment.title}</span>
                    {attachment.status && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        attachment.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : attachment.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {attachment.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{attachment.description}</p>
                  {attachment.dueDate && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500">Due: {attachment.dueDate}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${isAssistant ? 'text-gray-500' : 'text-white text-opacity-70'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isAssistant && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Processed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}