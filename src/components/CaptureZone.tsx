'use client';

import { useState, useCallback } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface CaptureZoneProps {
  onCapture: (text: string) => Promise<void>;
  onManualCreate?: (category: string, data: Record<string, string>) => Promise<void>;
  isProcessing: boolean;
}

export function CaptureZone({ onCapture, onManualCreate, isProcessing }: CaptureZoneProps) {
  const [text, setText] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCategory, setManualCategory] = useState<'ideas' | 'tasks' | 'people' | 'projects'>('ideas');
  const [manualData, setManualData] = useState<Record<string, string>>({});

  const handleTranscript = useCallback((transcript: string) => {
    setText((prev) => prev + transcript);
  }, []);

  const { isListening, startListening, stopListening, isSupported } = useVoiceInput({
    onTranscript: handleTranscript,
  });

  const handleSubmit = async () => {
    if (!text.trim() || isProcessing) return;
    await onCapture(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleManualSubmit = async () => {
    if (!onManualCreate || !manualData) return;

    let data: Record<string, string>;
    const now = new Date().toISOString().split('T')[0];

    switch (manualCategory) {
      case 'ideas':
        data = {
          insight: manualData.insight || '',
          category: manualData.category || 'General',
          date: now,
        };
        break;
      case 'tasks':
        data = {
          task: manualData.task || '',
          deadline: manualData.deadline || 'none',
          priority: manualData.priority || 'medium',
          status: 'pending',
        };
        break;
      case 'people':
        data = {
          name: manualData.name || '',
          context: manualData.context || '',
          lastContact: now,
        };
        break;
      case 'projects':
        data = {
          goal: manualData.goal || '',
          status: manualData.status || 'active',
          nextAction: manualData.nextAction || '',
        };
        break;
    }

    await onManualCreate(manualCategory, data);
    setShowManualModal(false);
    setManualData({});
  };

  const categoryFields: Record<string, { label: string; key: string; placeholder: string }[]> = {
    ideas: [
      { label: 'Insight', key: 'insight', placeholder: 'Your idea or insight...' },
      { label: 'Category', key: 'category', placeholder: 'e.g., Business, Personal, Tech' },
    ],
    tasks: [
      { label: 'Task', key: 'task', placeholder: 'What needs to be done...' },
      { label: 'Deadline', key: 'deadline', placeholder: 'e.g., tomorrow, 2024-01-15' },
      { label: 'Priority', key: 'priority', placeholder: 'low, medium, or high' },
    ],
    people: [
      { label: 'Name', key: 'name', placeholder: 'Person\'s name' },
      { label: 'Context', key: 'context', placeholder: 'How you know them...' },
    ],
    projects: [
      { label: 'Goal', key: 'goal', placeholder: 'Project goal...' },
      { label: 'Next Action', key: 'nextAction', placeholder: 'Next step to take...' },
    ],
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
        Capture Anything
      </label>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Type a thought, task, idea, or person..."
          className="w-full h-32 px-4 py-3 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-muted)] resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          disabled={isProcessing}
        />

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-[var(--background-tertiary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]'
              }`}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              <MicrophoneIcon className="w-5 h-5" />
              {isListening && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[var(--foreground-muted)] hidden sm:inline">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--background-tertiary)] rounded text-[10px]">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-[var(--background-tertiary)] rounded text-[10px]">Enter</kbd> to capture
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onManualCreate && (
            <button
              onClick={() => setShowManualModal(true)}
              disabled={isProcessing}
              className="px-4 py-2.5 sm:py-2 bg-[var(--background-tertiary)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-sm font-medium rounded-lg transition-colors border border-[var(--border)]"
            >
              + New Entry
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Capture'}
          </button>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowManualModal(false)} />
          <div className="relative bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">New Entry</h3>

            {/* Category Selector */}
            <div className="flex gap-2 mb-4">
              {(['ideas', 'tasks', 'people', 'projects'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setManualCategory(cat);
                    setManualData({});
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    manualCategory === cat
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--background-tertiary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Dynamic Fields */}
            <div className="space-y-3">
              {categoryFields[manualCategory].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={manualData[field.key] || ''}
                    onChange={(e) =>
                      setManualData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-muted)] text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setManualData({});
                }}
                className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!Object.values(manualData).some((v) => v.trim())}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}
