import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3 mb-4">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="bg-gray-50 rounded-2xl px-4 py-3">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-600">AI is thinking</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}