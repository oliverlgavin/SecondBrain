import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import type { ProjectData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SYSTEM_PROMPT = `You are an AI project advisor that helps users plan and complete their projects. Given a project, provide practical guidance and a roadmap for achieving the goal.

Return a JSON object with:
{
  "summary": "A brief 1-2 sentence assessment of the project and its current state",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to do"
    }
  ],
  "resources": ["List of tools, technologies, or resources that could help"],
  "considerations": ["Important risks, blockers, or things to keep in mind"],
  "milestones": ["Key checkpoints to track progress toward the goal"]
}

Guidelines:
- Provide 4-6 actionable steps tailored to the project's current status
- If the project is "on-hold", suggest how to restart momentum
- If the project is "active", focus on the next action and moving forward
- Be specific and practical
- Consider dependencies between steps

Return ONLY valid JSON, no markdown or explanation.`;

export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const regenerate = searchParams.get('regenerate') === 'true';

  const { data: entry, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('category', 'projects')
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const projectData = entry.data as ProjectData & { suggestions?: unknown };

  // Return cached suggestions if available
  if (projectData.suggestions && !regenerate) {
    return NextResponse.json({ project: entry, suggestions: projectData.suggestions });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Help me complete this project:

Goal: ${projectData.goal}
Status: ${projectData.status}
Next Action: ${projectData.nextAction}

Please provide practical guidance and a roadmap for achieving this goal.`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const responseText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let suggestions;
    try {
      suggestions = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse project suggestions:', rawText);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Save suggestions to the entry's data
    await supabase
      .from('entries')
      .update({
        data: { ...projectData, suggestions },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ project: entry, suggestions });
  } catch (error) {
    console.error('Project suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
