import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import { IdeaData } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(
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

    const ideaData = idea.data as IdeaData;

    // Generate suggestions
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are an expert consultant helping to create actionable implementation plans. Return a JSON object with this structure:
{
  "summary": "Brief 1-2 sentence summary",
  "steps": [{"title": "Step title", "description": "Detailed description"}],
  "resources": ["Resource 1", "Resource 2"],
  "considerations": ["Thing to consider 1", "Thing to consider 2"],
  "timeEstimate": "Estimated time to complete"
}
Return ONLY valid JSON.`,
      messages: [
        {
          role: 'user',
          content: `Create an implementation plan for this idea: "${ideaData.insight}" (Category: ${ideaData.category})`,
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    let suggestions;
    try {
      suggestions = JSON.parse(responseText);
    } catch {
      suggestions = {
        summary: 'Unable to generate summary',
        steps: [],
        resources: [],
        considerations: [],
        timeEstimate: 'Unknown',
      };
    }

    // Generate HTML document styled like a clean web document
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ideaData.insight} - Implementation Plan</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .meta {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .category {
      background: #fef3c7;
      color: #92400e;
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 500;
    }

    .date {
      color: #6b7280;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }

    .summary {
      font-size: 16px;
      color: #4b5563;
    }

    .time-estimate {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #f3f4f6;
      border-radius: 8px;
      margin-bottom: 32px;
      font-size: 14px;
      color: #374151;
    }

    .time-estimate strong {
      color: #1a1a1a;
    }

    .section {
      margin-bottom: 32px;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }

    .steps {
      counter-reset: step;
    }

    .step {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .step-number {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      background: #ede9fe;
      color: #7c3aed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .step-content h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .step-content p {
      font-size: 14px;
      color: #4b5563;
    }

    .list-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #4b5563;
    }

    .list-item .icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .icon-check {
      color: #10b981;
    }

    .icon-warning {
      color: #f59e0b;
    }

    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    @media print {
      body {
        padding: 20px;
      }

      .header {
        break-after: avoid;
      }

      .section {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="meta">
      <span class="category">${ideaData.category}</span>
      <span class="date">${new Date(ideaData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
    <h1>${ideaData.insight}</h1>
    <p class="summary">${suggestions.summary}</p>
  </div>

  <div class="time-estimate">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
    Estimated time: <strong>${ideaData.timeEstimate || suggestions.timeEstimate}</strong>
  </div>

  <div class="section">
    <h2>Implementation Steps</h2>
    <div class="steps">
      ${suggestions.steps.map((step: { title: string; description: string }, i: number) => `
        <div class="step">
          <div class="step-number">${i + 1}</div>
          <div class="step-content">
            <h3>${step.title}</h3>
            <p>${step.description}</p>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  ${suggestions.resources.length > 0 ? `
  <div class="section">
    <h2>Helpful Resources</h2>
    ${suggestions.resources.map((resource: string) => `
      <div class="list-item">
        <svg class="icon icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>${resource}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${suggestions.considerations.length > 0 ? `
  <div class="section">
    <h2>Things to Consider</h2>
    ${suggestions.considerations.map((item: string) => `
      <div class="list-item">
        <svg class="icon icon-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>${item}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    Generated by Second Brain &bull; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>

  <script>
    // Auto-trigger print dialog
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
