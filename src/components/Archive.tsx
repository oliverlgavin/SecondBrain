'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Entry, Category, PeopleData, ProjectData, IdeaData, TaskData } from '@/lib/supabase';

const categoryConfig: { category: Category; label: string; color: string }[] = [
  { category: 'tasks', label: 'Tasks', color: '#ef4444' },
  { category: 'projects', label: 'Projects', color: '#22c55e' },
  { category: 'ideas', label: 'Ideas', color: '#eab308' },
  { category: 'people', label: 'People', color: '#3b82f6' },
];

function getEntryLabel(entry: Entry): string {
  switch (entry.category) {
    case 'people': return (entry.data as PeopleData).name;
    case 'projects': return (entry.data as ProjectData).goal;
    case 'ideas': return (entry.data as IdeaData).insight;
    case 'tasks': return (entry.data as TaskData).task;
    default: return '';
  }
}

function getEntryDetail(entry: Entry): string {
  switch (entry.category) {
    case 'people': return (entry.data as PeopleData).context;
    case 'projects': return (entry.data as ProjectData).status;
    case 'ideas': return (entry.data as IdeaData).category;
    case 'tasks': return (entry.data as TaskData).priority;
    default: return '';
  }
}

function getEntryHref(entry: Entry): string | null {
  if (entry.category === 'ideas') return `/ideas/${entry.id}`;
  if (entry.category === 'tasks') return `/task/${entry.id}`;
  return null;
}

export function Archive() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entries?archived=only');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch archived entries:', error);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      fetchArchived();
    }
  }, [open, loaded, fetchArchived]);

  const handleUnarchive = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error('Unarchive failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const grouped = categoryConfig
    .map(({ category, label, color }) => ({
      category,
      label,
      color,
      items: entries.filter((e) => e.category === category),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--background-tertiary)]/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--foreground-muted)]/10">
            <ArchiveIcon className="h-4 w-4 text-[var(--foreground-muted)]" />
          </span>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Archive</h2>
          {loaded && (
            <span className="text-xs font-medium text-[var(--foreground-muted)] bg-[var(--background-tertiary)] px-2 py-0.5 rounded-md">
              {entries.length}
            </span>
          )}
        </div>
        <ChevronIcon className={`h-5 w-5 text-[var(--foreground-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-[var(--background-tertiary)] rounded animate-pulse max-w-[80%]" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)] text-center py-4">
              No archived entries yet
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ category, label, color, items }) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                      {label}
                    </h3>
                    <span className="text-xs text-[var(--foreground-muted)]">({items.length})</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((entry) => {
                      const href = getEntryHref(entry);
                      const label = getEntryLabel(entry);
                      const detail = getEntryDetail(entry);

                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            {href ? (
                              <Link
                                href={href}
                                className="text-sm text-[var(--foreground)] hover:text-[var(--accent)] truncate block"
                                title={label}
                              >
                                {label}
                              </Link>
                            ) : (
                              <span className="text-sm text-[var(--foreground)] truncate block" title={label}>
                                {label}
                              </span>
                            )}
                            {detail && (
                              <span className="text-xs text-[var(--foreground-muted)]">{detail}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleUnarchive(entry.id)}
                              className="p-1 text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
                              title="Restore"
                            >
                              <RestoreIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-[var(--foreground-muted)] hover:text-red-400 transition-colors"
                              title="Delete permanently"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
