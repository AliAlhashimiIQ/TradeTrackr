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
  const [startDate, setStartDate] = useState('2025-01-01T00:00');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Delete modal state
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
        timeframe: '15m',
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
      setStartDate('2025-01-01T00:00');
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Loading Backtesting Sandbox...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto relative overflow-hidden">
        {/* Neon decorative background glow */}
        <div className="absolute top-[-10%] left-[20%] w-[300px] h-[300px] bg-indigo-600/10 dark:bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/10 dark:bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Backtesting Sandbox
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Practise strategy execution in simulated historical market environments. Jump back in time to verify edge, test entries, and perfect risk management on any timeframe.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] active:scale-95 duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Create Backtest Run
          </button>
        </div>

        {/* Stats Row */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
            <div className="bg-white dark:bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-6 shadow-md dark:shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors duration-300" />
              <div className="text-[10px] text-slate-500 dark:text-gray-550 font-bold uppercase tracking-widest">Active Runs</div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">{totalSessions}</div>
            </div>
            <div className="bg-white dark:bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-6 shadow-md dark:shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors duration-300" />
              <div className="text-[10px] text-slate-500 dark:text-gray-550 font-bold uppercase tracking-widest">Total PnL Return</div>
              <div className={`text-3xl font-extrabold mt-2 font-mono ${netProfit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`}>
                {netProfit >= 0 ? '+' : ''}
                {formatCurrency(netProfit)}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0f111a]/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] p-6 shadow-md dark:shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors duration-300" />
              <div className="text-[10px] text-slate-500 dark:text-gray-550 font-bold uppercase tracking-widest">Replay Data Feed</div>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">All Timeframes</div>
            </div>
          </div>
        )}

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-slate-200 dark:border-white/[0.06] rounded-3xl p-8 bg-white dark:bg-[#0f111a]/40 backdrop-blur-md relative z-10 shadow-lg dark:shadow-2xl">
            <div className="w-20 h-20 rounded-2xl border border-slate-100 dark:border-white/[0.06] flex items-center justify-center mb-6 text-indigo-500 dark:text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.05)] bg-indigo-500/5">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">No sessions found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 mb-8 leading-relaxed">
              Create a custom backtesting run to replay historical candles, practice order execution, and calculate simulated win rates.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg"
            >
              Start Replaying Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {sessions.map((session) => {
              const sessionProfit = session.current_balance - session.initial_balance;
              const sessionProfitPercent = (sessionProfit / session.initial_balance) * 100;
              const stats = sessionStats[session.id] || { count: 0, wins: 0, losses: 0, winRate: 0, totalPips: 0 };

              return (
                <div
                  key={session.id}
                  className="group relative bg-white dark:bg-[#0f111a]/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/[0.06] hover:border-indigo-500/30 transition-all duration-300 shadow-md hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] cursor-pointer overflow-hidden flex flex-col justify-between"
                  onClick={() => router.push(`/backtesting/${session.id}`)}
                >
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {session.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                            {session.symbol}
                          </span>
                          <span className="text-slate-400 dark:text-slate-600 text-xs">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">Multi-Timeframe Feed</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSessionId(session.id);
                        }}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-white/[0.04] text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Session"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Rich Analytics Grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.04] text-xs">
                      
                      {/* Column 1: Financials */}
                      <div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Starting / Current</div>
                        <div className="font-bold text-slate-800 dark:text-white mt-1 font-mono">
                          {formatCurrency(session.initial_balance)} / {formatCurrency(session.current_balance)}
                        </div>
                      </div>
                      
                      {/* Column 2: Net Return */}
                      <div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Net Return</div>
                        <div className={`font-bold mt-1 font-mono ${sessionProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {sessionProfit >= 0 ? '+' : ''}{formatCurrency(sessionProfit)} ({sessionProfitPercent.toFixed(2)}%)
                        </div>
                      </div>

                      {/* Column 3: Trades Count */}
                      <div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Total Trades</div>
                        <div className="font-bold text-slate-800 dark:text-white mt-1 font-mono">
                          {stats.count} Trades <span className="text-[10px] text-slate-400 font-medium">({stats.wins} W - {stats.losses} L)</span>
                        </div>
                      </div>

                      {/* Column 4: Performance */}
                      <div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-550 font-bold uppercase tracking-widest">Win Rate & Pips</div>
                        <div className="font-bold mt-1 font-mono flex items-center gap-1.5">
                          <span className="text-slate-800 dark:text-white">{stats.winRate.toFixed(1)}% WR</span>
                          <span className="text-slate-400 font-medium">|</span>
                          <span className={stats.totalPips >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                            {stats.totalPips >= 0 ? '+' : ''}{stats.totalPips.toFixed(1)} Pips
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className={`h-1.5 w-full transition-all duration-300 ${sessionProfit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`} />
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
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.08] p-6 text-left align-middle shadow-2xl transition-all">
                    <Dialog.Title as="h3" className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      New Backtesting Run
                    </Dialog.Title>

                    <form onSubmit={handleCreateSession} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Session Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. EURUSD London Breakout"
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm bg-slate-50 dark:bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 transition-all font-medium font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Symbol</label>
                          <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm bg-white dark:bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-slate-900 dark:text-white transition-all font-medium font-sans"
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
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Starting Capital ($)</label>
                          <input
                            type="number"
                            required
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm bg-slate-50 dark:bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-slate-900 dark:text-white transition-all font-medium font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Start Date & Time (UTC)</label>
                        <input
                          type="datetime-local"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm bg-slate-50 dark:bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-slate-900 dark:text-white transition-all font-medium font-mono"
                        />
                      </div>

                      {strategies.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Link Playbook Strategy</label>
                          <select
                            value={selectedStrategy}
                            onChange={(e) => setSelectedStrategy(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm bg-white dark:bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-slate-900 dark:text-white transition-all font-medium font-sans"
                          >
                            <option value="">None (Generic Backtesting)</option>
                            {strategies.map((strat) => (
                              <option key={strat.id} value={strat.name}>
                                {strat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="mt-6 flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-white/[0.04]">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all font-sans"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreating}
                          className="px-4.5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all shadow-md font-sans"
                        >
                          {isCreating ? 'Launching...' : 'Launch Session'}
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
    </AuthenticatedLayout>
  );
}
