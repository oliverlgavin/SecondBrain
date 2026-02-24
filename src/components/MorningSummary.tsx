'use client';

import { useState, useEffect, useCallback } from 'react';

interface MorningSummaryProps {
  onRefresh: () => Promise<string[]>;
}

const CACHE_KEY = 'morning-summary';

function getCachedSummary(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { date, bullets } = JSON.parse(raw);
    if (date === new Date().toDateString() && Array.isArray(bullets) && bullets.length > 0) {
      return bullets;
    }
  } catch { /* ignore */ }
  return null;
}

function cacheSummary(bullets: string[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: new Date().toDateString(), bullets }));
  } catch { /* ignore */ }
}

export function MorningSummary({ onRefresh }: MorningSummaryProps) {
  const [bullets, setBullets] = useState<string[]>(() => getCachedSummary() ?? []);
  const [loading, setLoading] = useState(() => getCachedSummary() === null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const summary = await onRefresh();
      if (summary.length > 0) {
        setBullets(summary);
        cacheSummary(summary);
      }
    } catch {
      if (!background) setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const cached = getCachedSummary();
    if (cached) {
      // Already showing cached data, refresh in background
      loadSummary(true);
    } else {
      loadSummary(false);
    }
  }, [loadSummary]);

  if (error) {
    return (
      <div className="bg-[var(--background-secondary)]/80 border border-[var(--border)] rounded-xl p-4 shadow-sm">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm border border-[var(--border)] rounded-xl p-5 shadow-sm overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] rounded-l-xl" aria-hidden />
      <div className="flex items-center justify-between mb-4 pl-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
            <FocusIcon className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Focus for Today</h2>
        </div>
        <button
          onClick={() => loadSummary(false)}
          disabled={loading}
          className="text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-[var(--background-tertiary)]"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && bullets.length === 0 ? (
        <div className="space-y-3 pl-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-[var(--background-tertiary)] rounded animate-pulse max-w-[90%]" />
          ))}
        </div>
      ) : bullets.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)] pl-1">
          Add some tasks and projects to see your daily focus.
        </p>
      ) : (
        <ul className="space-y-3 pl-1">
          {bullets.map((bullet, i) => (
            <li key={i} className="text-sm text-[var(--foreground)] flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FocusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
