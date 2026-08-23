'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import DailyPrepForm from '@/components/journal/DailyPrepForm';
import { useAuth } from '@/hooks/useAuth';
import { getAllTrades } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import { toLocalYMD } from '@/lib/utils';
import { useAccount } from '@/providers/AccountProvider';
import { SkeletonCard, JournalSkeleton } from '@/components/ui/SkeletonLoader';
import DatePickerPopover from '@/components/ui/DatePickerPopover';

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

          {/* Interactive Mini Calendar Popover & Navigation */}
          <DatePickerPopover
            selectedDate={selectedDate}
            onChange={setSelectedDate}
          />
        </div>

        {/* Daily Prep Form */}
        {loading ? (
          <JournalSkeleton />
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
