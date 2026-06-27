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
  id: string;
  type: 'horizontal' | 'trendline' | 'fvg' | 'planner';
  price?: number;
  time?: number;
  p1?: { time: number; price: number };
  p2?: { time: number; price: number };
  startTime?: number;
  high?: number;
  low?: number;
  entry?: number;
  sl?: number;
  tp?: number;
  plannerType?: 'long' | 'short';
}

interface PendingOrder {
  id: string;
  type: 'Buy Limit' | 'Sell Limit' | 'Buy Stop' | 'Sell Stop';
  side: 'Long' | 'Short';
  price: number;
  qty: number;
  sl?: number;
  tp?: number;
  risk_percent?: number;
  risk_amount?: number;
  createdTime: number;
}

// Indicator Helpers
function computeEMA(data: any[], period: number) {
  if (data.length < period) return [];
  const ema = [];
  const k = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  ema.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const val = data[i].close * k + prevEma * (1 - k);
    ema.push({ time: data[i].time, value: val });
    prevEma = val;
  }
  return ema;
}

function computeRSI(data: any[], period = 14) {
  if (data.length <= period) return [];
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push({ time: data[period].time, value: 100 - 100 / (1 + rs) });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
  }
  return rsi;
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

  // Replay structures
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [indicatorsConfig, setIndicatorsConfig] = useState({
    ema20: false,
    ema50: false,
    ema200: false,
    rsi: false
  });

  // UI state tabs
  const [activeDrawerTab, setActiveDrawerTab] = useState<'trades' | 'analytics' | 'equity'>('trades');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drag coordinates for execution panel in Fullscreen
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panelOffsetRef = useRef({ x: 0, y: 0 });

  // Floating control toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<'cursor' | 'trendline' | 'horizontal' | 'fvg' | 'long' | 'short'>('cursor');
  const [drawingState, setDrawingState] = useState<any>(null);
  const [drawnLines, setDrawnLines] = useState<DrawingItem[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  
  // Custom toolbar utility options
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const [areDrawingsHidden, setAreDrawingsHidden] = useState(false);
  const [isToolLocked, setIsToolLocked] = useState(false);

  // Inputs
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPriceInput, setLimitPriceInput] = useState('');
  const [lots, setLots] = useState('1.0');
  const [slPips, setSlPips] = useState('');
  const [tpPips, setTpPips] = useState('');

  // Modify active position limits
  const [modifySLInput, setModifySLInput] = useState('');
  const [modifyTPInput, setModifyTPInput] = useState('');

  // Position Sizing calculator states
  const [useRiskCalculator, setUseRiskCalculator] = useState(false);
  const [riskType, setRiskType] = useState<'percent' | 'cash'>('percent');
  const [riskPercent, setRiskPercent] = useState('1'); // default 1%
  const [riskCash, setRiskCash] = useState('100'); // default $100

  // Refs
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<any>(null);
  const rsiChartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const rsiSeriesRef = useRef<any>(null);

  // EMA series refs
  const ema20SeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);
  const ema200SeriesRef = useRef<any>(null);
  
  // Execution lines
  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);

  const autoplayTimerRef = useRef<any>(null);
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
        
        // Hydrate extended columns
        setDrawnLines(sessionData.drawings || []);
        setPendingOrders(sessionData.pending_orders || []);
        setIndicatorsConfig(sessionData.indicators_config || { ema20: false, ema50: false, ema200: false, rsi: false });

        if (sessionData.current_index > 1000000) {
          setCurrentTimeUnix(sessionData.current_index);
        } else {
          setCurrentTimeUnix(Math.floor(new Date(sessionData.start_date).getTime() / 1000));
        }

        const completedTrades = await getBacktestTrades(sessionId);
        setTrades(completedTrades);
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

        // Fallback logic
        if (candleData.length === 0) {
          const fallbacks = ['1h', '1d'];
          for (const fb of fallbacks) {
            if (fb === activeTimeframe) continue;
            let fEnd = end;
            if (fb === '1d') fEnd = start + 365 * 24 * 3600;
            else if (fb === '1h') fEnd = start + 120 * 24 * 3600;

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

  // Synchronize state values into refs for the third-party chart callbacks
  const activeToolRef = useRef(activeTool);
  const drawingStateRef = useRef(drawingState);
  const isMagnetModeRef = useRef(isMagnetMode);
  const isToolLockedRef = useRef(isToolLocked);
  const candlesRef = useRef(candles);
  const slPipsRef = useRef(slPips);
  const tpPipsRef = useRef(tpPips);
  const sessionSymbolRef = useRef(sessionSymbol);
  const drawnLinesRef = useRef(drawnLines);
  const areDrawingsHiddenRef = useRef(areDrawingsHidden);
  const selectedDrawingIdRef = useRef(selectedDrawingId);

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { drawingStateRef.current = drawingState; drawShapes(); }, [drawingState]);
  useEffect(() => { isMagnetModeRef.current = isMagnetMode; }, [isMagnetMode]);
  useEffect(() => { isToolLockedRef.current = isToolLocked; }, [isToolLocked]);
  useEffect(() => { candlesRef.current = candles; }, [candles]);
  useEffect(() => { slPipsRef.current = slPips; }, [slPips]);
  useEffect(() => { tpPipsRef.current = tpPips; }, [tpPips]);
  useEffect(() => { sessionSymbolRef.current = sessionSymbol; }, [sessionSymbol]);
  useEffect(() => { drawnLinesRef.current = drawnLines; drawShapes(); }, [drawnLines]);
  useEffect(() => { areDrawingsHiddenRef.current = areDrawingsHidden; drawShapes(); }, [areDrawingsHidden]);
  useEffect(() => { selectedDrawingIdRef.current = selectedDrawingId; drawShapes(); }, [selectedDrawingId]);

  // Synchronize Position Risk Sizing
  useEffect(() => {
    if (useRiskCalculator && slPips) {
      const details = getSymbolDetails(session?.symbol || 'EURUSD');
      const sl = parseFloat(slPips);
      if (!isNaN(sl) && sl > 0) {
        const riskAmt = riskType === 'cash' 
          ? parseFloat(riskCash) 
          : balance * (parseFloat(riskPercent) / 100);
        if (!isNaN(riskAmt) && riskAmt > 0) {
          const pipValPerLot = (1 / details.multiplier) * details.contractSize;
          const calculatedLots = riskAmt / (sl * pipValPerLot);
          if (!isNaN(calculatedLots) && calculatedLots > 0) {
            setLots(calculatedLots.toFixed(2));
          }
        }
      }
    }
  }, [useRiskCalculator, riskType, riskPercent, riskCash, slPips, balance, session?.symbol]);

  // Synchronize modification inputs
  useEffect(() => {
    if (activeTrade) {
      setModifySLInput(activeTrade.sl ? activeTrade.sl.toString() : '');
      setModifyTPInput(activeTrade.tp ? activeTrade.tp.toString() : '');
    } else {
      setModifySLInput('');
      setModifyTPInput('');
    }
  }, [activeTrade]);

  // Dynamic Bounding Box Snapping Engine for Drawing Canvas
  const drawShapes = () => {
    const canvas = drawingCanvasRef.current;
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!canvas || !chart || !series) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Snapping dimensions to main chart pane table element to correct coordinate alignment shift
    const container = chartContainerRef.current;
    if (container) {
      const paneCell = container.querySelector('table tr:first-child td:nth-child(2)') as HTMLTableCellElement
        || container.querySelector('table tr:first-child td:first-child') as HTMLTableCellElement;
      
      if (paneCell) {
        const containerRect = container.getBoundingClientRect();
        const paneRect = paneCell.getBoundingClientRect();
        
        canvas.style.position = 'absolute';
        canvas.style.left = `${paneRect.left - containerRect.left}px`;
        canvas.style.top = `${paneRect.top - containerRect.top}px`;
        canvas.style.width = `${paneRect.width}px`;
        canvas.style.height = `${paneRect.height}px`;
        
        canvas.width = paneRect.width;
        canvas.height = paneRect.height;
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (areDrawingsHiddenRef.current) return;

    drawnLinesRef.current.forEach((drawing) => {
      const isSelected = drawing.id === selectedDrawingIdRef.current;

      if (drawing.type === 'horizontal' && drawing.price) {
        const y = series.priceToCoordinate(drawing.price);
        if (y === null) return;

        ctx.strokeStyle = isSelected ? '#f59e0b' : '#6366f1';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw selection markers
        if (isSelected) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(12, y, 4, 0, Math.PI * 2);
          ctx.arc(canvas.width - 12, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw price tag
        ctx.fillStyle = isSelected ? '#f59e0b' : '#6366f1';
        ctx.font = '10px monospace';
        ctx.fillText(` ${drawing.price.toFixed(5)}`, canvas.width - 80, y - 4);
      }
      else if (drawing.type === 'trendline' && drawing.p1 && drawing.p2) {
        const x1 = chart.timeScale().timeToCoordinate(drawing.p1.time as any);
        const y1 = series.priceToCoordinate(drawing.p1.price);
        const x2 = chart.timeScale().timeToCoordinate(drawing.p2.time as any);
        const y2 = series.priceToCoordinate(drawing.p2.price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) return;

        ctx.strokeStyle = isSelected ? '#f59e0b' : '#3b82f6';
        ctx.lineWidth = isSelected ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Coordinate endpoints nodes
        ctx.fillStyle = isSelected ? '#f59e0b' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(x1, y1, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.arc(x2, y2, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (drawing.type === 'fvg' && drawing.startTime && drawing.high && drawing.low) {
        const xStart = chart.timeScale().timeToCoordinate(drawing.startTime as any);
        const yHigh = series.priceToCoordinate(drawing.high);
        const yLow = series.priceToCoordinate(drawing.low);

        if (xStart === null || yHigh === null || yLow === null) return;

        ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.12)';
        ctx.fillRect(xStart, yHigh, canvas.width - xStart, yLow - yHigh);

        // Draw boundaries
        ctx.strokeStyle = isSelected ? '#f59e0b' : 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xStart, yHigh);
        ctx.lineTo(canvas.width, yHigh);
        ctx.moveTo(xStart, yLow);
        ctx.lineTo(canvas.width, yLow);
        ctx.stroke();
        ctx.setLineDash([]);

        // Selection outlines
        if (isSelected) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.strokeRect(xStart, yHigh, canvas.width - xStart, yLow - yHigh);
        }

        // FVG Marker label
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('FVG ZONE', xStart + 8, yHigh + 14);
      }
      else if (drawing.type === 'planner' && drawing.startTime && drawing.entry && drawing.sl && drawing.tp) {
        const xStart = chart.timeScale().timeToCoordinate(drawing.startTime as any);
        const yEntry = series.priceToCoordinate(drawing.entry);
        const ySl = series.priceToCoordinate(drawing.sl);
        const yTp = series.priceToCoordinate(drawing.tp);

        if (xStart === null || yEntry === null || ySl === null || yTp === null) return;

        const isLong = drawing.plannerType === 'long';

        // Draw Target TP Box
        ctx.fillStyle = isLong ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
        const tpHeight = yEntry - yTp; 
        ctx.fillRect(xStart, yTp, canvas.width - xStart, tpHeight);

        // Draw Stop Loss Box
        ctx.fillStyle = isLong ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)';
        const slHeight = ySl - yEntry;
        ctx.fillRect(xStart, yEntry, canvas.width - xStart, slHeight);

        // Selection outline
        if (isSelected) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.strokeRect(xStart, Math.min(yTp, ySl), canvas.width - xStart, Math.abs(ySl - yTp));
        }

        // Boundaries lines
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xStart, yTp);
        ctx.lineTo(canvas.width, yTp);
        ctx.moveTo(xStart, ySl);
        ctx.lineTo(canvas.width, ySl);
        ctx.stroke();

        // Entry border
        ctx.strokeStyle = isLong ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xStart, yEntry);
        ctx.lineTo(canvas.width, yEntry);
        ctx.stroke();

        // Tag label
        ctx.fillStyle = isLong ? '#10b981' : '#ef4444';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(isLong ? 'LONG POSITION PLANNER' : 'SHORT POSITION PLANNER', xStart + 8, yEntry - 5);
      }
    });

    // Draw Live Drag Preview Shape
    const drag = drawingStateRef.current;
    if (drag && activeToolRef.current !== 'cursor') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      const startX = drag.startX;
      const startY = drag.startY;
      const currentX = drag.currentX;
      const currentY = drag.currentY;

      if (activeToolRef.current === 'trendline') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        // draw endpoints nodes
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, Math.PI * 2);
        ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (activeToolRef.current === 'fvg') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.fillRect(startX, startY, currentX - startX, currentY - startY);
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      }
      else if (activeToolRef.current === 'long' || activeToolRef.current === 'short') {
        const isLong = activeToolRef.current === 'long';
        const tpHeight = currentY - startY;
        
        ctx.fillStyle = isLong 
          ? (tpHeight < 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)')
          : (tpHeight > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)');
        ctx.fillRect(startX, startY, currentX - startX, tpHeight);

        ctx.fillStyle = isLong
          ? (tpHeight < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)')
          : (tpHeight > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)');
        ctx.fillRect(startX, startY, currentX - startX, -tpHeight);

        ctx.strokeStyle = isLong ? '#10b981' : '#ef4444';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, startY);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  };

  // Click-and-drag drawing engine event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const activeToolVal = activeToolRef.current;
    if (activeToolVal === 'cursor') return;

    const canvas = drawingCanvasRef.current;
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!canvas || !chart || !series) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let price = series.coordinateToPrice(y);
    let time = chart.timeScale().coordinateToTime(x);

    if (price && time) {
      // Snapping magnet snaps to candle boundaries
      if (isMagnetModeRef.current && candlesRef.current.length > 0) {
        const closestCandle = candlesRef.current.reduce((prev: any, curr: any) => {
          return Math.abs(curr.time - (time as number)) < Math.abs(prev.time - (time as number)) ? curr : prev;
        });
        if (closestCandle) {
          const snaps = [closestCandle.open, closestCandle.high, closestCandle.low, closestCandle.close];
          const closestSnap = snaps.reduce((prev: number, curr: number) => {
            return Math.abs(curr - price!) < Math.abs(prev - price!) ? curr : prev;
          });
          price = closestSnap;
        }
      }

      // Horizontal line places immediately on MouseDown
      if (activeToolVal === 'horizontal') {
        const drawingId = Math.random().toString(36).substring(2, 9);
        const updated: DrawingItem[] = [
          ...drawnLinesRef.current,
          { id: drawingId, type: 'horizontal' as const, price, time: time as number }
        ];
        setDrawnLines(updated);
        saveDrawingsData(updated);
        if (!isToolLockedRef.current) setActiveTool('cursor');
        toast.success(`Horizontal Line placed at ${price.toFixed(5)}`);
        return;
      }

      // Start drag coordinate tracking for other shapes
      setDrawingState({
        startX: x,
        startY: y,
        startTime: time as number,
        startPrice: price,
        currentX: x,
        currentY: y
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeToolRef.current === 'cursor' || !drawingStateRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawingState((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        currentX: x,
        currentY: y
      };
    });
  };

  const handleCanvasMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const activeToolVal = activeToolRef.current;
    const drag = drawingStateRef.current;
    if (activeToolVal === 'cursor' || !drag) return;

    const canvas = drawingCanvasRef.current;
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!canvas || !chart || !series) {
      setDrawingState(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let price = series.coordinateToPrice(y);
    let time = chart.timeScale().coordinateToTime(x);

    if (price && time) {
      // Snapping magnet
      if (isMagnetModeRef.current && candlesRef.current.length > 0) {
        const closestCandle = candlesRef.current.reduce((prev: any, curr: any) => {
          return Math.abs(curr.time - (time as number)) < Math.abs(prev.time - (time as number)) ? curr : prev;
        });
        if (closestCandle) {
          const snaps = [closestCandle.open, closestCandle.high, closestCandle.low, closestCandle.close];
          const closestSnap = snaps.reduce((prev: number, curr: number) => {
            return Math.abs(curr - price!) < Math.abs(prev - price!) ? curr : prev;
          });
          price = closestSnap;
        }
      }

      const drawingId = Math.random().toString(36).substring(2, 9);
      let newDrawing: DrawingItem | null = null;

      if (activeToolVal === 'trendline') {
        newDrawing = {
          id: drawingId,
          type: 'trendline' as const,
          p1: { time: drag.startTime, price: drag.startPrice },
          p2: { time: time as number, price }
        };
      }
      else if (activeToolVal === 'fvg') {
        newDrawing = {
          id: drawingId,
          type: 'fvg' as const,
          startTime: drag.startTime,
          high: Math.max(drag.startPrice, price),
          low: Math.min(drag.startPrice, price)
        };
      }
      else if (activeToolVal === 'long' || activeToolVal === 'short') {
        const isLong = activeToolVal === 'long';
        const details = getSymbolDetails(sessionSymbolRef.current || 'EURUSD');
        const entry = drag.startPrice;
        const diffPrice = Math.abs(price - entry);

        let sl = 0;
        let tp = 0;

        if (isLong) {
          if (price < entry) {
            // Dragged below entry: dragging SL boundary
            const slOffset = diffPrice;
            const tpOffset = diffPrice * 2;
            sl = entry - slOffset;
            tp = entry + tpOffset;
          } else {
            // Dragged above entry: dragging TP boundary
            const tpOffset = diffPrice;
            const slOffset = diffPrice / 2;
            sl = entry - slOffset;
            tp = entry + tpOffset;
          }
        } else {
          if (price > entry) {
            // Dragged above entry: dragging SL boundary
            const slOffset = diffPrice;
            const tpOffset = diffPrice * 2;
            sl = entry + slOffset;
            tp = entry - tpOffset;
          } else {
            // Dragged below entry: dragging TP boundary
            const tpOffset = diffPrice;
            const slOffset = diffPrice / 2;
            sl = entry + slOffset;
            tp = entry - tpOffset;
          }
        }

        newDrawing = {
          id: drawingId,
          type: 'planner' as const,
          plannerType: isLong ? 'long' as const : 'short' as const,
          startTime: drag.startTime,
          entry,
          sl,
          tp
        };
      }

      if (newDrawing) {
        const updated: DrawingItem[] = [...drawnLinesRef.current, newDrawing];
        setDrawnLines(updated);
        saveDrawingsData(updated);
        toast.success(`${newDrawing.type.toUpperCase()} placed successfully!`);
      }
    }

    setDrawingState(null);
    if (!isToolLockedRef.current) {
      setActiveTool('cursor');
    }
  };

  // Reset drawing drag if mouse is released globally outside canvas boundaries
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (drawingStateRef.current) {
        setDrawingState(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

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

    // Add EMA series elements dynamically (data is populated in candles effect)
    ema20SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#6366f1', // Indigo
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 20',
    });
    
    ema50SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#10b981', // Green
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 50',
    });

    ema200SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ef4444', // Red
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 200',
    });

    chart.timeScale().fitContent();

    // Chart Click Handler for drawings & selection (utilizes synced state refs)
    chart.subscribeClick((param) => {
      const activeToolVal = activeToolRef.current;
      const drawingStateVal = drawingStateRef.current;
      const isMagnetModeVal = isMagnetModeRef.current;
      const isToolLockedVal = isToolLockedRef.current;
      const candlesVal = candlesRef.current;
      const slPipsVal = slPipsRef.current;
      const tpPipsVal = tpPipsRef.current;
      const sessionSymbolVal = sessionSymbolRef.current;
      const series = candleSeriesRef.current;

      if (!param.point || !param.time || !series) return;
      
      let price = series.coordinateToPrice(param.point.y);
      if (!price) return;
      const time = param.time;

      // Selection crosshair logic
      if (activeToolVal === 'cursor') {
        const xClick = param.point.x;
        const yClick = param.point.y;
        let matchedId: string | null = null;

        for (const drawing of drawnLinesRef.current) {
          if (drawing.type === 'horizontal' && drawing.price) {
            const y = series.priceToCoordinate(drawing.price);
            if (y !== null && Math.abs(yClick - y) < 8) {
              matchedId = drawing.id;
              break;
            }
          }
          else if (drawing.type === 'trendline' && drawing.p1 && drawing.p2) {
            const x1 = chart.timeScale().timeToCoordinate(drawing.p1.time as any);
            const y1 = series.priceToCoordinate(drawing.p1.price);
            const x2 = chart.timeScale().timeToCoordinate(drawing.p2.time as any);
            const y2 = series.priceToCoordinate(drawing.p2.price);
            if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
              const A = xClick - x1;
              const B = yClick - y1;
              const C = x2 - x1;
              const D = y2 - y1;
              const dot = A * C + B * D;
              const lenSq = C * C + D * D;
              let param_t = -1;
              if (lenSq !== 0) param_t = dot / lenSq;
              let xx, yy;
              if (param_t < 0) { xx = x1; yy = y1; }
              else if (param_t > 1) { xx = x2; yy = y2; }
              else { xx = x1 + param_t * C; yy = y1 + param_t * D; }
              const dist = Math.sqrt((xClick - xx) ** 2 + (yClick - yy) ** 2);
              if (dist < 8) {
                matchedId = drawing.id;
                break;
              }
            }
          }
          else if (drawing.type === 'fvg' && drawing.startTime && drawing.high && drawing.low) {
            const xStart = chart.timeScale().timeToCoordinate(drawing.startTime as any);
            const yHigh = series.priceToCoordinate(drawing.high);
            const yLow = series.priceToCoordinate(drawing.low);
            if (xStart !== null && yHigh !== null && yLow !== null) {
              if (xClick >= xStart && yClick >= yHigh && yClick <= yLow) {
                matchedId = drawing.id;
                break;
              }
            }
          }
          else if (drawing.type === 'planner' && drawing.startTime && drawing.entry && drawing.sl && drawing.tp) {
            const xStart = chart.timeScale().timeToCoordinate(drawing.startTime as any);
            const yEntry = series.priceToCoordinate(drawing.entry);
            const ySl = series.priceToCoordinate(drawing.sl);
            const yTp = series.priceToCoordinate(drawing.tp);
            if (xStart !== null && yEntry !== null && ySl !== null && yTp !== null) {
              const yMin = Math.min(yTp, ySl, yEntry);
              const yMax = Math.max(yTp, ySl, yEntry);
              if (xClick >= xStart && yClick >= yMin && yClick <= yMax) {
                matchedId = drawing.id;
                break;
              }
            }
          }
        }

        setSelectedDrawingId(matchedId);
        if (matchedId) {
          toast.success('Drawing selected. Press Backspace/Delete to remove.', { id: 'draw-select-notif' });
        }
        return;
      }
    });

    // Timescale scroll/zoom listeners
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (rsiChartRef.current && range) {
        rsiChartRef.current.timeScale().setVisibleLogicalRange(range);
      }
      drawShapes();
    });

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
      drawShapes();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
      drawShapes();
    };
    window.addEventListener('resize', handleResize);

    setTimeout(() => {
      drawShapes();
    }, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [loading, loadingChart]);

  // RSI Chart Panel setup
  useEffect(() => {
    if (loading || loadingChart || candles.length === 0 || !rsiContainerRef.current || !indicatorsConfig.rsi) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
      return;
    }

    const isDarkTheme = document.documentElement.classList.contains('dark');
    const rsiChart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDarkTheme ? '#090a10' : '#ffffff' },
        textColor: isDarkTheme ? '#9ca3af' : '#4b5563',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
      },
      timeScale: {
        visible: false,
      },
      rightPriceScale: {
        visible: true,
        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      }
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 2,
      priceLineVisible: false,
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: 'rgba(139, 92, 246, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
    });

    rsiSeries.createPriceLine({
      price: 70,
      color: 'rgba(139, 92, 246, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
    });

    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;

    // Hydrate logical range
    if (chartRef.current) {
      const range = chartRef.current.timeScale().getVisibleLogicalRange();
      if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
    }

    const handleResize = () => {
      if (rsiChart && rsiContainerRef.current) {
        rsiChart.resize(
          rsiContainerRef.current.clientWidth,
          rsiContainerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      rsiChart.remove();
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
    };
  }, [loading, loadingChart, indicatorsConfig.rsi]);

  // Sync visible slice of candles, EMAs, and RSI data when index/config changes
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0 || currentIndex >= candles.length) return;

    const visibleData = candles.slice(0, currentIndex + 1);
    candleSeriesRef.current.setData(visibleData);

    // Compute and populate EMA lines
    if (ema20SeriesRef.current) {
      if (indicatorsConfig.ema20) {
        ema20SeriesRef.current.setData(computeEMA(visibleData, 20));
      } else {
        ema20SeriesRef.current.setData([]);
      }
    }
    if (ema50SeriesRef.current) {
      if (indicatorsConfig.ema50) {
        ema50SeriesRef.current.setData(computeEMA(visibleData, 50));
      } else {
        ema50SeriesRef.current.setData([]);
      }
    }
    if (ema200SeriesRef.current) {
      if (indicatorsConfig.ema200) {
        ema200SeriesRef.current.setData(computeEMA(visibleData, 200));
      } else {
        ema200SeriesRef.current.setData([]);
      }
    }

    // Compute and populate RSI line
    if (rsiSeriesRef.current && indicatorsConfig.rsi) {
      rsiSeriesRef.current.setData(computeRSI(visibleData, 14));
    }

    const currentCandle = candles[currentIndex];
    if (currentCandle) {
      setCurrentTimeUnix(currentCandle.time);
    }

    updateChartPriceLines();
    drawShapes();
  }, [currentIndex, candles, indicatorsConfig]);

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
  }, [isPlaying, currentIndex, activeTrade, pendingOrders, candles, playSpeed, drawnLines, indicatorsConfig]);

  // Keyboard Shortcuts Hub (Stepping navigation and equipping toolbar actions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepBackward();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setActiveTool('trendline');
        setDrawingState(null);
        toast.success('Trendline Tool active');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setActiveTool('horizontal');
        setDrawingState(null);
        toast.success('Horizontal Tool active');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setActiveTool('fvg');
        setDrawingState(null);
        toast.success('FVG Tool active');
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setActiveTool('long');
        setDrawingState(null);
        toast.success('Long Position Tool active');
      } else if (e.key === 's' || e.key === 'S') {
        // Only trigger Short Planner if not writing in inputs
        e.preventDefault();
        setActiveTool('short');
        setDrawingState(null);
        toast.success('Short Position Tool active');
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setActiveTool('cursor');
        setDrawingState(null);
        setSelectedDrawingId(null);
        toast.success('Cursor active');
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedDrawingIdRef.current) {
          e.preventDefault();
          const updated = drawnLinesRef.current.filter((d) => d.id !== selectedDrawingIdRef.current);
          setDrawnLines(updated);
          saveDrawingsData(updated);
          setSelectedDrawingId(null);
          toast.success('Drawing deleted');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, candles, balance, activeTrade, pendingOrders, drawnLines, indicatorsConfig]);

  const saveDrawingsData = async (updatedDrawings: DrawingItem[]) => {
    if (!session) return;
    try {
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), balance, activeTrade, updatedDrawings, pendingOrders, indicatorsConfig);
    } catch (err) {
      console.error('Failed to save drawings to cloud:', err);
    }
  };

  const handleStepForward = async () => {
    if (currentIndex >= candles.length - 1) {
      setIsPlaying(false);
      toast.success('Simulation completed!');
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextCandle = candles[nextIndex];

    let currentBal = balance;
    let activeT = activeTrade ? { ...activeTrade } : null;
    let pOrders = [...pendingOrders];
    let triggeredOrderIdx = -1;

    // 1. Check if any pending orders are triggered by the next candle range
    if (!activeT && pOrders.length > 0) {
      for (let i = 0; i < pOrders.length; i++) {
        const o = pOrders[i];
        let triggered = false;
        
        if (o.type === 'Buy Limit' && nextCandle.low <= o.price) triggered = true;
        else if (o.type === 'Sell Limit' && nextCandle.high >= o.price) triggered = true;
        else if (o.type === 'Buy Stop' && nextCandle.high >= o.price) triggered = true;
        else if (o.type === 'Sell Stop' && nextCandle.low <= o.price) triggered = true;

        if (triggered) {
          triggeredOrderIdx = i;
          break;
        }
      }

      if (triggeredOrderIdx !== -1) {
        const order = pOrders[triggeredOrderIdx];
        activeT = {
          type: order.side,
          entryPrice: order.price,
          qty: order.qty,
          sl: order.sl,
          tp: order.tp,
          entryTime: nextCandle.time,
          risk_percent: order.risk_percent,
          risk_amount: order.risk_amount
        };
        
        pOrders.splice(triggeredOrderIdx, 1);
        setPendingOrders(pOrders);
        setActiveTrade(activeT);
        toast.success(`Pending ${order.type} triggered at ${order.price.toFixed(5)}!`);
        setIsPlaying(false); // Pause on trigger for execution oversight
      }
    }

    setCurrentIndex(nextIndex);
    setCurrentTimeUnix(nextCandle.time);

    // 2. Check if active position hits limits
    if (activeT) {
      const isLong = activeT.type === 'Long';
      let hitSL = false;
      let hitTP = false;

      if (isLong) {
        if (activeT.sl && nextCandle.low <= activeT.sl) hitSL = true;
        if (activeT.tp && nextCandle.high >= activeT.tp) hitTP = true;
      } else {
        if (activeT.sl && nextCandle.high >= activeT.sl) hitSL = true;
        if (activeT.tp && nextCandle.low <= activeT.tp) hitTP = true;
      }

      if (hitSL) {
        await executeCloseTrade(activeT.sl!, nextCandle.time, 'SL Hit', activeT, pOrders);
        activeT = null;
        setIsPlaying(false);
      } else if (hitTP) {
        await executeCloseTrade(activeT.tp!, nextCandle.time, 'TP Hit', activeT, pOrders);
        activeT = null;
        setIsPlaying(false);
      }
    }

    if (session) {
      await updateSessionState(
        sessionId,
        nextCandle.time,
        currentBal,
        activeT,
        drawnLines,
        pOrders,
        indicatorsConfig
      );
    }
  };

  const handleStepBackward = async () => {
    if (currentIndex <= 50) return;
    const prevIndex = currentIndex - 1;
    const prevCandle = candles[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentTimeUnix(prevCandle.time);
    
    if (session) {
      await updateSessionState(sessionId, prevCandle.time, balance, activeTrade, drawnLines, pendingOrders, indicatorsConfig);
    }
  };

  const handleOpenPosition = async (side: 'Long' | 'Short') => {
    if (!session) return;

    const currentCandle = candles[currentIndex];
    const entryPrice = currentCandle.close;
    const lotSize = parseFloat(lots) || 1.0;
    const details = getSymbolDetails(session.symbol);
    
    let slPrice: number | undefined;
    let tpPrice: number | undefined;

    if (slPips) {
      const slOffset = parseFloat(slPips) / details.multiplier;
      slPrice = side === 'Long' ? entryPrice - slOffset : entryPrice + slOffset;
    }
    if (tpPips) {
      const tpOffset = parseFloat(tpPips) / details.multiplier;
      tpPrice = side === 'Long' ? entryPrice + tpOffset : entryPrice - tpOffset;
    }

    let riskAmt = 0;
    let riskPct = 0;
    if (useRiskCalculator) {
      riskAmt = riskType === 'cash' ? parseFloat(riskCash) : balance * (parseFloat(riskPercent) / 100);
      riskPct = riskType === 'percent' ? parseFloat(riskPercent) : (riskAmt / balance) * 100;
    }

    if (orderType === 'market') {
      if (activeTrade) {
        toast.error('Another position is already active in this sandbox.');
        return;
      }

      const tradeState = {
        type: side,
        entryPrice,
        qty: lotSize,
        sl: slPrice,
        tp: tpPrice,
        entryTime: currentCandle.time,
        risk_percent: riskPct || undefined,
        risk_amount: riskAmt || undefined
      };

      setActiveTrade(tradeState);
      await updateSessionState(sessionId, currentTimeUnix || currentCandle.time, balance, tradeState, drawnLines, pendingOrders, indicatorsConfig);
      toast.success(`${side} Opened at ${entryPrice.toFixed(5)}`);
    } else {
      // Pending Stop/Limit order logic
      const triggerPrice = parseFloat(limitPriceInput);
      if (isNaN(triggerPrice) || triggerPrice <= 0) {
        toast.error('Please enter a valid trigger price.');
        return;
      }

      let pType: PendingOrder['type'] = 'Buy Limit';
      if (side === 'Long') {
        pType = triggerPrice < entryPrice ? 'Buy Limit' : 'Buy Stop';
      } else {
        pType = triggerPrice > entryPrice ? 'Sell Limit' : 'Sell Stop';
      }

      // Re-calculate SL/TP relative to pending price
      if (slPips) {
        const slOffset = parseFloat(slPips) / details.multiplier;
        slPrice = side === 'Long' ? triggerPrice - slOffset : triggerPrice + slOffset;
      }
      if (tpPips) {
        const tpOffset = parseFloat(tpPips) / details.multiplier;
        tpPrice = side === 'Long' ? triggerPrice + tpOffset : triggerPrice - tpOffset;
      }

      const newPending: PendingOrder = {
        id: Math.random().toString(36).substring(2, 9),
        type: pType,
        side,
        price: triggerPrice,
        qty: lotSize,
        sl: slPrice,
        tp: tpPrice,
        risk_percent: riskPct || undefined,
        risk_amount: riskAmt || undefined,
        createdTime: currentCandle.time
      };

      const updatedPending = [...pendingOrders, newPending];
      setPendingOrders(updatedPending);
      setLimitPriceInput('');

      await updateSessionState(sessionId, currentTimeUnix || currentCandle.time, balance, activeTrade, drawnLines, updatedPending, indicatorsConfig);
      toast.success(`Pending ${pType} set at ${triggerPrice.toFixed(5)}`);
    }
  };

  const handleCancelPending = async (id: string) => {
    const updated = pendingOrders.filter(o => o.id !== id);
    setPendingOrders(updated);
    if (session) {
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), balance, activeTrade, drawnLines, updated, indicatorsConfig);
    }
    toast.success('Pending order cancelled.');
  };

  const handleManualClose = async () => {
    if (!activeTrade) return;
    const currentCandle = candles[currentIndex];
    await executeCloseTrade(currentCandle.close, currentCandle.time, 'Manual Close', activeTrade, pendingOrders);
  };

  const handleMoveToBE = async () => {
    if (!activeTrade) return;
    const updatedTrade = { ...activeTrade, sl: activeTrade.entryPrice };
    setActiveTrade(updatedTrade);
    if (session) {
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), balance, updatedTrade, drawnLines, pendingOrders, indicatorsConfig);
    }
    toast.success(`Stop Loss moved to Break-Even at ${activeTrade.entryPrice.toFixed(5)}`);
  };

  const handleModifyLimits = async () => {
    if (!activeTrade) return;
    const slVal = modifySLInput ? parseFloat(modifySLInput) : undefined;
    const tpVal = modifyTPInput ? parseFloat(modifyTPInput) : undefined;

    const updatedTrade = { ...activeTrade, sl: slVal, tp: tpVal };
    setActiveTrade(updatedTrade);
    if (session) {
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), balance, updatedTrade, drawnLines, pendingOrders, indicatorsConfig);
    }
    toast.success('Position Stop/Target limits updated.');
  };

  const handlePartialClose = async (pct: number) => {
    if (!activeTrade || !session) return;
    const fraction = pct / 100;
    const qtyToClose = activeTrade.qty * fraction;
    const currentCandle = candles[currentIndex];
    const exitPrice = currentCandle.close;

    const details = getSymbolDetails(session.symbol);
    const isLong = activeTrade.type === 'Long';
    const priceDiff = isLong ? exitPrice - activeTrade.entryPrice : activeTrade.entryPrice - exitPrice;
    const pipsCalculated = priceDiff * details.multiplier;
    const pnl = priceDiff * qtyToClose * details.contractSize;

    const finalBalance = balance + pnl;

    // Calculate realized R-multiple
    let rMult = 0;
    if (activeTrade.sl) {
      const initialRiskPrice = isLong ? activeTrade.entryPrice - activeTrade.sl : activeTrade.sl - activeTrade.entryPrice;
      if (initialRiskPrice > 0) {
        rMult = priceDiff / initialRiskPrice;
      }
    }

    try {
      const newTrade = await addBacktestTrade({
        session_id: sessionId,
        symbol: session.symbol,
        type: activeTrade.type,
        entry_price: activeTrade.entryPrice,
        exit_price: exitPrice,
        entry_time: new Date(activeTrade.entryTime * 1000).toISOString(),
        exit_time: new Date(currentCandle.time * 1000).toISOString(),
        quantity: qtyToClose,
        profit_loss: pnl,
        pips: pipsCalculated,
        stop_loss: activeTrade.sl || undefined,
        take_profit: activeTrade.tp || undefined,
        notes: `Partial Close ${pct}%`,
        risk_percent: activeTrade.risk_percent ? activeTrade.risk_percent * fraction : undefined,
        risk_amount: activeTrade.risk_amount ? activeTrade.risk_amount * fraction : undefined,
        r_multiple: rMult,
        close_reason: `Partial Close ${pct}%`
      });

      const updatedTrade = {
        ...activeTrade,
        qty: activeTrade.qty - qtyToClose,
        risk_amount: activeTrade.risk_amount ? activeTrade.risk_amount * (1 - fraction) : undefined
      };

      setTrades(prev => [...prev, newTrade]);
      setBalance(finalBalance);
      setActiveTrade(updatedTrade);

      await updateSessionState(sessionId, currentTimeUnix || currentCandle.time, finalBalance, updatedTrade, drawnLines, pendingOrders, indicatorsConfig);
      toast.success(`Partial Close ${pct}% filled. Balance: +$${pnl.toFixed(2)}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to execute partial close');
    }
  };

  const executeCloseTrade = async (
    exitPrice: number,
    exitTimeUnix: number,
    notesText = '',
    tradeToClose = activeTrade,
    activePending = pendingOrders
  ) => {
    if (!tradeToClose || !session) return;

    const details = getSymbolDetails(session.symbol);
    const isLong = tradeToClose.type === 'Long';
    const priceDiff = isLong ? exitPrice - tradeToClose.entryPrice : tradeToClose.entryPrice - exitPrice;
    const pipsCalculated = priceDiff * details.multiplier;
    const pnl = priceDiff * tradeToClose.qty * details.contractSize;

    const finalBalance = balance + pnl;

    let rMult = 0;
    if (tradeToClose.sl) {
      const initialRiskPrice = isLong ? tradeToClose.entryPrice - tradeToClose.sl : tradeToClose.sl - tradeToClose.entryPrice;
      if (initialRiskPrice > 0) {
        rMult = priceDiff / initialRiskPrice;
      }
    }

    try {
      const newTrade = await addBacktestTrade({
        session_id: sessionId,
        symbol: session.symbol,
        type: tradeToClose.type,
        entry_price: tradeToClose.entryPrice,
        exit_price: exitPrice,
        entry_time: new Date(tradeToClose.entryTime * 1000).toISOString(),
        exit_time: new Date(exitTimeUnix * 1000).toISOString(),
        quantity: tradeToClose.qty,
        profit_loss: pnl,
        pips: pipsCalculated,
        stop_loss: tradeToClose.sl || undefined,
        take_profit: tradeToClose.tp || undefined,
        notes: notesText,
        risk_percent: tradeToClose.risk_percent,
        risk_amount: tradeToClose.risk_amount,
        r_multiple: rMult,
        close_reason: notesText
      });

      setTrades(prev => [...prev, newTrade]);
      setBalance(finalBalance);
      setActiveTrade(null);

      await updateSessionState(sessionId, currentTimeUnix || exitTimeUnix, finalBalance, null, drawnLines, activePending, indicatorsConfig);

      if (pnl >= 0) {
        toast.success(`Profit: +$${pnl.toFixed(2)} (${rMult > 0 ? '+' + rMult.toFixed(2) + 'R' : ''})`);
      } else {
        toast.error(`Loss: -$${Math.abs(pnl).toFixed(2)} (${rMult.toFixed(2)}R)`);
      }

      if (candleSeriesRef.current) {
        const markers = [
          {
            time: tradeToClose.entryTime,
            position: tradeToClose.type === 'Long' ? 'belowBar' : 'aboveBar',
            color: '#10b981',
            shape: tradeToClose.type === 'Long' ? 'arrowUp' : 'arrowDown',
            text: 'BUY',
          },
          {
            time: exitTimeUnix,
            position: tradeToClose.type === 'Long' ? 'aboveBar' : 'belowBar',
            color: '#ef4444',
            shape: tradeToClose.type === 'Long' ? 'arrowDown' : 'arrowUp',
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
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), newBal, activeTrade, drawnLines, pendingOrders, indicatorsConfig);
      toast.success('Trade deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete trade.');
    }
  };

  const clearDrawings = () => {
    setDrawnLines([]);
    setDrawingState(null);
    setActiveTool('cursor');
    saveDrawingsData([]);
    toast.success('All drawings cleared');
  };

  const toggleIndicator = async (key: 'ema20' | 'ema50' | 'ema200' | 'rsi') => {
    const updated = {
      ...indicatorsConfig,
      [key]: !indicatorsConfig[key]
    };
    setIndicatorsConfig(updated);
    if (session) {
      await updateSessionState(sessionId, currentTimeUnix || Math.floor(Date.now() / 1000), balance, activeTrade, drawnLines, pendingOrders, updated);
    }
  };

  const handleDragMouseDown = (e: React.MouseEvent) => {
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = document.fullscreenElement === chartWrapperRef.current;
      setIsFullscreen(isFull);
      setPanelPos({ x: 0, y: 0 });

      const container = chartContainerRef.current;
      if (chartRef.current && container) {
        setTimeout(() => {
          chartRef.current.resize(
            container.clientWidth,
            container.clientHeight
          );
          drawShapes();
        }, 100);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Export backtest trades to CSV
  const handleExportCSV = () => {
    if (trades.length === 0) {
      toast.error('No logged trades to export.');
      return;
    }
    const headers = ['ID', 'Type', 'Size', 'Entry Price', 'Exit Price', 'Entry Time', 'Exit Time', 'Pips', 'PnL ($)', 'R Multiple', 'Close Reason'];
    const rows = trades.map(t => [
      t.id,
      t.type,
      t.quantity,
      t.entry_price,
      t.exit_price || '',
      t.entry_time,
      t.exit_time || '',
      t.pips || 0,
      t.profit_loss || 0,
      t.r_multiple || 0,
      t.close_reason || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `backtest_session_${session?.name || 'trades'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Trades exported successfully');
  };

  // Performance calculations
  const totalTrades = trades.length;
  const wins = trades.filter(t => (t.profit_loss ?? 0) >= 0).length;
  const losses = totalTrades - wins;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const netProfit = balance - (session?.initial_balance || 10000);
  
  // Realized Profit Factor
  const grossProfit = trades.reduce((sum, t) => t.profit_loss && t.profit_loss > 0 ? sum + Number(t.profit_loss) : sum, 0);
  const grossLoss = trades.reduce((sum, t) => t.profit_loss && t.profit_loss < 0 ? sum + Math.abs(Number(t.profit_loss)) : sum, 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  // Max Drawdown (Peak to Valley)
  let peak = session?.initial_balance || 10000;
  let maxDD = 0;
  let runningBal = session?.initial_balance || 10000;
  trades.forEach((t) => {
    runningBal += Number(t.profit_loss ?? 0);
    if (runningBal > peak) peak = runningBal;
    const dd = ((peak - runningBal) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  });

  // Realized Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let streakType: 'win' | 'loss' | null = null;
  let consecutiveCount = 0;
  trades.forEach((t) => {
    const isWin = (t.profit_loss ?? 0) >= 0;
    if (isWin) {
      if (streakType === 'win') consecutiveCount++;
      else { streakType = 'win'; consecutiveCount = 1; }
      if (consecutiveCount > maxWinStreak) maxWinStreak = consecutiveCount;
    } else {
      if (streakType === 'loss') consecutiveCount++;
      else { streakType = 'loss'; consecutiveCount = 1; }
      if (consecutiveCount > maxLossStreak) maxLossStreak = consecutiveCount;
    }
  });

  // Realized Avg R:R
  const rMultiples = trades.map(t => t.r_multiple || 0).filter(r => r !== 0);
  const avgRR = rMultiples.length > 0 ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length : 0;

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
          <button onClick={() => router.push('/backtesting')} className="px-5 py-3 bg-indigo-600 rounded-xl text-sm font-semibold text-white shadow-lg">
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
      <div className="h-[calc(100vh-64px)] flex flex-col bg-[#090a10] text-slate-100 relative overflow-hidden font-sans">
        
        {/* Terminal Header Row */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0c0d16] px-5 py-3.5 z-20">
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => router.push('/backtesting')}
              className="p-1.5 hover:bg-white/5 rounded-lg border border-white/[0.04] transition-all text-slate-400 hover:text-white"
              title="Return to runs list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">{session.name}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                  {session.symbol}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formattedTime} UTC</p>
            </div>
          </div>

          {/* Timeframe selector & Navigation Controls */}
          <div className="flex items-center gap-4">
            
            {/* Indicators Config Popover */}
            <div className="flex items-center bg-slate-900 border border-white/[0.06] rounded-xl p-0.5 gap-0.5">
              <button 
                onClick={() => toggleIndicator('ema20')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${indicatorsConfig.ema20 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                EMA20
              </button>
              <button 
                onClick={() => toggleIndicator('ema50')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${indicatorsConfig.ema50 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                EMA50
              </button>
              <button 
                onClick={() => toggleIndicator('ema200')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${indicatorsConfig.ema200 ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                EMA200
              </button>
              <button 
                onClick={() => toggleIndicator('rsi')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${indicatorsConfig.rsi ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                RSI
              </button>
            </div>

            {/* Timeframe picker */}
            <div className="flex bg-slate-900/60 p-0.5 rounded-xl border border-white/[0.05]">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    activeTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Step Controls */}
            <div className="flex items-center gap-1.5 border-l border-white/[0.08] pl-4">
              <button
                onClick={handleStepBackward}
                disabled={currentIndex <= 50 || isPlaying}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 active:scale-95"
                title="Backward 1 Bar (←)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg active:scale-90"
                title="Play/Pause Autoplay (P / Space)"
              >
                {isPlaying ? (
                  <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleStepForward}
                disabled={currentIndex >= candles.length - 1 || isPlaying}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 active:scale-95"
                title="Forward 1 Bar (→ / Space)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
              className="px-2 py-1.5 text-[10px] font-bold border border-white/[0.06] rounded-xl bg-slate-900 text-slate-300 focus:outline-none"
            >
              <option value={1500}>1.5s Speed</option>
              <option value={1000}>1.0s Speed</option>
              <option value={500}>0.5s Speed</option>
              <option value={200}>0.2s Speed</option>
            </select>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-lg border border-white/[0.04] transition-all ${isSidebarOpen ? 'bg-indigo-600/25 text-indigo-400 border-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Toggle Right Execution Panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Workspace Layout Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main workspace container (Left: Chart, Bottom: drawer) */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#090a10]">
            
            {/* Chart Canvas Area */}
            <div ref={chartWrapperRef} className="flex-1 min-h-0 relative">
              
              {/* Toolbar Drawer overlays on Left */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 p-1 bg-[#0c0d16]/95 backdrop-blur-md rounded-xl border border-white/[0.08] shadow-2xl">
                
                {/* 1. Pointer */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTool('cursor'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${activeTool === 'cursor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  title="Select Crosshair (Esc / C)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-9h18" />
                  </svg>
                </button>

                <div className="h-px bg-white/[0.06] my-1 mx-1.5" />

                {/* 2. Trendline */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTool('trendline'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${activeTool === 'trendline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  title="Trendline (T - Click twice)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="6" cy="18" r="1.5" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="18" cy="6" r="1.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>

                {/* 3. Horizontal Level */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTool('horizontal'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${activeTool === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  title="Horizontal Line (H - Click once)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
                  </svg>
                </button>

                {/* 4. FVG Zone */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTool('fvg'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${activeTool === 'fvg' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  title="FVG Rectangle (F - Click High then Low)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="4" y="6" width="16" height="12" rx="1" />
                  </svg>
                </button>

                <div className="h-px bg-white/[0.06] my-1 mx-1.5" />

                {/* 5. Long Planner */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTool('long'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${activeTool === 'long' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                  title="Long position Planner (G)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                  </svg>
                </button>

                {/* 6. Short Planner */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTool('short'); setDrawingState(null); }}
                  className={`p-2 rounded-lg transition-all ${activeTool === 'short' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-500 hover:bg-rose-500/10'}`}
                  title="Short position Planner (S)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                  </svg>
                </button>

                <div className="h-px bg-white/[0.06] my-1 mx-1.5" />

                {/* 7. Magnet Mode Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMagnetMode(!isMagnetMode); }}
                  className={`p-2 rounded-lg transition-all ${isMagnetMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'}`}
                  title="Magnet Mode (Snaps to High/Low)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v4.5A4.5 4.5 0 0013.5 12h0A4.5 4.5 0 0018 7.5V3M9 3H5m4 0h4m5 0h-4m4 0h4" />
                  </svg>
                </button>

                {/* 8. Keep tool lock */}
                <button
                  onClick={(e) => { e.stopPropagation(); setIsToolLocked(!isToolLocked); }}
                  className={`p-2 rounded-lg transition-all ${isToolLocked ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'}`}
                  title="Lock Drawing Tool"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </button>

                {/* 9. Hide / Show Drawings */}
                <button
                  onClick={(e) => { e.stopPropagation(); setAreDrawingsHidden(!areDrawingsHidden); }}
                  className={`p-2 rounded-lg transition-all ${areDrawingsHidden ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  title={areDrawingsHidden ? 'Show Drawings' : 'Hide Drawings'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* 10. Clear All Drawings */}
                {drawnLines.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearDrawings(); }}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 border-t border-white/[0.04] mt-1"
                    title="Clear All Drawings"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Fullscreen Overlay Controller (Draggable Panel) */}
              {isFullscreen && (
                <div 
                  style={{ transform: `translate(${panelPos.x}px, ${panelPos.y}px)` }}
                  className="absolute top-4 right-4 z-30 w-72 bg-[#0c0d16]/95 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-2xl p-4 space-y-3.5 text-xs text-slate-100 select-none"
                >
                  <div onMouseDown={handleDragMouseDown} className="cursor-move flex justify-between items-center pb-2 border-b border-white/[0.04]">
                    <div>
                      <span className="font-bold text-white text-sm">{session.symbol}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400">{activeTimeframe}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFullscreenToggle(); }}
                      className="p-1 px-2 border border-white/[0.06] hover:bg-white/5 rounded text-xs text-slate-400 hover:text-white"
                      title="Exit Fullscreen"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1 border-b border-white/[0.04] pb-2">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Replay controls</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleStepBackward(); }} disabled={currentIndex <= 50 || isPlaying} className="p-1 px-2 border border-white/[0.06] rounded text-[10px] disabled:opacity-20 font-bold flex items-center justify-center text-slate-300">
                        ←
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="p-1 px-3 bg-indigo-650 text-white rounded text-[10px] font-bold min-w-[55px]">
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleStepForward(); }} disabled={currentIndex >= candles.length - 1 || isPlaying} className="p-1 px-2 border border-white/[0.06] rounded text-[10px] disabled:opacity-20 font-bold flex items-center justify-center text-slate-300">
                        →
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold font-mono">
                    <span className="text-slate-400 uppercase tracking-widest text-[9px]">Replay Balance</span>
                    <span className="text-white">{formatCurrency(balance)}</span>
                  </div>
                </div>
              )}

              {/* Standard Mode Fullscreen overlay toggle button */}
              {!isFullscreen && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFullscreenToggle(); }}
                    className="p-2 rounded-xl border bg-[#0f111a]/80 text-slate-300 border-white/[0.08] hover:bg-white/5 shadow-lg shadow-black/40 transition-all duration-150"
                    title="Fullscreen Replay Chart"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 4l-5 5m-11 7v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </button>
                </div>
              )}

              {loadingChart && (
                <div className="absolute inset-0 bg-[#090a10]/90 backdrop-blur-sm z-30 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-slate-400">Syncing historical candles feed...</span>
                  </div>
                </div>
              )}
              
              {/* Shaded Area Drawing Canvas Overlay */}
              <canvas 
                ref={drawingCanvasRef} 
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className={`absolute inset-0 z-10 ${activeTool === 'cursor' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
              />
              
              {/* Chart component wrapper */}
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>

            {/* Optional RSI Indicators panel (synchronized scroll) */}
            {indicatorsConfig.rsi && (
              <div className="h-[120px] bg-[#090a10] border-t border-white/[0.06] relative shrink-0">
                <div className="absolute top-2 left-4 text-[10px] text-purple-400 font-bold uppercase tracking-widest z-10 bg-[#090a10]/80 px-2 py-0.5 rounded">RSI (14)</div>
                <div ref={rsiContainerRef} className="w-full h-full" />
              </div>
            )}

            {/* Bottom Drawer Metrics & Logs Section */}
            <div className="h-64 border-t border-white/[0.06] bg-[#0c0d16] flex flex-col shrink-0">
              
              {/* Tab Header */}
              <div className="flex justify-between items-center border-b border-white/[0.06] px-5 py-2">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveDrawerTab('trades')}
                    className={`pb-1 text-xs font-bold border-b-2 transition-all ${activeDrawerTab === 'trades' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-355'}`}
                  >
                    Logged Trades ({totalTrades})
                  </button>
                  <button 
                    onClick={() => setActiveDrawerTab('analytics')}
                    className={`pb-1 text-xs font-bold border-b-2 transition-all ${activeDrawerTab === 'analytics' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-355'}`}
                  >
                    Analytics Metrics
                  </button>
                  <button 
                    onClick={() => setActiveDrawerTab('equity')}
                    className={`pb-1 text-xs font-bold border-b-2 transition-all ${activeDrawerTab === 'equity' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-355'}`}
                  >
                    Equity Curve
                  </button>
                </div>
                
                {/* Export Log Action */}
                {trades.length > 0 && activeDrawerTab === 'trades' && (
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                  </button>
                )}
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-4.5">
                {activeDrawerTab === 'trades' && (
                  trades.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-2">
                      <svg className="w-7 h-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-xs font-semibold text-slate-400">No simulated trades logged in this session.</span>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.04] text-slate-500 font-bold uppercase tracking-widest text-[9px] pb-1.5">
                          <th className="pb-2">Side</th>
                          <th className="pb-2">Lots</th>
                          <th className="pb-2">Entry Price</th>
                          <th className="pb-2">Exit Price</th>
                          <th className="pb-2">Pips Return</th>
                          <th className="pb-2">R Multiple</th>
                          <th className="pb-2">Realized PnL</th>
                          <th className="pb-2">Exit Reason</th>
                          <th className="pb-2 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-slate-300 font-medium font-mono">
                        {[...trades].reverse().map((trade) => (
                          <tr key={trade.id} className="hover:bg-white/[0.01]">
                            <td className="py-2">
                              <span className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase ${trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'}`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-2">{trade.quantity}</td>
                            <td className="py-2">{trade.entry_price.toFixed(5)}</td>
                            <td className="py-2">{trade.exit_price?.toFixed(5)}</td>
                            <td className={`py-2 ${(trade.pips || 0) >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                              {(trade.pips || 0) > 0 ? '+' : ''}{(trade.pips || 0).toFixed(1)}
                            </td>
                            <td className={`py-2 ${(trade.r_multiple || 0) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-450 font-bold'}`}>
                              {(trade.r_multiple || 0) > 0 ? '+' : ''}{(trade.r_multiple || 0).toFixed(2)}R
                            </td>
                            <td className={`py-2 ${(trade.profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                              {(trade.profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss || 0)}
                            </td>
                            <td className="py-2 text-[10px] text-slate-500 font-sans">{trade.close_reason || 'Exit Limit hit'}</td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => handleDeleteTrade(trade.id, trade.profit_loss || 0)}
                                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                title="Delete log entry"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}

                {activeDrawerTab === 'analytics' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-[#090a10] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Win Rate</div>
                      <div className="text-xl font-bold font-mono mt-1 text-white">{winRate.toFixed(1)}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{wins} Wins / {losses} Losses</div>
                    </div>
                    <div className="bg-[#090a10] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Realized profit factor</div>
                      <div className={`text-xl font-bold font-mono mt-1 ${profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor >= 1.0 ? 'text-blue-400' : 'text-rose-400'}`}>
                        {profitFactor.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Gross profit / loss</div>
                    </div>
                    <div className="bg-[#090a10] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Max Drawdown</div>
                      <div className="text-xl font-bold font-mono mt-1 text-rose-400">-{maxDD.toFixed(2)}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Peak-to-Valley drops</div>
                    </div>
                    <div className="bg-[#090a10] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Realized Avg R:R</div>
                      <div className="text-xl font-bold font-mono mt-1 text-indigo-400">{avgRR.toFixed(2)}R</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Based on Stop Loss ratio</div>
                    </div>
                    <div className="bg-[#090a10] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Max Win Streak</div>
                      <div className="text-xl font-bold font-mono mt-1 text-emerald-400">+{maxWinStreak}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Consecutive win trades</div>
                    </div>
                    <div className="bg-[#090a10] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Max Loss Streak</div>
                      <div className="text-xl font-bold font-mono mt-1 text-rose-400">-{maxLossStreak}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Consecutive loss trades</div>
                    </div>
                  </div>
                )}

                {activeDrawerTab === 'equity' && (
                  trades.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      No trades to render equity curve.
                    </div>
                  ) : (
                    <div className="h-full w-full min-h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityData}>
                          <defs>
                            <linearGradient id="colorBalanceReplay" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="tradeNum" stroke="#475569" fontSize={10} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
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
                  )
                )}
              </div>
            </div>

          </div>

          {/* Right Execution Sidebar Panel (FX Replay style input panels) */}
          {isSidebarOpen && (
            <div className="w-80 border-l border-white/[0.06] bg-[#0c0d16] flex flex-col overflow-y-auto z-15 select-none shrink-0">
              
              {/* Available Capital Card */}
              <div className="p-4 border-b border-white/[0.06] bg-slate-900/10 space-y-2">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold">Available Capital</span>
                <div className="text-2xl font-extrabold text-white font-mono">{formatCurrency(balance)}</div>
                
                <div className="flex justify-between items-center text-[10px] font-mono mt-1 pt-1.5 border-t border-white/[0.03]">
                  <span className="text-slate-400">Session Net Profit:</span>
                  <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)} ({((netProfit / session.initial_balance) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Order Submission Panel */}
              <div className="p-4 space-y-4">
                
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <h3 className="text-[10px] text-white uppercase tracking-widest font-extrabold">Simulated Orders</h3>
                  
                  {/* Order Type Toggle */}
                  <div className="flex bg-slate-900 border border-white/[0.06] p-0.5 rounded-lg">
                    <button 
                      onClick={() => setOrderType('market')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${orderType === 'market' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Market
                    </button>
                    <button 
                      onClick={() => setOrderType('limit')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${orderType === 'limit' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Pending
                    </button>
                  </div>
                </div>

                {!activeTrade ? (
                  <div className="space-y-4">
                    
                    {/* Execution Type / Entry levels */}
                    {orderType === 'limit' && (
                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Trigger Entry Price</label>
                        <input
                          type="text"
                          required
                          value={limitPriceInput}
                          onChange={(e) => setLimitPriceInput(e.target.value)}
                          placeholder="e.g. 1.08250"
                          className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-slate-950 text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenPosition('Long')}
                        className="py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/30 hover:border-emerald-500/50 shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        {orderType === 'market' ? 'Buy Market' : 'Buy Limit/Stop'}
                      </button>
                      <button
                        onClick={() => handleOpenPosition('Short')}
                        className="py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/30 hover:border-rose-500/50 shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        {orderType === 'market' ? 'Sell Market' : 'Sell Limit/Stop'}
                      </button>
                    </div>

                    <div className="space-y-3.5 pt-2 border-t border-white/[0.04]">
                      
                      {/* Risk sizing checkbox */}
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Position Sizing Calculator</label>
                        <input 
                          type="checkbox" 
                          checked={useRiskCalculator} 
                          onChange={(e) => setUseRiskCalculator(e.target.checked)} 
                          className="rounded border-white/[0.08] text-indigo-600 bg-slate-900 w-3.5 h-3.5"
                        />
                      </div>

                      {useRiskCalculator && (
                        <div className="bg-slate-955 p-3 rounded-xl border border-white/[0.04] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold">Calculate by</span>
                            <div className="flex bg-slate-900 rounded p-0.5 text-[8px] font-bold">
                              <button onClick={() => setRiskType('percent')} className={`px-1.5 py-0.5 rounded ${riskType === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>% Risk</button>
                              <button onClick={() => setRiskType('cash')} className={`px-1.5 py-0.5 rounded ${riskType === 'cash' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>$ Risk</button>
                            </div>
                          </div>

                          {riskType === 'percent' ? (
                            <div>
                              <label className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Risk Percent (%)</label>
                              <input 
                                type="number" 
                                value={riskPercent} 
                                onChange={(e) => setRiskPercent(e.target.value)} 
                                className="w-full px-2 py-1 bg-slate-900 border border-white/[0.06] rounded text-[10px] font-mono text-white focus:outline-none" 
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Risk Amount ($)</label>
                              <input 
                                type="number" 
                                value={riskCash} 
                                onChange={(e) => setRiskCash(e.target.value)} 
                                className="w-full px-2 py-1 bg-slate-900 border border-white/[0.06] rounded text-[10px] font-mono text-white focus:outline-none" 
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Lots Size</label>
                        <input
                          type="text"
                          value={lots}
                          disabled={useRiskCalculator}
                          onChange={(e) => setLots(e.target.value)}
                          className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-slate-950 disabled:opacity-50 text-white font-mono focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Stop Loss (Pips)</label>
                          <input
                            type="number"
                            placeholder="e.g. 15"
                            value={slPips}
                            onChange={(e) => setSlPips(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-slate-950 text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Take Profit (Pips)</label>
                          <input
                            type="number"
                            placeholder="e.g. 30"
                            value={tpPips}
                            onChange={(e) => setTpPips(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-xs bg-slate-950 text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  // Active Position Management Details
                  <div className="border border-indigo-500/20 bg-indigo-500/[0.02] rounded-2xl p-4 space-y-4 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl" />
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${activeTrade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'}`}>
                        {activeTrade.type} POSITION
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{activeTrade.qty} Lot(s)</span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Entry price</span>
                        <span className="text-white font-mono">{activeTrade.entryPrice.toFixed(5)}</span>
                      </div>
                      
                      {/* Interactive adjust SL/TP inputs */}
                      <div className="space-y-2 pt-2">
                        <div>
                          <label className="block text-[8px] text-slate-400 font-bold mb-1">Adjust Stop Loss</label>
                          <input 
                            type="text" 
                            value={modifySLInput} 
                            onChange={(e) => setModifySLInput(e.target.value)} 
                            placeholder="None"
                            className="w-full px-2.5 py-1.5 bg-slate-955 border border-white/[0.06] rounded-lg text-xs font-mono text-rose-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-400 font-bold mb-1">Adjust Take Profit</label>
                          <input 
                            type="text" 
                            value={modifyTPInput} 
                            onChange={(e) => setModifyTPInput(e.target.value)} 
                            placeholder="None"
                            className="w-full px-2.5 py-1.5 bg-slate-955 border border-white/[0.06] rounded-lg text-xs font-mono text-emerald-400 focus:outline-none"
                          />
                        </div>
                        <button 
                          onClick={handleModifyLimits}
                          className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[10px] font-bold transition-all"
                        >
                          Modify SL/TP Limits
                        </button>
                      </div>

                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Floating Return</span>
                      <span className={`text-sm font-bold font-mono ${getFloatingPnL() >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getFloatingPnL() >= 0 ? '+' : ''}
                        {formatCurrency(getFloatingPnL())}
                      </span>
                    </div>

                    {/* Scale out (Partial profit closes) */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                      <label className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Partial Scale-Outs</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button 
                          onClick={() => handlePartialClose(25)}
                          className="py-1 border border-white/[0.06] hover:bg-white/5 text-[9px] font-bold rounded"
                        >
                          Close 25%
                        </button>
                        <button 
                          onClick={() => handlePartialClose(50)}
                          className="py-1 border border-white/[0.06] hover:bg-white/5 text-[9px] font-bold rounded"
                        >
                          Close 50%
                        </button>
                        <button 
                          onClick={() => handlePartialClose(75)}
                          className="py-1 border border-white/[0.06] hover:bg-white/5 text-[9px] font-bold rounded"
                        >
                          Close 75%
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04]">
                      <button
                        onClick={handleMoveToBE}
                        className="py-2 border border-blue-500/30 hover:border-blue-500/50 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-xl transition-all"
                      >
                        BE (Break-Even)
                      </button>
                      <button
                        onClick={handleManualClose}
                        className="py-2 bg-indigo-605 hover:bg-indigo-600 text-white text-[10px] font-bold rounded-xl transition-all"
                      >
                        Close Position
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Pending Orders List Section */}
              <div className="p-4 border-t border-white/[0.06] space-y-3">
                <h3 className="text-[10px] text-white uppercase tracking-widest font-extrabold">Pending Orders ({pendingOrders.length})</h3>
                
                {pendingOrders.length === 0 ? (
                  <span className="text-[10px] text-slate-500 block">No pending stop/limit orders placed.</span>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {pendingOrders.map((o) => (
                      <div key={o.id} className="bg-slate-950 p-2.5 rounded-xl border border-white/[0.04] text-[10px] space-y-1.5 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${o.side === 'Long' ? 'text-emerald-400' : 'text-rose-450'}`}>{o.type}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-white">{o.qty} Lots</span>
                          </div>
                          <div className="font-mono text-slate-500 mt-0.5">Price: {o.price.toFixed(5)}</div>
                        </div>
                        <button 
                          onClick={() => handleCancelPending(o.id)}
                          className="px-2 py-1 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-[9px] rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </AuthenticatedLayout>
  );
}
