'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Entry, ProjectData } from '@/lib/supabase';
import { ProjectChat } from '@/components/ProjectChat';

interface Suggestions {
  summary: string;
  steps: { title: string; description: string }[];
  resources: string[];
  considerations: string[];
  milestones: string[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-500/20 text-green-400' },
  'on-hold': { label: 'On Hold', className: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: 'Completed', className: 'bg-zinc-500/20 text-zinc-400' },
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Entry | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showUpdated, setShowUpdated] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = async (regenerate = false) => {
    if (regenerate) setRegenerating(true);
    try {
      const url = `/api/projects/${projectId}/suggestions${regenerate ? '?regenerate=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProject(data.project);
      setSuggestions(data.suggestions);
    } catch {
      setError('Failed to load project guidance');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleProjectUpdate = (updatedFields?: Record<string, string>) => {
    if (updatedFields && project) {
      const updatedData = { ...project.data, ...updatedFields };
      setProject({ ...project, data: updatedData });
    }
    setShowUpdated(true);
    setTimeout(() => setShowUpdated(false), 2000);
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-[var(--foreground-muted)]">Generating project guidance...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !suggestions) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-[var(--accent)] hover:text-violet-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const projectData = project.data as ProjectData;
  const status = statusConfig[projectData.status] || statusConfig.active;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {showUpdated && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Project updated!</span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="flex-1">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <button
                onClick={() => fetchData(true)}
                disabled={regenerating}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--background-tertiary)] text-[var(--foreground-muted)] border border-[var(--border)] hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] disabled:opacity-50 rounded-lg transition-colors text-sm font-medium"
              >
                <svg className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Project Header */}
              <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4 gap-2">
                  <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] mb-4">
                  {projectData.goal}
                </h1>
                <p className="text-[var(--foreground-muted)]">
                  {suggestions.summary}
                </p>
              </div>

              {/* Next Action */}
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--accent)] text-sm font-medium mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Next Action
                </div>
                <p className="text-[var(--foreground)] text-sm">{projectData.nextAction}</p>
              </div>

              {/* Milestones */}
              {suggestions.milestones.length > 0 && (
                <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] mb-4">
                    Key Milestones
                  </h2>
                  <div className="space-y-3">
                    {suggestions.milestones.map((milestone, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 border-2 border-[var(--border)] rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs text-[var(--foreground-muted)]">{index + 1}</span>
                        </div>
                        <span className="text-sm text-[var(--foreground)]">{milestone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Implementation Steps */}
              <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] mb-4 sm:mb-6">
                  Recommended Steps
                </h2>
                <div className="space-y-4 sm:space-y-6">
                  {suggestions.steps.map((step, index) => (
                    <div key={index} className="flex gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center font-medium text-sm sm:text-base">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-[var(--foreground)] mb-1 text-sm sm:text-base">{step.title}</h3>
                        <p className="text-[var(--foreground-muted)] text-xs sm:text-sm">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              {suggestions.resources.length > 0 && (
                <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] mb-4">
                    Helpful Resources
                  </h2>
                  <ul className="space-y-2">
                    {suggestions.resources.map((resource, index) => (
                      <li key={index} className="flex items-start gap-2 text-[var(--foreground-muted)] text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {resource}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Considerations */}
              {suggestions.considerations.length > 0 && (
                <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] mb-4">
                    Things to Consider
                  </h2>
                  <ul className="space-y-2">
                    {suggestions.considerations.map((consideration, index) => (
                      <li key={index} className="flex items-start gap-2 text-[var(--foreground-muted)] text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {consideration}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar - Desktop */}
        <div className="hidden lg:flex w-80 xl:w-96 border-l border-[var(--border)] flex-col sticky top-0 h-screen">
          <ProjectChat
            projectId={projectId}
            suggestions={suggestions}
            onProjectUpdate={handleProjectUpdate}
          />
        </div>

        {/* Chat Button - Mobile */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-green-500 transition-colors z-40"
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
                <h3 className="font-medium text-[var(--foreground)]">Project Advisor</h3>
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
                <ProjectChat
                  projectId={projectId}
                  suggestions={suggestions}
                  onProjectUpdate={handleProjectUpdate}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
