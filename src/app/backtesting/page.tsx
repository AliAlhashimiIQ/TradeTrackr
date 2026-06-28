'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

// Pre-defined upcoming candle database to replay step-by-step
const UPCOMING_CANDLES: Candle[] = [
  { open: 110, close: 125, high: 130, low: 105 },
  { open: 125, close: 115, high: 128, low: 110 },
  { open: 115, close: 135, high: 140, low: 112 },
  { open: 135, close: 145, high: 152, low: 130 },
  { open: 145, close: 138, high: 148, low: 135 },
  { open: 138, close: 155, high: 160, low: 132 },
  { open: 155, close: 162, high: 168, low: 150 },
  { open: 162, close: 150, high: 165, low: 148 },
  { open: 150, close: 158, high: 162, low: 145 },
  { open: 158, close: 172, high: 175, low: 155 },
  { open: 172, close: 165, high: 174, low: 160 },
  { open: 165, close: 180, high: 185, low: 162 },
  { open: 180, close: 170, high: 182, low: 165 },
  { open: 170, close: 160, high: 172, low: 155 },
  { open: 160, close: 175, high: 180, low: 158 },
  { open: 175, close: 190, high: 195, low: 170 },
  { open: 190, close: 182, high: 192, low: 178 },
  { open: 182, close: 195, high: 198, low: 180 },
];

const INITIAL_CANDLES: Candle[] = [
  { open: 80, close: 95, high: 100, low: 75 },
  { open: 95, close: 90, high: 98, low: 88 },
  { open: 90, close: 105, high: 110, low: 85 },
  { open: 105, close: 100, high: 108, low: 98 },
  { open: 100, close: 115, high: 120, low: 95 },
  { open: 115, close: 110, high: 118, low: 108 },
];

export default function BacktestingPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Simulator States
  const [candles, setCandles] = useState<Candle[]>(INITIAL_CANDLES);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tradeState, setTradeState] = useState<'IDLE' | 'ACTIVE' | 'WIN' | 'LOSS'>('IDLE');
  const [tradeType, setTradeType] = useState<'LONG' | 'SHORT' | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>(['Simulator engine ready. Select trade direction.']);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Handle auto-play ticks
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        handleNextCandle();
      }, 1500);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, candles, stepIndex, tradeState]);

  const handleNextCandle = () => {
    if (stepIndex >= UPCOMING_CANDLES.length) {
      setIsPlaying(false);
      toast.error('Reached end of available historical database feed.');
      return;
    }

    const nextCandle = UPCOMING_CANDLES[stepIndex];
    const updatedCandles = [...candles, nextCandle];
    
    // Shift layout coordinates if candles exceed viewport size
    if (updatedCandles.length > 14) {
      updatedCandles.shift();
    }

    setCandles(updatedCandles);
    setStepIndex((prev) => prev + 1);

    // Evaluate active trade targets
    if (tradeState === 'ACTIVE' && entryPrice !== null && takeProfit !== null && stopLoss !== null) {
      if (tradeType === 'LONG') {
        if (nextCandle.high >= takeProfit) {
          setTradeState('WIN');
          setIsPlaying(false);
          setSimulationLogs((prev) => [`[SUCCESS] Take Profit Hit! +$350.00`, ...prev]);
          toast.success('Simulation Profit Target Reached!');
        } else if (nextCandle.low <= stopLoss) {
          setTradeState('LOSS');
          setIsPlaying(false);
          setSimulationLogs((prev) => [`[STOPPED] Stop Loss Hit. -$150.00`, ...prev]);
          toast.error('Simulation Stop Loss Hit.');
        }
      } else if (tradeType === 'SHORT') {
        if (nextCandle.low <= takeProfit) {
          setTradeState('WIN');
          setIsPlaying(false);
          setSimulationLogs((prev) => [`[SUCCESS] Take Profit Hit! +$350.00`, ...prev]);
          toast.success('Simulation Profit Target Reached!');
        } else if (nextCandle.high >= stopLoss) {
          setTradeState('LOSS');
          setIsPlaying(false);
          setSimulationLogs((prev) => [`[STOPPED] Stop Loss Hit. -$150.00`, ...prev]);
          toast.error('Simulation Stop Loss Hit.');
        }
      }
    }
  };

  const handleExecuteTrade = (type: 'LONG' | 'SHORT') => {
    if (tradeState === 'ACTIVE') {
      toast.error('You already have an active position running in the simulator.');
      return;
    }

    const currentPrice = candles[candles.length - 1].close;
    setEntryPrice(currentPrice);
    setTradeType(type);
    setTradeState('ACTIVE');

    if (type === 'LONG') {
      setTakeProfit(currentPrice + 25);
      setStopLoss(currentPrice - 12);
      setSimulationLogs((prev) => [`[EXECUTION] Buy Long Entry at ${currentPrice}`, ...prev]);
      toast.success(`Executed Buy Long at ${currentPrice}`);
    } else {
      setTakeProfit(currentPrice - 25);
      setStopLoss(currentPrice + 12);
      setSimulationLogs((prev) => [`[EXECUTION] Sell Short Entry at ${currentPrice}`, ...prev]);
      toast.success(`Executed Sell Short at ${currentPrice}`);
    }
    
    // Auto-resume playback to watch simulation execute
    setIsPlaying(true);
  };

  const handleResetSimulation = () => {
    setCandles(INITIAL_CANDLES);
    setStepIndex(0);
    setIsPlaying(false);
    setTradeState('IDLE');
    setTradeType(null);
    setEntryPrice(null);
    setTakeProfit(null);
    setStopLoss(null);
    setSimulationLogs(['Simulator reset. Select trade direction to begin.']);
    toast('Simulation Reset Successful.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(false);
    
    setTimeout(() => {
      setSubmitted(true);
      toast.success("Added to waitlist successfully.");
    }, 800);
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 text-slate-900 dark:text-white transition-colors duration-300">
        
        {/* Glowing Badge & Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 mb-4 tracking-wider uppercase">
            Interactive Beta Replay
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
            Backtesting Simulator
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-base sm:text-lg">
            Train your eyes, refine your edge, and practice execution candle-by-candle on historical index data.
          </p>
        </div>

        {/* Interactive Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-stretch">
          
          {/* Replay Chart Canvas */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 text-xs font-mono text-slate-400 dark:text-gray-500">US100.SPOT (15m)</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/5 text-xs text-indigo-600 dark:text-indigo-400">
                <span className={`w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                <span>{isPlaying ? 'Auto Replaying' : 'Paused'}</span>
              </div>
            </div>

            {/* SVG Candlestick Chart */}
            <div className="w-full h-64 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 p-4 flex items-center justify-center relative">
              <svg className="w-full h-full" viewBox="0 0 520 220" fill="none">
                {/* Horizontal grid lines */}
                <line x1="0" y1="44" x2="520" y2="44" stroke="rgba(128,128,128,0.06)" strokeWidth="1" />
                <line x1="0" y1="88" x2="520" y2="88" stroke="rgba(128,128,128,0.06)" strokeWidth="1" />
                <line x1="0" y1="132" x2="520" y2="132" stroke="rgba(128,128,128,0.06)" strokeWidth="1" />
                <line x1="0" y1="176" x2="520" y2="176" stroke="rgba(128,128,128,0.06)" strokeWidth="1" />

                {/* Render Dynamic Candles */}
                {candles.map((c, i) => {
                  const x = 20 + i * 36;
                  const isGreen = c.close >= c.open;
                  const bodyTop = isGreen ? 200 - c.close : 200 - c.open;
                  const bodyHeight = Math.max(Math.abs(c.close - c.open), 3);
                  const wickTop = 200 - c.high;
                  const wickBottom = 200 - c.low;

                  return (
                    <g key={i}>
                      {/* Wick */}
                      <line 
                        x1={x + 12} 
                        y1={wickTop} 
                        x2={x + 12} 
                        y2={wickBottom} 
                        stroke={isGreen ? '#10B981' : '#EF4444'} 
                        strokeWidth="1.5" 
                      />
                      {/* Body */}
                      <rect 
                        x={x} 
                        y={bodyTop} 
                        width="24" 
                        height={bodyHeight} 
                        fill={isGreen ? '#10B981' : '#EF4444'} 
                        rx="2"
                      />
                    </g>
                  );
                })}

                {/* Target Executions overlay overlay */}
                {tradeState === 'ACTIVE' && entryPrice !== null && takeProfit !== null && stopLoss !== null && (
                  <>
                    {/* Take Profit Target Line */}
                    <line x1="0" y1={200 - takeProfit} x2="520" y2={200 - takeProfit} stroke="#10B981" strokeDasharray="3 3" strokeWidth="1.5" />
                    <text x="440" y={200 - takeProfit - 4} fill="#10B981" fontSize="8" fontFamily="monospace" fontWeight="bold">TAKE PROFIT</text>

                    {/* Stop Loss Target Line */}
                    <line x1="0" y1={200 - stopLoss} x2="520" y2={200 - stopLoss} stroke="#EF4444" strokeDasharray="3 3" strokeWidth="1.5" />
                    <text x="445" y={200 - stopLoss - 4} fill="#EF4444" fontSize="8" fontFamily="monospace" fontWeight="bold">STOP LOSS</text>

                    {/* Entry Price Target Line */}
                    <line x1="0" y1={200 - entryPrice} x2="520" y2={200 - entryPrice} stroke="#4f46e5" strokeDasharray="3 3" strokeWidth="1.5" />
                    <text x="440" y={200 - entryPrice - 4} fill="#4f46e5" fontSize="8" fontFamily="monospace" fontWeight="bold">ENTRY LIMIT</text>
                  </>
                )}
              </svg>
            </div>

            {/* Replay Simulator Controls */}
            <div className="mt-5 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => handleExecuteTrade('LONG')}
                  disabled={tradeState === 'ACTIVE'}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Buy (Long)
                </button>
                <button
                  onClick={() => handleExecuteTrade('SHORT')}
                  disabled={tradeState === 'ACTIVE'}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Sell (Short)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors"
                  title={isPlaying ? 'Pause simulation' : 'Auto Play simulation'}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <button
                  onClick={handleNextCandle}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors"
                  title="Next Candle step"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
                <button
                  onClick={handleResetSimulation}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors"
                  title="Reset simulation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Waitlist and execution logs column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Waitlist Form Card */}
            <div className="bg-slate-50 dark:bg-gradient-to-b dark:from-indigo-900/30 dark:to-slate-900/30 border border-slate-200 dark:border-indigo-500/15 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Coming Soon Features</span>
              <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Request Beta Access</h2>
              <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed mb-5">
                Practice execution bar-by-bar with 24h CFD index & Forex feeds. Get notified when early beta begins.
              </p>

              {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 text-center">
                  <p className="font-bold text-xs">Priority registered successfully.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/15"
                  >
                    Join Waitlist
                  </button>
                </form>
              )}
            </div>

            {/* Execution logs log */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex-1 flex flex-col justify-between shadow-xl min-h-48">
              <div>
                <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block mb-3 font-mono">SIMULATION_LOGS</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {simulationLogs.map((log, idx) => (
                    <div key={idx} className="text-[10px] font-mono text-slate-600 dark:text-indigo-300 border-l border-indigo-500/20 pl-2 py-0.5 leading-normal">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[9.5px] text-slate-400 dark:text-gray-500 font-mono mt-3">
                {tradeState === 'WIN' && '🎯 Trade closed at profit target limit.'}
                {tradeState === 'LOSS' && '🛑 Trade closed at stop loss threshold.'}
                {tradeState === 'ACTIVE' && '⏳ Monitoring market ticks...'}
                {tradeState === 'IDLE' && '✓ Standby mode active.'}
              </div>
            </div>

          </div>
        </div>

        {/* Feature Grid Details */}
        <div className="border-t border-slate-200 dark:border-white/5 pt-12">
          <h3 className="text-center text-xs font-extrabold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-10">
            Why Backtest with TradeTrackr?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Replay Speed Control</h4>
              <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                Step through charts bar-by-bar at your own pace. Increase speed to test multiple trading weeks in a single session.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Interactive Drawings</h4>
              <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                Easily draw Fibonacci, supply/demand zones, and place target boundaries with real-time risk calculations.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Detailed Playbooks</h4>
              <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                Link simulator runs directly to your playbook strategies, generating rich reports to isolate patterns that yield high return rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
