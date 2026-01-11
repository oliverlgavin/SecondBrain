# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Production build
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 "Second Brain" application - an AI-powered personal knowledge management system.

### Tech Stack
- Next.js 16 App Router + React 19
- Tailwind CSS 4 (CSS-first config)
- Supabase (Postgres database)
- Anthropic Claude 3.5 Sonnet (AI categorization)
- Web Speech API (voice input)

### Core Flow
```
User Input → /api/capture (Claude AI) → Supabase entries table
                    ↓
         confidence >= 0.6? → Dashboard card
         confidence < 0.6?  → Review Sidebar
```

### Database Schema
Single `entries` table with JSONB `data` field. Categories: people, projects, ideas, tasks.

### Key Files
- `src/app/page.tsx` - Main dashboard (client component)
- `src/app/api/capture/route.ts` - AI categorization endpoint
- `src/app/api/entries/route.ts` - CRUD operations
- `src/app/api/summary/route.ts` - Morning briefing generator
- `src/middleware.ts` - Password auth check
- `src/lib/supabase.ts` - DB client + TypeScript types

### Components
- `CaptureZone` - Text input + voice recording
- `LiveCard` - Category card with inline editing
- `ReviewSidebar` - Uncertain entries queue
- `MorningSummary` - AI-generated daily focus

## Environment Variables

Copy `.env.local.example` to `.env.local`:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Database connection
- `ANTHROPIC_API_KEY` - Claude API
- `APP_PASSWORD` - Simple auth password

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entries_category ON entries(category);
CREATE INDEX idx_entries_archived ON entries(archived);
```
