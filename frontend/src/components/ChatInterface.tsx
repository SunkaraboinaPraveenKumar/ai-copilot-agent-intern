import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Zap, Clock, CheckCircle, Bell, Maximize2 } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { QuickActions } from './QuickActions';

interface ChatInterfaceProps {
  onSidebarToggle: () => void;
}

export function ChatInterface({ onSidebarToggle }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage } = useChat();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault?.();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    await sendMessage(userMessage);
  };

  const handleQuickAction = async (action: string) => {
    setInput(action);
    await sendMessage(action);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Maximize2 className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Copilot</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-green-50 px-3 py-1 rounded-full">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Online</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to AI Copilot</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md">
              Your intelligent assistant for managing tasks, emails, and projects across Google Suite and JIRA.
            </p>
            <QuickActions onActionClick={handleQuickAction} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Enhanced Input Form */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about your tasks, emails, or schedule..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 shadow-sm"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span className="font-medium">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}