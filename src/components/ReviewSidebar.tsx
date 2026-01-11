'use client';

import { useState } from 'react';
import type { Entry, Category } from '@/lib/supabase';

interface ReviewSidebarProps {
  entries: Entry[];
  onAssign: (entryId: string, category: Category) => Promise<void>;
  onDismiss: (entryId: string) => Promise<void>;
}

const categoryOptions: { value: Category; label: string; color: string }[] = [
  { value: 'people', label: 'People', color: 'bg-blue-500' },
  { value: 'projects', label: 'Projects', color: 'bg-green-500' },
  { value: 'ideas', label: 'Ideas', color: 'bg-yellow-500' },
  { value: 'tasks', label: 'Tasks', color: 'bg-red-500' },
];

export function ReviewSidebar({ entries, onAssign, onDismiss }: ReviewSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (entries.length === 0) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    e.dataTransfer.setData('text/plain', entryId);
    setDraggingId(entryId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const getEntryPreview = (entry: Entry): string => {
    const data = entry.data as unknown as Record<string, unknown>;
    const firstValue = Object.values(data)[0];
    return typeof firstValue === 'string' ? firstValue : JSON.stringify(data);
  };

  const SidebarContent = () => (
    <>
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-medium text-sm">Review Required</h3>
        <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
          {entries.length}
        </span>
      </div>

      <div className="p-3 space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            draggable
            onDragStart={(e) => handleDragStart(e, entry.id)}
            onDragEnd={handleDragEnd}
            className={`bg-[var(--background-tertiary)] rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
              draggingId === entry.id ? 'opacity-50 scale-95' : ''
            }`}
          >
            <p className="text-sm text-[var(--foreground)] line-clamp-2 mb-3">
              {getEntryPreview(entry)}
            </p>
            <div className="flex flex-wrap gap-1">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onAssign(entry.id, opt.value)}
                  className={`text-xs px-2 py-1 rounded ${opt.color}/20 hover:${opt.color}/40 text-white/80 transition-colors`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => onDismiss(entry.id)}
                className="text-xs px-2 py-1 rounded bg-zinc-500/20 hover:bg-zinc-500/40 text-white/60 transition-colors ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}

        <p className="text-xs text-[var(--foreground-muted)] text-center pt-2 hidden lg:block">
          Drag items to cards or click a category
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: Floating button and modal */}
      <div className="lg:hidden">
        {/* Floating button */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 bg-amber-500 text-white p-4 rounded-full shadow-lg hover:bg-amber-400 transition-colors"
        >
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {entries.length}
          </span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        {/* Modal overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-[var(--background-secondary)] rounded-t-2xl shadow-xl animate-slide-up">
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <SidebarContent />
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Fixed sidebar */}
      <div className="hidden lg:block bg-[var(--background-secondary)] border-l border-[var(--border)] w-80">
        <SidebarContent />
      </div>
    </>
  );
}
