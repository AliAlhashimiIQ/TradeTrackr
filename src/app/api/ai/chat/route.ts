import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit, rateLimitExceeded } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const auth = await authenticateRequest(req);
  if ('error' in auth && auth.error) return auth.error;

  // 2. Rate limit (15 chat messages/minute per user)
  const { allowed, resetIn } = checkRateLimit(auth.user!.id, 15, 60_000);
  if (!allowed) return rateLimitExceeded(resetIn);

  // 3. Parse and validate body
  let body: { trades: any[]; question: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { trades, question } = body;
  if (!trades || !question) {
    return NextResponse.json({ error: 'Missing trades or question' }, { status: 400 });
  }

  if (typeof question !== 'string' || question.length > 2000) {
    return NextResponse.json({ error: 'Question must be a string under 2000 characters' }, { status: 400 });
  }

  // 4. Call OpenAI (server-side only)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  // Format trades for the prompt (limit to 10 for brevity)
  const tradesForPrompt = trades.slice(0, 10).map((t: any, i: number) =>
    `Trade #${i + 1}: Symbol=${t.symbol}, Type=${t.type}, Entry=${t.entry_price}, Exit=${t.exit_price}, Qty=${t.quantity}, P&L=${t.profit_loss}, Tags=${(t.tags || []).join(',')}, Notes=${t.notes || ''}`
  ).join('\n');

  const prompt = `You are a professional trading coach AI. The user selected these trades:\n${tradesForPrompt}\n\nUser question: ${question}\n\nGive a detailed, actionable answer based only on the provided trades. If the user asks about FOMO, tags, emotions, or performance, analyze those. If the user asks for a summary, provide stats and patterns. Be concise but insightful.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful trading coach AI.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI API error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No answer generated.';
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Failed to call OpenAI:', error);
    return NextResponse.json({ error: 'Failed to call AI service' }, { status: 500 });
  }
} 
