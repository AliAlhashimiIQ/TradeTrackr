'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAccount } from '@/hooks/useAccount'
import { getAllTrades } from '@/lib/tradingApi'
import { Trade } from '@/lib/types'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import { CalendarSkeleton } from '@/components/ui/SkeletonLoader'
import EmptyState from '@/components/ui/EmptyState'
import { LAYOUT } from '@/lib/designSystem'

/* ─── helpers ─── */
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const fmtDecimal = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const toLocalDateString = (d: Date) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const groupTradesByDate = (trades: Trade[]) => {
  const grouped: Record<string, Trade[]> = {}
  trades.forEach((trade) => {
    const date = toLocalDateString(new Date(trade.entry_time))
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(trade)
  })
  return grouped
}

const calcPnL = (trades: Trade[]) =>
  trades.reduce((s, t) => s + t.profit_loss, 0)

const calcWinRate = (trades: Trade[]) => {
  if (!trades.length) return 0
  return Math.round(
    (trades.filter((t) => t.profit_loss > 0).length / trades.length) * 100
  )
}

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

const getFirstDayOfMonth = (y: number, m: number) => {
  return new Date(y, m, 1).getDay()
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const getWeekDates = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  const sunday = new Date(d)
  sunday.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(sunday)
    dd.setDate(sunday.getDate() + i)
    return dd
  })
}

/* ─── icons ─── */
const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
  </svg>
)
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
)
const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const TrendUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)
const TrendDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
)

/* ─────────────────── COMPONENT ─────────────────── */
export default function CalendarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { selectedAccountIds } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const monthName = currentDate.toLocaleString('default', { month: 'long' })
  const today = new Date()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setIsLoading(false); return }
      try {
        const all = await getAllTrades(user.id, {
          accountIds: selectedAccountIds === 'all' ? undefined : selectedAccountIds as string[]
        })
        setTrades(all)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [user, selectedAccountIds])

  const tradesByDate = useMemo(() => groupTradesByDate(trades), [trades])

  /* ─── computed month stats ─── */
  const monthStats = useMemo(() => {
    const monthTrades = trades.filter((t) => {
      const d = new Date(t.entry_time)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const pnl = calcPnL(monthTrades)
    const wins = monthTrades.filter((t) => t.profit_loss > 0).length
    const losses = monthTrades.filter((t) => t.profit_loss < 0).length
    const winRate = monthTrades.length
      ? Math.round((wins / monthTrades.length) * 100)
      : 0
    const tradingDays = new Set(
      monthTrades.map((t) => toLocalDateString(new Date(t.entry_time)))
    ).size
    const bestDay = Object.entries(tradesByDate).reduce(
      (best, [dateStr, dayTrades]) => {
        const [year, month, day] = dateStr.split('-').map(Number)
        if (month - 1 !== currentMonth || year !== currentYear) return best
        const dp = calcPnL(dayTrades)
        return dp > best ? dp : best
      },
      0
    )
    const worstDay = Object.entries(tradesByDate).reduce(
      (worst, [dateStr, dayTrades]) => {
        const [year, month, day] = dateStr.split('-').map(Number)
        if (month - 1 !== currentMonth || year !== currentYear) return worst
        const dp = calcPnL(dayTrades)
        return dp < worst ? dp : worst
      },
      0
    )
    return { pnl, wins, losses, winRate, tradingDays, totalTrades: monthTrades.length, bestDay, worstDay }
  }, [trades, currentMonth, currentYear, tradesByDate])

  const yearMonthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthTrades = trades.filter((t) => {
        const d = new Date(t.entry_time)
        return d.getMonth() === m && d.getFullYear() === currentYear
      })
      const pnl = calcPnL(monthTrades)
      const wins = monthTrades.filter((t) => t.profit_loss > 0).length
      const winRate = monthTrades.length
        ? Math.round((wins / monthTrades.length) * 100)
        : 0
      return {
        month: m,
        pnl,
        tradesCount: monthTrades.length,
        winRate,
      }
    })
  }, [trades, currentYear])

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return []
    const key = toLocalDateString(selectedDate)
    return tradesByDate[key] || []
  }, [selectedDate, tradesByDate])

  const selectedDayPnL = calcPnL(selectedDayTrades)

  /* ─── navigation ─── */
  const goToPrevious = () => {
    if (viewMode === 'Month') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    } else {
      const nd = new Date(currentDate)
      nd.setDate(currentDate.getDate() - 7)
      setCurrentDate(nd)
    }
    setSelectedDate(null)
  }
  const goToNext = () => {
    if (viewMode === 'Month') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    } else {
      const nd = new Date(currentDate)
      nd.setDate(currentDate.getDate() + 7)
      setCurrentDate(nd)
    }
    setSelectedDate(null)
  }
  const goToToday = () => {
    const t = new Date()
    setCurrentDate(t)
    setSelectedDate(t)
  }

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  const weekLabel = useMemo(() => {
    const s = weekDates[0]
    const e = weekDates[6]
    const sMonth = s.toLocaleString('default', { month: 'short' })
    const eMonth = e.toLocaleString('default', { month: 'short' })
    if (sMonth === eMonth) {
      return `${sMonth} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
    }
    return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}`
  }, [weekDates])

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <CalendarSkeleton />
      </AuthenticatedLayout>
    )
  }
  if (!user) return null

  /* ═══════════════════════ DAY CELL ═══════════════════════ */
  const DayCell = ({
    date,
    isOutsideMonth = false,
    large = false,
  }: {
    date: Date | null
    isOutsideMonth?: boolean
    large?: boolean
  }) => {
    if (!date) {
      return (
        <div
          className={`${large ? 'min-h-[140px]' : 'min-h-[110px]'}`}
          style={{
            background: 'var(--calendar-empty-bg)',
            borderRight: '1px solid var(--calendar-cell-border)',
            borderBottom: '1px solid var(--calendar-cell-border)',
          }}
        />
      )
    }

    const dateStr = toLocalDateString(date)
    const dayTrades = tradesByDate[dateStr] || []
    const pnl = calcPnL(dayTrades)
    const isToday = isSameDay(date, today)
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
    const hasTrades = dayTrades.length > 0
    const isProfit = pnl > 0
    const isLoss = pnl < 0

    // Liquid glass cell styles with P&L tinting using CSS variables
    const cellStyle: React.CSSProperties = isSelected
      ? {
          background: `linear-gradient(160deg, var(--calendar-selected-bg-grad-start) 0%, var(--calendar-selected-bg-grad-end) 100%), var(--calendar-selected-bg)`,
          borderRight: '1px solid var(--calendar-selected-border)',
          borderBottom: '1px solid var(--calendar-selected-border)',
          borderTop: '1px solid var(--calendar-selected-border-top)',
          borderLeft: '1px solid var(--calendar-selected-border-top)',
          boxShadow: 'var(--calendar-selected-shadow)',
        }
      : isProfit
        ? {
            background: `linear-gradient(160deg, var(--calendar-profit-bg-grad-start) 0%, var(--calendar-profit-bg-grad-end) 100%), var(--calendar-profit-bg)`,
            borderRight: '1px solid var(--calendar-profit-border)',
            borderBottom: '1px solid var(--calendar-profit-border)',
            borderTop: '1px solid var(--calendar-profit-border-top)',
            borderLeft: '1px solid var(--calendar-profit-border-top)',
            boxShadow: 'var(--calendar-profit-shadow)',
          }
        : isLoss
          ? {
              background: `linear-gradient(160deg, var(--calendar-loss-bg-grad-start) 0%, var(--calendar-loss-bg-grad-end) 100%), var(--calendar-loss-bg)`,
              borderRight: '1px solid var(--calendar-loss-border)',
              borderBottom: '1px solid var(--calendar-loss-border)',
              borderTop: '1px solid var(--calendar-loss-border-top)',
              borderLeft: '1px solid var(--calendar-loss-border-top)',
              boxShadow: 'var(--calendar-loss-shadow)',
            }
          : {
              background: `linear-gradient(160deg, var(--calendar-base-bg-grad-start) 0%, var(--calendar-base-bg-grad-end) 100%), var(--calendar-base-bg)`,
              borderRight: '1px solid var(--calendar-base-border)',
              borderBottom: '1px solid var(--calendar-base-border)',
              borderTop: '1px solid var(--calendar-base-border-top)',
              borderLeft: '1px solid var(--calendar-base-border-top)',
              boxShadow: 'var(--calendar-base-shadow)',
            }

    return (
      <motion.div
        onClick={() => setSelectedDate(date)}
        whileHover={{ scale: 1.015, y: -1 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          relative ${large ? 'min-h-[140px]' : 'min-h-[110px]'} p-2 md:p-3 cursor-pointer
          transition-all duration-300 group
          ${isOutsideMonth ? 'opacity-20 pointer-events-none' : ''}
        `}
        style={{
          ...cellStyle,
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Subtle top shimmer line for profit/loss cells */}
        {hasTrades && (
          <div
            className="absolute top-0 left-[10%] right-[10%] h-[1px]"
            style={{
              background: isProfit
                ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)'
                : isLoss
                  ? 'linear-gradient(90deg, transparent, rgba(239,68,68,0.45), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              opacity: 0.8,
            }}
          />
        )}

        {/* Day number */}
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs font-medium leading-none ${
              isToday
                ? 'text-white w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold'
                : isSelected
                  ? 'text-indigo-300'
                  : hasTrades
                    ? 'text-gray-300'
                    : 'text-gray-600'
            }`}
            style={
              isToday
                ? {
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 0 12px rgba(99,102,241,0.35), 0 2px 6px rgba(0,0,0,0.3)',
                  }
                : undefined
            }
          >
            {date.getDate()}
          </span>

          {hasTrades && (
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm ${
                isProfit
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5'
                  : isLoss
                    ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5'
                    : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              <span>{dayTrades.length}</span>
              <span className="text-[7px] opacity-60">{dayTrades.length === 1 ? 'Trade' : 'Trades'}</span>
            </span>
          )}
        </div>

        {/* Mobile P&L Text */}
        {hasTrades && (
          <div className="md:hidden flex justify-center mt-0.5 relative z-10 w-full overflow-hidden text-center">
            <span
              className={`text-[8.5px] font-black tracking-tight leading-none truncate ${
                isProfit ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-400'
              }`}
              style={{
                textShadow: isProfit
                  ? '0 0 8px rgba(16,185,129,0.3)'
                  : isLoss
                    ? '0 0 8px rgba(239,68,68,0.2)'
                    : 'none',
              }}
            >
              {pnl > 0 ? '+' : ''}{fmt(pnl)}
            </span>
          </div>
        )}

        {/* P&L (Desktop) */}
        {hasTrades && (
          <div className="hidden md:block mt-auto pt-1">
            <div
              className={`text-base font-bold tabular-nums tracking-tight leading-tight ${
                isProfit ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-400'
              }`}
              style={{
                textShadow: isProfit
                  ? '0 0 20px rgba(16,185,129,0.25)'
                  : isLoss
                    ? '0 0 20px rgba(239,68,68,0.2)'
                    : 'none',
              }}
            >
              {pnl > 0 ? '+' : ''}{fmt(pnl)}
            </div>

            {/* Win rate liquid progress bar */}
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3) inset',
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${calcWinRate(dayTrades)}%`,
                    background: isProfit
                      ? 'linear-gradient(90deg, rgba(16,185,129,0.5), rgba(16,185,129,0.8))'
                      : 'linear-gradient(90deg, rgba(239,68,68,0.4), rgba(239,68,68,0.7))',
                    boxShadow: isProfit
                      ? '0 0 6px rgba(16,185,129,0.3), 0 1px 0 rgba(255,255,255,0.15) inset'
                      : '0 0 6px rgba(239,68,68,0.25), 0 1px 0 rgba(255,255,255,0.12) inset',
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-500 tabular-nums font-medium">
                {calcWinRate(dayTrades)}%
              </span>
            </div>
          </div>
        )}

        {/* Bottom glow puddle for selected */}
        {isSelected && (
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[20px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)',
            }}
          />
        )}
      </motion.div>
    )
  }

  /* ═══════════════════ MONTH VIEW ═══════════════════ */
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7

    const cells = []
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstDay + 1
      const isValid = dayNum > 0 && dayNum <= daysInMonth
      const date = isValid ? new Date(currentYear, currentMonth, dayNum) : null
      cells.push(
        <DayCell key={i} date={date} isOutsideMonth={!isValid} />
      )
    }

    const weekRows: React.ReactNode[] = []
    const weeklyStatsList: Array<{ row: number; pnl: number; tradesCount: number; winRate: number }> = []

    for (let row = 0; row < cells.length / 7; row++) {
      const weekCells = cells.slice(row * 7, row * 7 + 7)
      let weekTrades: Trade[] = []
      for (let d = 0; d < 7; d++) {
        const dayNum = row * 7 + d - firstDay + 1
        if (dayNum > 0 && dayNum <= daysInMonth) {
          const date = new Date(currentYear, currentMonth, dayNum)
          const dateStr = toLocalDateString(date)
          const dayTrades = tradesByDate[dateStr] || []
          weekTrades = [...weekTrades, ...dayTrades]
        }
      }
      const weekPnl = calcPnL(weekTrades)
      const weekTradesCount = weekTrades.length
      const weekWinRate = calcWinRate(weekTrades)

      weeklyStatsList.push({
        row: row + 1,
        pnl: weekPnl,
        tradesCount: weekTradesCount,
        winRate: weekWinRate,
      })

      weekRows.push(
        <div key={row} className="grid grid-cols-7 border-b border-white/[0.04] last:border-b-0">
          {weekCells}
        </div>
      )
    }

    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
        {/* Calendar Grid (7 columns - Sun to Sat) */}
        <div className="flex-1 min-w-0">
          <div
            className="card rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
            }}
          >
            {/* Day headers */}
            <div
              className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.015]"
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="px-3 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            {weekRows}
          </div>
        </div>

        {/* Weekly Totals Sidebar (on the right for desktop, bottom for mobile) */}
        <div className="w-full lg:w-[240px] flex flex-col gap-4 shrink-0">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">
            Weekly Totals
          </div>
          <div className="flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-thin">
            {weeklyStatsList.map((stat) => (
              <div
                key={stat.row}
                className="card p-4 rounded-xl flex flex-col justify-center animate-fadeIn min-h-[110px] min-w-[160px] lg:min-w-0 flex-1"
                style={{
                  background: 'var(--calendar-weekly-card-bg)',
                  borderBottom: '1px solid var(--calendar-weekly-card-border)',
                  boxShadow: 'var(--calendar-weekly-card-shadow)',
                }}
              >
                <span className="text-[10px] text-indigo-400/90 uppercase tracking-[0.15em] font-extrabold mb-1">
                  Week {stat.row}
                </span>
                <span
                  className={`text-lg font-black tabular-nums tracking-tight ${
                    stat.pnl > 0 ? 'text-emerald-400' : stat.pnl < 0 ? 'text-red-400' : 'text-gray-500'
                  }`}
                  style={{
                    textShadow: stat.pnl > 0
                      ? '0 0 20px rgba(16,185,129,0.3)'
                      : stat.pnl < 0
                        ? '0 0 20px rgba(239,68,68,0.22)'
                        : 'none',
                  }}
                >
                  {stat.pnl !== 0 ? (stat.pnl > 0 ? '+' : '') + fmt(stat.pnl) : '—'}
                </span>
                {stat.tradesCount > 0 && (
                  <div className="mt-2 flex flex-col gap-1 items-start">
                    <span className="text-[10px] text-gray-400 font-semibold lowercase tracking-wide">
                      {stat.tradesCount} {stat.tradesCount === 1 ? 'trade' : 'trades'}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border ${
                      stat.winRate >= 50
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                        : 'bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.08)]'
                    }`}>
                      {stat.winRate}% WR
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════ WEEK VIEW ═══════════════════ */
  const renderWeekView = () => {
    const weekPnl = weekDates.reduce((s, d) => {
      const k = toLocalDateString(d)
      return s + calcPnL(tradesByDate[k] || [])
    }, 0)

    return (
      <div
        className="card rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        {/* Day headers */}
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="px-3 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {weekDates.map((date) => (
            <DayCell key={date.toISOString()} date={date} large />
          ))}
        </div>

        {/* Week total bar — liquid glass */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderTop: '1px solid var(--calendar-weekly-card-border)',
            background: 'var(--calendar-weekly-card-bg)',
            boxShadow: 'var(--calendar-weekly-card-shadow)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-[0.15em]">Week Total</span>
            {weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []).length > 0 && (
              <span className="text-xs text-gray-400 font-semibold">
                ({weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []).length} {weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []).length === 1 ? 'trade' : 'trades'} · {calcWinRate(weekDates.map(date => toLocalDateString(date)).flatMap(k => tradesByDate[k] || []))}% WR)
              </span>
            )}
          </div>
          <span
            className={`text-lg font-black tabular-nums ${
              weekPnl > 0 ? 'text-emerald-400' : weekPnl < 0 ? 'text-red-400' : 'text-gray-500'
            }`}
            style={{
              textShadow: weekPnl > 0
                ? '0 0 20px rgba(16,185,129,0.3)'
                : weekPnl < 0
                  ? '0 0 20px rgba(239,68,68,0.22)'
                  : 'none',
            }}
          >
            {weekPnl > 0 ? '+' : ''}{fmt(weekPnl)}
          </span>
        </div>
      </div>
    )
  }

  /* ═══════════════════ MAIN RENDER ═══════════════════ */
  return (
    <AuthenticatedLayout>
      <div className={`${LAYOUT.container} py-8`}>

        {/* ─── Header ─── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.06))',
                  border: '1px solid rgba(99,102,241,0.2)',
                  boxShadow: '0 0 16px rgba(99,102,241,0.1), 0 1px 0 rgba(255,255,255,0.08) inset',
                  color: '#818cf8',
                }}
              >
                <CalendarIcon />
              </div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                {viewMode === 'Month' ? `${monthName} ${currentYear}` : weekLabel}
              </h1>
            </div>
            <p className="text-sm text-gray-500 ml-[48px]">
              {monthStats.totalTrades} trades across {monthStats.tradingDays} trading days
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle — liquid glass pill */}
            <div
              className="flex rounded-xl p-0.5"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05) inset',
              }}
            >
              {(['Week', 'Month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                  style={
                    viewMode === mode
                      ? {
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          boxShadow: '0 0 10px rgba(99, 102, 241, 0.1)',
                        }
                      : {
                          color: 'var(--secondary)',
                          border: '1px solid transparent',
                        }
                  }
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Navigation — liquid glass buttons */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={goToPrevious}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  color: 'var(--secondary)',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 1px 0 rgba(255, 255, 255, 0.05) inset',
                }}
              >
                <ChevronLeft />
              </button>
              <button
                onClick={goToToday}
                className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
              >
                Today
              </button>
              <button
                onClick={goToNext}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  color: 'var(--secondary)',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 1px 0 rgba(255, 255, 255, 0.05) inset',
                }}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Month Stats Strip — stat-card liquid glass ─── */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            {
              label: 'Net P&L',
              value: (monthStats.pnl > 0 ? '+' : '') + fmt(monthStats.pnl),
              color: monthStats.pnl > 0 ? 'var(--success)' : monthStats.pnl < 0 ? 'var(--danger)' : 'var(--secondary)',
              icon: monthStats.pnl >= 0 ? <TrendUp /> : <TrendDown />,
              iconColor: monthStats.pnl >= 0 ? 'var(--success)' : 'var(--danger)',
              glow: monthStats.pnl > 0 ? 'rgba(16,185,129,0.06)' : monthStats.pnl < 0 ? 'rgba(239,68,68,0.05)' : undefined,
            },
            {
              label: 'Win Rate',
              value: `${monthStats.winRate}%`,
              color: monthStats.winRate >= 50 ? 'var(--success)' : 'var(--danger)',
              glow: monthStats.winRate >= 50 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
            },
            {
              label: 'Wins',
              value: monthStats.wins.toString(),
              color: 'var(--success)',
            },
            {
              label: 'Losses',
              value: monthStats.losses.toString(),
              color: 'var(--danger)',
            },
            {
              label: 'Total Trades',
              value: monthStats.totalTrades.toString(),
              color: 'var(--foreground)',
            },
            {
              label: 'Best Day',
              value: monthStats.bestDay > 0 ? '+' + fmt(monthStats.bestDay) : '—',
              color: 'var(--success)',
              glow: monthStats.bestDay > 0 ? 'rgba(16,185,129,0.06)' : undefined,
            },
            {
              label: 'Worst Day',
              value: monthStats.worstDay < 0 ? fmt(monthStats.worstDay) : '—',
              color: 'var(--danger)',
              glow: monthStats.worstDay < 0 ? 'rgba(239,68,68,0.05)' : undefined,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="stat-card px-4 py-3 flex flex-col gap-1 relative overflow-hidden"
            >
              {/* Faint colored puddle at bottom */}
              {stat.glow && (
                <div
                  className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[80%] h-[40px] pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse, ${stat.glow} 0%, transparent 70%)`,
                  }}
                />
              )}
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  {stat.label}
                </span>
                {stat.icon && (
                  <span style={{ color: stat.iconColor }}>{stat.icon}</span>
                )}
              </div>
              <span
                className="text-lg font-bold tabular-nums relative z-10"
                style={{
                  color: stat.color,
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Calendar Grid ─── */}
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

        {/* ─── Selected Day Detail ─── */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              className="mt-6"
            >
              <div className="card rounded-2xl overflow-hidden">
                {/* Day header */}
                <div
                  className="px-6 py-5 flex items-center justify-between"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'linear-gradient(160deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                  }}
                >
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? 's' : ''}
                      {selectedDayTrades.length > 0 && ` · ${calcWinRate(selectedDayTrades)}% win rate`}
                    </p>
                  </div>
                  {selectedDayTrades.length > 0 && (
                    <div
                      className="text-xl font-bold tabular-nums"
                      style={{
                        color: selectedDayPnL > 0 ? 'var(--success)' : selectedDayPnL < 0 ? 'var(--danger)' : 'var(--secondary)',
                      }}
                    >
                      {selectedDayPnL > 0 ? '+' : ''}{fmt(selectedDayPnL)}
                    </div>
                  )}
                </div>

                {/* Day stats */}
                {selectedDayTrades.length > 0 && (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-4"
                    style={{ borderBottom: '1px solid var(--card-border)' }}
                  >
                    {[
                      {
                        label: 'Win Rate',
                        value: `${calcWinRate(selectedDayTrades)}%`,
                        color: calcWinRate(selectedDayTrades) >= 50 ? 'var(--success)' : 'var(--danger)',
                      },
                      {
                        label: 'Avg Win',
                        value: (() => {
                          const wins = selectedDayTrades.filter((t) => t.profit_loss > 0)
                          return wins.length ? '+' + fmt(calcPnL(wins) / wins.length) : '—'
                        })(),
                        color: 'var(--success)',
                      },
                      {
                        label: 'Avg Loss',
                        value: (() => {
                          const losses = selectedDayTrades.filter((t) => t.profit_loss < 0)
                          return losses.length ? fmt(calcPnL(losses) / losses.length) : '—'
                        })(),
                        color: 'var(--danger)',
                      },
                      {
                        label: 'Largest',
                        value: (() => {
                          const max = selectedDayTrades.reduce(
                            (m, t) => (Math.abs(t.profit_loss) > Math.abs(m) ? t.profit_loss : m),
                            0
                          )
                          return (max > 0 ? '+' : '') + fmt(max)
                        })(),
                        color: 'var(--foreground)',
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="px-6 py-4 flex flex-col gap-1"
                        style={{
                          borderRight: i < 3 ? '1px solid var(--card-border)' : 'none',
                          background: 'rgba(255,255,255,0.01)',
                        }}
                      >
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                          {s.label}
                        </span>
                        <span
                          className="text-base font-bold tabular-nums"
                          style={{ color: s.color }}
                        >
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trades list */}
                {selectedDayTrades.length > 0 ? (
                  <div>
                    {selectedDayTrades.map((trade, idx) => {
                      const isLong = trade.type?.toLowerCase() === 'long'
                      const duration = Math.round(
                        (new Date(trade.exit_time).getTime() -
                          new Date(trade.entry_time).getTime()) /
                          (1000 * 60)
                      )
                      const durationStr =
                        duration >= 60
                          ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                          : `${duration}m`

                      return (
                        <div
                          key={trade.id}
                          className="px-6 py-4 flex items-center gap-4 transition-all duration-200 group"
                          style={{
                            borderBottom:
                              idx < selectedDayTrades.length - 1
                                ? '1px solid var(--card-border)'
                                : 'none',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {/* Side badge — liquid style */}
                          <span
                            className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: isLong
                                ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06))'
                                : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))',
                              border: isLong
                                ? '1px solid rgba(99,102,241,0.2)'
                                : '1px solid rgba(239,68,68,0.2)',
                              color: isLong ? '#818cf8' : '#f87171',
                              boxShadow: isLong
                                ? '0 0 8px rgba(99,102,241,0.1)'
                                : '0 0 8px rgba(239,68,68,0.08)',
                            }}
                          >
                            {trade.type}
                          </span>

                          {/* Symbol */}
                          <span className="text-sm font-semibold text-white min-w-[70px]">
                            {trade.symbol}
                          </span>

                          {/* Entry / Exit */}
                          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 min-w-[180px]">
                            <span>
                              <span className="text-gray-600 mr-1">Entry</span>
                              <span className="text-gray-300 tabular-nums">{fmtDecimal(trade.entry_price)}</span>
                            </span>
                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <span>
                              <span className="text-gray-600 mr-1">Exit</span>
                              <span className="text-gray-300 tabular-nums">{fmtDecimal(trade.exit_price)}</span>
                            </span>
                          </div>

                          {/* Time */}
                          <span className="hidden md:block text-xs text-gray-500 tabular-nums min-w-[60px]">
                            {new Date(trade.entry_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {/* Duration */}
                          <span className="hidden md:block text-xs text-gray-500 tabular-nums min-w-[50px]">
                            {durationStr}
                          </span>

                          <div className="flex-1" />

                          {/* P&L */}
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{
                              color: trade.profit_loss > 0 ? 'var(--success)' : trade.profit_loss < 0 ? 'var(--danger)' : 'var(--secondary)',
                            }}
                          >
                            {trade.profit_loss > 0 ? '+' : ''}
                            {fmtDecimal(trade.profit_loss)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-600 text-sm">No trades on this day</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ─── Month Quick Select ─── */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Quick Month Select
            </span>
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1">
              <button 
                onClick={() => {
                  setCurrentDate(new Date(currentYear - 1, currentMonth, 1))
                  setSelectedDate(null)
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                title="Previous Year"
              >
                <ChevronLeft />
              </button>
              <span className="text-xs font-bold text-white px-2.5 font-mono select-none">{currentYear}</span>
              <button 
                onClick={() => {
                  setCurrentDate(new Date(currentYear + 1, currentMonth, 1))
                  setSelectedDate(null)
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                title="Next Year"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {yearMonthlyStats.map((stat) => {
              const dateForMonth = new Date(currentYear, stat.month, 1)
              const name = dateForMonth.toLocaleString('default', { month: 'long' })
              const isActive = currentMonth === stat.month
              const isProfit = stat.pnl > 0
              const isLoss = stat.pnl < 0
              
              return (
                <button
                  key={stat.month}
                  onClick={() => {
                    setCurrentDate(new Date(currentYear, stat.month, 1))
                    setSelectedDate(null)
                  }}
                  className={`card p-4 rounded-xl flex flex-col justify-between text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group ${
                    isActive 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/[0.03]' 
                      : 'border-white/[0.06] hover:border-white/[0.12] bg-[#0a0b12]/40'
                  }`}
                  style={{
                    background: isActive ? 'linear-gradient(160deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.01) 100%)' : 'var(--calendar-weekly-card-bg)',
                    boxShadow: isActive ? '0 0 20px rgba(99,102,241,0.05), var(--calendar-weekly-card-shadow)' : 'var(--calendar-weekly-card-shadow)',
                  }}
                >
                  <div className="flex flex-col gap-1 w-full">
                    <span className={`text-[10px] uppercase tracking-[0.15em] font-extrabold transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {name}
                    </span>
                    <span
                      className={`text-lg font-black tabular-nums tracking-tight leading-none mt-1 ${
                        stat.tradesCount > 0 ? (isProfit ? 'text-emerald-400' : 'text-red-400') : 'text-gray-500'
                      }`}
                      style={{
                        textShadow: stat.tradesCount > 0
                          ? isProfit
                            ? '0 0 20px rgba(16,185,129,0.3)'
                            : isLoss
                              ? '0 0 20px rgba(239,68,68,0.22)'
                              : 'none'
                          : 'none',
                      }}
                    >
                      {stat.tradesCount > 0 ? (isProfit ? '+' : '') + fmt(stat.pnl) : '—'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5 items-start w-full">
                    <span className="text-[10px] text-gray-500 font-semibold lowercase tracking-wide">
                      {stat.tradesCount} {stat.tradesCount === 1 ? 'trade' : 'trades'}
                    </span>
                    {stat.tradesCount > 0 ? (
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border ${
                        stat.winRate >= 50
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                          : 'bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.08)]'
                      }`}>
                        {stat.winRate}% WR
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-white/[0.04] bg-white/[0.02] text-gray-600">
                        — WR
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
