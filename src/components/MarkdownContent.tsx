'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline break-all"
          >
            {children}
          </a>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-[var(--background-tertiary)] px-1 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return (
            <pre className="bg-[var(--background-tertiary)] p-3 rounded-lg overflow-x-auto mb-2">
              <code className="text-sm font-mono">{children}</code>
            </pre>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[var(--accent)] pl-4 italic text-[var(--foreground-muted)] mb-2">
            {children}
          </blockquote>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
