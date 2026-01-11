import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

export type Category = 'people' | 'projects' | 'ideas' | 'tasks';

export interface PeopleData {
  name: string;
  context: string;
  lastContact: string;
}

export interface ProjectData {
  goal: string;
  status: 'active' | 'on-hold' | 'completed';
  nextAction: string;
}

export interface IdeaData {
  insight: string;
  category: string;
  date: string;
  notes?: string;
  timeEstimate?: string;
  saved?: boolean;
}

export interface TaskData {
  task: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
  location?: string;
  notes?: string;
}

export type EntryData = PeopleData | ProjectData | IdeaData | TaskData;

export interface Entry {
  id: string;
  category: Category;
  data: EntryData;
  confidence: number;
  needs_review: boolean;
  archived: boolean;
  linked_entries: string[];
  created_at: string;
  updated_at: string;
  user_id?: string;
}
