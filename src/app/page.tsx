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
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);

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
    setCaptureError(null);
    setCaptureSuccess(false);

    try {
      // Get current local date in ISO format
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          currentDate,
          currentTime,
          currentDay,
        }),
      });

      if (res.ok) {
        const { entry } = await res.json();
        if (entry) {
          setEntries((prev) => [entry, ...prev]);
          setCaptureSuccess(true);
          setTimeout(() => setCaptureSuccess(false), 3000);
        } else {
          setCaptureError('Entry was not saved properly');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setCaptureError(errorData.error || 'Failed to capture entry');
      }
    } catch (error) {
      console.error('Capture failed:', error);
      setCaptureError('Network error. Please try again.');
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

  const handleCompleteTask = async (id: string) => {
    try {
      // Find the current entry to get its data
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      const updatedData = {
        ...entry.data,
        status: 'completed',
      };

      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? updated : e))
        );
      }
    } catch (error) {
      console.error('Complete task failed:', error);
    }
  };

  const handleManualCreate = async (category: string, data: Record<string, string>) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          data,
          confidence: 1.0,
          needs_review: false,
        }),
      });

      if (res.ok) {
        const newEntry = await res.json();
        setEntries((prev) => [newEntry, ...prev]);
        setCaptureSuccess(true);
        setTimeout(() => setCaptureSuccess(false), 3000);
      } else {
        setCaptureError('Failed to create entry');
      }
    } catch (error) {
      console.error('Manual create failed:', error);
      setCaptureError('Failed to create entry');
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
      {/* Capture Success Toast */}
      {captureSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Captured successfully!</span>
          </div>
        </div>
      )}

      {/* Capture Error Toast */}
      {captureError && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-medium">{captureError}</span>
            <button
              onClick={() => setCaptureError(null)}
              className="ml-2 hover:text-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
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

          <CaptureZone onCapture={handleCapture} onManualCreate={handleManualCreate} isProcessing={isProcessing} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {cardConfig.map(({ category, title, color }) => (
              <LiveCard
                key={category}
                title={title}
                category={category}
                entries={getEntriesByCategory(category)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onArchive={category === 'tasks' ? handleCompleteTask : undefined}
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
