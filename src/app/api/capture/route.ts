import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import type { Category, EntryData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant that categorizes user inputs into one of four categories for a "Second Brain" application.

Categories:
1. "people" - Information about a person (name, how you know them, contact info)
2. "projects" - Goals, ongoing work, initiatives with action items
3. "ideas" - Insights, thoughts, concepts, creative sparks
4. "tasks" - Actionable to-do items with potential deadlines

Analyze the input and return a JSON object with:
{
  "category": "people" | "projects" | "ideas" | "tasks",
  "confidence": 0.0 to 1.0 (how confident you are in this categorization),
  "data": {
    // For people: { "name": string, "context": string, "lastContact": string }
    // For projects: { "goal": string, "status": "active" | "on-hold" | "completed", "nextAction": string }
    // For ideas: { "insight": string, "category": string, "date": string (ISO date) }
    // For tasks: { "task": string, "deadline": string (ISO date or "none"), "priority": "low" | "medium" | "high", "status": "pending" | "in-progress" | "completed", "location": string or null, "notes": string or null }
  },
  "mentionedPeople": string[] // Names of people mentioned (for cross-linking)
}

Guidelines:
- Extract as much relevant information as possible
- For dates, use ISO format (YYYY-MM-DD) or relative terms like "today", "tomorrow"
- Infer priority/status from context when not explicit
- If multiple categories seem to apply, choose the most specific one
- Set confidence < 0.6 if the input is too vague or ambiguous
- For tasks, extract location if mentioned (e.g., "meeting at Starbucks" → location: "Starbucks")
- For tasks, default status to "pending" unless otherwise specified

Return ONLY valid JSON, no markdown or explanation.`;

interface CaptureResult {
  category: Category;
  confidence: number;
  data: EntryData;
  mentionedPeople: string[];
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text, currentDate, currentTime, currentDay } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Build dynamic system prompt with current date context
    const dateContext = currentDate
      ? `\n\nCurrent date/time context:
- Today's date: ${currentDate} (${currentDay})
- Current time: ${currentTime}
- When user says "today", use: ${currentDate}
- When user says "tomorrow", calculate based on ${currentDate}
- When user says "next week", calculate 7 days from ${currentDate}`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Categorize this input: "${text}"`,
        },
      ],
      system: SYSTEM_PROMPT + dateContext,
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip markdown fences if Claude wraps JSON in ```json ... ```
    const responseText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    let result: CaptureResult;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse AI response:', rawText);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Determine if needs review
    const needsReview = result.confidence < 0.6;

    // Find linked people entries if any names were mentioned
    let linkedEntries: string[] = [];
    if (result.mentionedPeople && result.mentionedPeople.length > 0) {
      const { data: peopleEntries } = await supabase
        .from('entries')
        .select('id, data')
        .eq('category', 'people')
        .eq('archived', false)
        .eq('user_id', user.id);

      if (peopleEntries) {
        linkedEntries = peopleEntries
          .filter((entry) => {
            const name = (entry.data as { name?: string }).name?.toLowerCase();
            return result.mentionedPeople.some(
              (mentioned) => name?.includes(mentioned.toLowerCase())
            );
          })
          .map((entry) => entry.id);
      }
    }

    // Insert the entry
    const { data: newEntry, error } = await supabase
      .from('entries')
      .insert({
        category: result.category,
        data: result.data,
        confidence: result.confidence,
        needs_review: needsReview,
        archived: false,
        linked_entries: linkedEntries,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
    }

    return NextResponse.json({
      entry: newEntry,
      needsReview,
      mentionedPeople: result.mentionedPeople,
    });
  } catch (error) {
    console.error('Capture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
