import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import type { TaskData, ProjectData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ bullets: [] });
  }

  try {
    // Fetch active tasks and projects for this user
    const [tasksResult, projectsResult] = await Promise.all([
      supabase
        .from('entries')
        .select('*')
        .eq('category', 'tasks')
        .eq('archived', false)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('entries')
        .select('*')
        .eq('category', 'projects')
        .eq('archived', false)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const tasks = tasksResult.data || [];
    const projects = projectsResult.data || [];

    if (tasks.length === 0 && projects.length === 0) {
      return NextResponse.json({ bullets: [] });
    }

    const taskSummary = tasks
      .map((t) => {
        const data = t.data as TaskData;
        return `- Task: ${data.task} (Priority: ${data.priority}, Deadline: ${data.deadline})`;
      })
      .join('\n');

    const projectSummary = projects
      .map((p) => {
        const data = p.data as ProjectData;
        return `- Project: ${data.goal} (Status: ${data.status}, Next: ${data.nextAction})`;
      })
      .join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Based on these tasks and projects, generate exactly 3 short, actionable focus points for today. Each should be 1 sentence max.

Tasks:
${taskSummary || 'No tasks'}

Projects:
${projectSummary || 'No projects'}

Return as a JSON array of 3 strings, nothing else. Example: ["Focus point 1", "Focus point 2", "Focus point 3"]`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

    let bullets: string[];
    try {
      bullets = JSON.parse(responseText);
    } catch {
      bullets = ['Review your pending tasks', 'Check project progress', 'Capture new ideas'];
    }

    return NextResponse.json({ bullets });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', bullets: [] },
      { status: 500 }
    );
  }
}
