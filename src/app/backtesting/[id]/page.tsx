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

function getSymbolDetails(symbol: string) {
  const clean = symbol.replace(/\.[a-zA-Z0-9]+$/, '').toUpperCase();
  if (clean.includes('JPY')) {
    return { multiplier: 100, contractSize: 100000, isForex: true };
  }
  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return { multiplier: 10, contractSize: 100, isForex: false };
  }
  if (clean.includes('XAG') || clean.includes('SILVER')) {
    return { multiplier: 10, contractSize: 5000, isForex: false };
  }
  if (clean.endsWith('USD') || clean.endsWith('USDT')) {
    if (clean.startsWith('BTC') || clean.startsWith('ETH') || clean.startsWith('SOL')) {
      return { multiplier: 1, contractSize: 1, isForex: false };
    }
    return { multiplier: 10000, contractSize: 100000, isForex: true };
  }
  if (clean === 'NQ=F' || clean === 'NAS100' || clean === 'US100') {
    return { multiplier: 1, contractSize: 20, isForex: false };
  }
  if (clean === 'ES=F' || clean === 'SPX500' || clean === 'US500') {
    return { multiplier: 1, contractSize: 50, isForex: false };
  }
  if (clean === 'YM=F' || clean === 'US30' || clean === 'DJ30') {
    return { multiplier: 1, contractSize: 5, isForex: false };
  }
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
  const [activeTimeframe, setActiveTimeframe] = useState('15m');
  const [currentIndex, setCurrentIndex] = useState(100);
  const [balance, setBalance] = useState(10000);
  const [activeTrade, setActiveTrade] = useState<BacktestingSession['active_trade']>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);

  // Inputs
  const [lots, setLots] = useState('1.0');
  const [slPips, setSlPips] = useState('');
  const [tpPips, setTpPips] = useState('');

  // Chart Container Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);
  const autoplayTimerRef = useRef<any>(null);

  // Track the current replayed time (Unix seconds)
  const [currentTimeUnix, setCurrentTimeUnix] = useState<number | null>(null);

  // Fetch initial Session and Trades
  useEffect(() => {
    if (!user || !sessionId) return;

    const loadSessionData = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await getBacktestSession(sessionId);
        setSession(sessionData);
        setBalance(Number(sessionData.current_balance));
        setActiveTrade(sessionData.active_trade);

        const completedTrades = await getBacktestTrades(sessionId);
        setTrades(completedTrades);

        // If session was saved with a Unix timestamp index (e.g. index is a timestamp > 1000000)
        // Store it as our current replayed time.
        if (sessionData.current_index > 1000000) {
          setCurrentTimeUnix(sessionData.current_index);
        } else {
          // Fallback to start_date timestamp
          setCurrentTimeUnix(Math.floor(new Date(sessionData.start_date).getTime() / 1000));
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred loading the session.');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [user, sessionId]);

  // Load candle data when symbol, start_date or activeTimeframe changes
  useEffect(() => {
    if (!session || !currentTimeUnix) return;

    const fetchCandles = async () => {
      try {
        setLoadingChart(true);
        const start = Math.floor(new Date(session.start_date).getTime() / 1000);
        let durationDays = 30;

        if (activeTimeframe === '1m') durationDays = 5;
        else if (activeTimeframe === '5m') durationDays = 15;
        else if (activeTimeframe === '15m') durationDays = 30;
        else if (activeTimeframe === '1h' || activeTimeframe === '4h') durationDays = 120;
        else durationDays = 365;

        const end = start + durationDays * 24 * 3600;

        const candleRes = await fetch(
          `/api/charts/history?symbol=${encodeURIComponent(
            session.symbol
          )}&interval=${activeTimeframe}&start=${start}&end=${end}`
        );

        if (!candleRes.ok) {
          throw new Error(`Failed to load historical charts for ${session.symbol}`);
        }

        const candleJson = await candleRes.json();
        const candleData = candleJson.data || [];

        if (candleData.length === 0) {
          throw new Error('No historical price bars available for this date range.');
        }

        setCandles(candleData);

        // Map currentTimeUnix to closest candle index in new timeframe
        let matchedIndex = 0;
        for (let i = 0; i < candleData.length; i++) {
          if (candleData[i].time <= currentTimeUnix) {
            matchedIndex = i;
          } else {
            break;
          }
        }

        // If timestamp is before first candle, default to 50 visible
        if (matchedIndex < 50) {
          matchedIndex = Math.min(50, candleData.length - 1);
        }

        setCurrentIndex(matchedIndex);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error loading chart timeframe.');
      } finally {
        setLoadingChart(false);
      }
    };

    fetchCandles();
  }, [session, activeTimeframe, currentTimeUnix]);

  // Initialize and Render Chart
  useEffect(() => {
    if (loading || loadingChart || candles.length === 0 || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090a10' },
        textColor: '#9ca3af',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const visibleData = candles.slice(0, currentIndex + 1);
    candlestickSeries.setData(visibleData);

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    updateChartPriceLines();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [loading, loadingChart, candles]);

  // Sync visible candles when index changes
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0 || currentIndex >= candles.length) return;

    const visibleData = candles.slice(0, currentIndex + 1);
    candleSeriesRef.current.setData(visibleData);

    // Save currentTimeUnix state
    const currentCandle = candles[currentIndex];
    if (currentCandle) {
      setCurrentTimeUnix(currentCandle.time);
    }

    updateChartPriceLines();

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [currentIndex, candles]);

  const updateChartPriceLines = () => {
    const series = candleSeriesRef.current;
    if (!series) return;

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
        color: '#6366f1',
        lineWidth: 1.5,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'ENTRY',
      });

      if (activeTrade.sl) {
        slLineRef.current = series.createPriceLine({
          price: activeTrade.sl,
          color: '#f43f5e',
          lineWidth: 1.5,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
        });
      }

      if (activeTrade.tp) {
        tpLineRef.current = series.createPriceLine({
          price: activeTrade.tp,
          color: '#10b981',
          lineWidth: 1.5,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP',
        });
      }
    }
  };

  useEffect(() => {
    updateChartPriceLines();
  }, [activeTrade]);

  // Autoplay Timer
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

  const handleStepForward = async () => {
    if (currentIndex >= candles.length - 1) {
      setIsPlaying(false);
      toast.success('Simulation end reached!');
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextCandle = candles[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentTimeUnix(nextCandle.time);

    // Save timestamp to DB so it persists session replayed location
    await updateSessionState(sessionId, nextCandle.time, balance, activeTrade);

    if (activeTrade) {
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

      if (hitSL) {
        await executeCloseTrade(activeTrade.sl!, nextCandle.time, 'Auto Exit: SL Triggered');
        setIsPlaying(false);
      } else if (hitTP) {
        await executeCloseTrade(activeTrade.tp!, nextCandle.time, 'Auto Exit: TP Triggered');
        setIsPlaying(false);
      }
    }
  };

  const handleStepBackward = async () => {
    if (currentIndex <= 50) return;
    const prevIndex = currentIndex - 1;
    const prevCandle = candles[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentTimeUnix(prevCandle.time);
    await updateSessionState(sessionId, prevCandle.time, balance, activeTrade);
  };

  const handleOpenPosition = async (type: 'Long' | 'Short') => {
    if (!session || activeTrade) return;

    const currentCandle = candles[currentIndex];
    const entryPrice = currentCandle.close;
    const lotSize = parseFloat(lots) || 1.0;

    const details = getSymbolDetails(session.symbol);
    
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

    const tradeState = {
      type,
      entryPrice,
      qty: lotSize,
      sl: slPrice,
      tp: tpPrice,
      entryTime: currentCandle.time,
    };

    setActiveTrade(tradeState);
    await updateSessionState(sessionId, currentTimeUnix || currentCandle.time, balance, tradeState);
    toast.success(`${type} Opened at ${entryPrice.toFixed(5)}`);
  };

  const handleManualClose = async () => {
    if (!activeTrade) return;
    const currentCandle = candles[currentIndex];
    await executeCloseTrade(currentCandle.close, currentCandle.time, 'Manual Close');
  };

  const executeCloseTrade = async (exitPrice: number, exitTimeUnix: number, notesText = '') => {
    if (!activeTrade || !session) return;

    const details = getSymbolDetails(session.symbol);
    const isLong = activeTrade.type === 'Long';
    const priceDiff = isLong ? exitPrice - activeTrade.entryPrice : activeTrade.entryPrice - exitPrice;
    const pipsCalculated = priceDiff * details.multiplier;
    const pnl = priceDiff * activeTrade.qty * details.contractSize;

    const finalBalance = balance + pnl;

    try {
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

      await updateSessionState(sessionId, currentTimeUnix || exitTimeUnix, finalBalance, null);

      if (pnl >= 0) {
        toast.success(`Profit Logged: +$${pnl.toFixed(2)}`);
      } else {
        toast.error(`Loss Logged: -$${Math.abs(pnl).toFixed(2)}`);
      }

      if (candleSeriesRef.current) {
        const markers = [
          {
            time: activeTrade.entryTime,
            position: activeTrade.type === 'Long' ? 'belowBar' : 'aboveBar',
            color: '#10b981',
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
        createSeriesMarkers(candleSeriesRef.current, markers as any);
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to save trade log.');
    }
  };

  const handleDeleteTrade = async (id: string, pnl: number) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    try {
      await deleteBacktestTrade(id);
      const newBal = balance - pnl;
      setBalance(newBal);
      setTrades(prev => prev.filter(t => t.id !== id));
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), newBal, activeTrade);
      toast.success('Trade deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete trade.');
    }
  };

  const totalTrades = trades.length;
  const wins = trades.filter(t => (t.profit_loss ?? 0) >= 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const netProfit = balance - (session?.initial_balance || 10000);

  const equityData = [{ tradeNum: 0, balance: session?.initial_balance || 10000 }];
  let cumBal = session?.initial_balance || 10000;
  trades.forEach((t, i) => {
    cumBal += Number(t.profit_loss ?? 0);
    equityData.push({ tradeNum: i + 1, balance: cumBal });
  });

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
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-400">Loading Replay Workspace...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !session) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-xl mx-auto py-16 text-center">
          <h2 className="text-2xl font-extrabold text-white mb-2">Replay Run Locked</h2>
          <p className="text-gray-400 text-sm mb-6">{error || 'Session could not be opened.'}</p>
          <button onClick={() => router.push('/backtesting')} className="px-5 py-3 bg-indigo-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-600/10">
            Back to Sandbox
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
    : 'Syncing...';

  return (
    <AuthenticatedLayout>
      <div className="px-6 lg:px-8 py-5 max-w-7xl mx-auto relative">
        
        {/* Floating Topbar Dashboard */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-[#0f111a]/85 backdrop-blur-lg border border-white/[0.06] px-6 py-4 rounded-3xl shadow-xl relative z-20">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              📈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">{session.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 uppercase">
                  {session.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{formattedTime} UTC</p>
            </div>
          </div>

          {/* Timeframe Selector & Playback */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Timeframe Picker */}
            <div className="flex bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.05]">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    activeTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Replay controller buttons */}
            <div className="flex items-center gap-2 border-l border-white/[0.08] pl-4">
              <button
                onClick={handleStepBackward}
                disabled={currentIndex <= 50 || isPlaying}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 active:scale-95"
                title="Backward 1 Bar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-90"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleStepForward}
                disabled={currentIndex >= candles.length - 1 || isPlaying}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 active:scale-95"
                title="Forward 1 Bar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
                </svg>
              </button>
            </div>

            {/* Play Speed dropdown */}
            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-bold border border-white/[0.06] rounded-xl bg-[#090a10] text-slate-300 focus:outline-none"
            >
              <option value={1500}>1.5s Speed</option>
              <option value={1000}>1.0s Speed</option>
              <option value={500}>0.5s Speed</option>
            </select>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
          
          {/* Left Column: Trade Entry Control */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Balance and Stats Card */}
            <div className="bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-lg space-y-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Available Capital</span>
              <div className="text-2xl font-extrabold text-white font-mono">{formatCurrency(balance)}</div>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.03] font-semibold">
                <span className="text-gray-500">Session PnL:</span>
                <span className={`${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netProfit >= 0 ? '+' : ''}
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>

            {/* Interactive Buy/Sell Action Card */}
            <div className="bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-lg space-y-5">
              <h3 className="text-xs text-white font-bold uppercase tracking-widest pb-2 border-b border-white/[0.04]">Replay Orders</h3>

              {!activeTrade ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleOpenPosition('Long')}
                      className="py-3 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 shadow-md shadow-emerald-500/5 transition-all active:scale-95 duration-150 cursor-pointer"
                    >
                      Buy Market
                    </button>
                    <button
                      onClick={() => handleOpenPosition('Short')}
                      className="py-3 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 shadow-md shadow-rose-500/5 transition-all active:scale-95 duration-150 cursor-pointer"
                    >
                      Sell Market
                    </button>
                  </div>

                  <div className="space-y-3.5 pt-2 border-t border-white/[0.04]">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Lots size</label>
                      <input
                        type="text"
                        value={lots}
                        onChange={(e) => setLots(e.target.value)}
                        className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Stop Loss (Pips)</label>
                        <input
                          type="number"
                          placeholder="e.g. 15"
                          value={slPips}
                          onChange={(e) => setSlPips(e.target.value)}
                          className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Take Profit (Pips)</label>
                        <input
                          type="number"
                          placeholder="e.g. 30"
                          value={tpPips}
                          onChange={(e) => setTpPips(e.target.value)}
                          className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-indigo-500/20 bg-indigo-500/[0.02] rounded-2xl p-4.5 space-y-4 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl" />
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${activeTrade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {activeTrade.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{activeTrade.qty} Lot(s)</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-500">Entry price</span>
                      <span className="text-white font-mono">{activeTrade.entryPrice.toFixed(5)}</span>
                    </div>
                    {activeTrade.sl && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-500">Stop loss</span>
                        <span className="text-rose-400 font-mono">{activeTrade.sl.toFixed(5)}</span>
                      </div>
                    )}
                    {activeTrade.tp && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-500">Take profit</span>
                        <span className="text-emerald-400 font-mono">{activeTrade.tp.toFixed(5)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Floating return</span>
                    <span className={`text-sm font-bold font-mono ${getFloatingPnL() >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {getFloatingPnL() >= 0 ? '+' : ''}
                      {formatCurrency(getFloatingPnL())}
                    </span>
                  </div>

                  <button
                    onClick={handleManualClose}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 active:scale-95 duration-150 cursor-pointer"
                  >
                    Close Position Market
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Main: Interactive Chart canvas */}
          <div className="lg:col-span-3">
            <div className="relative w-full h-[500px] bg-[#090a10] rounded-3xl border border-white/[0.06] overflow-hidden shadow-2xl">
              {loadingChart && (
                <div className="absolute inset-0 bg-[#090a10]/80 backdrop-blur-sm z-30 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-slate-400">Loading historical data feed...</span>
                  </div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Bottom stats and lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/[0.05]">
          
          {/* Replay stats and equity chart */}
          <div className="lg:col-span-1 bg-[#0f111a]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-white font-bold uppercase tracking-widest mb-4">Replay Performance</h3>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Trades</div>
                  <div className="text-lg font-bold text-white mt-1.5 font-mono">{totalTrades}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Win Rate</div>
                  <div className="text-lg font-bold text-white mt-1.5 font-mono">{winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Pips</div>
                  <div className={`text-lg font-bold mt-1.5 font-mono ${trades.reduce((sum, t) => sum + (t.pips || 0), 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trades.reduce((sum, t) => sum + (t.pips || 0), 0).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Equity curve */}
            {trades.length > 0 && (
              <div className="h-32 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData}>
                    <defs>
                      <linearGradient id="colorBalanceReplay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="tradeNum" hide />
                    <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d0e16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                      labelStyle={{ color: '#9ca3af', fontSize: '10px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Balance']}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBalanceReplay)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Replay trades list */}
          <div className="lg:col-span-2 bg-[#0f111a]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-lg">
            <h3 className="text-xs text-white font-bold uppercase tracking-widest mb-4 pb-2 border-b border-white/[0.04]">Logged Simulator Trades</h3>
            
            {trades.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500 text-center">
                <span className="text-2xl mb-2">📋</span>
                <p className="text-xs font-semibold">No simulation trades logged yet.</p>
                <p className="text-[10px] text-gray-600 mt-1 max-w-[200px]">Launch a simulated order to record your first trade metrics.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-56">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-gray-500 font-bold uppercase tracking-widest text-[9px] pb-2">
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Entry</th>
                      <th className="pb-2">Exit</th>
                      <th className="pb-2">Pips</th>
                      <th className="pb-2">Return PnL</th>
                      <th className="pb-2 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-gray-300 font-medium font-mono">
                    {[...trades].reverse().map((trade) => (
                      <tr key={trade.id} className="hover:bg-white/[0.01]">
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase ${trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-2.5">{trade.quantity}</td>
                        <td className="py-2.5">{trade.entry_price.toFixed(5)}</td>
                        <td className="py-2.5">{trade.exit_price?.toFixed(5)}</td>
                        <td className={`py-2.5 ${(trade.pips || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(trade.pips || 0) > 0 ? '+' : ''}{(trade.pips || 0).toFixed(1)}
                        </td>
                        <td className={`py-2.5 ${(trade.profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(trade.profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss || 0)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteTrade(trade.id, trade.profit_loss || 0)}
                            className="text-gray-500 hover:text-rose-400 transition-colors p-1"
                            title="Delete log entry"
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
    </AuthenticatedLayout>
  );
}
