import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit, rateLimitExceeded } from '@/lib/apiAuth';

/**
 * POST /api/ai/analyze
 * Server-side OpenAI proxy for trade analysis.
 * Replaces the client-side callOpenAIForAnalytics() that was exposing the API key.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate
  const auth = await authenticateRequest(req);
  if ('error' in auth && auth.error) return auth.error;

  // 2. Rate limit (10 requests/minute per user)
  const { allowed, resetIn } = checkRateLimit(auth.user!.id, 10, 60_000);
  if (!allowed) return rateLimitExceeded(resetIn);

  // 3. Parse body
  let body: { prompt: string; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, max_tokens = 600 } = body;
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid prompt' }, { status: 400 });
  }

  // 4. Reject excessively long prompts
  if (prompt.length > 10_000) {
    return NextResponse.json({ error: 'Prompt too long (max 10,000 characters)' }, { status: 400 });
  }

  // 5. Call OpenAI (server-side only — key never leaves the server)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

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
          { role: 'system', content: 'You are a professional trading coach AI. Respond in JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: Math.min(max_tokens, 1000), // Cap at 1000 tokens
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI API error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Try to parse as JSON, fall back to raw string
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = content;
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Failed to call OpenAI:', error);
    return NextResponse.json({ error: 'Failed to call AI service' }, { status: 500 });
  }
}
