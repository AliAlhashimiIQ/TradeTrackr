import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.tradingeconomics.com/calendar';

export async function GET(request: NextRequest) {
  // Use server-only key TRADING_ECONOMICS_API_KEY
  const apiKey = process.env.TRADING_ECONOMICS_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    // If key is not configured, return a 401 unauthorized so client can fall back to mock data
    return NextResponse.json({ error: 'Trading Economics API key is not configured on the server.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('c');
  const indicator = searchParams.get('i');
  const importance = searchParams.get('importance');
  const startDate = searchParams.get('d1');
  const endDate = searchParams.get('d2');

  const queryParts: string[] = [];
  queryParts.push(`client=${apiKey}`);

  if (country) queryParts.push(`c=${country}`);
  if (indicator) queryParts.push(`i=${indicator}`);
  if (importance) queryParts.push(`importance=${importance}`);
  if (startDate) queryParts.push(`d1=${startDate}`);
  if (endDate) queryParts.push(`d2=${endDate}`);

  const targetUrl = `${BASE_URL}?${queryParts.join('&')}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache results for 5 minutes
    });

    if (!response.ok) {
      console.error(`Trading Economics API returned status: ${response.status}`);
      return NextResponse.json({ error: `Trading Economics API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Calendar proxy endpoint error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
