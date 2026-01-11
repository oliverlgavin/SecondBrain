'use client';

import { useRouter } from 'next/navigation';
import type { Entry, IdeaData } from '@/lib/supabase';

interface SavedIdeasProps {
  entries: Entry[];
}

export function SavedIdeas({ entries }: SavedIdeasProps) {
  const router = useRouter();

  // Filter for saved ideas
  const savedIdeas = entries.filter((entry) => {
    if (entry.category !== 'ideas') return false;
    const ideaData = entry.data as IdeaData;
    return ideaData.saved === true;
  });

  if (savedIdeas.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--border)] flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-400" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
          Saved Ideas
        </h2>
        <span className="ml-auto text-xs text-[var(--foreground-muted)] bg-[var(--background-tertiary)] px-2 py-0.5 rounded-full">
          {savedIdeas.length}
        </span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {savedIdeas.map((entry) => {
          const ideaData = entry.data as IdeaData;
          return (
            <button
              key={entry.id}
              onClick={() => router.push(`/ideas/${entry.id}`)}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-[var(--background-tertiary)] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base text-[var(--foreground)] group-hover:text-amber-400 transition-colors truncate">
                    {ideaData.insight}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {ideaData.category}
                    </span>
                    {ideaData.timeEstimate && (
                      <>
                        <span className="text-[var(--foreground-muted)]">-</span>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {ideaData.timeEstimate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-[var(--foreground-muted)] group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
