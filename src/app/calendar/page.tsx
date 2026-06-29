'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/hooks/useAccount';
import { getAllTrades } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { CalendarSkeleton } from '@/components/ui/SkeletonLoader';
import EmptyState from '@/components/ui/EmptyState';
import { LAYOUT } from '@/lib/designSystem';
import MiniSparkline from '@/components/ui/MiniSparkline';
import { supabase } from '@/lib/supabaseClient';

/* ─── helpers ─── */
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtDecimal = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const toLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const groupTradesByDate = (trades: Trade[]) => {
  const grouped: Record<string, Trade[]> = {};
  trades.forEach((trade) => {
    const date = toLocalDateString(new Date(trade.entry_time));
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(trade);
  });
  return grouped;
};

const calcPnL = (trades: Trade[]) =>
  trades.reduce((s, t) => s + t.profit_loss, 0);

const calcWinRate = (trades: Trade[]) => {
  if (!trades.length) return 0;
  return Math.round(
    (trades.filter((t) => t.profit_loss > 0).length / trades.length) * 100
  );
};

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const getFirstDayOfMonth = (y: number, m: number) => {
  return new Date(y, m, 1).getDay();
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getWeekDates = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d);
  sunday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(sunday);
    dd.setDate(sunday.getDate() + i);
    return dd;
  });
};

/* ─── icons ─── */
const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
  </svg>
);
const TrendUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const TrendDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { accounts, selectedAccountIds } = useAccount();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [authToken, setAuthToken] = useState<string>('');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const today = new Date();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchToken() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAuthToken(session.access_token);
      }
    }
    fetchToken();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const all = await getAllTrades(user.id, {
          accountIds: selectedAccountIds === 'all' ? undefined : (selectedAccountIds as string[]),
        });
        setTrades(all);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [user?.id, selectedAccountIds]);

  const tradesByDate = useMemo(() => groupTradesByDate(trades), [trades]);

  // Sorted list of current month's trades chronologically
  const monthTrades = useMemo(() => {
    return trades
      .filter((t) => {
        const d = new Date(t.entry_time);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  }, [trades, currentMonth, currentYear]);

  // Cumulative P&L for sparkline rendering
  const monthCumulativePnL = useMemo(() => {
    let sum = 0;
    const p = [0];
    monthTrades.forEach((t) => {
      sum += t.profit_loss;
      p.push(sum);
    });
    return p;
  }, [monthTrades]);

  // Compute active account balance for Gain % calculation
  const activeAccountBalance = useMemo(() => {
    if (selectedAccountIds === 'all' || !selectedAccountIds?.length) {
      return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 100000;
    }
    const filtered = accounts.filter(a => selectedAccountIds.includes(a.id));
    return filtered.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 100000;
  }, [accounts, selectedAccountIds]);

  // Compute stats for selected month
  const monthStats = useMemo(() => {
    const pnl = calcPnL(monthTrades);
    const wins = monthTrades.filter((t) => t.profit_loss > 0).length;
    const losses = monthTrades.filter((t) => t.profit_loss < 0).length;
    const winRate = monthTrades.length
      ? Math.round((wins / monthTrades.length) * 100)
      : 0;
    const tradingDays = new Set(
      monthTrades.map((t) => toLocalDateString(new Date(t.entry_time)))
    ).size;
    
    const bestDay = Object.entries(tradesByDate).reduce((best, [dateStr, dayTrades]) => {
      const [year, month] = dateStr.split('-').map(Number);
      if (month - 1 !== currentMonth || year !== currentYear) return best;
      const dp = calcPnL(dayTrades);
      return dp > best ? dp : best;
    }, 0);

    const worstDay = Object.entries(tradesByDate).reduce((worst, [dateStr, dayTrades]) => {
      const [year, month] = dateStr.split('-').map(Number);
      if (month - 1 !== currentMonth || year !== currentYear) return worst;
      const dp = calcPnL(dayTrades);
      return dp < worst ? dp : worst;
    }, 0);

    const gainPercent = activeAccountBalance > 0 ? (pnl / activeAccountBalance) * 100 : 0;

    return { pnl, wins, losses, winRate, tradingDays, totalTrades: monthTrades.length, bestDay, worstDay, gainPercent };
  }, [monthTrades, currentMonth, currentYear, tradesByDate, activeAccountBalance]);

  // Year to Date monthly overview
  const yearMonthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthTrades = trades.filter((t) => {
        const d = new Date(t.entry_time);
        return d.getMonth() === m && d.getFullYear() === currentYear;
      });
      const pnl = calcPnL(monthTrades);
      const wins = monthTrades.filter((t) => t.profit_loss > 0).length;
      const winRate = monthTrades.length
        ? Math.round((wins / monthTrades.length) * 100)
        : 0;
      return {
        month: m,
        pnl,
        tradesCount: monthTrades.length,
        winRate,
      };
    });
  }, [trades, currentYear]);

  // Get Top Setups
  const topSetups = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    monthTrades.forEach((t) => {
      const setupName = t.strategy || 'Unassigned Setup';
      if (!groups[setupName]) groups[setupName] = [];
      groups[setupName].push(t);
    });
    return Object.entries(groups)
      .map(([name, tList]) => {
        const wins = tList.filter((t) => t.profit_loss > 0).length;
        const winRate = tList.length ? Math.round((wins / tList.length) * 100) : 0;
        return { name, count: tList.length, winRate };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [monthTrades]);

  // Get list of last 5 trades globally
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
      .slice(0, 5);
  }, [trades]);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startM = start.toLocaleString('default', { month: 'short' });
    const endM = end.toLocaleString('default', { month: 'short' });
    if (startM === endM) {
      return `${startM} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startM} ${start.getDate()} - ${endM} ${end.getDate()}, ${start.getFullYear()}`;
  }, [weekDates]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return tradesByDate[toLocalDateString(selectedDate)] || [];
  }, [selectedDate, tradesByDate]);

  const selectedDayPnL = useMemo(() => calcPnL(selectedDayTrades), [selectedDayTrades]);

  const goToPrevious = () => {
    if (viewMode === 'Month') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
    setSelectedDate(null);
  };

  const goToNext = () => {
    if (viewMode === 'Month') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className={`${LAYOUT.container} py-8`}>
          <CalendarSkeleton />
        </div>
      </AuthenticatedLayout>
    );
  }

  /* ═══════════════════ DAY CELL ═══════════════════ */
  const DayCell = ({ date, isOutsideMonth = false, large = false }: { date: Date | null; isOutsideMonth?: boolean; large?: boolean }) => {
    if (!date) {
      return <div className="aspect-[4/3] sm:aspect-[1.5] rounded-2xl bg-slate-50/10 dark:bg-white/[0.01] border border-transparent opacity-20" />;
    }

    const dateStr = toLocalDateString(date);
    const dayTrades = tradesByDate[dateStr] || [];
    const pnl = calcPnL(dayTrades);
    const isProfit = pnl > 0;
    const isLoss = pnl < 0;
    const isToday = isSameDay(date, today);
    const isSelected = selectedDate && isSameDay(date, selectedDate);

    // Color-coded borders and backgrounds for winning/losing days
    let dayCellClasses = 'bg-white dark:bg-[#0d0e16] border-slate-250 dark:border-white/[0.06]';
    if (dayTrades.length > 0) {
      if (isProfit) {
        dayCellClasses = 'bg-[#e6f4ea] dark:bg-emerald-950/45 border-[#ceead6] dark:border-emerald-500/35';
      } else if (isLoss) {
        dayCellClasses = 'bg-[#fce8e6] dark:bg-rose-950/45 border-[#fad2cf] dark:border-rose-500/35';
      }
    }

    return (
      <motion.button
        onClick={() => setSelectedDate(date)}
        whileHover={{ y: -2 }}
        className={`relative aspect-[4/3] sm:aspect-[1.5] p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between text-left group ${dayCellClasses} ${
          isToday
            ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/10 dark:ring-indigo-400/10 bg-indigo-50/50 dark:bg-indigo-950/10'
            : isOutsideMonth
              ? 'opacity-25 bg-slate-50/20 dark:bg-white/[0.01] border-slate-200 dark:border-white/[0.03]'
              : 'shadow-sm hover:border-slate-350 dark:hover:border-white/10 hover:shadow'
        } ${isSelected ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 border-transparent shadow-lg' : ''}`}
      >
        <div className="flex justify-between items-center w-full">
          <span className={`text-xs font-bold font-mono ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-650 dark:text-slate-400'}`}>
            {date.getDate()}
          </span>
          {isToday && (
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
              Today
            </span>
          )}
        </div>

        {dayTrades.length > 0 ? (
          <div className="flex flex-col w-full text-right">
            <span className="text-[9px] text-slate-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
              {dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''}
            </span>
            <span className={`text-xs sm:text-sm font-black tracking-tight mt-0.5 leading-none ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-450'}`}>
              {pnl > 0 ? '+' : ''}${Math.abs(pnl).toFixed(0)}
            </span>
          </div>
        ) : null}
      </motion.button>
    );
  };

  /* ═══════════════════ WEEK VIEW ═══════════════════ */
  const renderWeekView = () => {
    const weekPnl = weekDates.reduce((s, d) => {
      const k = toLocalDateString(d);
      return s + calcPnL(tradesByDate[k] || []);
    }, 0);

    return (
      <div className="bg-white dark:bg-[#0d0e16] rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden shadow-sm p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/[0.04] mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-3">
          {weekDates.map((date) => (
            <DayCell key={date.toISOString()} date={date} large />
          ))}
        </div>

        {/* Week total bar */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-white/[0.04] mt-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest">Week Total</span>
            {weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []).length > 0 && (
              <span className="text-xs text-slate-500 dark:text-gray-400 font-semibold font-mono">
                ({weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []).length} trades · {calcWinRate(weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []))}% WR)
              </span>
            )}
          </div>
          <span className={`text-lg font-black tabular-nums ${weekPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : weekPnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            {weekPnl > 0 ? '+' : ''}{fmt(weekPnl)}
          </span>
        </div>
      </div>
    );
  };

  /* ═══════════════════ MONTH VIEW ═══════════════════ */
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstDay + 1;
      const isValid = dayNum > 0 && dayNum <= daysInMonth;
      const date = isValid ? new Date(currentYear, currentMonth, dayNum) : null;
      cells.push(<DayCell key={i} date={date} isOutsideMonth={!isValid} />);
    }

    const weekRows: React.ReactNode[] = [];
    const weeklyStatsList: Array<{ start: Date; end: Date; pnl: number; tradesCount: number; winRate: number; cumulative: number[] }> = [];

    for (let row = 0; row < cells.length / 7; row++) {
      const weekCells = cells.slice(row * 7, row * 7 + 7);
      
      const startDayNum = row * 7 - firstDay + 1;
      const endDayNum = row * 7 - firstDay + 7;
      const startD = new Date(currentYear, currentMonth, Math.max(1, startDayNum));
      const endD = new Date(currentYear, currentMonth, Math.min(daysInMonth, endDayNum));

      let weekTrades: Trade[] = [];
      for (let d = 0; d < 7; d++) {
        const dayNum = row * 7 + d - firstDay + 1;
        if (dayNum > 0 && dayNum <= daysInMonth) {
          const date = new Date(currentYear, currentMonth, dayNum);
          const dateStr = toLocalDateString(date);
          const dayTrades = tradesByDate[dateStr] || [];
          weekTrades = [...weekTrades, ...dayTrades];
        }
      }

      // Sort weekly trades to construct week sparkline
      const sortedWeekTrades = [...weekTrades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
      let sum = 0;
      const cumulative = [0];
      sortedWeekTrades.forEach(t => {
        sum += t.profit_loss;
        cumulative.push(sum);
      });

      weeklyStatsList.push({
        start: startD,
        end: endD,
        pnl: calcPnL(weekTrades),
        tradesCount: weekTrades.length,
        winRate: calcWinRate(weekTrades),
        cumulative,
      });

      weekRows.push(
        <div key={row} className="grid grid-cols-7 gap-3">
          {weekCells}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start w-full">
        {/* Calendar Grid (3 columns) */}
        <div className="xl:col-span-3 flex flex-col gap-3">
          <div className="bg-white dark:bg-[#0d0e16] rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden shadow-sm p-5">
            {/* Calendar header controls */}
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={goToPrevious}
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121420] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  <ChevronLeft />
                </button>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                  {monthName} {currentYear}
                </h2>
                <button
                  onClick={goToNext}
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121420] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
                {(['Month', 'Week'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode === 'Month' ? 'Month' : 'Week')}
                    className={`px-4 py-1 text-xs font-bold rounded-lg transition-all ${
                      (mode === 'Month' && viewMode === 'Month') || (mode === 'Week' && viewMode === 'Week')
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-655 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {mode === 'Month' ? 'Monthly' : 'Weekly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-3 mb-3">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d} className="px-1 py-2 text-center text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>

            {/* Month Day Grid */}
            <div className="flex flex-col gap-3">
              {weekRows}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets (1 column) */}
        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
          {/* Weekly Totals Card */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Weekly Totals
            </h3>
            <div className="space-y-4">
              {weeklyStatsList.map((stat, idx) => {
                const rangeStr = `${stat.start.toLocaleString('en-US', { month: 'short', day: '2-digit' })} - ${stat.end.toLocaleString('en-US', { month: 'short', day: '2-digit' })}`;
                const isProfit = stat.pnl > 0;
                const isLoss = stat.pnl < 0;
                
                return (
                  <div key={idx} className="flex flex-col gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-white/[0.03] bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">
                        Week {idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold font-mono">
                        {rangeStr}
                      </span>
                    </div>

                    <div className="flex items-end justify-between mt-1">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                          {isProfit ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold font-mono">
                          {stat.tradesCount} trades · {stat.winRate}% WR
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 text-right">
                        <span className={`text-base font-black tabular-nums tracking-tight leading-none ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                          {stat.pnl !== 0 ? (isProfit ? '+' : '-') : ''}${Math.abs(stat.pnl).toFixed(0)}
                        </span>
                        {stat.cumulative.length >= 2 ? (
                          <MiniSparkline
                            data={stat.cumulative}
                            width={75}
                            height={20}
                            color="#10b981"
                            negativeColor="#ef4444"
                          />
                        ) : (
                          <div className="w-[75px] h-[20px] border-b border-dashed border-slate-200 dark:border-white/10" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Setups Card */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Top Setups
            </h3>
            {topSetups.length > 0 ? (
              <div className="space-y-3.5">
                {topSetups.map((setup, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 dark:border-white/[0.03] bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={setup.name}>
                        {setup.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                        {setup.count} trades logged
                      </span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      {setup.winRate}% WIN
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4">No strategy tags set yet.</p>
            )}
          </div>

          {/* Monthly Goal Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 dark:from-indigo-700 dark:to-violet-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100">Monthly Goal</span>
              <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-lg border border-white/10">3.2%</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight">$10,000 Profit</span>
              <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-white h-full rounded-full" style={{ width: '3.2%' }} />
              </div>
            </div>

            <p className="text-[10px] text-indigo-100/90 leading-relaxed font-medium">
              Wait for better setups to recover drawdown and reach target. Stick to risk rules.
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════ MAIN RENDER ═══════════════════ */
  return (
    <AuthenticatedLayout>
      <div className={`${LAYOUT.container} py-8`}>
        
        {/* ─── Breadcrumbs & Main Header ─── */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center text-xs text-slate-400 dark:text-gray-500 font-semibold gap-1.5 mb-1">
              <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Dashboard</Link>
              <span>/</span>
              <span>{monthName} {currentYear} Overview</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Performance Command
            </h1>
          </div>

          <Link
            href="/trades/new"
            className="flex items-center px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 cursor-pointer self-start md:self-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Log Trade</span>
          </Link>
        </div>

        {/* ─── Top Stats Strip (Restored 7 Cards) ─── */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
          {/* Card 1: Net P&L (with Sparkline + Gain %) */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col gap-1.5 relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Net P&L</span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                monthStats.pnl >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
              }`}>
                {monthStats.pnl >= 0 ? '+' : ''}{monthStats.gainPercent.toFixed(1)}%
              </span>
            </div>
            <span className={`text-xl font-black tabular-nums tracking-tight ${monthStats.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {monthStats.pnl >= 0 ? '+' : '-'}${Math.abs(monthStats.pnl).toFixed(0)}
            </span>
            {monthCumulativePnL.length >= 2 ? (
              <div className="mt-1">
                <MiniSparkline
                  data={monthCumulativePnL}
                  width={90}
                  height={18}
                  color="#10b981"
                  negativeColor="#ef4444"
                />
              </div>
            ) : null}
          </div>

          {/* Card 2: Win Rate */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Win Rate</span>
              <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9155" className="stroke-slate-100 dark:stroke-white/[0.05]" strokeWidth="3.5" fill="none" />
                <circle cx="18" cy="18" r="15.9155" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="3.5" strokeDasharray={`${monthStats.winRate}, 100`} strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
              {monthStats.winRate}%
            </span>
          </div>

          {/* Card 3: Wins */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Wins</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {monthStats.wins}
            </span>
          </div>

          {/* Card 4: Losses */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Losses</span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              {monthStats.losses}
            </span>
          </div>

          {/* Card 5: Total Trades */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Trades</span>
              <span className="text-[8px] font-black uppercase bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded text-slate-500 font-mono">Month</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {monthStats.totalTrades}
            </span>
          </div>

          {/* Card 6: Best Day */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Best Day</span>
              <span className="text-emerald-500"><TrendUp /></span>
            </div>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight mt-1">
              {monthStats.bestDay > 0 ? '+' : ''}${monthStats.bestDay.toFixed(0)}
            </span>
          </div>

          {/* Card 7: Worst Day */}
          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider">Worst Day</span>
              <span className="text-rose-500"><TrendDown /></span>
            </div>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight mt-1">
              {monthStats.worstDay < 0 ? '-' : ''}${Math.abs(monthStats.worstDay).toFixed(0)}
            </span>
          </div>
        </div>

        {/* ─── Grid View ─── */}
        {trades.length === 0 ? (
          <EmptyState variant="calendar" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${currentDate.toISOString()}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {viewMode === 'Month' ? renderMonthView() : renderWeekView()}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ─── Selected Day Detail Panel ─── */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              <div className="bg-white dark:bg-[#0d0e16] rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden shadow-md">
                {/* Day header */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04]">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-semibold">
                      {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? 's' : ''}
                      {selectedDayTrades.length > 0 && ` · ${calcWinRate(selectedDayTrades)}% win rate`}
                    </p>
                  </div>
                  {selectedDayTrades.length > 0 && (
                    <div className={`text-xl font-black tabular-nums ${selectedDayPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {selectedDayPnL > 0 ? '+' : ''}{fmt(selectedDayPnL)}
                    </div>
                  )}
                </div>

                {/* Day stats details */}
                {selectedDayTrades.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01]">
                    {[
                      {
                        label: 'Win Rate',
                        value: `${calcWinRate(selectedDayTrades)}%`,
                        color: calcWinRate(selectedDayTrades) >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      },
                      {
                        label: 'Avg Win',
                        value: (() => {
                          const wins = selectedDayTrades.filter((t) => t.profit_loss > 0);
                          return wins.length ? '+' + fmt(calcPnL(wins) / wins.length) : '—';
                        })(),
                        color: 'text-emerald-600 dark:text-emerald-400',
                      },
                      {
                        label: 'Avg Loss',
                        value: (() => {
                          const losses = selectedDayTrades.filter((t) => t.profit_loss < 0);
                          return losses.length ? fmt(calcPnL(losses) / losses.length) : '—';
                        })(),
                        color: 'text-rose-600 dark:text-rose-400',
                      },
                      {
                        label: 'Largest Execution',
                        value: (() => {
                          const max = selectedDayTrades.reduce(
                            (m, t) => (Math.abs(t.profit_loss) > Math.abs(m) ? t.profit_loss : m),
                            0
                          );
                          return (max > 0 ? '+' : '') + fmt(max);
                        })(),
                        color: 'text-slate-800 dark:text-slate-200',
                      },
                    ].map((s, i) => (
                      <div key={i} className="px-6 py-4 flex flex-col gap-1 border-r border-slate-100 dark:border-white/[0.04] last:border-r-0">
                        <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                          {s.label}
                        </span>
                        <span className="text-base font-bold tabular-nums" style={{ color: `var(--${s.color})` }}>
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Day execution row list */}
                {selectedDayTrades.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {selectedDayTrades.map((trade) => {
                      const isLong = trade.type?.toLowerCase() === 'long';
                      return (
                        <div key={trade.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                              isLong 
                                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' 
                                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                            }`}>
                              {trade.type}
                            </span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-250 font-mono">
                              {trade.symbol}
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            <span className="text-xs text-slate-400 dark:text-gray-500 font-semibold font-mono">
                              Lots: {trade.lots || (trade.quantity / 1000).toFixed(2)}
                            </span>
                            <span className={`text-sm font-black tabular-nums ${trade.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {trade.profit_loss >= 0 ? '+' : ''}{fmtDecimal(trade.profit_loss)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center text-xs text-slate-400 dark:text-gray-500 font-semibold">
                    No trades executed on this day.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── YTD Annual Quick View Timeline (Enhanced & Color-Coded) ─── */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.06] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">
              Annual Quick View
            </span>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] rounded-xl p-1">
              <button
                onClick={() => {
                  setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
                  setSelectedDate(null);
                }}
                className="p-1 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <ChevronLeft />
              </button>
              <span className="text-xs font-bold text-slate-800 dark:text-white px-2 font-mono select-none">{currentYear}</span>
              <button
                onClick={() => {
                  setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
                  setSelectedDate(null);
                }}
                className="p-1 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3.5">
            {yearMonthlyStats.map((stat) => {
              const dateForMonth = new Date(currentYear, stat.month, 1);
              const name = dateForMonth.toLocaleString('default', { month: 'short' }).toUpperCase();
              const isActive = currentMonth === stat.month;
              const isProfit = stat.pnl > 0;
              const isLoss = stat.pnl < 0;

              // Soft green/red monthly card styling
              let monthCardClasses = 'bg-white dark:bg-[#0d0e16] border-slate-250 dark:border-white/[0.06]';
              if (stat.tradesCount > 0) {
                if (isProfit) {
                  monthCardClasses = 'bg-[#e6f4ea] dark:bg-emerald-950/45 border-[#ceead6] dark:border-emerald-500/35';
                } else if (isLoss) {
                  monthCardClasses = 'bg-[#fce8e6] dark:bg-rose-950/45 border-[#fad2cf] dark:border-rose-500/35';
                }
              }
              
              return (
                <button
                  key={stat.month}
                  onClick={() => {
                    setCurrentDate(new Date(currentYear, stat.month, 1));
                    setSelectedDate(null);
                  }}
                  className={`p-3.5 rounded-xl flex flex-col justify-between text-center transition-all border ${monthCardClasses} ${
                    isActive
                      ? 'ring-2 ring-indigo-500 border-transparent shadow-md'
                      : 'hover:border-slate-350 dark:hover:border-white/12'
                  }`}
                >
                  <span className={`text-[10px] tracking-wider font-black ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-500'}`}>
                    {name}
                  </span>
                  <span className={`text-xs font-black tabular-nums tracking-tight mt-2 block ${stat.tradesCount > 0 ? (isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-400'}`}>
                    {stat.tradesCount > 0 ? (isProfit ? '+' : '-') + `$${Math.abs(stat.pnl).toFixed(0)}` : '—'}
                  </span>
                  <div className="mt-2.5 flex flex-col gap-0.5 items-center w-full">
                    <span className="text-[9px] text-slate-500 dark:text-gray-500 font-semibold font-mono">
                      {stat.tradesCount} Tr
                    </span>
                    {stat.tradesCount > 0 ? (
                      <span className={`text-[8px] font-black px-1 py-0.2 rounded border ${
                        stat.winRate >= 50
                          ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/15'
                          : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/15'
                      }`}>
                        {stat.winRate}% WR
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Recent Activity Log ─── */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.06]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">
              Recent Activity
            </span>
            <Link
              href="/trades"
              className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 transition-all"
            >
              <span>Full Journal</span>
              <ChevronRight />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/[0.04]">
            {recentTrades.map((t) => {
              const isLong = t.type?.toLowerCase() === 'long';
              return (
                <div key={t.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      isLong 
                        ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' 
                        : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                    }`}>
                      {t.type}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {t.symbol}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-gray-500 hidden sm:inline font-semibold">
                      · {new Date(t.entry_time).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                    </span>
                  </div>

                  <span className={`text-sm font-black tabular-nums ${t.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {t.profit_loss >= 0 ? '+' : ''}{fmtDecimal(t.profit_loss)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
