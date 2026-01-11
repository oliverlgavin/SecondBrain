'use client';

import { useState, useRef, useEffect } from 'react';

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
  timeEstimate: string;
}

interface IdeaChatProps {
  ideaId: string;
  suggestions: Suggestions | null;
  onIdeaUpdate: (updatedFields?: Record<string, string>) => void;
}

export function IdeaChat({ ideaId, suggestions, onIdeaUpdate }: IdeaChatProps) {
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/ideas/${ideaId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          suggestions,
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      console.log('Chat response:', data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.ideaUpdated) {
        console.log('Updating idea with fields:', data.updatedFields);
        onIdeaUpdate(data.updatedFields);
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
    { text: 'Make it clearer', icon: '✨' },
    { text: 'Add more detail', icon: '📝' },
    { text: 'Change category', icon: '🏷️' },
    { text: 'How do I start?', icon: '🚀' },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--background-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-medium text-[var(--foreground)]">Idea Assistant</h3>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          Refine and develop your idea
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setInput(action.text)}
                  className="text-left p-3 bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <span className="mr-2">{action.icon}</span>
                  {action.text}
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-[var(--foreground-muted)] pt-2">
              Ask me to refine, expand, or help execute this idea
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
                  ? 'bg-violet-600 text-white'
                  : 'bg-[var(--background-tertiary)] text-[var(--foreground)]'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
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

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden">
          <span className="pl-3 text-violet-400 font-mono text-sm">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I improve this idea?"
            disabled={isLoading}
            className="flex-1 bg-transparent px-2 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none font-mono"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 text-violet-400 hover:text-violet-300 disabled:text-zinc-600 transition-colors"
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
