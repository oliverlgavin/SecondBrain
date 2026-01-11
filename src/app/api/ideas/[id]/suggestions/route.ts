import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import type { IdeaData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SYSTEM_PROMPT = `You are an AI assistant that helps users implement their ideas. Given an idea, provide practical suggestions for how to bring it to life.

Return a JSON object with:
{
  "summary": "A brief 1-2 sentence summary of the idea",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to do"
    }
  ],
  "resources": ["List of tools, technologies, or resources that could help"],
  "considerations": ["Important things to keep in mind, potential challenges"],
  "timeEstimate": "Rough time estimate (e.g., '2-4 weeks', '1-2 months')"
}

Guidelines:
- Provide 4-6 actionable steps
- Be specific and practical
- Consider the user's perspective as someone implementing this themselves
- Include both technical and non-technical considerations where relevant

Return ONLY valid JSON, no markdown or explanation.`;

export async function GET(_request: Request, { params }: RouteParams) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the idea
  const { data: entry, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('category', 'ideas')
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  const ideaData = entry.data as IdeaData;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Help me implement this idea:

Idea: ${ideaData.insight}
Category: ${ideaData.category}
Date captured: ${ideaData.date}

Please provide practical suggestions for how to bring this idea to life.`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';

    let suggestions;
    try {
      suggestions = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      idea: entry,
      suggestions,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
