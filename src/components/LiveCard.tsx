'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Entry, Category, PeopleData, ProjectData, IdeaData, TaskData } from '@/lib/supabase';

interface LiveCardProps {
  title: string;
  category: Category;
  entries: Entry[];
  onUpdate: (id: string, data: Entry['data']) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onPersonClick?: (name: string) => void;
  accentColor: string;
}

const categoryColumns: Record<Category, string[]> = {
  people: ['Name', 'Context', 'Last Contact'],
  projects: ['Goal', 'Status', 'Next Action'],
  ideas: ['Insight', 'Category', 'Date'],
  tasks: ['Task', 'Deadline', 'Priority'],
};

// Helper to truncate long text
const truncateText = (text: string, maxLength: number = 60): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export function LiveCard({
  title,
  category,
  entries,
  onUpdate,
  onDelete,
  onArchive,
  onPersonClick,
  accentColor,
}: LiveCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const columns = categoryColumns[category];

  const getCellValue = (entry: Entry, colIndex: number): string => {
    const data = entry.data;
    switch (category) {
      case 'people': {
        const d = data as PeopleData;
        return [d.name, d.context, d.lastContact][colIndex] || '';
      }
      case 'projects': {
        const d = data as ProjectData;
        return [d.goal, d.status, d.nextAction][colIndex] || '';
      }
      case 'ideas': {
        const d = data as IdeaData;
        return [d.insight, d.category, d.date][colIndex] || '';
      }
      case 'tasks': {
        const d = data as TaskData;
        return [d.task, d.deadline, d.priority][colIndex] || '';
      }
      default:
        return '';
    }
  };

  const updateCellValue = (entry: Entry, colIndex: number, value: string): Entry['data'] => {
    const data = { ...entry.data };
    switch (category) {
      case 'people': {
        const d = data as PeopleData;
        if (colIndex === 0) d.name = value;
        if (colIndex === 1) d.context = value;
        if (colIndex === 2) d.lastContact = value;
        break;
      }
      case 'projects': {
        const d = data as ProjectData;
        if (colIndex === 0) d.goal = value;
        if (colIndex === 1) d.status = value as ProjectData['status'];
        if (colIndex === 2) d.nextAction = value;
        break;
      }
      case 'ideas': {
        const d = data as IdeaData;
        if (colIndex === 0) d.insight = value;
        if (colIndex === 1) d.category = value;
        if (colIndex === 2) d.date = value;
        break;
      }
      case 'tasks': {
        const d = data as TaskData;
        if (colIndex === 0) d.task = value;
        if (colIndex === 1) d.deadline = value;
        if (colIndex === 2) d.priority = value as TaskData['priority'];
        break;
      }
    }
    return data;
  };

  const renderCell = (entry: Entry, colIndex: number) => {
    const value = getCellValue(entry, colIndex);
    const isEditing = editingId === `${entry.id}-${colIndex}`;

    // Check if this is a name in a non-people card that should be clickable
    const isClickableName = category !== 'people' && colIndex === 0 && onPersonClick;

    if (isEditing) {
      return (
        <input
          autoFocus
          defaultValue={value}
          onBlur={(e) => {
            const newData = updateCellValue(entry, colIndex, e.target.value);
            onUpdate(entry.id, newData);
            setEditingId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newData = updateCellValue(entry, colIndex, e.currentTarget.value);
              onUpdate(entry.id, newData);
              setEditingId(null);
            }
            if (e.key === 'Escape') {
              setEditingId(null);
            }
          }}
          className="w-full bg-[var(--background)] border border-[var(--accent)] rounded px-2 py-1 text-sm focus:outline-none"
        />
      );
    }

    // Priority badge
    if (category === 'tasks' && colIndex === 2) {
      const priorityColors: Record<string, string> = {
        high: 'bg-red-500/20 text-red-400',
        medium: 'bg-yellow-500/20 text-yellow-400',
        low: 'bg-green-500/20 text-green-400',
      };
      return (
        <span
          onClick={() => setEditingId(`${entry.id}-${colIndex}`)}
          className={`inline-block px-2 py-0.5 rounded text-xs cursor-pointer ${priorityColors[value] || 'bg-[var(--background-tertiary)]'}`}
        >
          {value}
        </span>
      );
    }

    // Status badge
    if (category === 'projects' && colIndex === 1) {
      const statusColors: Record<string, string> = {
        active: 'bg-green-500/20 text-green-400',
        'on-hold': 'bg-yellow-500/20 text-yellow-400',
        completed: 'bg-zinc-500/20 text-zinc-400',
      };
      return (
        <span
          onClick={() => setEditingId(`${entry.id}-${colIndex}`)}
          className={`inline-block px-2 py-0.5 rounded text-xs cursor-pointer ${statusColors[value] || 'bg-[var(--background-tertiary)]'}`}
        >
          {value}
        </span>
      );
    }

    // Projects goal column - make it a clickable link with truncation
    if (category === 'projects' && colIndex === 0) {
      const displayValue = truncateText(value, 60);
      return (
        <Link
          href={`/projects/${entry.id}`}
          className="cursor-pointer hover:text-[var(--accent)] underline decoration-dotted"
          title={value}
        >
          {displayValue || <span className="text-[var(--foreground-muted)] italic">empty</span>}
        </Link>
      );
    }

    // Ideas insight column - make it a clickable link with truncation
    if (category === 'ideas' && colIndex === 0) {
      const displayValue = truncateText(value, 60);
      return (
        <Link
          href={`/ideas/${entry.id}`}
          className="cursor-pointer hover:text-[var(--accent)] underline decoration-dotted"
          title={value} // Show full text on hover
        >
          {displayValue || <span className="text-[var(--foreground-muted)] italic">empty</span>}
        </Link>
      );
    }

    // Tasks column - make task name a clickable link with truncation
    if (category === 'tasks' && colIndex === 0) {
      const displayValue = truncateText(value, 60);
      return (
        <Link
          href={`/task/${entry.id}`}
          className="cursor-pointer hover:text-[var(--accent)] underline decoration-dotted"
          title={value} // Show full text on hover
        >
          {displayValue || <span className="text-[var(--foreground-muted)] italic">empty</span>}
        </Link>
      );
    }

    return (
      <span
        onClick={() => isClickableName ? undefined : setEditingId(`${entry.id}-${colIndex}`)}
        className={`cursor-pointer hover:text-[var(--accent)] ${isClickableName ? 'underline decoration-dotted' : ''}`}
      >
        {value || <span className="text-[var(--foreground-muted)] italic">empty</span>}
      </span>
    );
  };

  return (
    <div
      className="card-hover-lift bg-[var(--background-secondary)]/80 backdrop-blur-sm border border-[var(--border)] rounded-xl overflow-hidden shadow-sm"
      id={`card-${category}`}
    >
      <div
        className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background-tertiary)]/30"
        style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90"
            style={{ backgroundColor: `${accentColor}40` }}
          >
            <CategoryIcon category={category} className="h-4 w-4" style={{ color: accentColor }} />
          </span>
          <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        <span className="text-xs font-medium text-[var(--foreground-muted)] bg-[var(--background-tertiary)] px-2 py-1 rounded-md">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed opacity-60"
            style={{ borderColor: accentColor }}
          >
            <CategoryIcon category={category} className="h-6 w-6" style={{ color: accentColor }} />
          </div>
          <p className="text-sm font-medium text-[var(--foreground-muted)]">No {title.toLowerCase()} yet</p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Capture something and it’ll show up here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background-tertiary)] transition-colors"
                >
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 break-words max-w-xs">
                      {renderCell(entry, colIndex)}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      {onArchive && (
                        <button
                          onClick={() => onArchive(entry.id)}
                          className="p-1 text-[var(--foreground-muted)] hover:text-green-400 transition-colors"
                          title="Archive"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="p-1 text-[var(--foreground-muted)] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CategoryIcon({
  category,
  className,
  style,
}: {
  category: Category;
  className?: string;
  style?: React.CSSProperties;
}) {
  const props = { className, style };
  switch (category) {
    case 'people':
      return (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case 'projects':
      return (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case 'ideas':
      return (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      );
    case 'tasks':
      return (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}
