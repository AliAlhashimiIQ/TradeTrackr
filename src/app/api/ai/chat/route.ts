import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { trades, question } = await req.json();
  if (!trades || !question) {
    return NextResponse.json({ error: 'Missing trades or question' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
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
      return NextResponse.json({ error: 'OpenAI API error', details: err }, { status: 500 });
    }
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No answer generated.';
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to call OpenAI', details: (error as any).toString() }, { status: 500 });
  }
} 
