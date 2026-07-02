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
  threshold: string
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
    id: 'ignition', name: 'Ignition', description: 'First day journaled', threshold: '1 day',
    accentColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.12)',
    check: s => s.totalDays >= 1,
    icon: <BadgeIcon paths={['M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z']} />,
  },
  {
    id: 'week_warrior', name: 'Week Warrior', description: '5-day streak achieved', threshold: '5 days',
    accentColor: '#eab308', glowColor: 'rgba(234,179,8,0.12)',
    check: s => s.longestStreak >= 5,
    icon: <BadgeIcon paths={['M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z']} />,
  },
  {
    id: 'consistent', name: 'Consistent', description: '10-day streak achieved', threshold: '10 days',
    accentColor: '#10b981', glowColor: 'rgba(16,185,129,0.12)',
    check: s => s.longestStreak >= 10,
    icon: <BadgeIcon paths={[
      'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Z',
      'M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z',
      'M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
    ]} />,
  },
  {
    id: 'momentum', name: 'Momentum', description: '25-day streak achieved', threshold: '25 days',
    accentColor: '#6366f1', glowColor: 'rgba(99,102,241,0.12)',
    check: s => s.longestStreak >= 25,
    icon: <BadgeIcon paths={['M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941']} />,
  },
  {
    id: 'elite', name: 'Elite', description: '50-day streak achieved', threshold: '50 days',
    accentColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.12)',
    check: s => s.longestStreak >= 50,
    icon: <BadgeIcon paths={[
      'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
    ]} />,
  },
  {
    id: 'legend', name: 'Legend', description: '100-day streak achieved', threshold: '100 days',
    accentColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.15)',
    check: s => s.longestStreak >= 100,
    icon: <BadgeIcon paths={[
      'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0',
    ]} />,
  },
  {
    id: 'ice_shield', name: 'Ice Shield', description: 'Streak protected by a freeze', threshold: 'Use freeze',
    accentColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.12)',
    check: s => s.usedFreezes,
    icon: <BadgeIcon paths={[
      'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
    ]} />,
  },
  {
    id: 'veteran', name: 'Veteran', description: '30 total journaling days', threshold: '30 days total',
    accentColor: '#14b8a6', glowColor: 'rgba(20,184,166,0.12)',
    check: s => s.totalDays >= 30,
    icon: <BadgeIcon paths={[
      'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    ]} />,
  },
  {
    id: 'century', name: 'Century', description: '100 trades recorded', threshold: '100 trades',
    accentColor: '#f43f5e', glowColor: 'rgba(244,63,94,0.12)',
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
  return { prev: 100, next: 100, progress: 100 }
}

interface HeatmapCell {
  date: string
  hasActivity: boolean
  isFrozen: boolean
  isWeekend: boolean
  isFuture: boolean
  isToday: boolean
}

function generateHeatmap(tradeDates: string[], frozenDates: string[]): HeatmapCell[] {
  const today = new Date()
  const todayStr = formatDate(today)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 7 * 12)
  const dow = startDate.getDay()
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1))

  const cells: HeatmapCell[] = []
  const current = new Date(startDate)

  for (let i = 0; i < 91; i++) {
    const dateStr = formatDate(current)
    const dayOfWeek = current.getDay()
    cells.push({
      date: dateStr,
      hasActivity: tradeDates.includes(dateStr),
      isFrozen: frozenDates.includes(dateStr) && !tradeDates.includes(dateStr),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isFuture: dateStr > todayStr,
      isToday: dateStr === todayStr,
    })
    current.setDate(current.getDate() + 1)
  }
  return cells
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthLabels(cells: HeatmapCell[]): { col: number; label: string }[] {
  const labels: { col: number; label: string }[] = []
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  let lastMonth = -1
  cells.forEach((cell, i) => {
    if (i % 7 === 0) {
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
  const r = 46
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: 120, height: 120 }}>
      {/* Outer decorative ring */}
      <svg width="120" height="120" viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        {/* Faint background track */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
        {/* Animated progress arc */}
        <motion.circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke="url(#streakRingGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
        {/* Glow filter for the progress */}
        <defs>
          <linearGradient id="streakRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      {/* Inner content */}
      <div className="relative flex flex-col items-center">
        <motion.span
          className="text-[32px] font-bold tabular-nums tracking-tighter leading-none"
          style={{ color: 'var(--foreground)' }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {current}
        </motion.span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-gray-500 mt-1">
          {current === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors"
      style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <span
        className="text-xl font-bold tabular-nums leading-none"
        style={{ color: accent || 'var(--foreground)' }}
      >
        {value}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</span>
    </div>
  )
}

function BadgeCard({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  return (
    <motion.div
      className="relative flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-300 cursor-default group/badge overflow-hidden"
      style={earned ? {
        background: `linear-gradient(135deg, ${badge.glowColor}, transparent)`,
        borderColor: badge.accentColor + '30',
      } : {
        background: 'rgba(255,255,255,0.015)',
        borderColor: 'rgba(255,255,255,0.04)',
        opacity: 0.5,
      }}
      whileHover={earned ? { scale: 1.02 } : {}}
    >
      {/* Earned shimmer */}
      {earned && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 40%, ${badge.accentColor}08 50%, transparent 60%)`,
          }}
        />
      )}

      {/* Icon container */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative"
        style={earned ? {
          color: badge.accentColor,
          background: badge.accentColor + '15',
          boxShadow: `0 0 12px ${badge.accentColor}20`,
        } : {
          color: 'rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {badge.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold leading-tight"
          style={{ color: earned ? badge.accentColor : 'rgba(255,255,255,0.25)' }}>
          {badge.name}
        </p>
        <p className="text-[9px] mt-0.5 leading-tight"
          style={{ color: earned ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)' }}>
          {badge.description}
        </p>
      </div>

      {/* Status indicator */}
      {earned ? (
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: badge.accentColor + '20' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={badge.accentColor} strokeWidth="3" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-700 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      )}
    </motion.div>
  )
}

function ActivityHeatmap({ tradeDates, frozenDates }: { tradeDates: string[]; frozenDates: string[] }) {
  const cells = useMemo(() => generateHeatmap(tradeDates, frozenDates), [tradeDates, frozenDates])
  const monthLabels = useMemo(() => getMonthLabels(cells), [cells])

  const DAY_LABELS = ['M', '', 'W', '', 'F', '', '']

  const weeks: HeatmapCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  const getCellColor = (cell: HeatmapCell): string => {
    if (cell.isFuture || cell.isWeekend) return 'transparent'
    if (cell.hasActivity) return 'rgba(99,102,241,0.8)'
    if (cell.isFrozen) return 'rgba(6,182,212,0.5)'
    return 'rgba(255,255,255,0.04)'
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Month labels */}
      <div className="flex gap-[3px] pl-[22px]">
        {weeks.map((_, wi) => {
          const label = monthLabels.find(l => l.col === wi)
          return (
            <div key={wi} className="flex-1 text-[8px] text-gray-600 font-medium" style={{ minWidth: 12, maxWidth: 12 }}>
              {label?.label ?? ''}
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-1.5 items-start">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px]">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[12px] text-[8px] text-gray-600 leading-none flex items-center justify-end pr-1" style={{ width: 16 }}>
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
                  title={!cell.isWeekend && !cell.isFuture ? `${cell.date}${cell.hasActivity ? ' — Active' : cell.isFrozen ? ' — Freeze' : ''}` : undefined}
                  className="h-[12px] rounded-[3px] transition-all duration-200"
                  style={{
                    background: getCellColor(cell),
                    outline: cell.isToday && !cell.isWeekend ? `1.5px solid rgba(99,102,241,0.5)` : 'none',
                    outlineOffset: '0.5px',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-0.5">
        {[
          { color: 'rgba(99,102,241,0.8)', label: 'Active' },
          { color: 'rgba(6,182,212,0.5)', label: 'Freeze' },
          { color: 'rgba(255,255,255,0.04)', label: 'Inactive' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: item.color }} />
            <span className="text-[8px] text-gray-600 font-medium uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Freeze token visual ────────────────────────────────────────────────────────

function FreezeTokens({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border"
      style={{ background: 'rgba(6,182,212,0.03)', borderColor: 'rgba(6,182,212,0.1)' }}>
      <div className="flex items-center gap-2 flex-1">
        {Array.from({ length: 3 }).map((_, i) => {
          const active = i < count
          return (
            <motion.div
              key={i}
              className="relative w-10 h-10 rounded-xl border flex items-center justify-center"
              style={active ? {
                background: 'rgba(6,182,212,0.1)',
                borderColor: 'rgba(6,182,212,0.3)',
                color: '#06b6d4',
                boxShadow: '0 0 10px rgba(6,182,212,0.1)',
              } : {
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.08)',
              }}
              initial={false}
              animate={active ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '1.5'} className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </motion.div>
          )
        })}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums" style={{ color: count > 0 ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}>
          {count}<span className="text-gray-600 font-normal"> / 3</span>
        </p>
        <p className="text-[9px] text-gray-600 mt-0.5">available</p>
      </div>
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</h3>
      {right}
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
  isOpen, onClose, currentStreak, longestStreak, totalDays, thisWeek, thisMonth,
  totalTrades, streakFreezes, tradeDates, frozenDates, isStreakActiveToday,
}: StreakPanelProps) {
  const { progress, next } = getMilestones(currentStreak)

  const badgeStats: BadgeStats = {
    totalDays, totalTrades, longestStreak, usedFreezes: frozenDates.length > 0,
  }

  const earnedBadges = BADGES.filter(b => b.check(badgeStats))
  const lockedBadges = BADGES.filter(b => !b.check(badgeStats))

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
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl pointer-events-auto"
              style={{
                background: 'linear-gradient(180deg, var(--card-bg) 0%, var(--card-bg) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 60px rgba(99,102,241,0.04)',
              }}
            >
              {/* ─── Header ─── */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b"
                style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="2" className="w-4 h-4 animate-flame">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
                      Journaling Streak
                    </h2>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                      {earnedBadges.length} of {BADGES.length} badges earned
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 pb-6 flex flex-col gap-5 pt-5">

                {/* ─── Hero: Ring + Status ─── */}
                <div className="flex items-center gap-5 p-5 rounded-xl border relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%)',
                    borderColor: 'rgba(99,102,241,0.1)',
                  }}>
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(99,102,241,0.04) 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  <ProgressRing current={currentStreak} progress={progress} />

                  <div className="flex-1 min-w-0 relative">
                    {/* Status pill */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.12em] mb-3"
                      style={isStreakActiveToday ? {
                        background: 'rgba(16,185,129,0.1)',
                        color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.15)',
                      } : {
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.15)',
                      }}>
                      <div className="relative">
                        <div className={`w-1.5 h-1.5 rounded-full ${isStreakActiveToday ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {isStreakActiveToday && (
                          <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        )}
                      </div>
                      {isStreakActiveToday ? 'Active Today' : 'At Risk'}
                    </div>

                    {/* Milestone progress */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-gray-500 font-medium">
                          {currentStreak >= 100
                            ? 'All milestones reached'
                            : `${next - currentStreak} day${next - currentStreak !== 1 ? 's' : ''} to next milestone`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="relative w-full h-2 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8, #a78bfa)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                        />
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 w-1/3 animate-shimmer"
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                              animationDuration: '2s',
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-600 font-medium tabular-nums">
                          {currentStreak < 100 ? `${currentStreak} / ${next}` : '100+'}
                        </span>
                        <span className="text-gray-600">
                          Best: <span className="text-gray-400 font-semibold tabular-nums">{longestStreak}d</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Stats ─── */}
                <div className="grid grid-cols-4 gap-2">
                  <StatCard label="Total" value={totalDays} accent="#818cf8" />
                  <StatCard label="Week" value={thisWeek} accent={thisWeek >= 3 ? '#34d399' : undefined} />
                  <StatCard label="Month" value={thisMonth} />
                  <StatCard label="Trades" value={totalTrades} />
                </div>

                {/* ─── Heatmap ─── */}
                <div>
                  <SectionHeader title="Activity — Last 13 Weeks" />
                  <div className="p-4 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}>
                    <ActivityHeatmap tradeDates={tradeDates} frozenDates={frozenDates} />
                  </div>
                </div>

                {/* ─── Freeze Tokens ─── */}
                <div>
                  <SectionHeader
                    title="Freeze Tokens"
                    right={<span className="text-[9px] text-gray-600 font-medium">Every 5-day milestone</span>}
                  />
                  <FreezeTokens count={streakFreezes} />
                  <p className="text-[10px] text-gray-600 mt-2 leading-relaxed pl-0.5">
                    Tokens automatically protect your streak when a weekday is missed.
                  </p>
                </div>

                {/* ─── Badges ─── */}
                <div>
                  <SectionHeader
                    title="Badges"
                    right={
                      <span className="text-[10px] font-semibold tabular-nums px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>
                        {earnedBadges.length} / {BADGES.length}
                      </span>
                    }
                  />
                  <div className="flex flex-col gap-2">
                    {/* Earned first */}
                    {earnedBadges.map(badge => (
                      <BadgeCard key={badge.id} badge={badge} earned={true} />
                    ))}
                    {/* Then locked */}
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
  )
}
