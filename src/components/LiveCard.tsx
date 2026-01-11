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

    // Ideas insight column - make it a clickable link
    if (category === 'ideas' && colIndex === 0) {
      return (
        <Link
          href={`/ideas/${entry.id}`}
          className="cursor-pointer hover:text-[var(--accent)] underline decoration-dotted"
        >
          {value || <span className="text-[var(--foreground-muted)] italic">empty</span>}
        </Link>
      );
    }

    // Tasks column - make task name a clickable link
    if (category === 'tasks' && colIndex === 0) {
      return (
        <Link
          href={`/task/${entry.id}`}
          className="cursor-pointer hover:text-[var(--accent)] underline decoration-dotted"
        >
          {value || <span className="text-[var(--foreground-muted)] italic">empty</span>}
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
      className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg overflow-hidden"
      id={`card-${category}`}
    >
      <div
        className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between"
        style={{ borderTopColor: accentColor, borderTopWidth: '2px' }}
      >
        <h3 className="font-medium text-[var(--foreground)]">{title}</h3>
        <span className="text-xs text-[var(--foreground-muted)]">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center text-[var(--foreground-muted)] text-sm">
          No {title.toLowerCase()} yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                    <td key={colIndex} className="px-4 py-2">
                      {renderCell(entry, colIndex)}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      {category === 'tasks' && onArchive && (
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
