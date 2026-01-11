import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { IdeaData } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ideaId } = await params;
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the current idea
    const { data: idea, error: fetchError } = await supabase
      .from('entries')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (idea.category !== 'ideas') {
      return NextResponse.json({ error: 'Entry is not an idea' }, { status: 400 });
    }

    const ideaData = idea.data as IdeaData;
    const newSavedState = !ideaData.saved;

    // Update the saved status
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        data: { ...ideaData, saved: newSavedState },
        updated_at: new Date().toISOString()
      })
      .eq('id', ideaId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ saved: newSavedState });
  } catch (error) {
    console.error('Save toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle save status' },
      { status: 500 }
    );
  }
}
