'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import DailyPrepForm from '@/components/journal/DailyPrepForm';
import { useAuth } from '@/hooks/useAuth';
import { getAllTrades } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import { toLocalYMD } from '@/lib/utils';
import { useAccount } from '@/providers/AccountProvider';

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
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
              Daily Prep & Macro Journal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Structure your trading sessions with daily bias, key levels, economic events, and post-market reviews.
            </p>
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs shadow-sm">
            <button
              onClick={handlePrevDay}
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
            >
              ← Prev
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 rounded-lg transition-colors font-bold"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Daily Prep Form */}
        <DailyPrepForm
          date={selectedDate}
          tradesCount={dayTrades.length}
          netPnL={netPnL}
        />
      </div>
    </AuthenticatedLayout>
  );
}
