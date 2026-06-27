'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/providers/SettingsProvider';
import { getBacktestSession, getBacktestTrades, addBacktestTrade, updateSessionState, deleteBacktestTrade } from '@/lib/services/backtestService';
import { BacktestingSession, BacktestTrade } from '@/lib/types';
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

// Helper to determine contract sizes/pip multipliers
function getSymbolDetails(symbol: string) {
  const clean = symbol.replace(/\.[a-zA-Z0-9]+$/, '').toUpperCase();
  if (clean.includes('JPY')) {
    return { multiplier: 100, contractSize: 100000, isForex: true };
  }
  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return { multiplier: 10, contractSize: 100, isForex: false }; // Gold
  }
  if (clean.includes('XAG') || clean.includes('SILVER')) {
    return { multiplier: 10, contractSize: 5000, isForex: false }; // Silver
  }
  if (clean.endsWith('USD') || clean.endsWith('USDT')) {
    // Check if crypto
    if (clean.startsWith('BTC') || clean.startsWith('ETH') || clean.startsWith('SOL')) {
      return { multiplier: 1, contractSize: 1, isForex: false };
    }
    // Forex standard
    return { multiplier: 10000, contractSize: 100000, isForex: true };
  }
  // Stock Indices (NQ, ES, YM)
  if (clean === 'NQ=F' || clean === 'NAS100' || clean === 'US100') {
    return { multiplier: 1, contractSize: 20, isForex: false }; // Nasdaq futures ($20 per point)
  }
  if (clean === 'ES=F' || clean === 'SPX500' || clean === 'US500') {
    return { multiplier: 1, contractSize: 50, isForex: false }; // S&P 500 futures ($50 per point)
  }
  if (clean === 'YM=F' || clean === 'US30' || clean === 'DJ30') {
    return { multiplier: 1, contractSize: 5, isForex: false }; // Dow futures ($5 per point)
  }
  // Default fallback
  return { multiplier: 10000, contractSize: 100000, isForex: true };
}

export default function BacktestSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { colorblindMode } = useSettings();

  const [session, setSession] = useState<BacktestingSession | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [candles, setCandles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(100);
  const [balance, setBalance] = useState(10000);
  const [activeTrade, setActiveTrade] = useState<BacktestingSession['active_trade']>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000); // ms delay

  // Active Trade Input Form
  const [lots, setLots] = useState('1.0');
  const [slPips, setSlPips] = useState('');
  const [tpPips, setTpPips] = useState('');

  // Refs for lightweight-charts canvas
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);

  // Autoplay Timer Ref
  const autoplayTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load Session and Trades, then fetch Candle data
  useEffect(() => {
    if (!user || !sessionId) return;

    const loadSessionData = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await getBacktestSession(sessionId);
        setSession(sessionData);
        setBalance(Number(sessionData.current_balance));
        setCurrentIndex(sessionData.current_index);
        setActiveTrade(sessionData.active_trade);

        const completedTrades = await getBacktestTrades(sessionId);
        setTrades(completedTrades);

        // Fetch Candles based on start_date and timeframe
        const start = Math.floor(new Date(sessionData.start_date).getTime() / 1000);
        let durationDays = 30; // 30 days default fallback
        
        if (sessionData.timeframe === '1m') durationDays = 5;
        else if (sessionData.timeframe === '5m') durationDays = 15;
        else if (sessionData.timeframe === '15m') durationDays = 30;
        else if (sessionData.timeframe === '1h' || sessionData.timeframe === '4h') durationDays = 120;
        else durationDays = 365;

        const end = start + durationDays * 24 * 3600;

        const candleRes = await fetch(
          `/api/charts/history?symbol=${encodeURIComponent(
            sessionData.symbol
          )}&interval=${sessionData.timeframe}&start=${start}&end=${end}`
        );

        if (!candleRes.ok) {
          throw new Error(`Failed to load historical charts for ${sessionData.symbol}`);
        }

        const candleJson = await candleRes.json();
        const candleData = candleJson.data || [];
        
        if (candleData.length === 0) {
          throw new Error('No historical price bars available for this date and symbol.');
        }

        setCandles(candleData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred loading the backtest session.');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [user, sessionId]);

  // Chart Rendering and Sync visible candles
  useEffect(() => {
    if (loading || error || candles.length === 0 || !chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d0e16' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Populate initial slice of candles
    const visibleData = candles.slice(0, currentIndex + 1);
    candlestickSeries.setData(visibleData);

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;

    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [loading, error, candles]);

  // Update visible candles and markers when index changes
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const visibleData = candles.slice(0, currentIndex + 1);
    candleSeriesRef.current.setData(visibleData);

    // Dynamic price lines for open positions
    updateChartPriceLines();

    // Snapping visible range
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [currentIndex, candles]);

  // Update price lines helper
  const updateChartPriceLines = () => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Clear old lines
    if (entryLineRef.current) {
      series.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }
    if (slLineRef.current) {
      series.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      series.removePriceLine(tpLineRef.current);
      tpLineRef.current = null;
    }

    if (activeTrade) {
      entryLineRef.current = series.createPriceLine({
        price: activeTrade.entryPrice,
        color: '#3b82f6',
        lineWidth: 1.5,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'ENTRY',
      });

      if (activeTrade.sl) {
        slLineRef.current = series.createPriceLine({
          price: activeTrade.sl,
          color: '#ef4444',
          lineWidth: 1.5,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
        });
      }

      if (activeTrade.tp) {
        tpLineRef.current = series.createPriceLine({
          price: activeTrade.tp,
          color: '#22c55e',
          lineWidth: 1.5,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP',
        });
      }
    }
  };

  // Draw price lines whenever activeTrade changes
  useEffect(() => {
    updateChartPriceLines();
  }, [activeTrade]);

  // Autoplay Effect
  useEffect(() => {
    if (isPlaying) {
      autoplayTimerRef.current = setInterval(() => {
        handleStepForward();
      }, playSpeed);
    } else {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPlaying, currentIndex, activeTrade, candles, playSpeed]);

  // Step Forward Handler
  const handleStepForward = async () => {
    if (currentIndex >= candles.length - 1) {
      setIsPlaying(false);
      toast.success('Simulation completed! No more historical candles available.');
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // Save to Database periodically/instantly
    await updateSessionState(sessionId, nextIndex, balance, activeTrade);

    // Check if we hit SL or TP on the new candle
    if (activeTrade) {
      const nextCandle = candles[nextIndex];
      const isLong = activeTrade.type === 'Long';
      
      let hitSL = false;
      let hitTP = false;

      if (isLong) {
        if (activeTrade.sl && nextCandle.low <= activeTrade.sl) hitSL = true;
        if (activeTrade.tp && nextCandle.high >= activeTrade.tp) hitTP = true;
      } else {
        if (activeTrade.sl && nextCandle.high >= activeTrade.sl) hitSL = true;
        if (activeTrade.tp && nextCandle.low <= activeTrade.tp) hitTP = true;
      }

      if (hitSL && hitTP) {
        // If both hit on same candle, default to SL (conservative simulation)
        await executeCloseTrade(activeTrade.sl!, nextCandle.time, 'Auto Exit: SL Hit');
        setIsPlaying(false);
      } else if (hitSL) {
        await executeCloseTrade(activeTrade.sl!, nextCandle.time, 'Auto Exit: SL Hit');
        setIsPlaying(false);
      } else if (hitTP) {
        await executeCloseTrade(activeTrade.tp!, nextCandle.time, 'Auto Exit: TP Hit');
        setIsPlaying(false);
      }
    }
  };

  // Step Backward Handler
  const handleStepBackward = async () => {
    if (currentIndex <= 50) return; // Keep minimum candles visible
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    await updateSessionState(sessionId, prevIndex, balance, activeTrade);
  };

  // Order Placement
  const handleOpenPosition = async (type: 'Long' | 'Short') => {
    if (!session || activeTrade) return;

    const currentCandle = candles[currentIndex];
    const entryPrice = currentCandle.close;
    const lotSize = parseFloat(lots) || 1.0;

    const details = getSymbolDetails(session.symbol);
    
    // Calculate SL and TP prices based on input pips
    let slPrice: number | undefined;
    let tpPrice: number | undefined;

    if (slPips) {
      const slOffset = parseFloat(slPips) / details.multiplier;
      slPrice = type === 'Long' ? entryPrice - slOffset : entryPrice + slOffset;
    }
    if (tpPips) {
      const tpOffset = parseFloat(tpPips) / details.multiplier;
      tpPrice = type === 'Long' ? entryPrice + tpOffset : entryPrice - tpOffset;
    }

    const tradeState: BacktestingSession['active_trade'] = {
      type,
      entryPrice,
      qty: lotSize,
      sl: slPrice,
      tp: tpPrice,
      entryTime: currentCandle.time,
    };

    setActiveTrade(tradeState);
    await updateSessionState(sessionId, currentIndex, balance, tradeState);
    toast.success(`${type} Order Executed at ${entryPrice.toFixed(5)}`);
  };

  // Manual Close position
  const handleManualClose = async () => {
    if (!activeTrade) return;
    const currentCandle = candles[currentIndex];
    await executeCloseTrade(currentCandle.close, currentCandle.time, 'Manual Exit');
  };

  // Closing Position logic
  const executeCloseTrade = async (exitPrice: number, exitTimeUnix: number, notesText = '') => {
    if (!activeTrade || !session) return;

    const details = getSymbolDetails(session.symbol);
    const isLong = activeTrade.type === 'Long';
    
    // Math checks
    const priceDiff = isLong ? exitPrice - activeTrade.entryPrice : activeTrade.entryPrice - exitPrice;
    const pipsCalculated = priceDiff * details.multiplier;
    const pnl = priceDiff * activeTrade.qty * details.contractSize;

    const finalBalance = balance + pnl;

    try {
      // Save trade to Supabase
      const newTrade = await addBacktestTrade({
        session_id: sessionId,
        symbol: session.symbol,
        type: activeTrade.type,
        entry_price: activeTrade.entryPrice,
        exit_price: exitPrice,
        entry_time: new Date(activeTrade.entryTime * 1000).toISOString(),
        exit_time: new Date(exitTimeUnix * 1000).toISOString(),
        quantity: activeTrade.qty,
        profit_loss: pnl,
        pips: pipsCalculated,
        stop_loss: activeTrade.sl || undefined,
        take_profit: activeTrade.tp || undefined,
        notes: notesText,
      });

      setTrades(prev => [...prev, newTrade]);
      setBalance(finalBalance);
      setActiveTrade(null);

      // Save state to DB
      await updateSessionState(sessionId, currentIndex, finalBalance, null);

      if (pnl >= 0) {
        toast.success(`Trade Profit: +$${pnl.toFixed(2)}`);
      } else {
        toast.error(`Trade Loss: -$${Math.abs(pnl).toFixed(2)}`);
      }

      // Draw snapping marker arrow on chart series
      if (candleSeriesRef.current) {
        const markers = [
          {
            time: activeTrade.entryTime,
            position: activeTrade.type === 'Long' ? 'belowBar' : 'aboveBar',
            color: '#22c55e',
            shape: activeTrade.type === 'Long' ? 'arrowUp' : 'arrowDown',
            text: 'BUY',
          },
          {
            time: exitTimeUnix,
            position: activeTrade.type === 'Long' ? 'aboveBar' : 'belowBar',
            color: '#ef4444',
            shape: activeTrade.type === 'Long' ? 'arrowDown' : 'arrowUp',
            text: 'SELL',
          }
        ];
        
        // Connect them with line series path
        const path = chartRef.current.addSeries(LineSeries, {
          color: 'rgba(59, 130, 246, 0.5)',
          lineWidth: 2,
          lineStyle: 2,
        });

        path.setData([
          { time: activeTrade.entryTime, value: activeTrade.entryPrice },
          { time: exitTimeUnix, value: exitPrice }
        ]);

        createSeriesMarkers(candleSeriesRef.current, markers as any);
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to log backtest trade');
    }
  };

  const handleDeleteTrade = async (id: string, pnl: number) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    try {
      await deleteBacktestTrade(id);
      const newBal = balance - pnl;
      setBalance(newBal);
      setTrades(prev => prev.filter(t => t.id !== id));
      await updateSessionState(sessionId, currentIndex, newBal, activeTrade);
      toast.success('Trade deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete trade');
    }
  };

  // Metrics helper
  const netProfit = balance - (session?.initial_balance || 10000);
  const totalTrades = trades.length;
  const wins = trades.filter(t => (t.profit_loss ?? 0) >= 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // Recharts Equity curve data
  const equityData = [{ tradeNum: 0, balance: session?.initial_balance || 10000 }];
  let cumBal = session?.initial_balance || 10000;
  trades.forEach((t, i) => {
    cumBal += Number(t.profit_loss ?? 0);
    equityData.push({ tradeNum: i + 1, balance: cumBal });
  });

  // Floating PnL for active trade card
  const getFloatingPnL = () => {
    if (!activeTrade || candles.length === 0 || currentIndex >= candles.length) return 0;
    const currentPrice = candles[currentIndex].close;
    const details = getSymbolDetails(session?.symbol || 'EURUSD');
    const diff = activeTrade.type === 'Long' ? currentPrice - activeTrade.entryPrice : activeTrade.entryPrice - currentPrice;
    return diff * activeTrade.qty * details.contractSize;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  if (authLoading || loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading Replay Workspace...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !session) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-xl mx-auto py-16 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Replay Session Unavailable</h2>
          <p className="text-gray-400 text-sm mb-6">{error || 'Session details could not be found.'}</p>
          <button onClick={() => router.push('/backtesting')} className="px-4 py-2 bg-indigo-600 rounded-xl text-sm font-semibold text-white">
            Return to Dashboard
          </button>
        </div>
      </AuthenticatedLayout>
    );
  }

  const currentCandle = candles[currentIndex];
  const formattedTime = currentCandle
    ? new Date(currentCandle.time * 1000).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      })
    : 'Unknown';

  return (
    <AuthenticatedLayout>
      <div className="px-6 lg:px-8 py-5 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-white/[0.05] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400 font-mono font-bold uppercase tracking-wider">
                {session.symbol}
              </span>
              <span className="font-mono text-gray-500 text-xs">{session.timeframe}</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1.5">{session.name}</h1>
          </div>

          {/* Replay controller */}
          <div className="flex flex-wrap items-center gap-3 bg-white/[0.02] border border-white/[0.08] px-4 py-2 rounded-2xl shadow-inner">
            <button
              onClick={handleStepBackward}
              disabled={currentIndex <= 50 || isPlaying}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
              title="Step Backward (Hides last candle)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 transition-colors"
              title={isPlaying ? 'Pause Autoplay' : 'Start Autoplay'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleStepForward}
              disabled={currentIndex >= candles.length - 1 || isPlaying}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
              title="Step Forward (Shows next candle)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
              </svg>
            </button>

            {/* Speed Selector */}
            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-white/[0.06] rounded bg-[#0d0e16] text-white focus:outline-none"
            >
              <option value={1500}>1.5s / bar</option>
              <option value={1000}>1.0s / bar</option>
              <option value={500}>0.5s / bar</option>
            </select>

            <span className="text-[11px] font-mono text-gray-400 border-l border-white/[0.08] pl-3">
              {formattedTime} UTC
            </span>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Orders Panel */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Account Info */}
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02]">
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Account Balance</h3>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{formatCurrency(balance)}</div>
              <div className={`text-xs mt-1.5 font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}
                {formatCurrency(netProfit)} ({((netProfit / session.initial_balance) * 100).toFixed(2)}%)
              </div>
            </div>

            {/* Trading Panel */}
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02] space-y-4">
              <h3 className="text-xs text-white font-bold uppercase tracking-wider pb-2 border-b border-white/[0.04]">Execution Control</h3>

              {!activeTrade ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenPosition('Long')}
                      className="py-2.5 rounded-xl text-xs font-bold bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 hover:border-green-500/50 shadow-lg shadow-green-500/5 transition-all"
                    >
                      Buy / Market
                    </button>
                    <button
                      onClick={() => handleOpenPosition('Short')}
                      className="py-2.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 shadow-lg shadow-red-500/5 transition-all"
                    >
                      Sell / Market
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Lots / Size</label>
                    <input
                      type="text"
                      value={lots}
                      onChange={(e) => setLots(e.target.value)}
                      className="w-full px-3 py-1.5 border border-white/[0.06] rounded-xl text-xs bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Stop Loss (Pips)</label>
                      <input
                        type="number"
                        placeholder="e.g. 20"
                        value={slPips}
                        onChange={(e) => setSlPips(e.target.value)}
                        className="w-full px-3 py-1.5 border border-white/[0.06] rounded-xl text-xs bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Take Profit (Pips)</label>
                      <input
                        type="number"
                        placeholder="e.g. 40"
                        value={tpPips}
                        onChange={(e) => setTpPips(e.target.value)}
                        className="w-full px-3 py-1.5 border border-white/[0.06] rounded-xl text-xs bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-indigo-500/20 bg-indigo-500/[0.02] rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${activeTrade.type === 'Long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {activeTrade.type} position
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">{activeTrade.qty} Lot(s)</span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-400">Entry Price</span>
                      <span className="text-white font-mono">{activeTrade.entryPrice.toFixed(5)}</span>
                    </div>
                    {activeTrade.sl && (
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-400">Stop Loss</span>
                        <span className="text-red-400 font-mono">{activeTrade.sl.toFixed(5)}</span>
                      </div>
                    )}
                    {activeTrade.tp && (
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-400">Take Profit</span>
                        <span className="text-green-400 font-mono">{activeTrade.tp.toFixed(5)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Unrealized PnL</span>
                    <span className={`text-sm font-bold font-mono ${getFloatingPnL() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {getFloatingPnL() >= 0 ? '+' : ''}
                      {formatCurrency(getFloatingPnL())}
                    </span>
                  </div>

                  <button
                    onClick={handleManualClose}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 active:scale-98"
                  >
                    Close Position Market
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Main: Chart */}
          <div className="lg:col-span-3 space-y-6">
            <div ref={chartContainerRef} className="w-full h-[500px] bg-[#0d0e16] rounded-2xl border border-white/[0.08] relative overflow-hidden shadow-2xl" />
          </div>
        </div>

        {/* Bottom Panel: Performance & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/[0.05]">
          
          {/* Equity Chart & Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02]">
              <h3 className="text-xs text-white font-bold uppercase tracking-wider mb-4">Replay Performance</h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Trades</div>
                  <div className="text-lg font-bold text-white mt-1 font-mono">{totalTrades}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Win Rate</div>
                  <div className="text-lg font-bold text-white mt-1 font-mono">{winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pips Gain</div>
                  <div className={`text-lg font-bold mt-1 font-mono ${trades.reduce((sum, t) => sum + (t.pips || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trades.reduce((sum, t) => sum + (t.pips || 0), 0).toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Equity curve */}
              {trades.length > 0 && (
                <div className="h-44 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="tradeNum" hide />
                      <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0d0e16', borderColor: 'rgba(255,255,255,0.08)' }}
                        labelStyle={{ color: '#9ca3af', fontSize: '10px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Balance']}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Replay Trades Log */}
          <div className="lg:col-span-2">
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02] h-full flex flex-col">
              <h3 className="text-xs text-white font-bold uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.04]">Logged Simulation Trades</h3>
              
              {trades.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-gray-500">
                  <svg className="w-10 h-10 mb-2.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-xs font-semibold">No simulation trades logged yet.</p>
                  <p className="text-[10px] max-w-[200px] mt-1 text-gray-600">Place Buy/Sell orders on the execution panel to begin.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.04] text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Quantity</th>
                        <th className="pb-2">Entry</th>
                        <th className="pb-2">Exit</th>
                        <th className="pb-2">Pips</th>
                        <th className="pb-2">Net Return</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-gray-300 font-medium">
                      {[...trades].reverse().map((trade) => (
                        <tr key={trade.id} className="hover:bg-white/[0.01]">
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${trade.type === 'Long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono">{trade.quantity}</td>
                          <td className="py-2.5 font-mono">{trade.entry_price.toFixed(5)}</td>
                          <td className="py-2.5 font-mono">{trade.exit_price?.toFixed(5)}</td>
                          <td className={`py-2.5 font-mono ${(trade.pips || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(trade.pips || 0) > 0 ? '+' : ''}{(trade.pips || 0).toFixed(1)}
                          </td>
                          <td className={`py-2.5 font-mono ${(trade.profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(trade.profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss || 0)}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteTrade(trade.id, trade.profit_loss || 0)}
                              className="text-gray-500 hover:text-red-400 p-1"
                              title="Delete Trade Log"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
