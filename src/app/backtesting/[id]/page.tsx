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

interface DrawingItem {
  type: 'horizontal' | 'trendline' | 'fvg' | 'planner';
  ref?: any;
  series?: any;
  topRef?: any;
  bottomRef?: any;
  entryRef?: any;
  slRef?: any;
  tpRef?: any;
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

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Floating execution panel drag coordinates
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panelOffsetRef = useRef({ x: 0, y: 0 });

  // Advanced TradingView-style drawing toolbar state
  const [activeTool, setActiveTool] = useState<'cursor' | 'trendline' | 'horizontal' | 'fvg' | 'long' | 'short'>('cursor');
  const [drawingState, setDrawingState] = useState<any>(null); // store first click values
  const [drawnLines, setDrawnLines] = useState<DrawingItem[]>([]);
  
  // Custom toolbar utility options
  const [isMagnetMode, setIsMagnetMode] = useState(true);
  const [areDrawingsHidden, setAreDrawingsHidden] = useState(false);
  const [isToolLocked, setIsToolLocked] = useState(false);

  // Inputs
  const [lots, setLots] = useState('1.0');
  const [slPips, setSlPips] = useState('');
  const [tpPips, setTpPips] = useState('');

  // Refs
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  
  // Execution lines
  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);

  const autoplayTimerRef = useRef<any>(null);

  // Track current replayed Unix timestamp
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

        if (sessionData.current_index > 1000000) {
          setCurrentTimeUnix(sessionData.current_index);
        } else {
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
  const sessionSymbol = session?.symbol;
  const sessionStartDate = session?.start_date;

  useEffect(() => {
    if (!sessionSymbol || !sessionStartDate || !currentTimeUnix) return;

    const fetchCandles = async () => {
      try {
        setLoadingChart(true);
        const start = Math.floor(new Date(sessionStartDate).getTime() / 1000);
        let durationDays = 30;

        if (activeTimeframe === '1m') durationDays = 5;
        else if (activeTimeframe === '5m') durationDays = 15;
        else if (activeTimeframe === '15m') durationDays = 30;
        else if (activeTimeframe === '1h' || activeTimeframe === '4h') durationDays = 120;
        else durationDays = 365;

        const end = start + durationDays * 24 * 3600;

        let candleData = [];
        let fetchedTimeframe = activeTimeframe;

        const candleRes = await fetch(
          `/api/charts/history?symbol=${encodeURIComponent(
            sessionSymbol
          )}&interval=${activeTimeframe}&start=${start}&end=${end}`
        );

        if (candleRes.ok) {
          const candleJson = await candleRes.json();
          candleData = candleJson.data || [];
        }

        // Fallback hierarchy if timeframe is expired on Yahoo Finance
        if (candleData.length === 0) {
          const fallbacks = ['1h', '1d'];
          for (const fb of fallbacks) {
            if (fb === activeTimeframe) continue;
            let fEnd = end;
            if (fb === '1d') {
              fEnd = start + 365 * 24 * 3600;
            } else if (fb === '1h') {
              fEnd = start + 120 * 24 * 3600;
            }
            const fbRes = await fetch(
              `/api/charts/history?symbol=${encodeURIComponent(
                sessionSymbol
              )}&interval=${fb}&start=${start}&end=${fEnd}`
            );
            if (fbRes.ok) {
              const fbJson = await fbRes.json();
              const fbData = fbJson.data || [];
              if (fbData.length > 0) {
                candleData = fbData;
                fetchedTimeframe = fb;
                break;
              }
            }
          }
        }

        if (candleData.length === 0) {
          throw new Error('No historical price bars available for this date range.');
        }

        setCandles(candleData);

        if (fetchedTimeframe !== activeTimeframe) {
          setActiveTimeframe(fetchedTimeframe);
          toast.error(`${activeTimeframe} timeframe data has expired for this historical date on Yahoo. Switched to ${fetchedTimeframe}.`, {
            duration: 5000,
          });
        }

        // Align index
        let matchedIndex = 0;
        for (let i = 0; i < candleData.length; i++) {
          if (candleData[i].time <= currentTimeUnix) {
            matchedIndex = i;
          } else {
            break;
          }
        }

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
  }, [sessionSymbol, sessionStartDate, activeTimeframe]);

  // Initialize and Render Chart
  useEffect(() => {
    if (loading || loadingChart || candles.length === 0 || !chartContainerRef.current) return;

    const isDarkTheme = document.documentElement.classList.contains('dark');

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDarkTheme ? '#090a10' : '#ffffff' },
        textColor: isDarkTheme ? '#9ca3af' : '#4b5563',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' },
        horzLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' },
      },
      timeScale: {
        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
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

    // Chart Click Handler for drawings (includes Magnet Snapping option)
    chart.subscribeClick((param) => {
      if (activeTool === 'cursor' || !param.point || !param.time || !candleSeriesRef.current) return;
      
      let price = candleSeriesRef.current.coordinateToPrice(param.point.y);
      if (!price) return;
      const time = param.time;

      // Magnet snapping mode logic
      if (isMagnetMode && candles.length > 0) {
        const closestCandle = candles.reduce((prev, curr) => {
          return Math.abs(curr.time - (time as number)) < Math.abs(prev.time - (time as number)) ? curr : prev;
        });
        if (closestCandle) {
          const snaps = [closestCandle.open, closestCandle.high, closestCandle.low, closestCandle.close];
          const closestSnap = snaps.reduce((prev, curr) => {
            return Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev;
          });
          price = closestSnap;
        }
      }

      if (activeTool === 'horizontal') {
        const line = candleSeriesRef.current.createPriceLine({
          price,
          color: '#6366f1',
          lineWidth: 1.5,
          axisLabelVisible: true,
          title: 'LEVEL',
        });
        setDrawnLines((prev) => [...prev, { type: 'horizontal', ref: line }]);
        if (!isToolLocked) setActiveTool('cursor');
        toast.success(`Horizontal Line placed at ${price.toFixed(5)}`);
      }
      else if (activeTool === 'trendline') {
        if (!drawingState) {
          setDrawingState({ time, price });
          toast.success('Start point set. Click on the chart again to draw trendline.');
        } else {
          const trendLineSeries = chart.addSeries(LineSeries, {
            color: '#3b82f6',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          trendLineSeries.setData([
            { time: drawingState.time, value: drawingState.price },
            { time: time, value: price }
          ]);
          setDrawnLines((prev) => [...prev, { type: 'trendline', series: trendLineSeries }]);
          setDrawingState(null);
          if (!isToolLocked) setActiveTool('cursor');
          toast.success('Trendline drawn');
        }
      }
      else if (activeTool === 'fvg') {
        if (!drawingState) {
          setDrawingState({ price });
          toast.success('High boundary set. Click again to set low boundary.');
        } else {
          const topLine = candleSeriesRef.current.createPriceLine({
            price: drawingState.price,
            color: '#f59e0b',
            lineWidth: 1.5,
            lineStyle: 1,
            title: 'FVG High',
          });
          const bottomLine = candleSeriesRef.current.createPriceLine({
            price: price,
            color: '#f59e0b',
            lineWidth: 1.5,
            lineStyle: 1,
            title: 'FVG Low',
          });
          setDrawnLines((prev) => [...prev, { type: 'fvg', topRef: topLine, bottomRef: bottomLine }]);
          setDrawingState(null);
          if (!isToolLocked) setActiveTool('cursor');
          toast.success('FVG boundaries placed');
        }
      }
      else if (activeTool === 'long') {
        const details = getSymbolDetails(sessionSymbol || 'EURUSD');
        const slOffset = (parseFloat(slPips) || 20) / details.multiplier;
        const tpOffset = (parseFloat(tpPips) || 40) / details.multiplier;

        const entry = price;
        const sl = entry - slOffset;
        const tp = entry + tpOffset;

        const entryLine = candleSeriesRef.current.createPriceLine({ price: entry, color: '#3b82f6', lineWidth: 1.5, lineStyle: 2, title: 'PLAN ENTRY' });
        const slLine = candleSeriesRef.current.createPriceLine({ price: sl, color: '#ef4444', lineWidth: 1.5, lineStyle: 2, title: 'PLAN SL' });
        const tpLine = candleSeriesRef.current.createPriceLine({ price: tp, color: '#10b981', lineWidth: 1.5, lineStyle: 2, title: 'PLAN TP' });

        setDrawnLines((prev) => [...prev, { type: 'planner', entryRef: entryLine, slRef: slLine, tpRef: tpLine }]);
        if (!isToolLocked) setActiveTool('cursor');
        toast.success(`Long Plan placed: Entry ${entry.toFixed(5)}`);
      }
      else if (activeTool === 'short') {
        const details = getSymbolDetails(sessionSymbol || 'EURUSD');
        const slOffset = (parseFloat(slPips) || 20) / details.multiplier;
        const tpOffset = (parseFloat(tpPips) || 40) / details.multiplier;

        const entry = price;
        const sl = entry + slOffset;
        const tp = entry - tpOffset;

        const entryLine = candleSeriesRef.current.createPriceLine({ price: entry, color: '#3b82f6', lineWidth: 1.5, lineStyle: 2, title: 'PLAN ENTRY' });
        const slLine = candleSeriesRef.current.createPriceLine({ price: sl, color: '#ef4444', lineWidth: 1.5, lineStyle: 2, title: 'PLAN SL' });
        const tpLine = candleSeriesRef.current.createPriceLine({ price: tp, color: '#10b981', lineWidth: 1.5, lineStyle: 2, title: 'PLAN TP' });

        setDrawnLines((prev) => [...prev, { type: 'planner', entryRef: entryLine, slRef: slLine, tpRef: tpLine }]);
        if (!isToolLocked) setActiveTool('cursor');
        toast.success(`Short Plan placed: Entry ${entry.toFixed(5)}`);
      }
    });

    // Theme Mutation Observer
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      if (chartRef.current) {
        chartRef.current.applyOptions({
          layout: {
            background: { type: ColorType.Solid, color: dark ? '#090a10' : '#ffffff' },
            textColor: dark ? '#9ca3af' : '#4b5563',
          },
          grid: {
            vertLines: { color: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' },
            horzLines: { color: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' },
          },
          timeScale: {
            borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          }
        });
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

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
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [loading, loadingChart, candles, activeTool, drawingState, isMagnetMode, isToolLocked]);

  // Sync visible slice of candles instantly when index updates
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0 || currentIndex >= candles.length) return;

    const visibleData = candles.slice(0, currentIndex + 1);
    candleSeriesRef.current.setData(visibleData);

    const currentCandle = candles[currentIndex];
    if (currentCandle) {
      setCurrentTimeUnix(currentCandle.time);
    }

    updateChartPriceLines();
  }, [currentIndex, candles]);

  // Handle drawings visibility hide/show toggle
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    drawnLines.forEach((drawing) => {
      if (drawing.type === 'horizontal') {
        drawing.ref.applyOptions({ lineVisible: !areDrawingsHidden });
      } else if (drawing.type === 'trendline') {
        drawing.series.applyOptions({ visible: !areDrawingsHidden });
      } else if (drawing.type === 'fvg') {
        drawing.topRef.applyOptions({ lineVisible: !areDrawingsHidden });
        drawing.bottomRef.applyOptions({ lineVisible: !areDrawingsHidden });
      } else if (drawing.type === 'planner') {
        drawing.entryRef.applyOptions({ lineVisible: !areDrawingsHidden });
        drawing.slRef.applyOptions({ lineVisible: !areDrawingsHidden });
        drawing.tpRef.applyOptions({ lineVisible: !areDrawingsHidden });
      }
    });
  }, [areDrawingsHidden, drawnLines]);

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
        color: '#3b82f6',
        lineWidth: 1.5,
        lineStyle: 2,
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

  // Autoplay loop
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
      toast.success('Simulation completed!');
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextCandle = candles[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentTimeUnix(nextCandle.time);

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
        await executeCloseTrade(activeTrade.sl!, nextCandle.time, 'SL Hit');
        setIsPlaying(false);
      } else if (hitTP) {
        await executeCloseTrade(activeTrade.tp!, nextCandle.time, 'TP Hit');
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
        toast.success(`Profit: +$${pnl.toFixed(2)}`);
      } else {
        toast.error(`Loss: -$${Math.abs(pnl).toFixed(2)}`);
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
      toast.error('Failed to save trade.');
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

  const clearDrawings = () => {
    const series = candleSeriesRef.current;
    if (!series || !chartRef.current) return;

    drawnLines.forEach((drawing) => {
      if (drawing.type === 'horizontal') {
        series.removePriceLine(drawing.ref);
      } else if (drawing.type === 'trendline') {
        chartRef.current.removeSeries(drawing.series);
      } else if (drawing.type === 'fvg') {
        series.removePriceLine(drawing.topRef);
        series.removePriceLine(drawing.bottomRef);
      } else if (drawing.type === 'planner') {
        series.removePriceLine(drawing.entryRef);
        series.removePriceLine(drawing.slRef);
        series.removePriceLine(drawing.tpRef);
      }
    });

    setDrawnLines([]);
    setDrawingState(null);
    setActiveTool('cursor');
    toast.success('All drawings cleared');
  };

  // Draggable Floating Panel mouse handlers
  const handleDragMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking the top header bar
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panelOffsetRef.current = { ...panelPos };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPanelPos({
        x: panelOffsetRef.current.x + dx,
        y: panelOffsetRef.current.y + dy
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panelPos]);

  // Fullscreen toggle handler on the chart wrapper wrapper
  const handleFullscreenToggle = () => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch((err) => {
        toast.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen to fullscreen changes on the chart wrapper
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = document.fullscreenElement === chartWrapperRef.current;
      setIsFullscreen(isFull);

      // Reset panel drag position when toggling fullscreen to prevent it getting offscreen
      setPanelPos({ x: 0, y: 0 });

      const container = chartContainerRef.current;
      if (chartRef.current && container) {
        setTimeout(() => {
          chartRef.current.resize(
            container.clientWidth,
            container.clientHeight
          );
        }, 100);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Loading Replay Workspace...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !session) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-xl mx-auto py-16 text-center">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Replay Run Locked</h2>
          <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">{error || 'Session could not be opened.'}</p>
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
      <div className="px-6 lg:px-8 py-5 max-w-7xl mx-auto relative text-slate-800 dark:text-slate-100">
        
        {/* Floating Topbar Dashboard */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-white dark:bg-[#0f111a]/85 backdrop-blur-lg border border-slate-200 dark:border-white/[0.06] px-6 py-4 rounded-3xl shadow-md dark:shadow-xl relative z-20">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 dark:text-white">{session.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">
                  {session.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{formattedTime} UTC</p>
            </div>
          </div>

          {/* Timeframe Selector & Playback */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Timeframe Picker */}
            <div className="flex bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-xl border border-slate-200 dark:border-white/[0.05]">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    activeTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Replay controller buttons */}
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/[0.08] pl-4">
              <button
                onClick={handleStepBackward}
                disabled={currentIndex <= 50 || isPlaying}
                className="p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-30 active:scale-95"
                title="Backward 1 Bar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                </svg>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-90"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleStepForward}
                disabled={currentIndex >= candles.length - 1 || isPlaying}
                className="p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-30 active:scale-95"
                title="Forward 1 Bar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-white/[0.06] rounded-xl bg-white dark:bg-[#090a10] text-slate-600 dark:text-slate-300 focus:outline-none"
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
            <div className="bg-white dark:bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5 shadow-sm dark:shadow-lg space-y-3">
              <span className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Available Capital</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(balance)}</div>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-white/[0.03] font-semibold">
                <span className="text-slate-500">Session PnL:</span>
                <span className={`${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {netProfit >= 0 ? '+' : ''}
                  {formatCurrency(netProfit)} ({((netProfit / session.initial_balance) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Interactive Buy/Sell Action Card */}
            <div className="bg-white dark:bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5 shadow-sm dark:shadow-lg space-y-5">
              <h3 className="text-xs text-slate-800 dark:text-white font-bold uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-white/[0.04]">Replay Orders</h3>

              {!activeTrade ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleOpenPosition('Long')}
                      className="py-3 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 shadow-sm transition-all active:scale-95 duration-150 cursor-pointer"
                    >
                      Buy Market
                    </button>
                    <button
                      onClick={() => handleOpenPosition('Short')}
                      className="py-3 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/50 shadow-sm transition-all active:scale-95 duration-150 cursor-pointer"
                    >
                      Sell Market
                    </button>
                  </div>

                  <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1.5">Lots size</label>
                      <input
                        type="text"
                        value={lots}
                        onChange={(e) => setLots(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-xs bg-slate-50 dark:bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1.5">Stop Loss (Pips)</label>
                        <input
                          type="number"
                          placeholder="e.g. 15"
                          value={slPips}
                          onChange={(e) => setSlPips(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-xs bg-slate-50 dark:bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
                      />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1.5">Take Profit (Pips)</label>
                        <input
                          type="number"
                          placeholder="e.g. 30"
                          value={tpPips}
                          onChange={(e) => setTpPips(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-xs bg-slate-50 dark:bg-white/[0.01] focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-indigo-500/20 bg-indigo-500/[0.02] rounded-2xl p-4.5 space-y-4 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl" />
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${activeTrade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'}`}>
                      {activeTrade.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{activeTrade.qty} Lot(s)</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Entry price</span>
                      <span className="text-slate-900 dark:text-white font-mono">{activeTrade.entryPrice.toFixed(5)}</span>
                    </div>
                    {activeTrade.sl && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Stop loss</span>
                        <span className="text-rose-500 dark:text-rose-400 font-mono">{activeTrade.sl.toFixed(5)}</span>
                      </div>
                    )}
                    {activeTrade.tp && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Take profit</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{activeTrade.tp.toFixed(5)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Floating return</span>
                    <span className={`text-sm font-bold font-mono ${getFloatingPnL() >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                      {getFloatingPnL() >= 0 ? '+' : ''}
                      {formatCurrency(getFloatingPnL())}
                    </span>
                  </div>

                  <button
                    onClick={handleManualClose}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 duration-150 cursor-pointer"
                  >
                    Close Position Market
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Main: Interactive Chart canvas */}
          <div className="lg:col-span-3">
            {/* The chartWrapperRef is target of the requestFullscreen */}
            <div 
              ref={chartWrapperRef}
              className={`relative w-full bg-white dark:bg-[#090a10] rounded-3xl border border-slate-200 dark:border-white/[0.06] overflow-hidden shadow-md dark:shadow-2xl transition-all duration-155 ${isFullscreen ? 'h-screen w-screen rounded-none border-none' : 'h-[500px]'}`}
            >
              
              {/* Fullscreen Overlay Controller (Draggable Panel) */}
              {isFullscreen && (
                <div 
                  style={{ transform: `translate(${panelPos.x}px, ${panelPos.y}px)` }}
                  className="absolute top-4 right-4 z-30 w-72 bg-white/95 dark:bg-[#0d0e16]/95 backdrop-blur-md border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-4 space-y-3.5 text-xs text-slate-800 dark:text-slate-100 select-none"
                >
                  {/* Draggable Header */}
                  <div 
                    onMouseDown={handleDragMouseDown}
                    className="cursor-move flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/[0.04]"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{session.symbol}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400">{activeTimeframe}</span>
                    </div>
                    <button 
                      onClick={handleFullscreenToggle} 
                      className="p-1 px-2 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/5 rounded font-semibold transition-all flex items-center justify-center text-slate-500 dark:text-gray-400"
                      title="Exit Fullscreen"
                    >
                      <svg className="w-3 h-3 text-slate-400 hover:text-slate-650" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between gap-1 border-b border-slate-100 dark:border-white/[0.04] pb-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Replay</span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={handleStepBackward} 
                        disabled={currentIndex <= 50 || isPlaying} 
                        className="p-1 px-2 border border-slate-200 dark:border-white/[0.06] rounded text-[10px] disabled:opacity-20 font-bold flex items-center justify-center text-slate-600 dark:text-gray-300"
                        title="Step Backward"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)} 
                        className="p-1 px-3 bg-indigo-600 text-white rounded text-[10px] font-bold flex items-center justify-center min-w-[55px]"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      <button 
                        onClick={handleStepForward} 
                        disabled={currentIndex >= candles.length - 1 || isPlaying} 
                        className="p-1 px-2 border border-slate-200 dark:border-white/[0.06] rounded text-[10px] disabled:opacity-20 font-bold flex items-center justify-center text-slate-600 dark:text-gray-300"
                        title="Step Forward"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Timeframe selection */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Timeframe</span>
                    <div className="flex bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.05]">
                      {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setActiveTimeframe(tf)}
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                            activeTimeframe === tf ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account display */}
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest text-[9px]">Equity</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(balance)}</span>
                  </div>

                  {/* Order placing */}
                  <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                    {!activeTrade ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleOpenPosition('Long')} className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-center rounded-lg">
                            Buy Mkt
                          </button>
                          <button onClick={() => handleOpenPosition('Short')} className="py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-center rounded-lg">
                            Sell Mkt
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-1">Lots</label>
                            <input type="text" value={lots} onChange={(e) => setLots(e.target.value)} className="w-full px-2 py-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded text-[10px] font-mono text-slate-800 dark:text-white" />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-1">SL (Pips)</label>
                            <input type="number" placeholder="e.g. 15" value={slPips} onChange={(e) => setSlPips(e.target.value)} className="w-full px-2 py-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded text-[10px] font-mono text-slate-800 dark:text-white" />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-1">TP (Pips)</label>
                            <input type="number" placeholder="e.g. 30" value={tpPips} onChange={(e) => setTpPips(e.target.value)} className="w-full px-2 py-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded text-[10px] font-mono text-slate-800 dark:text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-2.5 space-y-2">
                        <div className="flex justify-between">
                          <span className={`font-bold ${activeTrade.type === 'Long' ? 'text-emerald-500' : 'text-rose-500'}`}>{activeTrade.type}</span>
                          <span className="font-mono text-slate-400">{activeTrade.qty} Lots</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1">
                          <span className="text-slate-400">Floating:</span>
                          <span className={`font-bold font-mono ${getFloatingPnL() >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {getFloatingPnL() >= 0 ? '+' : ''}{formatCurrency(getFloatingPnL())}
                          </span>
                        </div>
                        <button onClick={handleManualClose} className="w-full py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold">
                          Close Position
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono text-center pt-1">{formattedTime} UTC</div>
                </div>
              )}

              {/* Advanced TradingView-style Drawing Toolbar sidebar overlay */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 p-1.5 bg-white/95 dark:bg-[#0c0e15]/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-2xl">
                
                {/* 1. Pointer / Selection Crosshair */}
                <button
                  onClick={() => { setActiveTool('cursor'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${
                    activeTool === 'cursor'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Cursor / Crosshair Selection"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-9h18" />
                  </svg>
                </button>

                {/* Separator line */}
                <div className="h-px bg-slate-200 dark:bg-white/[0.06] my-1 mx-1.5" />

                {/* 2. Trendline */}
                <button
                  onClick={() => { setActiveTool('trendline'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${
                    activeTool === 'trendline'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Trend Line (Click twice)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="6" cy="18" r="1.5" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="18" cy="6" r="1.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 17L17 7" />
                  </svg>
                </button>

                {/* 3. Horizontal Level */}
                <button
                  onClick={() => { setActiveTool('horizontal'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${
                    activeTool === 'horizontal'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Horizontal Line (Click once)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                </button>

                {/* 4. FVG Rectangle Zone */}
                <button
                  onClick={() => { setActiveTool('fvg'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${
                    activeTool === 'fvg'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Fair Value Gap Rectangle (Click High, then Low)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <rect x="4" y="6" width="16" height="12" rx="1.5" />
                  </svg>
                </button>

                {/* Separator line */}
                <div className="h-px bg-slate-200 dark:bg-white/[0.06] my-1 mx-1.5" />

                {/* 5. Long Planner */}
                <button
                  onClick={() => { setActiveTool('long'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${
                    activeTool === 'long'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600'
                  }`}
                  title="Long Position Planner"
                >
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                  </svg>
                </button>

                {/* 6. Short Planner */}
                <button
                  onClick={() => { setActiveTool('short'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${
                    activeTool === 'short'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                  }`}
                  title="Short Position Planner"
                >
                  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                  </svg>
                </button>

                {/* Separator line */}
                <div className="h-px bg-slate-200 dark:bg-white/[0.06] my-1 mx-1.5" />

                {/* 7. Magnet Mode Toggle */}
                <button
                  onClick={() => setIsMagnetMode(!isMagnetMode)}
                  className={`p-2 rounded-lg transition-all ${
                    isMagnetMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Magnet Mode (Snaps price levels exactly to candle High/Low/Open/Close)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v4.5A4.5 4.5 0 0013.5 12h0A4.5 4.5 0 0018 7.5V3M9 3H5m4 0h4m5 0h-4m4 0h4" />
                  </svg>
                </button>

                {/* 8. Stay in Drawing Mode Lock */}
                <button
                  onClick={() => setIsToolLocked(!isToolLocked)}
                  className={`p-2 rounded-lg transition-all ${
                    isToolLocked
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Lock Drawing Tool (Stay in drawing mode after placing level)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </button>

                {/* 9. Hide / Show Drawings (Eye Icon) */}
                <button
                  onClick={() => setAreDrawingsHidden(!areDrawingsHidden)}
                  className={`p-2 rounded-lg transition-all ${
                    areDrawingsHidden
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title={areDrawingsHidden ? 'Show Drawings' : 'Hide Drawings'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* 10. Delete All Drawings (Trash Can) */}
                {drawnLines.length > 0 && (
                  <button
                    onClick={clearDrawings}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all border-t border-slate-100 dark:border-white/[0.04] mt-1 flex items-center justify-center"
                    title="Clear All Drawings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Standard Mode Chart Controls (top-right overlay when not fullscreen) */}
              {!isFullscreen && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <button
                    onClick={handleFullscreenToggle}
                    className="p-2 rounded-xl border bg-white dark:bg-[#0f111a]/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/5 shadow transition-all duration-150"
                    title="Toggle Fullscreen Chart"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 4l-5 5m-11 7v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </button>
                </div>
              )}

              {loadingChart && (
                <div className="absolute inset-0 bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-sm z-30 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading historical data feed...</span>
                  </div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Bottom panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-200 dark:border-white/[0.05]">
          
          {/* Stats & Equity */}
          <div className="lg:col-span-1 bg-white dark:bg-[#0f111a]/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5 shadow-sm dark:shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-slate-800 dark:text-white font-bold uppercase tracking-widest mb-4">Replay Performance</h3>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Total Trades</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-white mt-1.5 font-mono">{totalTrades}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Win Rate</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-white mt-1.5 font-mono">{winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Total Pips</div>
                  <div className={`text-lg font-bold mt-1.5 font-mono ${trades.reduce((sum, t) => sum + (t.pips || 0), 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {trades.reduce((sum, t) => sum + (t.pips || 0), 0).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Equity Curve */}
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
          <div className="lg:col-span-2 bg-white dark:bg-[#0f111a]/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5 shadow-sm dark:shadow-lg">
            <h3 className="text-xs text-slate-800 dark:text-white font-bold uppercase tracking-widest mb-4 pb-2 border-b border-slate-100 dark:border-white/[0.04]">Logged Simulator Trades</h3>
            
            {trades.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 text-center">
                <svg className="w-8 h-8 mb-3 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p className="text-xs font-semibold">No simulation trades logged yet.</p>
                <p className="text-[10px] text-slate-500 dark:text-gray-600 mt-1 max-w-[200px]">Launch a simulated order to record your first trade metrics.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-56">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-widest text-[9px] pb-2">
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Entry</th>
                      <th className="pb-2">Exit</th>
                      <th className="pb-2">Pips</th>
                      <th className="pb-2">Return PnL</th>
                      <th className="pb-2 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] text-slate-700 dark:text-gray-300 font-medium font-mono">
                    {[...trades].reverse().map((trade) => (
                      <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase ${trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'}`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-2.5">{trade.quantity}</td>
                        <td className="py-2.5">{trade.entry_price.toFixed(5)}</td>
                        <td className="py-2.5">{trade.exit_price?.toFixed(5)}</td>
                        <td className={`py-2.5 ${(trade.pips || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {(trade.pips || 0) > 0 ? '+' : ''}{(trade.pips || 0).toFixed(1)}
                        </td>
                        <td className={`py-2.5 ${(trade.profit_loss || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {(trade.profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss || 0)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteTrade(trade.id, trade.profit_loss || 0)}
                            className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1 flex justify-end w-full"
                            title="Delete log entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
