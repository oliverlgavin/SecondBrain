import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function DELETE() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
