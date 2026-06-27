import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function mapSymbol(symbol: string): string {
  const cleaned = symbol.replace(/\.[a-zA-Z0-9]+$/, '').trim().toUpperCase();

  // 1. Direct index maps
  const indexMap: Record<string, string> = {
    'US30': '^DJI',
    'DJ30': '^DJI',
    'DOW30': '^DJI',
    'NAS100': '^NDX',
    'NDX100': '^NDX',
    'USTEC': '^NDX',
    'US100': '^NDX',
    'NASDAQ': '^NDX',
    'SPX500': '^GSPC',
    'US500': '^GSPC',
    'SPX': '^GSPC',
    'GER30': '^GDAXI',
    'GER40': '^GDAXI',
    'DE30': '^GDAXI',
    'DE40': '^GDAXI',
    'DAX': '^GDAXI',
    'DAX30': '^GDAXI',
    'DAX40': '^GDAXI',
    'UK100': '^FTSE',
  };
  if (indexMap[cleaned]) {
    return indexMap[cleaned];
  }

  // 2. Spot Gold & Silver
  if (cleaned === 'XAUUSD' || cleaned === 'XAU') return 'XAUUSD=X';
  if (cleaned === 'XAGUSD' || cleaned === 'XAG') return 'XAGUSD=X';

  // 3. Forex Pairs (e.g., EURUSD, GBPUSD, USDJPY)
  if (/^[A-Z]{6}$/.test(cleaned)) {
    return `${cleaned}=X`;
  }

  // 4. Crypto Pairs (e.g., BTCUSD, BTCUSDT, ETHUSD)
  if (cleaned.endsWith('USDT') || cleaned.endsWith('USD')) {
    const base = cleaned.replace(/USD(T)?$/, '');
    return `${base}-USD`;
  }

  // Default fallback (e.g. AAPL, TSLA)
  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') || '15m'; // e.g. 5m, 15m, 1h, 1d
    const start = searchParams.get('start'); // unix timestamp (seconds)
    const end = searchParams.get('end'); // unix timestamp (seconds)

    if (!rawSymbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const symbol = mapSymbol(rawSymbol);
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}`;
    if (start) url += `&period1=${start}`;
    if (end) url += `&period2=${end}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Yahoo Finance API error: Status ${res.status}, response: ${errText}`);
      return NextResponse.json({ error: `Failed to fetch data from Yahoo Finance: Status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const chartData = data.chart?.result?.[0];

    if (!chartData) {
      return NextResponse.json({ error: 'No data returned from data source' }, { status: 404 });
    }

    const timestamps = chartData.timestamp || [];
    const quote = chartData.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [] } = quote;

    const formattedData = [];
    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      const o = open[i];
      const h = high[i];
      const l = low[i];
      const c = close[i];

      if (
        t !== null && o !== null && h !== null && l !== null && c !== null &&
        t !== undefined && o !== undefined && h !== undefined && l !== undefined && c !== undefined
      ) {
        formattedData.push({
          time: t, // Unix timestamp in seconds
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c)
        });
      }
    }

    // Sort ascending by time
    formattedData.sort((a, b) => a.time - b.time);

    return NextResponse.json({ symbol, data: formattedData });
  } catch (error: any) {
    console.error('Error fetching historical chart data:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
