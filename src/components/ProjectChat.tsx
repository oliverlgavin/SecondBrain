'use client';

import { useState, useRef, useEffect } from 'react';
import { MarkdownContent } from '@/components/MarkdownContent';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Suggestions {
  summary: string;
  steps: { title: string; description: string }[];
  resources: string[];
  considerations: string[];
  milestones: string[];
}

interface ProjectChatProps {
  projectId: string;
  suggestions: Suggestions | null;
  onProjectUpdate: (updatedFields?: Record<string, string>) => void;
}

export function ProjectChat({ projectId, suggestions, onProjectUpdate }: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          suggestions,
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.projectUpdated) {
        onProjectUpdate(data.updatedFields);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { text: 'What should I do next?', icon: '>' },
    { text: 'Break this down further', icon: '#' },
    { text: 'Change status', icon: '~' },
    { text: 'How do I get unstuck?', icon: '!' },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--background-secondary)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-medium text-[var(--foreground)]">Project Advisor</h3>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          Get guidance and track progress
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.text)}
                  className="text-left p-3 bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <span className="mr-2 font-mono text-[var(--accent)]">{action.icon}</span>
                  {action.text}
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-[var(--foreground-muted)] pt-2">
              Ask me for advice on completing this project
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-[var(--background-tertiary)] text-[var(--foreground)]'
              }`}
            >
              <MarkdownContent content={message.content} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--background-tertiary)] rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden">
          <span className="pl-3 text-green-500 font-mono text-sm">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this project..."
            disabled={isLoading}
            className="flex-1 bg-transparent px-2 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none font-mono"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 text-green-500 hover:text-green-300 disabled:text-zinc-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
