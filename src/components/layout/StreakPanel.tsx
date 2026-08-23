'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Shield, 
  Award, 
  CheckCircle2, 
  Lock, 
  Zap, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  Snowflake, 
  Target, 
  X, 
  BarChart3,
  Clock,
  ShieldCheck
} from 'lucide-react';

// ─── Badge Definitions ─────────────────────────────────────────────────────────

interface BadgeStats {
  totalDays: number;
  totalTrades: number;
  longestStreak: number;
  usedFreezes: boolean;
}

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  threshold: string;
  accentColor: string;
  glowColor: string;
  check: (s: BadgeStats) => boolean;
  icon: React.ReactNode;
}

const BADGES: BadgeDef[] = [
  {
    id: 'ignition',
    name: 'Ignition',
    description: 'First day logged',
    threshold: '1 day',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.12)',
    check: s => s.totalDays >= 1,
    icon: <Flame className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '5-day streak achieved',
    threshold: '5 days',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.12)',
    check: s => s.longestStreak >= 5,
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: '10-day streak achieved',
    threshold: '10 days',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.12)',
    check: s => s.longestStreak >= 10,
    icon: <Target className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: '25-day streak achieved',
    threshold: '25 days',
    accentColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.12)',
    check: s => s.longestStreak >= 25,
    icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
  },
  {
    id: 'elite',
    name: 'Elite Master',
    description: '50-day streak achieved',
    threshold: '50 days',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.12)',
    check: s => s.longestStreak >= 50,
    icon: <ShieldCheck className="w-5 h-5 text-violet-500" />,
  },
  {
    id: 'legend',
    name: 'Trading Legend',
    description: '100-day streak achieved',
    threshold: '100 days',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.18)',
    check: s => s.longestStreak >= 100,
    icon: <Award className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'ice_shield',
    name: 'Ice Shield',
    description: 'Streak protected by freeze',
    threshold: 'Use freeze',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.12)',
    check: s => s.usedFreezes,
    icon: <Snowflake className="w-5 h-5 text-cyan-500" />,
  },
  {
    id: 'veteran',
    name: 'Veteran Journaler',
    description: '30 total journaling days',
    threshold: '30 days total',
    accentColor: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.12)',
    check: s => s.totalDays >= 30,
    icon: <Calendar className="w-5 h-5 text-teal-500" />,
  },
  {
    id: 'century',
    name: 'Century Club',
    description: '100 trades recorded',
    threshold: '100 trades',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.12)',
    check: s => s.totalTrades >= 100,
    icon: <BarChart3 className="w-5 h-5 text-rose-500" />,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMilestones(current: number): { prev: number; next: number; progress: number } {
  const milestones = [5, 10, 25, 50, 100];
  for (let i = 0; i < milestones.length; i++) {
    if (current < milestones[i]) {
      const prev = i === 0 ? 0 : milestones[i - 1];
      const next = milestones[i];
      const progress = ((current - prev) / (next - prev)) * 100;
      return { prev, next, progress: Math.max(0, Math.min(100, progress)) };
    }
  }
  return { prev: 100, next: 100, progress: 100 };
}

interface HeatmapCell {
  date: string;
  hasActivity: boolean;
  isFrozen: boolean;
  isWeekend: boolean;
  isFuture: boolean;
  isToday: boolean;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateHeatmap(tradeDates: string[], frozenDates: string[]): HeatmapCell[] {
  const today = new Date();
  const todayStr = formatDate(today);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7 * 12);
  const dow = startDate.getDay();
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const cells: HeatmapCell[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < 91; i++) {
    const dateStr = formatDate(current);
    const dayOfWeek = current.getDay();
    cells.push({
      date: dateStr,
      hasActivity: tradeDates.includes(dateStr),
      isFrozen: frozenDates.includes(dateStr) && !tradeDates.includes(dateStr),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isFuture: dateStr > todayStr,
      isToday: dateStr === todayStr,
    });
    current.setDate(current.getDate() + 1);
  }
  return cells;
}

function getMonthLabels(cells: HeatmapCell[]): { col: number; label: string }[] {
  const labels: { col: number; label: string }[] = [];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let lastMonth = -1;
  cells.forEach((cell, i) => {
    if (i % 7 === 0) {
      const month = parseInt(cell.date.split('-')[1]) - 1;
      if (month !== lastMonth) {
        labels.push({ col: Math.floor(i / 7), label: MONTHS[month] });
        lastMonth = month;
      }
    }
  });
  return labels;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressRing({ current, progress }: { current: number; progress: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0 w-28 h-28">
      <svg width="112" height="112" viewBox="0 0 112 112" className="absolute inset-0 -rotate-90">
        {/* Background track */}
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-slate-200/80 dark:text-white/[0.06]"
          strokeWidth="7"
        />
        {/* Animated progress arc */}
        <motion.circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="url(#streakRingGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
        <defs>
          <linearGradient id="streakRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Inner Metric */}
      <div className="relative flex flex-col items-center justify-center">
        <motion.div
          className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white leading-none flex items-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {current}
        </motion.div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
          {current === 1 ? 'Day' : 'Days'}
        </span>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  accent 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ReactNode; 
  accent?: string; 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] shadow-sm transition-all hover:bg-slate-100/70 dark:hover:bg-white/[0.04]">
      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 mb-1">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span
        className={`text-xl font-black font-mono tracking-tight leading-none ${
          accent || 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function BadgeCard({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  return (
    <motion.div
      className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-default group overflow-hidden ${
        earned
          ? 'bg-white dark:bg-[#121524] shadow-sm hover:shadow-md hover:-translate-y-0.5'
          : 'bg-slate-50/50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/[0.03] opacity-45'
      }`}
      style={earned ? {
        borderColor: `${badge.accentColor}35`,
        background: `linear-gradient(135deg, ${badge.glowColor}, transparent)`,
      } : undefined}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          earned
            ? 'border-transparent shadow-sm'
            : 'border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.03] text-slate-400'
        }`}
        style={earned ? {
          background: `${badge.accentColor}18`,
          borderColor: `${badge.accentColor}30`,
        } : undefined}
      >
        {earned ? badge.icon : <Lock className="w-4 h-4 text-slate-400 dark:text-slate-600" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-bold leading-tight truncate ${earned ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {badge.name}
          </p>
          {earned && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.accentColor }} />
          )}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
          {badge.description}
        </p>
      </div>

      {/* Status Pill */}
      {earned ? (
        <div 
          className="px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 shrink-0"
          style={{ 
            backgroundColor: `${badge.accentColor}15`, 
            color: badge.accentColor,
            border: `1px solid ${badge.accentColor}30` 
          }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Unlocked</span>
        </div>
      ) : (
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 shrink-0 font-medium">
          {badge.threshold}
        </span>
      )}
    </motion.div>
  );
}

function ActivityHeatmap({ tradeDates, frozenDates }: { tradeDates: string[]; frozenDates: string[] }) {
  const cells = useMemo(() => generateHeatmap(tradeDates, frozenDates), [tradeDates, frozenDates]);
  const monthLabels = useMemo(() => getMonthLabels(cells), [cells]);

  const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''];

  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Month Labels */}
      <div className="flex gap-[3px] pl-[20px]">
        {weeks.map((_, wi) => {
          const label = monthLabels.find(l => l.col === wi);
          return (
            <div key={wi} className="flex-1 text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase" style={{ minWidth: 12, maxWidth: 12 }}>
              {label?.label ?? ''}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-2 items-start">
        {/* Day Labels */}
        <div className="flex flex-col gap-[3px]">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[12px] text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 leading-none flex items-center justify-end pr-1" style={{ width: 14 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="flex gap-[3px] flex-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]" style={{ flex: '1 1 0' }}>
              {week.map((cell, di) => (
                <div
                  key={`${wi}-${di}`}
                  title={!cell.isWeekend && !cell.isFuture ? `${cell.date}${cell.hasActivity ? ' — Trade Logged' : cell.isFrozen ? ' — Freeze Protected' : ' — No Trades'}` : undefined}
                  className={`h-[12px] rounded-[3px] transition-all duration-200 ${
                    cell.isFuture || cell.isWeekend
                      ? 'bg-transparent'
                      : cell.hasActivity
                      ? 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.3)]'
                      : cell.isFrozen
                      ? 'bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-200/70 dark:bg-white/[0.04]'
                  }`}
                  style={{
                    outline: cell.isToday && !cell.isWeekend ? `1.5px solid rgba(99,102,241,0.8)` : 'none',
                    outlineOffset: '0.5px',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3.5 mt-1 border-t border-slate-100 dark:border-white/[0.04] pt-2">
        {[
          { color: 'bg-indigo-600 dark:bg-indigo-500', label: 'Trade Logged' },
          { color: 'bg-cyan-500 dark:bg-cyan-400', label: 'Freeze Shield' },
          { color: 'bg-slate-200 dark:bg-white/[0.04]', label: 'No Trades' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-[2px] ${item.color}`} />
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreezeTokens({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] dark:bg-cyan-500/[0.04]">
      <div className="flex items-center gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => {
          const active = i < count;
          return (
            <motion.div
              key={i}
              className={`relative w-10 h-10 rounded-xl border flex items-center justify-center ${
                active
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-100/80 dark:bg-white/[0.02] border-dashed border-slate-300 dark:border-white/[0.1] text-slate-300 dark:text-white/10'
              }`}
              initial={false}
              animate={active ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <Snowflake className="w-5 h-5" />
            </motion.div>
          );
        })}
      </div>

      <div className="text-right">
        <div className="flex items-baseline justify-end gap-1">
          <span className="text-base font-black font-mono text-cyan-600 dark:text-cyan-400">
            {count}
          </span>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            / 3 Available
          </span>
        </div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
          Streak Shields
        </p>
      </div>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────

interface StreakPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  thisWeek: number;
  thisMonth: number;
  totalTrades: number;
  streakFreezes: number;
  tradeDates: string[];
  frozenDates: string[];
  isStreakActiveToday: boolean;
}

export function StreakPanel({
  isOpen, 
  onClose, 
  currentStreak, 
  longestStreak, 
  totalDays, 
  thisWeek, 
  thisMonth,
  totalTrades, 
  streakFreezes, 
  tradeDates, 
  frozenDates, 
  isStreakActiveToday,
}: StreakPanelProps) {
  const { progress, next } = getMilestones(currentStreak);

  const badgeStats: BadgeStats = {
    totalDays, 
    totalTrades, 
    longestStreak, 
    usedFreezes: frozenDates.length > 0,
  };

  const earnedBadges = BADGES.filter(b => b.check(badgeStats));
  const lockedBadges = BADGES.filter(b => !b.check(badgeStats));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-6 pointer-events-none"
          >
            <div className="relative w-full max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl pointer-events-auto border border-slate-200/90 dark:border-white/[0.08] shadow-2xl bg-white dark:bg-[#0c0f1d] text-slate-900 dark:text-slate-100 flex flex-col">
              
              {/* Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] bg-white/95 dark:bg-[#0c0f1d]/95 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30 shadow-sm">
                    <Flame className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                      Discipline &amp; Journaling Streak
                    </h2>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {earnedBadges.length} of {BADGES.length} Badges Earned ({Math.round((earnedBadges.length / BADGES.length) * 100)}% Complete)
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/[0.08] transition-all"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">

                {/* Hero Card: Ring + Milestone HUD */}
                <div className="p-5 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-violet-500/[0.03] shadow-sm flex flex-col sm:flex-row items-center gap-5">
                  <ProgressRing current={currentStreak} progress={progress} />

                  <div className="flex-1 min-w-0 w-full space-y-3">
                    {/* Status Pill */}
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        isStreakActiveToday
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isStreakActiveToday ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                        <span>{isStreakActiveToday ? 'Active Today' : 'At Risk'}</span>
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        Best: <strong className="text-slate-900 dark:text-white">{longestStreak}d</strong>
                      </span>
                    </div>

                    {/* Progress Bar & Milestone Text */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>
                          {currentStreak >= 100
                            ? 'All Milestones Mastered'
                            : `${next - currentStreak} Days to ${next}-Day Milestone`}
                        </span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
                          {currentStreak} / {next}d
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden p-0.5">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCard label="Total Days" value={totalDays} icon={<Calendar className="w-3 h-3" />} accent="text-indigo-600 dark:text-indigo-400" />
                  <StatCard label="This Week" value={thisWeek} icon={<Zap className="w-3 h-3" />} accent="text-emerald-600 dark:text-emerald-400" />
                  <StatCard label="This Month" value={thisMonth} icon={<Clock className="w-3 h-3" />} />
                  <StatCard label="Total Trades" value={totalTrades} icon={<BarChart3 className="w-3 h-3" />} />
                </div>

                {/* 13-Week Activity Heatmap */}
                <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.015] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Activity Heatmap (Last 13 Weeks)
                    </h3>
                  </div>
                  <ActivityHeatmap tradeDates={tradeDates} frozenDates={frozenDates} />
                </div>

                {/* Freeze Token Shields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Freeze Shield Protection
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">1 Token earned every 5-day milestone</span>
                  </div>
                  <FreezeTokens count={streakFreezes} />
                </div>

                {/* Badges Gallery (2-Column Grid) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <Award className="w-3.5 h-3.5" />
                      Achievement Badges
                    </h3>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      {earnedBadges.length} / {BADGES.length} Unlocked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {earnedBadges.map(badge => (
                      <BadgeCard key={badge.id} badge={badge} earned={true} />
                    ))}
                    {lockedBadges.map(badge => (
                      <BadgeCard key={badge.id} badge={badge} earned={false} />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
