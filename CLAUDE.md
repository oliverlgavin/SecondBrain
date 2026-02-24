# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Production build
- `npm run start` - Serve production build
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 "Second Brain" application — an AI-powered personal knowledge management system. All pages are client components using the App Router.

### Tech Stack
- Next.js 16 App Router + React 19
- Tailwind CSS 4 (CSS-first config via PostCSS, theme variables in `globals.css`)
- Supabase (Postgres database + email/password auth via `@supabase/ssr`)
- Anthropic Claude Sonnet (`claude-sonnet-4-20250514`) for AI features
- Web Speech API (voice input)
- Google Maps API (location tasks + distance calculation)
- pdf-lib (PDF export for ideas)

### Core Flow
```
User Input → /api/capture (Claude AI) → Supabase entries table
                    ↓
         confidence >= 0.6? → Dashboard card
         confidence < 0.6?  → Review Sidebar
```

### Authentication
Supabase email/password auth. Middleware (`src/middleware.ts`) uses `@supabase/ssr` `createServerClient` to check sessions and redirects unauthenticated users to `/login`. All API routes and DB queries are scoped to `user_id`.

### Database Schema
Single `entries` table with JSONB `data` field. Categories: people, projects, ideas, tasks. Each category has a different `data` shape defined in `src/lib/supabase.ts` (e.g., `PeopleData`, `ProjectData`, `IdeaData`, `TaskData`).

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/capture` | POST | AI categorization of free-text input via Claude |
| `/api/entries` | GET, POST | List entries (filterable) / create entry |
| `/api/entries/[id]` | GET, PATCH, DELETE | Single entry CRUD |
| `/api/summary` | GET | AI-generated daily focus (3 action items) |
| `/api/auth` | DELETE | Logout (Supabase sign out) |
| `/api/distance` | GET | Google Maps travel time calculation |
| `/api/ideas/[id]/suggestions` | GET | AI implementation plan for an idea |
| `/api/ideas/[id]/chat` | POST | Interactive AI chat to refine an idea |
| `/api/ideas/[id]/pdf` | POST, GET | PDF export of idea plan |
| `/api/ideas/[id]/save` | POST | Toggle saved/bookmarked status |
| `/api/task/[id]/chat` | POST | AI task management chat (location-aware) |

### Key Patterns

**Dynamic JSON Action Parsing**: AI chat responses (`/api/ideas/[id]/chat`, `/api/task/[id]/chat`) can include a JSON block at the end (e.g., `{"action": "update", "updates": {...}}`). The client-side code detects this via regex, extracts the JSON, removes it from the displayed message, and applies the updates to the entry.

**Confidence-Based Routing**: Entries with `confidence < 0.6` are marked `needs_review` and routed to the ReviewSidebar for manual categorization instead of appearing on the dashboard.

**Theme System**: CSS variables defined in `src/app/globals.css` under `:root` (dark default) and `[data-theme="light"]`. ThemeProvider (`src/components/ThemeProvider.tsx`) manages state via context + localStorage.

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `ANTHROPIC_API_KEY` — Claude API key (server-only)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps API key

## Supabase Setup

Run this SQL in Supabase SQL Editor:
```sql
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('people', 'projects', 'ideas', 'tasks')),
  data JSONB NOT NULL,
  confidence FLOAT,
  needs_review BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  linked_entries UUID[] DEFAULT '{}',
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entries_category ON entries(category);
CREATE INDEX idx_entries_archived ON entries(archived);
```
