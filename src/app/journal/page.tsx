'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import DailyPrepForm from '@/components/journal/DailyPrepForm';
import { useAuth } from '@/hooks/useAuth';
import { getAllTrades } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import { toLocalYMD } from '@/lib/utils';
import { useAccount } from '@/providers/AccountProvider';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

export default function JournalPage() {
  const { user } = useAuth();
  const { selectedAccountIds } = useAccount();
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalYMD(new Date().toISOString()));
  const [dayTrades, setDayTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const accountIds: string[] | undefined =
    selectedAccountIds === 'all' ? undefined : (selectedAccountIds as string[]);

  useEffect(() => {
    async function loadDayTrades() {
      if (!user) return;
      setLoading(true);
      try {
        const start = `${selectedDate}T00:00:00.000Z`;
        const end = `${selectedDate}T23:59:59.999Z`;

        const trades = await getAllTrades(user.id, {
          startDate: start,
          endDate: end,
          accountIds,
        });
        setDayTrades(trades);
      } catch (err) {
        console.error('Failed to load trades for date:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDayTrades();
  }, [user, selectedDate, selectedAccountIds]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toLocalYMD(d.toISOString()));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toLocalYMD(d.toISOString()));
  };

  const handleToday = () => {
    setSelectedDate(toLocalYMD(new Date().toISOString()));
  };

  const netPnL = dayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              Daily Prep & Macro Journal
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Structure your trading sessions with daily bias, key levels, economic events, and post-market reviews.
            </p>
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center gap-2 bg-white dark:bg-[var(--surface-1)] border border-slate-200 dark:border-white/[0.08] p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={handlePrevDay}
              className="p-2 min-w-[36px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all font-semibold text-xs"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              />
            </div>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl transition-all font-extrabold text-xs"
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 min-w-[36px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all font-semibold text-xs"
              title="Next Day"
              aria-label="Next Day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Daily Prep Form */}
        {loading ? (
          <div className="space-y-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
          </div>
        ) : (
          <DailyPrepForm
            date={selectedDate}
            tradesCount={dayTrades.length}
            netPnL={netPnL}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
}
