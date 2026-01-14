import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import { Entry, TaskData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequest {
  message: string;
  userLocation: {
    latitude: number | null;
    longitude: number | null;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createServerSupabase();

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the task
    const { data: task, error: fetchError } = await supabase
      .from('entries')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.category !== 'tasks') {
      return NextResponse.json({ error: 'Entry is not a task' }, { status: 400 });
    }

    const body: ChatRequest = await request.json();
    const { message, userLocation } = body;

    const taskData = task.data as TaskData;

    // Fetch other tasks for conflict detection
    const { data: otherTasks } = await supabase
      .from('entries')
      .select('*')
      .eq('category', 'tasks')
      .eq('user_id', user.id)
      .neq('id', taskId)
      .eq('archived', false);

    // Calculate distance if user has location and task has location
    let distanceInfo = '';
    if (userLocation.latitude && userLocation.longitude && taskData.location) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        try {
          const origin = `${userLocation.latitude},${userLocation.longitude}`;
          const destination = encodeURIComponent(taskData.location);
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&departure_time=now&key=${apiKey}`;

          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const element = data.rows?.[0]?.elements?.[0];
            if (element?.status === 'OK') {
              const duration = element.duration_in_traffic?.text || element.duration?.text;
              const distance = element.distance?.text;
              distanceInfo = `Distance to task location: ${distance}, Travel time: ${duration} (with current traffic)`;
            }
          }
        } catch (err) {
          console.error('Error fetching distance:', err);
        }
      }
    }

    // Build the system prompt - context aware based on task type
    const hasLocation = Boolean(taskData.location);

    const systemPrompt = `You are a smart task assistant that adapts to the task type.

Current Task Information:
- Task: ${taskData.task}
- Status: ${taskData.status || 'pending'}
- Priority: ${taskData.priority || 'medium'}
- Deadline: ${taskData.deadline || 'Not set'}
- Location: ${taskData.location || 'None (simple task)'}
- Notes: ${taskData.notes || 'None'}

${hasLocation ? `
TASK TYPE: Location-based errand
${distanceInfo ? `Current Distance: ${distanceInfo}` : 'User GPS: Not available'}

Focus on logistics and travel. When asked "how far" or about distance, provide the travel info above.
` : `
TASK TYPE: Simple task (no location)
Focus on productivity and task management. Don't mention travel or directions.
`}

${otherTasks && otherTasks.length > 0 ? `
Other Tasks (for conflict detection):
${otherTasks.map((t: Entry) => {
  const td = t.data as TaskData;
  return `- ${td.task} (Deadline: ${td.deadline || 'Not set'})`;
}).join('\n')}
` : ''}

When the user wants to modify the task, respond with a JSON object at the END of your message:
{"action": "update", "updates": {"field": "value"}}

Valid fields:
- task (string): Task name
- status: "pending", "in-progress", or "completed"
- priority: "low", "medium", or "high"
- deadline (string): Date/time
- location (string): Address - ADDING a location turns this into a location task, REMOVING (empty string) makes it a simple task
- notes (string): Clean up and improve grammar before saving

Examples:
- "Change priority to high" → {"action": "update", "updates": {"priority": "high"}}
- "Mark complete" → {"action": "update", "updates": {"status": "completed"}}
- "Add note: bring laptop" → {"action": "update", "updates": {"notes": "Bring laptop."}}
- "Clear notes" → {"action": "update", "updates": {"notes": ""}}
- "Add location: 123 Main St" → {"action": "update", "updates": {"location": "123 Main St"}}
- "Remove location" → {"action": "update", "updates": {"location": ""}}
${hasLocation ? `- "Get directions" → IMPORTANT: Use EXACTLY this URL format: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(taskData.location || '')}
- "How far am I?" → Tell them: ${distanceInfo || 'Location services unavailable'}

CRITICAL: When providing directions links, use ONLY this exact format: https://www.google.com/maps/dir/?api=1&destination=ENCODED_ADDRESS
Never make up or hallucinate URLs. Only use the exact URL pattern above with the task's location.` : ''}

Be concise. ${hasLocation ? 'Proactively mention travel time if relevant.' : 'Focus on helping them complete the task efficiently.'}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the response for actions
    let taskUpdated = false;
    let finalResponse = assistantMessage;

    // Look for JSON action in the message - handle nested objects
    const jsonMatch = assistantMessage.match(/\{"action":\s*"[^"]+",\s*"(?:updates|url)":\s*\{[^{}]*\}\s*\}|\{"action":\s*"[^"]+",\s*"url":\s*"[^"]+"\s*\}/);

    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[0]);

        if (action.action === 'update' && action.updates) {
          // Handle notes append
          if (action.updates.notes && taskData.notes && message.toLowerCase().includes('add to notes')) {
            action.updates.notes = `${taskData.notes}\n${action.updates.notes}`;
          }

          // Parse natural language dates
          if (action.updates.deadline) {
            const parsedDate = parseNaturalDate(action.updates.deadline);
            if (parsedDate) {
              action.updates.deadline = parsedDate;
            }
          }

          // Update the task in database
          const updatedData = { ...taskData, ...action.updates };
          const { error: updateError } = await supabase
            .from('entries')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .eq('user_id', user.id);

          if (!updateError) {
            taskUpdated = true;
          }
        }

        // Remove the JSON from the displayed response
        finalResponse = assistantMessage.replace(jsonMatch[0], '').trim();
      } catch (err) {
        console.error('Error parsing action:', err);
      }
    }

    return NextResponse.json({
      response: finalResponse,
      taskUpdated,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

function parseNaturalDate(input: string): string | null {
  const now = new Date();
  const lowered = input.toLowerCase().trim();

  if (lowered === 'today') {
    return now.toISOString();
  }

  if (lowered === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  if (lowered === 'next week') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString();
  }

  // Try parsing with time
  const timeMatch = lowered.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3];

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const dateWithTime = new Date(now);

    // Check if it includes a day reference
    if (lowered.includes('tomorrow')) {
      dateWithTime.setDate(dateWithTime.getDate() + 1);
    }

    dateWithTime.setHours(hours, minutes, 0, 0);
    return dateWithTime.toISOString();
  }

  // Try parsing as ISO date
  try {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}
