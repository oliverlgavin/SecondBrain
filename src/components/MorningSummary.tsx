'use client';

import { useState, useEffect, useCallback } from 'react';

interface MorningSummaryProps {
  onRefresh: () => Promise<string[]>;
}

export function MorningSummary({ onRefresh }: MorningSummaryProps) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await onRefresh();
      setBullets(summary);
    } catch {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (error) {
    return (
      <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-violet-300">Focus for Today</h2>
        <button
          onClick={loadSummary}
          disabled={loading}
          className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && bullets.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-[var(--background-tertiary)] rounded animate-pulse" />
          ))}
        </div>
      ) : bullets.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          Add some tasks and projects to see your daily focus.
        </p>
      ) : (
        <ul className="space-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="text-sm text-[var(--foreground)] flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
