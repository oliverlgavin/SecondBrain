import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import { IdeaData } from '@/lib/supabase';

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
    timeEstimate: string;
  };
}

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

    const body: ChatRequest = await request.json();
    const { message, suggestions } = body;

    const ideaData = idea.data as IdeaData;

    const systemPrompt = `You are a helpful idea assistant. You help users develop and refine their ideas.

Current Idea:
- Insight: ${ideaData.insight}
- Category: ${ideaData.category}
- Date: ${ideaData.date}
- Time Estimate: ${ideaData.timeEstimate || 'Not set (AI will generate)'}
- Notes: ${ideaData.notes || 'None'}

${suggestions ? `
Current AI-Generated Plan:
- Summary: ${suggestions.summary}
- Default Time Estimate: ${suggestions.timeEstimate}
- Steps: ${suggestions.steps.map((s, i) => `${i + 1}. ${s.title}`).join(', ')}
` : ''}

You can help the user:
1. Edit the idea details (insight, category, timeEstimate, notes)
2. Discuss and refine the implementation plan
3. Answer questions about how to execute the idea

When the user wants to edit the idea, respond with a JSON object at the END of your message:
{"action": "update", "updates": {"field": "value"}}

Valid fields:
- insight (string): The main idea/insight - clean up grammar and make it clear
- category (string): The idea category
- timeEstimate (string): Custom time estimate (e.g., "4-8 months", "2 weeks")
- notes (string): Additional notes about the idea

Examples:
- "Change insight to: Build a mobile app" → {"action": "update", "updates": {"insight": "Build a mobile app"}}
- "Update category to business" → {"action": "update", "updates": {"category": "business"}}
- "Change the estimated time to 4-8 months" → {"action": "update", "updates": {"timeEstimate": "4-8 months"}}
- "Add a note: Need to research suppliers first" → {"action": "update", "updates": {"notes": "Need to research suppliers first"}}

IMPORTANT: When the user asks to change ANY field (insight, category, timeEstimate, notes), you MUST include the JSON action at the end of your response. Always include the JSON - never skip it when making changes.

Be concise and helpful. Focus on making the idea actionable.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    let ideaUpdated = false;
    let finalResponse = assistantMessage;
    let actionUpdates: Record<string, string> | undefined = undefined;

    // Try multiple regex patterns to catch different JSON formats
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
        // Clean up the JSON string
        const cleanJson = matchedJson.replace(/```json\s*|\s*```/g, '').trim();
        const action = JSON.parse(cleanJson);

        console.log('Parsed action:', action);

        if (action.action === 'update' && action.updates) {
          actionUpdates = action.updates;
          const updatedData = { ...ideaData, ...action.updates };
          console.log('Updating idea with:', updatedData);

          const { error: updateError } = await supabase
            .from('entries')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', ideaId)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Database update error:', updateError);
          } else {
            ideaUpdated = true;
            console.log('Idea updated successfully');
          }
        }

        if (jsonMatch) {
          finalResponse = assistantMessage.replace(jsonMatch[0], '').trim();
        }
      } catch (err) {
        console.error('Error parsing action:', err, 'Raw match:', matchedJson);
      }
    } else {
      console.log('No JSON action found in response:', assistantMessage.substring(0, 200));
    }

    console.log('Returning response:', { ideaUpdated, actionUpdates });

    return NextResponse.json({
      response: finalResponse,
      ideaUpdated,
      updatedFields: actionUpdates,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
