import { Bot, User, Calendar, Mail, GitBranch, Clock, CheckCircle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

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

// Custom components for ReactMarkdown
const MarkdownComponents = {
  // Headings with better styling
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>
  ),
  
  // Paragraphs with proper spacing
  p: ({ children }: any) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),
  
  // Code blocks with syntax highlighting effect
  code: ({ inline, children }: any) => {
    if (inline) {
      return (
        <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    }
    
    return <CodeBlock>{children}</CodeBlock>;
  },
  
  // Lists with better spacing
  ul: ({ children }: any) => (
    <ul className="mb-3 ml-4 space-y-1 list-disc">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="mb-3 ml-4 space-y-1 list-decimal">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed">{children}</li>
  ),
  
  // Blockquotes
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-4 bg-blue-50 italic">
      {children}
    </blockquote>
  ),
  
  // Links
  a: ({ href, children }: any) => (
    <a 
      href={href} 
      className="text-blue-600 hover:text-blue-800 underline transition-colors"
      target="_blank" 
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  
  // Tables
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-200 rounded-lg">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-2 border-b border-gray-200">{children}</td>
  ),
  
  // Horizontal rule
  hr: () => (
    <hr className="my-6 border-t border-gray-300" />
  ),
};

// Code block component with copy functionality
function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative my-4">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code className="font-mono text-sm leading-relaxed">{children}</code>
      </pre>
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
        title="Copy code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Message({ message }: MessageProps) {
  const isAssistant = message.type === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-6`}>
      <div className={`flex space-x-3 max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg' 
            : 'bg-gradient-to-r from-green-400 to-blue-500 shadow-lg'
        }`}>
          {isAssistant ? (
            <Bot className="h-4 w-4 text-white" />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`${
          isAssistant 
            ? 'bg-white border border-gray-200 shadow-sm' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
        } rounded-2xl px-5 py-4 transition-all duration-200 hover:shadow-md`}>
          
          {/* Enhanced ReactMarkdown */}
          <div className={`prose prose-sm max-w-none ${
            isAssistant 
              ? 'prose-gray' 
              : 'prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-code:text-gray-200 prose-code:bg-white prose-code:bg-opacity-20'
          }`}>
            <ReactMarkdown components={MarkdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="bg-white bg-opacity-90 rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-2 mb-2">
                    {attachment.type === 'calendar' && <Calendar className="h-4 w-4 text-blue-600" />}
                    {attachment.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                    {attachment.type === 'task' && <GitBranch className="h-4 w-4 text-purple-600" />}
                    <span className="text-sm font-semibold text-gray-900">{attachment.title}</span>
                    {attachment.status && (
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
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
                  <p className="text-sm text-gray-600 leading-relaxed">{attachment.description}</p>
                  {attachment.dueDate && (
                    <div className="flex items-center space-x-1 mt-3">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500 font-medium">Due: {attachment.dueDate}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-200 border-opacity-30">
            <span className={`text-xs font-medium ${isAssistant ? 'text-gray-500' : 'text-white text-opacity-70'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isAssistant && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Processed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo component to show the enhanced message
export default function MessageDemo() {
  const sampleMessage = {
    id: '1',
    content: `# Welcome to Enhanced Markdown!

Here's what makes this message component **much better**:

## Code Examples
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Inline code looks great too: \`const x = 42;\`

## Lists Work Perfectly
- Clean bullet points
- Proper spacing
- Great readability

1. Numbered lists too
2. With consistent formatting
3. And hover effects

## Other Features
> This is a beautiful blockquote with proper styling

| Feature | Status |
|---------|---------|
| Syntax highlighting | ✅ |
| Copy buttons | ✅ |
| Responsive design | ✅ |

[Links look great too](https://example.com)

---

*Much better formatting overall!*`,
    type: 'assistant' as const,
    timestamp: new Date(),
    attachments: [
      {
        type: 'task' as const,
        title: 'Implement enhanced markdown',
        description: 'Add better styling and components to ReactMarkdown',
        status: 'completed',
        dueDate: 'Today'
      }
    ]
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Enhanced Message Component</h1>
        <Message message={sampleMessage} />
      </div>
    </div>
  );
}