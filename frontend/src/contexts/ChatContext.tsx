import React, { createContext, useContext, useState } from 'react';
import { chatAPI, ChatMessage } from '../services/api';

interface Message {
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
}

interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isLoading: boolean;
  sendMessage: (content: string, threadId?: string) => Promise<void>;
  currentThreadId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentThreadId(null);
  };

  const sendMessage = async (content: string, threadId?: string) => {
    setIsLoading(true);
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date(),
    };
    addMessage(userMessage);

    try {
      // Prepare messages for API
      const apiMessages: ChatMessage[] = [
        ...messages.map(msg => ({
          role: msg.type as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content }
      ];

      // Send to backend
      const response = await chatAPI.sendMessage(apiMessages, threadId || currentThreadId || undefined);
      
      // Update thread ID
      setCurrentThreadId(response.data.thread_id);

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.data.message,
        type: 'assistant',
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        type: 'assistant',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      addMessage, 
      clearMessages, 
      isLoading, 
      sendMessage,
      currentThreadId
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}