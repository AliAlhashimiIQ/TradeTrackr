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

export default function BacktestingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { colorblindMode } = useSettings();

  const [sessions, setSessions] = useState<BacktestingSession[]>([]);
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('15m');
  const [initialBalance, setInitialBalance] = useState('10000');
  const [startDate, setStartDate] = useState('2025-01-01');
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

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getBacktestSessions(user.id);
      setSessions(data);

      // Load strategies for playbook linking
      const { data: stratData } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('user_id', user.id);
      
      setStrategies(stratData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load backtest sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
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
        name: name.trim(),
        symbol: symbol.toUpperCase(),
        timeframe,
        initial_balance: initialBal,
        current_balance: initialBal,
        start_date: new Date(startDate).toISOString(),
        current_index: 100, // Starts with first 100 candles visible
        active_trade: null,
        strategy: selectedStrategy || null,
      });

      toast.success('Backtest session created!');
      setSessions(prev => [newSession, ...prev]);
      setShowAddModal(false);
      
      // Reset form
      setName('');
      setSymbol('EURUSD');
      setTimeframe('15m');
      setInitialBalance('10000');
      setStartDate('2025-01-01');
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

  // Calculations for dashboard summary
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
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading Backtesting Sandbox...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="px-6 lg:px-8 py-5 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <svg className="w-7 h-7 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Backtesting Sandbox
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Step through historical price data, execute simulated trades, and test your strategies in a risk-free workspace.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </button>
        </div>

        {/* Stats Row */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02]" style={{ backgroundColor: 'var(--card-bg)' }}>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active Sessions</div>
              <div className="text-2xl font-bold text-white mt-1.5">{totalSessions}</div>
            </div>
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02]" style={{ backgroundColor: 'var(--card-bg)' }}>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Net Return</div>
              <div className={`text-2xl font-bold mt-1.5 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}
                {formatCurrency(netProfit)}
              </div>
            </div>
            <div className="card rounded-2xl border border-white/[0.08] p-5 shadow-lg bg-white/[0.02]" style={{ backgroundColor: 'var(--card-bg)' }}>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Win Rate (Global)</div>
              <div className="text-2xl font-bold text-white mt-1.5">Simulation Active</div>
            </div>
          </div>
        )}

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-white/[0.08] rounded-3xl p-8 bg-white/[0.01]" style={{ backgroundColor: 'var(--card-bg)' }}>
            <div className="w-16 h-16 rounded-2xl border border-white/[0.06] flex items-center justify-center mb-5 text-indigo-400 shadow-xl bg-white/[0.02]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">No backtesting sessions found</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
              Create your first session to step through historical candles and practice executing your playbook strategies.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98"
            >
              Start Backtesting
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const sessionProfit = session.current_balance - session.initial_balance;
              const sessionProfitPercent = (sessionProfit / session.initial_balance) * 100;

              return (
                <div
                  key={session.id}
                  className="group relative card rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-indigo-500/30 transition-all duration-300 shadow-lg flex flex-col justify-between hover:shadow-[0_0_30px_rgba(99,102,241,0.05)] cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/backtesting/${session.id}`)}
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {session.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 font-semibold">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[10px] uppercase">
                            {session.symbol}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="font-medium text-gray-400 font-mono">{session.timeframe}</span>
                        </p>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSessionId(session.id);
                        }}
                        className="p-1.5 rounded-lg border border-white/[0.04] text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/[0.04]">
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Initial Capital</div>
                        <div className="text-sm font-bold text-white mt-1 font-mono">{formatCurrency(session.initial_balance)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Return PnL</div>
                        <div className={`text-sm font-bold mt-1 font-mono ${sessionProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {sessionProfit >= 0 ? '+' : ''}
                          {sessionProfitPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlight bar */}
                  <div className={`h-1 w-full ${sessionProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#0d0e16] border border-white/[0.08] p-6 text-left align-middle shadow-[0_0_50px_rgba(99,102,241,0.15)] transition-all">
                    <Dialog.Title as="h3" className="text-base font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      New Backtesting Session
                    </Dialog.Title>

                    <form onSubmit={handleCreateSession} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Session Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. EURUSD London Breakout"
                          className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-sm bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 text-white placeholder-gray-600 transition-all font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Symbol</label>
                          <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-sm bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium"
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
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Timeframe</label>
                          <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-sm bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium"
                          >
                            <option value="1m">1m</option>
                            <option value="5m">5m</option>
                            <option value="15m">15m</option>
                            <option value="1h">1h</option>
                            <option value="4h">4h</option>
                            <option value="1d">1d</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Start Date</label>
                          <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-sm bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Starting Capital ($)</label>
                          <input
                            type="number"
                            required
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-sm bg-white/[0.02] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium font-mono"
                          />
                        </div>
                      </div>

                      {strategies.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Link Playbook Strategy</label>
                          <select
                            value={selectedStrategy}
                            onChange={(e) => setSelectedStrategy(e.target.value)}
                            className="w-full px-3 py-2 border border-white/[0.06] rounded-xl text-sm bg-[#0d0e16] focus:outline-none focus:border-indigo-500/50 text-white transition-all font-medium"
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

                      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/[0.04]">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreating}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10"
                        >
                          {isCreating ? 'Creating...' : 'Launch Replay'}
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
