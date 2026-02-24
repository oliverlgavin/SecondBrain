import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import { ProjectData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequest {
  message: string;
  suggestions?: {
    summary: string;
    steps: { title: string; description: string }[];
    resources: string[];
    considerations: string[];
    milestones: string[];
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: project, error: fetchError } = await supabase
      .from('entries')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.category !== 'projects') {
      return NextResponse.json({ error: 'Entry is not a project' }, { status: 400 });
    }

    const body: ChatRequest = await request.json();
    const { message, suggestions } = body;

    const projectData = project.data as ProjectData;

    const systemPrompt = `You are a helpful project advisor. You help users plan, execute, and complete their projects.

Current Project:
- Goal: ${projectData.goal}
- Status: ${projectData.status}
- Next Action: ${projectData.nextAction}

${suggestions ? `
Current AI-Generated Plan:
- Summary: ${suggestions.summary}
- Milestones: ${suggestions.milestones.join(', ')}
- Steps: ${suggestions.steps.map((s, i) => `${i + 1}. ${s.title}`).join(', ')}
` : ''}

You can help the user:
1. Edit the project details (goal, status, nextAction)
2. Discuss strategy and next steps
3. Help break down work and unblock progress

When the user wants to edit the project, respond with a JSON object at the END of your message:
{"action": "update", "updates": {"field": "value"}}

Valid fields:
- goal (string): The project goal
- status (string): Must be one of "active", "on-hold", or "completed"
- nextAction (string): The immediate next step to take

Examples:
- "Change status to on-hold" → {"action": "update", "updates": {"status": "on-hold"}}
- "Update next action to: Set up the database" → {"action": "update", "updates": {"nextAction": "Set up the database"}}
- "Change the goal to: Launch MVP by March" → {"action": "update", "updates": {"goal": "Launch MVP by March"}}

IMPORTANT: When the user asks to change ANY field (goal, status, nextAction), you MUST include the JSON action at the end of your response. Always include the JSON - never skip it when making changes.

Be concise and helpful. Focus on actionable advice that moves the project forward.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    let projectUpdated = false;
    let finalResponse = assistantMessage;
    let actionUpdates: Record<string, string> | undefined = undefined;

    const jsonPatterns = [
      /\{"action":\s*"update",\s*"updates":\s*\{[^{}]*\}\}/,
      /\{"action":\s*"[^"]+",\s*"updates":\s*\{[^{}]*\}\s*\}/,
      /```json\s*(\{[\s\S]*?\})\s*```/,
    ];

    let jsonMatch = null;
    let matchedJson = null;

    for (const pattern of jsonPatterns) {
      const match = assistantMessage.match(pattern);
      if (match) {
        jsonMatch = match;
        matchedJson = match[1] || match[0];
        break;
      }
    }

    if (matchedJson) {
      try {
        const cleanJson = matchedJson.replace(/```json\s*|\s*```/g, '').trim();
        const action = JSON.parse(cleanJson);

        if (action.action === 'update' && action.updates) {
          // Validate status field if present
          if (action.updates.status && !['active', 'on-hold', 'completed'].includes(action.updates.status)) {
            delete action.updates.status;
          }

          actionUpdates = action.updates;
          const updatedData = { ...projectData, ...action.updates };

          const { error: updateError } = await supabase
            .from('entries')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Database update error:', updateError);
          } else {
            projectUpdated = true;
          }
        }

        if (jsonMatch) {
          finalResponse = assistantMessage.replace(jsonMatch[0], '').trim();
        }
      } catch (err) {
        console.error('Error parsing action:', err, 'Raw match:', matchedJson);
      }
    }

    return NextResponse.json({
      response: finalResponse,
      projectUpdated,
      updatedFields: actionUpdates,
    });
  } catch (error) {
    console.error('Project chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
