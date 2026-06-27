'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/providers/SettingsProvider';
import { getBacktestSessions, createBacktestSession, deleteBacktestSession } from '@/lib/services/backtestService';
import { BacktestingSession } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface SessionStats {
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPips: number;
}

export default function BacktestingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { colorblindMode } = useSettings();

  const [sessions, setSessions] = useState<BacktestingSession[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, SessionStats>>({});
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('EURUSD');
  const [initialBalance, setInitialBalance] = useState('10000');
  const [startDate, setStartDate] = useState('2026-05-01T00:00');
  const [timeframe, setTimeframe] = useState('15m');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Delete modal state
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Reactive verification for start date and timeframe limits
  useEffect(() => {
    if (!startDate) {
      setWarning(null);
      return;
    }

    const selectedDate = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - selectedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 1. Weekend check
    const day = selectedDate.getDay();
    if (day === 0 || day === 6) {
      setWarning("⚠️ Selected date falls on a weekend (Saturday/Sunday). Yahoo Finance historical data feeds are closed; the chart simulation will automatically start on the nearest market open.");
      return;
    }

    // 2. Timeframe historical retention check
    if (timeframe === '1m' && diffDays > 30) {
      setWarning("⚠️ Yahoo Finance keeps 1-minute historical data for the last 30 days ONLY. Your selected date is older; this run will fallback to 1-hour or 1-day timeframe.");
      return;
    }
    if ((timeframe === '5m' || timeframe === '15m') && diffDays > 60) {
      setWarning("⚠️ Yahoo Finance keeps 5-minute and 15-minute intraday data for the last 60 days ONLY. Selecting an older date triggers an automatic timeframe upgrade.");
      return;
    }
    if (timeframe === '1h' && diffDays > 730) {
      setWarning("⚠️ Yahoo Finance keeps 1-hour data for the last 730 days (2 years) ONLY. Please choose a more recent date or use the 1D timeframe.");
      return;
    }

    setWarning(null);
  }, [startDate, timeframe]);

  const loadData = async (isInitial = false) => {
    if (!user) return;
    try {
      if (isInitial) setLoading(true);
      
      const data = await getBacktestSessions(user.id);
      setSessions(data);

      // Load strategies for playbook linking
      const { data: stratData } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('user_id', user.id);
      
      setStrategies(stratData || []);

      // Load trades to calculate per-session metrics
      const { data: tradesData, error: tradesErr } = await (supabase as any)
        .from('backtest_trades')
        .select('session_id, profit_loss, pips');

      if (!tradesErr && tradesData) {
        const statsMap: Record<string, SessionStats> = {};
        tradesData.forEach((t: any) => {
          if (!statsMap[t.session_id]) {
            statsMap[t.session_id] = { count: 0, wins: 0, losses: 0, winRate: 0, totalPips: 0 };
          }
          const s = statsMap[t.session_id];
          s.count += 1;
          s.totalPips += Number(t.pips || 0);
          if (Number(t.profit_loss || 0) >= 0) {
            s.wins += 1;
          } else {
            s.losses += 1;
          }
        });

        // Compute win rates
        Object.keys(statsMap).forEach((key) => {
          const s = statsMap[key];
          s.winRate = s.count > 0 ? (s.wins / s.count) * 100 : 0;
        });

        setSessionStats(statsMap);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load backtest sessions');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Only run full-page loading spinner on initial mount
  useEffect(() => {
    if (user) {
      loadData(sessions.length === 0);
    }
  }, [user]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isCreating) return;

    if (!name.trim()) {
      toast.error('Please enter a session name');
      return;
    }

    try {
      setIsCreating(true);
      const initialBal = parseFloat(initialBalance) || 10000;

      const newSession = await createBacktestSession({
        user_id: user.id,
        name: name.trim(),
        symbol: symbol.toUpperCase(),
        timeframe: timeframe,
        initial_balance: initialBal,
        current_balance: initialBal,
        start_date: new Date(startDate).toISOString(),
        current_index: 0,
        active_trade: null,
        strategy: selectedStrategy || null,
      });

      toast.success('Backtest session launched!');
      setSessions(prev => [newSession, ...prev]);
      setShowAddModal(false);
      
      // Reset form
      setName('');
      setSymbol('EURUSD');
      setInitialBalance('10000');
      setStartDate('2026-05-01T00:00');
      setTimeframe('15m');
      setSelectedStrategy('');

      // Navigate to the newly created session
      router.push(`/backtesting/${newSession.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!deletingSessionId || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteBacktestSession(deletingSessionId);
      toast.success('Session deleted successfully');
      setSessions(prev => prev.filter(s => s.id !== deletingSessionId));
      setDeletingSessionId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete session');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSessions = sessions.length;
  const netProfit = sessions.reduce((sum, s) => sum + (s.current_balance - s.initial_balance), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  if (authLoading || loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[70vh] bg-[#090a10]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-500 tracking-wider">LOADING TERMINAL RUNS...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-[#090a10] text-slate-100 px-6 lg:px-8 py-8 relative overflow-hidden">
        {/* Neon styling glows */}
        <div className="absolute top-[-10%] left-[20%] w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/[0.04]">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase font-sans">
                    Replay Simulation Sandbox
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Practise strategy execution, verify edge, and backtest historical markets like FX Replay.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                // Set default date to current local timestamp in format YYYY-MM-DDTHH:MM
                const localNow = new Date();
                localNow.setMinutes(localNow.getMinutes() - localNow.getTimezoneOffset());
                const formatted = localNow.toISOString().slice(0, 16);
                setStartDate(formatted);
                setShowAddModal(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Create Backtest Run
            </button>
          </div>

          {/* Stats Bar */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <div className="bg-[#0f111a] border border-white/[0.04] rounded-xl p-5 relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Simulations</span>
                <span className="text-2xl font-extrabold text-white mt-1.5 block font-mono">{totalSessions}</span>
              </div>
              
              <div className="bg-[#0f111a] border border-white/[0.04] rounded-xl p-5 relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Accumulated Profit</span>
                <span className={`text-2xl font-extrabold mt-1.5 block font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                </span>
              </div>
              
              <div className="bg-[#0f111a] border border-white/[0.04] rounded-xl p-5 relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Market Data Feed</span>
                <span className="text-2xl font-extrabold text-indigo-400 mt-1.5 block uppercase tracking-wider font-sans text-sm md:text-base">
                  Yahoo Finance Live
                </span>
              </div>
            </div>
          )}

          {/* Sessions Grid */}
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.04] rounded-2xl p-8 bg-[#0f111a]/40 backdrop-blur-md shadow-2xl">
              <div className="w-16 h-16 rounded-xl border border-white/[0.06] flex items-center justify-center mb-5 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.1)] bg-indigo-500/5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">No Active Sessions</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-2 mb-6 leading-relaxed">
                Start a backtest run to replay historical bars, draw tools on chart, execute positions, and evaluate strategy results.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
              >
                Launch First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => {
                const sessionProfit = session.current_balance - session.initial_balance;
                const sessionProfitPercent = (sessionProfit / session.initial_balance) * 100;
                const stats = sessionStats[session.id] || { count: 0, wins: 0, losses: 0, winRate: 0, totalPips: 0 };

                return (
                  <div
                    key={session.id}
                    onClick={() => router.push(`/backtesting/${session.id}`)}
                    className="group relative bg-[#0f111a] border border-white/[0.04] hover:border-indigo-500/30 rounded-xl transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)]"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-5">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {session.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-455 font-mono text-[10px] font-bold uppercase tracking-widest border border-indigo-500/10">
                              {session.symbol}
                            </span>
                            <span className="text-slate-700 text-xs">•</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800/40 text-slate-400 font-mono text-[10px] font-medium border border-white/[0.04]">
                              {session.timeframe}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSessionId(session.id);
                          }}
                          className="p-1.5 rounded-lg border border-white/[0.02] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 gap-y-4 gap-x-5 pt-4 border-t border-white/[0.03] text-xs">
                        
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Balance Sheet</span>
                          <span className="font-bold text-slate-200 mt-1 block font-mono">
                            {formatCurrency(session.current_balance)}
                            <span className="text-[10px] text-slate-500 font-medium font-sans block mt-0.5">
                              Start: {formatCurrency(session.initial_balance)}
                            </span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Performance Return</span>
                          <span className={`font-bold mt-1 block font-mono ${sessionProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {sessionProfit >= 0 ? '+' : ''}{sessionProfitPercent.toFixed(2)}%
                            <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                              {sessionProfit >= 0 ? '+' : ''}{formatCurrency(sessionProfit)}
                            </span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Execution Stats</span>
                          <span className="font-bold text-slate-200 mt-1 block font-mono">
                            {stats.count} Trades
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                              {stats.wins} Wins / {stats.losses} Losses
                            </span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Win Ratio & Pips</span>
                          <span className="font-bold text-slate-200 mt-1 block font-mono">
                            {stats.winRate.toFixed(1)}% WR
                            <span className={`text-[10px] block font-medium mt-0.5 ${stats.totalPips >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {stats.totalPips >= 0 ? '+' : ''}{stats.totalPips.toFixed(1)} Pips
                            </span>
                          </span>
                        </div>

                      </div>

                      {/* Date details */}
                      <div className="mt-4 pt-3 border-t border-white/[0.02] flex items-center justify-between text-[10px] text-slate-550 font-mono">
                        <span>START: {new Date(session.start_date).toLocaleDateString()}</span>
                        {session.created_at && (
                          <span>CREATED: {new Date(session.created_at).toLocaleDateString()}</span>
                        )}
                      </div>

                    </div>
                    <div className={`h-1.5 w-full ${sessionProfit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-550 to-pink-500'}`} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Creation Modal */}
          <Transition appear show={showAddModal} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setShowAddModal(false)}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-[#0d0e16] border border-white/[0.08] p-6 text-left align-middle shadow-2xl transition-all">
                      <Dialog.Title as="h3" className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2 font-sans">
                        <div className="w-7 h-7 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        Launch Backtesting Session
                      </Dialog.Title>

                      <form onSubmit={handleCreateSession} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Session Name</label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. NQ London Session Replay"
                            className="w-full px-3.5 py-2.5 border border-white/[0.06] rounded-lg text-xs bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-white placeholder-slate-600 transition-all font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trading Symbol</label>
                            <select
                              value={symbol}
                              onChange={(e) => setSymbol(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-white/[0.06] rounded-lg text-xs bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium animate-none"
                            >
                              <option value="EURUSD">EURUSD</option>
                              <option value="GBPUSD">GBPUSD</option>
                              <option value="USDJPY">USDJPY</option>
                              <option value="AUDUSD">AUDUSD</option>
                              <option value="NQ=F">NQ=F (Nasdaq)</option>
                              <option value="ES=F">ES=F (S&P 500)</option>
                              <option value="YM=F">YM=F (Dow Jones)</option>
                              <option value="XAUUSD=X">Gold (Spot)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Capital ($)</label>
                            <input
                              type="number"
                              required
                              value={initialBalance}
                              onChange={(e) => setInitialBalance(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-white/[0.06] rounded-lg text-xs bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-semibold font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Starting Timeframe</label>
                            <select
                              value={timeframe}
                              onChange={(e) => setTimeframe(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-white/[0.06] rounded-lg text-xs bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium"
                            >
                              <option value="1m">1m (Last 30 Days)</option>
                              <option value="5m">5m (Last 60 Days)</option>
                              <option value="15m">15m (Last 60 Days)</option>
                              <option value="1h">1h (Last 2 Years)</option>
                              <option value="1d">1d (All History)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Playbook Strategy</label>
                            <select
                              value={selectedStrategy}
                              onChange={(e) => setSelectedStrategy(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-white/[0.06] rounded-lg text-xs bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium"
                            >
                              <option value="">None (Generic)</option>
                              {strategies.map((strat) => (
                                <option key={strat.id} value={strat.name}>
                                  {strat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date & Time (UTC)</label>
                          <input
                            type="datetime-local"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-white/[0.06] rounded-lg text-xs bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-semibold font-mono"
                          />
                        </div>

                        {/* Reactive warnings banner */}
                        {warning && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[11px] text-amber-300 leading-relaxed font-sans mt-3">
                            {warning}
                          </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isCreating}
                            className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white transition-all shadow-md uppercase tracking-wider cursor-pointer"
                          >
                            {isCreating ? 'Launching...' : 'Launch Run'}
                          </button>
                        </div>
                      </form>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {/* Delete Confirmation */}
          <ConfirmModal
            isOpen={deletingSessionId !== null}
            onClose={() => setDeletingSessionId(null)}
            onConfirm={handleDeleteSession}
            title="Delete Backtest Session"
            description="Are you sure you want to delete this backtest session? All historical trades logged during this session will be permanently deleted. This action cannot be undone."
            confirmLabel="Delete Session"
            cancelLabel="Cancel"
            variant="danger"
            isLoading={isDeleting}
          />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
