'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Entry, TaskData } from '@/lib/supabase';
import { TaskMap } from '@/components/TaskMap';
import { TaskChat } from '@/components/TaskChat';
import { useGeolocation } from '@/hooks/useGeolocation';

type TaskStatus = 'pending' | 'in-progress' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high';

const statusColors: Record<TaskStatus, string> = {
  'pending': 'bg-zinc-600 text-zinc-200',
  'in-progress': 'bg-amber-600 text-amber-100',
  'completed': 'bg-emerald-600 text-emerald-100',
};

const priorityColors: Record<TaskPriority, string> = {
  'low': 'text-zinc-400',
  'medium': 'text-amber-400',
  'high': 'text-red-400',
};

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [travelDistance, setTravelDistance] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { latitude, longitude, loading: geoLoading } = useGeolocation();

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/entries/${taskId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Task not found');
        } else {
          throw new Error('Failed to fetch task');
        }
        return;
      }
      const data = await res.json();
      if (data.category !== 'tasks') {
        setError('This entry is not a task');
        return;
      }
      setTask(data);
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  // Calculate travel time when we have location data
  useEffect(() => {
    const calculateTravelTime = async () => {
      if (!task || !latitude || !longitude) return;

      const taskData = task.data as TaskData;
      if (!taskData.location) return;

      try {
        const origin = `${latitude},${longitude}`;

        const res = await fetch(
          `/api/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(taskData.location)}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.duration) {
            setTravelTime(data.duration);
            setTravelDistance(data.distance);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
          }
        }
      } catch (err) {
        console.error('Error calculating travel time:', err);
      }
    };

    if (!geoLoading && latitude && longitude) {
      calculateTravelTime();
    }
  }, [task, latitude, longitude, geoLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--foreground-muted)]">Loading task...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || 'Task not found'}</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const taskData = task.data as TaskData;
  const status = taskData.status || 'pending';
  const priority = taskData.priority || 'medium';
  const hasLocation = Boolean(taskData.location);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Travel Time Toast - Only for location tasks */}
      {showToast && travelTime && hasLocation && (
        <div className="fixed top-4 right-4 z-50 bg-violet-600 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in max-w-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">{travelTime} away</p>
              {travelDistance && <p className="text-xs opacity-80">{travelDistance}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 xl:px-12 w-full">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Task Header - Minimal */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}>
                {status.replace('-', ' ')}
              </span>
              <span className={`text-xs font-medium ${priorityColors[priority]}`}>
                {priority.toUpperCase()}
              </span>
              {hasLocation && (
                <span className="text-xs text-[var(--accent)] flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  Location task
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
              {taskData.task}
            </h1>
            {taskData.deadline && taskData.deadline !== 'none' && (
              <p className="text-[var(--foreground-muted)] text-sm">
                Due {new Date(taskData.deadline).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

          {/* Location Section - Only shown if task has location */}
          {hasLocation && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[var(--foreground)]">{taskData.location}</span>
                </div>
                {travelTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--accent)] font-medium">{travelTime}</span>
                    {travelDistance && <span className="text-[var(--foreground-muted)]">({travelDistance})</span>}
                  </div>
                )}
              </div>
              <TaskMap
                location={taskData.location!}
                userLocation={{ latitude, longitude }}
                className="h-48 sm:h-64 rounded-lg overflow-hidden"
              />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(taskData.location!)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:text-violet-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Get directions
              </a>
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                Notes
              </h2>
              {taskData.notes && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/entries/${taskId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          data: { ...taskData, notes: '' }
                        }),
                      });
                      if (res.ok) {
                        fetchTask();
                      }
                    } catch (err) {
                      console.error('Error deleting notes:', err);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {taskData.notes ? (
              <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border)]">
                <p className="text-[var(--foreground)] whitespace-pre-wrap">{taskData.notes}</p>
              </div>
            ) : (
              <p className="text-[var(--foreground-muted)] text-sm italic">
                {hasLocation
                  ? 'No notes. Try "add note: pick up extra bags"'
                  : 'No notes. Try "add note: remember to check twice"'}
              </p>
            )}
          </div>

          {/* Quick Info - Minimal footer */}
          <div className="text-xs text-[var(--foreground-muted)] flex items-center gap-4 pt-4 border-t border-[var(--border)]">
            <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>Updated {new Date(task.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Chat Sidebar - Desktop */}
        <div className="hidden lg:flex w-80 xl:w-96 border-l border-[var(--border)] flex-col sticky top-0 h-screen">
          <TaskChat
            taskId={taskId}
            userLocation={{ latitude, longitude }}
            onTaskUpdate={fetchTask}
            hasLocation={hasLocation}
            travelTime={travelTime}
          />
        </div>

        {/* Chat Button - Mobile */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-violet-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-violet-500 transition-colors z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Chat Modal - Mobile */}
        {isChatOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsChatOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 h-[80vh] bg-[var(--background)] rounded-t-2xl overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <h3 className="font-medium text-[var(--foreground)]">Task Assistant</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(80vh-64px)]">
                <TaskChat
                  taskId={taskId}
                  userLocation={{ latitude, longitude }}
                  onTaskUpdate={fetchTask}
                  hasLocation={hasLocation}
                  travelTime={travelTime}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
