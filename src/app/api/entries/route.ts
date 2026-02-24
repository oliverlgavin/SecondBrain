import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const archivedParam = searchParams.get('archived');
  const needsReview = searchParams.get('needs_review') === 'true';

  let query = supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (archivedParam === 'only') {
    query = query.eq('archived', true);
  } else if (archivedParam !== 'true') {
    query = query.eq('archived', false);
  }

  if (needsReview) {
    query = query.eq('needs_review', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('entries')
      .insert({
        category: body.category,
        data: body.data,
        confidence: body.confidence ?? 1.0,
        needs_review: body.needs_review ?? false,
        archived: false,
        linked_entries: body.linked_entries ?? [],
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
