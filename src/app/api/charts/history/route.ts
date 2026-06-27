import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function mapSymbol(symbol: string): string {
  const cleaned = symbol.replace(/\.[a-zA-Z0-9]+$/, '').trim().toUpperCase();

  // 1. Direct index maps
  const indexMap: Record<string, string> = {
    'US30': 'YM=F',
    'DJ30': 'YM=F',
    'DOW30': 'YM=F',
    'NAS100': 'NQ=F',
    'NDX100': 'NQ=F',
    'USTEC': 'NQ=F',
    'US100': 'NQ=F',
    'NASDAQ': 'NQ=F',
    'SPX500': 'ES=F',
    'US500': 'ES=F',
    'SPX': 'ES=F',
    'GER30': 'FDAX.EX',
    'GER40': 'FDAX.EX',
    'DE30': 'FDAX.EX',
    'DE40': 'FDAX.EX',
    'DAX': 'FDAX.EX',
    'DAX30': 'FDAX.EX',
    'DAX40': 'FDAX.EX',
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

    const is4h = interval === '4h';
    const queryInterval = is4h ? '1h' : interval;

    const symbol = mapSymbol(rawSymbol);
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${queryInterval}`;
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

    let finalData = formattedData;

    if (is4h) {
      const groups: Record<number, typeof formattedData> = {};
      for (const candle of formattedData) {
        const date = new Date(candle.time * 1000);
        // Align to UTC 4-hour boundaries (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
        date.setUTCHours(Math.floor(date.getUTCHours() / 4) * 4, 0, 0, 0);
        const groupTime = Math.floor(date.getTime() / 1000);
        if (!groups[groupTime]) {
          groups[groupTime] = [];
        }
        groups[groupTime].push(candle);
      }

      const aggregated = Object.entries(groups).map(([timeStr, candlesInGroup]) => {
        const time = Number(timeStr);
        candlesInGroup.sort((a, b) => a.time - b.time);
        const open = candlesInGroup[0].open;
        const close = candlesInGroup[candlesInGroup.length - 1].close;
        const high = Math.max(...candlesInGroup.map(c => c.high));
        const low = Math.min(...candlesInGroup.map(c => c.low));
        return { time, open, high, low, close };
      });
      
      aggregated.sort((a, b) => a.time - b.time);
      finalData = aggregated;
    }

    return NextResponse.json({ symbol, data: finalData });
  } catch (error: any) {
    console.error('Error fetching historical chart data:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
