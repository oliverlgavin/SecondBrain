import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import { IdeaData } from '@/lib/supabase';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST endpoint - uses pre-generated suggestions from client
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

    const ideaData = idea.data as IdeaData;

    // Get suggestions from form data
    const formData = await request.formData();
    const suggestionsJson = formData.get('suggestions') as string;
    let suggestions;

    try {
      suggestions = JSON.parse(suggestionsJson);
    } catch {
      suggestions = {
        summary: 'Unable to load summary',
        steps: [],
        resources: [],
        considerations: [],
        timeEstimate: 'Unknown',
      };
    }

    return generatePDFResponse(ideaData, suggestions);
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// GET endpoint - generates suggestions on the fly (fallback)
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

    return generatePDFResponse(ideaData, suggestions);
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// Helper to wrap text into lines
function wrapText(text: string, maxWidth: number, font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function generatePDFResponse(ideaData: IdeaData, suggestions: {
  summary: string;
  steps: { title: string; description: string }[];
  resources: string[];
  considerations: string[];
  timeEstimate: string;
}) {
  try {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions in points
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const purple = rgb(0.486, 0.227, 0.929);
  const darkGray = rgb(0.102, 0.102, 0.102);
  const mediumGray = rgb(0.294, 0.333, 0.388);
  const lightGray = rgb(0.612, 0.639, 0.686);
  const amber = rgb(0.573, 0.251, 0.055);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (y - neededSpace < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // Category and date header
  const categoryText = ideaData.category.toUpperCase();
  const dateText = new Date(ideaData.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  page.drawText(categoryText, {
    x: margin,
    y,
    size: 10,
    font: helveticaBold,
    color: amber,
  });

  const categoryWidth = helveticaBold.widthOfTextAtSize(categoryText, 10);
  page.drawText(`    ${dateText}`, {
    x: margin + categoryWidth,
    y,
    size: 10,
    font: helvetica,
    color: lightGray,
  });

  y -= 30;

  // Title
  const titleLines = wrapText(ideaData.insight, contentWidth, helveticaBold, 22);
  for (const line of titleLines) {
    checkPageBreak(30);
    page.drawText(line, {
      x: margin,
      y,
      size: 22,
      font: helveticaBold,
      color: darkGray,
    });
    y -= 28;
  }

  y -= 10;

  // Summary
  const summaryLines = wrapText(suggestions.summary, contentWidth, helvetica, 12);
  for (const line of summaryLines) {
    checkPageBreak(18);
    page.drawText(line, {
      x: margin,
      y,
      size: 12,
      font: helvetica,
      color: mediumGray,
    });
    y -= 18;
  }

  y -= 15;

  // Purple divider line
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 2,
    color: purple,
  });

  y -= 30;

  // Time estimate
  checkPageBreak(40);
  page.drawRectangle({
    x: margin,
    y: y - 25,
    width: contentWidth,
    height: 35,
    color: rgb(0.953, 0.957, 0.965),
  });

  page.drawText('Estimated time: ', {
    x: margin + 20,
    y: y - 15,
    size: 11,
    font: helvetica,
    color: mediumGray,
  });

  const timeLabel = helvetica.widthOfTextAtSize('Estimated time: ', 11);
  page.drawText(ideaData.timeEstimate || suggestions.timeEstimate, {
    x: margin + 20 + timeLabel,
    y: y - 15,
    size: 11,
    font: helveticaBold,
    color: darkGray,
  });

  y -= 55;

  // Implementation Steps section
  checkPageBreak(50);
  page.drawText('Implementation Steps', {
    x: margin,
    y,
    size: 16,
    font: helveticaBold,
    color: darkGray,
  });

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.898, 0.906, 0.922),
  });

  y -= 25;

  // Steps
  for (let i = 0; i < suggestions.steps.length; i++) {
    const step = suggestions.steps[i];
    checkPageBreak(60);

    // Step number circle
    page.drawCircle({
      x: margin + 15,
      y: y - 2,
      size: 12,
      color: rgb(0.929, 0.914, 0.992),
    });

    page.drawText(`${i + 1}`, {
      x: margin + 11,
      y: y - 6,
      size: 10,
      font: helveticaBold,
      color: purple,
    });

    // Step title
    page.drawText(step.title, {
      x: margin + 40,
      y,
      size: 12,
      font: helveticaBold,
      color: darkGray,
    });

    y -= 18;

    // Step description
    const descLines = wrapText(step.description, contentWidth - 40, helvetica, 11);
    for (const line of descLines) {
      checkPageBreak(16);
      page.drawText(line, {
        x: margin + 40,
        y,
        size: 11,
        font: helvetica,
        color: mediumGray,
      });
      y -= 16;
    }

    y -= 15;
  }

  // Resources section
  if (suggestions.resources.length > 0) {
    y -= 10;
    checkPageBreak(50);

    page.drawText('Helpful Resources', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: darkGray,
    });

    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.898, 0.906, 0.922),
    });

    y -= 20;

    for (const resource of suggestions.resources) {
      checkPageBreak(20);

      page.drawText('-', {
        x: margin + 5,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.063, 0.725, 0.506),
      });

      const resourceLines = wrapText(resource, contentWidth - 25, helvetica, 11);
      for (let i = 0; i < resourceLines.length; i++) {
        if (i > 0) {
          checkPageBreak(16);
        }
        page.drawText(resourceLines[i], {
          x: margin + 25,
          y,
          size: 11,
          font: helvetica,
          color: mediumGray,
        });
        if (i < resourceLines.length - 1) {
          y -= 16;
        }
      }

      y -= 18;
    }
  }

  // Considerations section
  if (suggestions.considerations.length > 0) {
    y -= 10;
    checkPageBreak(50);

    page.drawText('Things to Consider', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: darkGray,
    });

    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.898, 0.906, 0.922),
    });

    y -= 20;

    for (const item of suggestions.considerations) {
      checkPageBreak(20);

      page.drawText('!', {
        x: margin + 7,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.961, 0.62, 0.043),
      });

      const itemLines = wrapText(item, contentWidth - 25, helvetica, 11);
      for (let i = 0; i < itemLines.length; i++) {
        if (i > 0) {
          checkPageBreak(16);
        }
        page.drawText(itemLines[i], {
          x: margin + 25,
          y,
          size: 11,
          font: helvetica,
          color: mediumGray,
        });
        if (i < itemLines.length - 1) {
          y -= 16;
        }
      }

      y -= 18;
    }
  }

  // Footer
  y -= 20;
  checkPageBreak(30);

  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.898, 0.906, 0.922),
  });

  y -= 15;

  const footerText = `Generated by Second Brain - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  const footerWidth = helvetica.widthOfTextAtSize(footerText, 9);
  page.drawText(footerText, {
    x: (pageWidth - footerWidth) / 2,
    y,
    size: 9,
    font: helvetica,
    color: lightGray,
  });

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();

  // Create filename from idea title
  const filename = ideaData.insight
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 50)
    .toLowerCase();

  // Convert to Buffer for NextResponse compatibility
  const pdfBuffer = Buffer.from(pdfBytes);

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}_plan.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    },
  });
  } catch (error) {
    console.error('PDF generation internal error:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
