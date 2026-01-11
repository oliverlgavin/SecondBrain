'use client';

import { useState, useEffect, useCallback } from 'react';
import { CaptureZone } from '@/components/CaptureZone';
import { LiveCard } from '@/components/LiveCard';
import { MorningSummary } from '@/components/MorningSummary';
import { ReviewSidebar } from '@/components/ReviewSidebar';
import { SavedIdeas } from '@/components/SavedIdeas';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClientSupabase } from '@/lib/supabase-client';
import type { Entry, Category } from '@/lib/supabase';

const cardConfig: { category: Category; title: string; color: string }[] = [
  { category: 'people', title: 'People', color: '#3b82f6' },
  { category: 'projects', title: 'Projects', color: '#22c55e' },
  { category: 'ideas', title: 'Ideas', color: '#eab308' },
  { category: 'tasks', title: 'Tasks', color: '#ef4444' },
];

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCapture = async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const { entry } = await res.json();
        setEntries((prev) => [entry, ...prev]);
      }
    } catch (error) {
      console.error('Capture failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async (id: string, data: Entry['data']) => {
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? updated : e))
        );
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });

      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error('Archive failed:', error);
    }
  };

  const handleAssignCategory = async (entryId: string, category: Category) => {
    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, needs_review: false }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? updated : e))
        );
      }
    } catch (error) {
      console.error('Assign failed:', error);
    }
  };

  const handleDismissReview = async (entryId: string) => {
    await handleDelete(entryId);
  };

  const fetchSummary = async (): Promise<string[]> => {
    try {
      const res = await fetch('/api/summary');
      if (res.ok) {
        const { bullets } = await res.json();
        return bullets;
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
    return [];
  };

  const handleLogout = async () => {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const reviewEntries = entries.filter((e) => e.needs_review);
  const getEntriesByCategory = (category: Category) =>
    entries.filter((e) => e.category === category && !e.needs_review);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col lg:flex-row">
      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)]">Second Brain</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="space-y-6 sm:space-y-8">
          <MorningSummary onRefresh={fetchSummary} />

          <CaptureZone onCapture={handleCapture} isProcessing={isProcessing} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {cardConfig.map(({ category, title, color }) => (
              <LiveCard
                key={category}
                title={title}
                category={category}
                entries={getEntriesByCategory(category)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onArchive={category === 'tasks' ? handleArchive : undefined}
                accentColor={color}
              />
            ))}
          </div>

          <SavedIdeas entries={entries} />
        </div>
      </div>

      <ReviewSidebar
        entries={reviewEntries}
        onAssign={handleAssignCategory}
        onDismiss={handleDismissReview}
      />
    </div>
  );
}
