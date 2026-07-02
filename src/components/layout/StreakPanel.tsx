'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Badge Definitions ─────────────────────────────────────────────────────────

interface BadgeStats {
  totalDays: number
  totalTrades: number
  longestStreak: number
  usedFreezes: boolean
}

interface BadgeDef {
  id: string
  name: string
  description: string
  accentColor: string
  glowColor: string
  check: (s: BadgeStats) => boolean
  icon: React.ReactNode
}

function BadgeIcon({ paths, strokeWidth = 1.5 }: { paths: string[]; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const BADGES: BadgeDef[] = [
  {
    id: 'ignition',
    name: 'Ignition',
    description: 'First day journaled',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.15)',
    check: s => s.totalDays >= 1,
    icon: <BadgeIcon paths={['M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z']} />,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '5-day streak achieved',
    accentColor: '#eab308',
    glowColor: 'rgba(234,179,8,0.15)',
    check: s => s.longestStreak >= 5,
    icon: <BadgeIcon paths={['M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z']} />,
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: '10-day streak achieved',
    accentColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.15)',
    check: s => s.longestStreak >= 10,
    icon: <BadgeIcon paths={[
      'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Z',
      'M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z',
      'M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
    ]} />,
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: '25-day streak achieved',
    accentColor: '#6366f1',
    glowColor: 'rgba(99,102,241,0.15)',
    check: s => s.longestStreak >= 25,
    icon: <BadgeIcon paths={['M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941']} />,
  },
  {
    id: 'elite',
    name: 'Elite',
    description: '50-day streak achieved',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.15)',
    check: s => s.longestStreak >= 50,
    icon: <BadgeIcon paths={[
      'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
    ]} />,
  },
  {
    id: 'legend',
    name: 'Legend',
    description: '100-day streak achieved',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.2)',
    check: s => s.longestStreak >= 100,
    icon: <BadgeIcon paths={[
      'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0',
    ]} />,
  },
  {
    id: 'ice_shield',
    name: 'Ice Shield',
    description: 'Streak protected by freeze',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6,182,212,0.15)',
    check: s => s.usedFreezes,
    icon: <BadgeIcon paths={[
      'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
    ]} />,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: '30 total journaling days',
    accentColor: '#14b8a6',
    glowColor: 'rgba(20,184,166,0.15)',
    check: s => s.totalDays >= 30,
    icon: <BadgeIcon paths={[
      'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    ]} />,
  },
  {
    id: 'century',
    name: 'Century',
    description: '100 trades recorded',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.15)',
    check: s => s.totalTrades >= 100,
    icon: <BadgeIcon paths={[
      'M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z',
    ]} />,
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMilestones(current: number): { prev: number; next: number; progress: number } {
  const milestones = [5, 10, 25, 50, 100]
  for (let i = 0; i < milestones.length; i++) {
    if (current < milestones[i]) {
      const prev = i === 0 ? 0 : milestones[i - 1]
      const next = milestones[i]
      const progress = ((current - prev) / (next - prev)) * 100
      return { prev, next, progress: Math.max(0, Math.min(100, progress)) }
    }
  }
  // Beyond 100
  return { prev: 100, next: 100, progress: 100 }
}

interface HeatmapCell {
  date: string
  hasActivity: boolean
  isFrozen: boolean
  isWeekend: boolean
  isFuture: boolean
  isEmpty: boolean // padding cell before first real day
}

function generateHeatmap(tradeDates: string[], frozenDates: string[]): HeatmapCell[] {
  const today = new Date()
  const todayStr = formatDate(today)

  // Start from Monday of 12 weeks ago
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 7 * 12)
  const dow = startDate.getDay()
  const daysBack = dow === 0 ? 6 : dow - 1 // days since Monday
  startDate.setDate(startDate.getDate() - daysBack)

  const cells: HeatmapCell[] = []
  const current = new Date(startDate)

  // Generate exactly 91 days (13 weeks)
  for (let i = 0; i < 91; i++) {
    const dateStr = formatDate(current)
    const dayOfWeek = current.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    cells.push({
      date: dateStr,
      hasActivity: tradeDates.includes(dateStr),
      isFrozen: frozenDates.includes(dateStr) && !tradeDates.includes(dateStr),
      isWeekend,
      isFuture: dateStr > todayStr,
      isEmpty: false,
    })

    current.setDate(current.getDate() + 1)
  }

  return cells
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthLabels(cells: HeatmapCell[]): { col: number; label: string }[] {
  const labels: { col: number; label: string }[] = []
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  let lastMonth = -1
  cells.forEach((cell, i) => {
    if (!cell.isEmpty && i % 7 === 0) {
      const month = parseInt(cell.date.split('-')[1]) - 1
      if (month !== lastMonth) {
        labels.push({ col: Math.floor(i / 7), label: MONTHS[month] })
        lastMonth = month
      }
    }
  })
  return labels
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressRing({ current, progress }: { current: number; progress: number }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
        {/* Track */}
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="7" />
        {/* Progress */}
        <circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center label */}
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--foreground)' }}>
          {current}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mt-0.5">
          {current === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border"
      style={{ background: 'var(--table-header-bg)', borderColor: 'var(--card-border)' }}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</span>
    </div>
  )
}

function BadgeCard({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  return (
    <div
      className="relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300"
      style={earned ? {
        background: badge.glowColor,
        borderColor: badge.accentColor + '40',
        boxShadow: `0 0 16px ${badge.glowColor}`,
      } : {
        background: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.05)',
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={earned ? {
          color: badge.accentColor,
          background: badge.accentColor + '18',
        } : {
          color: 'rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        {badge.icon}
      </div>

      {/* Name */}
      <span
        className="text-[11px] font-semibold text-center leading-tight"
        style={{ color: earned ? badge.accentColor : 'rgba(255,255,255,0.2)' }}
      >
        {badge.name}
      </span>

      {/* Locked indicator */}
      {!earned && (
        <div className="absolute top-2 right-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
          </svg>
        </div>
      )}

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-gray-900 border border-white/10 text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
          {badge.description}
        </div>
      </div>
    </div>
  )
}

function ActivityHeatmap({ tradeDates, frozenDates }: { tradeDates: string[]; frozenDates: string[] }) {
  const cells = useMemo(() => generateHeatmap(tradeDates, frozenDates), [tradeDates, frozenDates])
  const monthLabels = useMemo(() => getMonthLabels(cells), [cells])

  const DAY_LABELS = ['Mon', 'Wed', 'Fri']
  const DAY_LABEL_ROWS = [0, 2, 4] // which rows to show labels for

  // Weeks: group cells into columns of 7
  const weeks: HeatmapCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Month labels */}
      <div className="flex gap-[3px] pl-8">
        {weeks.map((_, wi) => {
          const label = monthLabels.find(l => l.col === wi)
          return (
            <div key={wi} className="w-[11px] text-[8px] text-gray-600 font-medium" style={{ minWidth: 11 }}>
              {label?.label ?? ''}
            </div>
          )
        })}
      </div>

      {/* Grid + day labels */}
      <div className="flex gap-2 items-start">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pt-0">
          {Array.from({ length: 7 }).map((_, row) => {
            const labelIdx = DAY_LABEL_ROWS.indexOf(row)
            return (
              <div key={row} className="h-[11px] text-[8px] text-gray-600 leading-none flex items-center justify-end pr-1 w-6">
                {labelIdx >= 0 ? DAY_LABELS[labelIdx] : ''}
              </div>
            )
          })}
        </div>

        {/* Cells: rows = days of week, columns = weeks */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={`${wi}-${di}`}
                  title={cell.date}
                  className="w-[11px] h-[11px] rounded-[2px] transition-colors duration-150"
                  style={{
                    background: cell.isFuture
                      ? 'transparent'
                      : cell.isWeekend
                      ? 'transparent'
                      : cell.hasActivity
                      ? 'rgba(99,102,241,0.75)'
                      : cell.isFrozen
                      ? 'rgba(6,182,212,0.45)'
                      : 'rgba(255,255,255,0.05)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pl-8 mt-1">
        {[
          { color: 'rgba(99,102,241,0.75)', label: 'Active' },
          { color: 'rgba(6,182,212,0.45)', label: 'Freeze used' },
          { color: 'rgba(255,255,255,0.05)', label: 'No activity' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: item.color }} />
            <span className="text-[9px] text-gray-600 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────

interface StreakPanelProps {
  isOpen: boolean
  onClose: () => void
  currentStreak: number
  longestStreak: number
  totalDays: number
  thisWeek: number
  thisMonth: number
  totalTrades: number
  streakFreezes: number
  tradeDates: string[]
  frozenDates: string[]
  isStreakActiveToday: boolean
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
  const { progress, next, prev } = getMilestones(currentStreak)

  const badgeStats: BadgeStats = {
    totalDays,
    totalTrades,
    longestStreak,
    usedFreezes: frozenDates.length > 0,
  }

  const earnedCount = BADGES.filter(b => b.check(badgeStats)).length

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
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[500px] max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* ─── Header ─── */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
                style={{ background: 'var(--card-bg)' }}>
                <div>
                  <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
                    Journaling Streak
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {earnedCount} of {BADGES.length} badges earned
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 pb-6 flex flex-col gap-6">

                {/* ─── Progress Ring + Status ─── */}
                <div className="flex items-center gap-6 p-5 rounded-xl border"
                  style={{ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.12)' }}>
                  <ProgressRing current={currentStreak} progress={progress} />

                  <div className="flex-1 min-w-0">
                    {/* Status badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider mb-3"
                      style={isStreakActiveToday ? {
                        background: 'rgba(16,185,129,0.1)',
                        color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.2)',
                      } : {
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isStreakActiveToday ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {isStreakActiveToday ? 'Active' : 'At risk'}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {currentStreak >= 100
                            ? 'Maximum milestone reached'
                            : `${next - currentStreak} day${next - currentStreak !== 1 ? 's' : ''} to next milestone`}
                        </span>
                        <span className="text-gray-400 font-medium tabular-nums">
                          {currentStreak < 100 ? `${currentStreak} / ${next}` : '100+'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        />
                      </div>

                      <p className="text-[10px] text-gray-600">
                        Longest streak: <span className="text-gray-400 font-semibold">{longestStreak} days</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* ─── Stats Grid ─── */}
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3">Activity</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <StatCard label="Total Days" value={totalDays} />
                    <StatCard label="This Week" value={thisWeek} />
                    <StatCard label="This Month" value={thisMonth} />
                    <StatCard label="All Trades" value={totalTrades} />
                  </div>
                </div>

                {/* ─── Freeze Tokens ─── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      Streak Freeze Tokens
                    </h3>
                    <span className="text-[10px] text-gray-600">Awarded every 5-day milestone</span>
                  </div>
                  <div className="flex items-center gap-2 p-4 rounded-xl border"
                    style={{ background: 'rgba(6,182,212,0.04)', borderColor: 'rgba(6,182,212,0.12)' }}>
                    <div className="flex items-center gap-2 flex-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all"
                          style={i < streakFreezes ? {
                            background: 'rgba(6,182,212,0.12)',
                            borderColor: 'rgba(6,182,212,0.3)',
                            color: '#06b6d4',
                          } : {
                            background: 'rgba(255,255,255,0.02)',
                            borderColor: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums" style={{ color: streakFreezes > 0 ? '#06b6d4' : 'rgba(255,255,255,0.2)' }}>
                        {streakFreezes} / 3
                      </p>
                      <p className="text-[9px] text-gray-600 mt-0.5">available</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                    Freeze tokens automatically protect your streak when you miss a weekday. New tokens are awarded when you hit a 5-day milestone.
                  </p>
                </div>

                {/* ─── Badges ─── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Badges</h3>
                    <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                      {earnedCount} / {BADGES.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {BADGES.map(badge => (
                      <div key={badge.id} className="relative group">
                        <BadgeCard badge={badge} earned={badge.check(badgeStats)} />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                          <div className="bg-gray-900 border border-white/10 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl">
                            {badge.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── Heatmap ─── */}
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3">
                    Activity — Last 13 Weeks
                  </h3>
                  <div className="p-4 rounded-xl border overflow-x-auto"
                    style={{ background: 'var(--table-header-bg)', borderColor: 'var(--card-border)' }}>
                    <ActivityHeatmap tradeDates={tradeDates} frozenDates={frozenDates} />
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
