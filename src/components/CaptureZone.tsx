'use client';

import { useState, useCallback } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface CaptureZoneProps {
  onCapture: (text: string) => Promise<void>;
  isProcessing: boolean;
}

export function CaptureZone({ onCapture, isProcessing }: CaptureZoneProps) {
  const [text, setText] = useState('');

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
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isProcessing}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Capture'}
        </button>
      </div>
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
