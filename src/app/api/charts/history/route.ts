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

function mapTwelveSymbol(symbol: string): string {
  const cleaned = symbol.replace(/\.[a-zA-Z0-9]+$/, '').trim().toUpperCase();

  // 1. Direct index maps
  const indexMap: Record<string, string> = {
    'US30': 'DJI',
    'DJ30': 'DJI',
    'DOW30': 'DJI',
    'NAS100': 'NDX',
    'NDX100': 'NDX',
    'USTEC': 'NDX',
    'US100': 'NDX',
    'NASDAQ': 'IXIC',
    'SPX500': 'SPX',
    'US500': 'SPX',
    'SPX': 'SPX',
    'GER30': 'DAX',
    'GER40': 'DAX',
    'DE30': 'DAX',
    'DE40': 'DAX',
    'DAX': 'DAX',
    'UK100': 'FTSE',
    'NQ=F': 'NDX',
    'ES=F': 'SPX',
    'YM=F': 'DJI',
  };
  if (indexMap[cleaned]) {
    return indexMap[cleaned];
  }

  // 2. Spot Gold & Silver
  if (cleaned === 'XAUUSD' || cleaned === 'XAU' || cleaned === 'XAUUSD=X') return 'XAU/USD';
  if (cleaned === 'XAGUSD' || cleaned === 'XAG' || cleaned === 'XAGUSD=X') return 'XAG/USD';

  // 3. Forex Pairs (e.g. EURUSD, GBPUSD, USDJPY)
  if (/^[A-Z]{6}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}/${cleaned.slice(3)}`;
  }
  const forexMatch = cleaned.match(/^([A-Z]{3})([A-Z]{3})=X$/);
  if (forexMatch) {
    return `${forexMatch[1]}/${forexMatch[2]}`;
  }

  // 4. Crypto Pairs (e.g. BTCUSD, BTCUSDT)
  if (cleaned.endsWith('USDT') || cleaned.endsWith('USD')) {
    const base = cleaned.replace(/USD(T)?$/, '');
    return `${base}/USD`;
  }

  return cleaned;
}

function mapInterval(interval: string): string {
  const map: Record<string, string> = {
    '1m': '1min',
    '5m': '5min',
    '15m': '15min',
    '1h': '1h',
    '4h': '4h',
    '1d': '1day',
  };
  return map[interval] || interval;
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

    const apikey = process.env.TWELVE_DATA_API_KEY;
    let twelveDataSuccess = false;
    let formattedData: any[] = [];

    // Try Twelve Data first if API key is provided
    if (apikey && apikey !== 'your_api_key_here') {
      try {
        let twelveSymbol = mapTwelveSymbol(rawSymbol);
        const twelveInterval = mapInterval(interval);
        
        let twelveUrl = `https://api.twelvedata.com/time_series?symbol=${twelveSymbol}&interval=${twelveInterval}&apikey=${apikey}&outputsize=5000`;
        if (start) {
          const startDateStr = new Date(Number(start) * 1000).toISOString().slice(0, 19).replace('T', ' ');
          twelveUrl += `&start_date=${encodeURIComponent(startDateStr)}`;
        }
        if (end) {
          const endDateStr = new Date(Number(end) * 1000).toISOString().slice(0, 19).replace('T', ' ');
          twelveUrl += `&end_date=${encodeURIComponent(endDateStr)}`;
        }

        let tdRes = await fetch(twelveUrl, { next: { revalidate: 60 } });
        if (tdRes.ok) {
          let tdJson = await tdRes.json();
          
          // Check if index symbol is restricted on free plan and query ETF alternative
          if (tdJson.status !== 'ok' && (twelveSymbol === 'NDX' || twelveSymbol === 'SPX' || twelveSymbol === 'DJI')) {
            const etfMap: Record<string, string> = { 'NDX': 'QQQ', 'SPX': 'SPY', 'DJI': 'DIA' };
            const etfSymbol = etfMap[twelveSymbol];
            console.log(`Twelve Data: Index ${twelveSymbol} restricted on free plan. Trying ETF fallback: ${etfSymbol}`);
            
            let etfUrl = `https://api.twelvedata.com/time_series?symbol=${etfSymbol}&interval=${twelveInterval}&apikey=${apikey}&outputsize=5000`;
            if (start) {
              const startDateStr = new Date(Number(start) * 1000).toISOString().slice(0, 19).replace('T', ' ');
              etfUrl += `&start_date=${encodeURIComponent(startDateStr)}`;
            }
            if (end) {
              const endDateStr = new Date(Number(end) * 1000).toISOString().slice(0, 19).replace('T', ' ');
              etfUrl += `&end_date=${encodeURIComponent(endDateStr)}`;
            }
            
            const etfRes = await fetch(etfUrl, { next: { revalidate: 60 } });
            if (etfRes.ok) {
              tdJson = await etfRes.json();
              twelveSymbol = etfSymbol;
            }
          }

          if (tdJson.status === 'ok' && Array.isArray(tdJson.values)) {
            formattedData = tdJson.values.map((item: any) => {
              const dt = item.datetime.includes(' ') ? item.datetime : `${item.datetime} 00:00:00`;
              const time = Math.floor(new Date(dt + ' UTC').getTime() / 1000);
              return {
                time,
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close)
              };
            }).filter((item: any) => !isNaN(item.time) && !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close));

            // Sort ascending (oldest first)
            formattedData.sort((a, b) => a.time - b.time);
            twelveDataSuccess = true;
            console.log(`Twelve Data: Loaded ${formattedData.length} candles for ${twelveSymbol}`);
          } else {
            console.warn(`Twelve Data API returned warning/error:`, tdJson);
          }
        } else {
          console.warn(`Twelve Data HTTP error: Status ${tdRes.status}`);
        }
      } catch (tdErr) {
        console.error(`Twelve Data fetch failed, falling back:`, tdErr);
      }
    }

    // Return Twelve Data if successful
    if (twelveDataSuccess && formattedData.length > 0) {
      return NextResponse.json({ symbol: rawSymbol, data: formattedData });
    }

    // FALLBACK: Yahoo Finance
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
      return NextResponse.json({ error: `Failed to fetch data: Status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const chartData = data.chart?.result?.[0];

    if (!chartData) {
      return NextResponse.json({ error: 'No data returned from Yahoo fallback' }, { status: 404 });
    }

    const timestamps = chartData.timestamp || [];
    const quote = chartData.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [] } = quote;

    const yfFormattedData = [];
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
        yfFormattedData.push({
          time: t,
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c)
        });
      }
    }

    yfFormattedData.sort((a, b) => a.time - b.time);
    let finalData = yfFormattedData;

    if (is4h) {
      const groups: Record<number, typeof yfFormattedData> = {};
      for (const candle of yfFormattedData) {
        const date = new Date(candle.time * 1000);
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

    console.log(`Yahoo Finance: Loaded fallback of ${finalData.length} candles for ${symbol}`);
    return NextResponse.json({ symbol, data: finalData });
  } catch (error: any) {
    console.error('Error fetching historical chart data:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
