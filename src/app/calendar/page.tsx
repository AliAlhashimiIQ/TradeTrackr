'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
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

const groupTradesByDate = (trades: Trade[]) => {
  const grouped: Record<string, Trade[]> = {}
  trades.forEach((trade) => {
    const date = new Date(trade.entry_time).toISOString().slice(0, 10)
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
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const getWeekDates = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
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
        const all = await getAllTrades(user.id)
        setTrades(all)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [user])

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
      monthTrades.map((t) => new Date(t.entry_time).toISOString().slice(0, 10))
    ).size
    const bestDay = Object.entries(tradesByDate).reduce(
      (best, [dateStr, dayTrades]) => {
        const d = new Date(dateStr)
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return best
        const dp = calcPnL(dayTrades)
        return dp > best ? dp : best
      },
      0
    )
    const worstDay = Object.entries(tradesByDate).reduce(
      (worst, [dateStr, dayTrades]) => {
        const d = new Date(dateStr)
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return worst
        const dp = calcPnL(dayTrades)
        return dp < worst ? dp : worst
      },
      0
    )
    return { pnl, wins, losses, winRate, tradingDays, totalTrades: monthTrades.length, bestDay, worstDay }
  }, [trades, currentMonth, currentYear, tradesByDate])

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return []
    const key = selectedDate.toISOString().slice(0, 10)
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
            background: 'rgba(10, 11, 18, 0.5)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        />
      )
    }

    const dateStr = date.toISOString().slice(0, 10)
    const dayTrades = tradesByDate[dateStr] || []
    const pnl = calcPnL(dayTrades)
    const isToday = isSameDay(date, today)
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
    const hasTrades = dayTrades.length > 0
    const isProfit = pnl > 0
    const isLoss = pnl < 0

    // Liquid glass cell styles with P&L tinting
    const cellStyle: React.CSSProperties = isSelected
      ? {
          background: `linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%), rgba(13,14,22,0.9)`,
          borderRight: '1px solid rgba(99,102,241,0.25)',
          borderBottom: '1px solid rgba(99,102,241,0.25)',
          borderTop: '1px solid rgba(99,102,241,0.15)',
          borderLeft: '1px solid rgba(99,102,241,0.15)',
          boxShadow: `
            0 1px 0 0 rgba(99,102,241,0.15) inset,
            0 0 24px rgba(99,102,241,0.08),
            0 8px 32px -8px rgba(0,0,0,0.4)
          `,
        }
      : isProfit
        ? {
            background: `linear-gradient(160deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%), rgba(13,14,22,0.85)`,
            borderRight: '1px solid rgba(16,185,129,0.12)',
            borderBottom: '1px solid rgba(16,185,129,0.12)',
            borderTop: '1px solid rgba(16,185,129,0.08)',
            borderLeft: '1px solid rgba(16,185,129,0.08)',
            boxShadow: `
              0 1px 0 0 rgba(16,185,129,0.08) inset,
              0 4px 16px -4px rgba(0,0,0,0.3)
            `,
          }
        : isLoss
          ? {
              background: `linear-gradient(160deg, rgba(239,68,68,0.07) 0%, rgba(239,68,68,0.02) 100%), rgba(13,14,22,0.85)`,
              borderRight: '1px solid rgba(239,68,68,0.12)',
              borderBottom: '1px solid rgba(239,68,68,0.12)',
              borderTop: '1px solid rgba(239,68,68,0.08)',
              borderLeft: '1px solid rgba(239,68,68,0.08)',
              boxShadow: `
                0 1px 0 0 rgba(239,68,68,0.07) inset,
                0 4px 16px -4px rgba(0,0,0,0.3)
              `,
            }
          : {
              background: `linear-gradient(160deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%), rgba(13,14,22,0.8)`,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              borderTop: '1px solid rgba(255,255,255,0.035)',
              borderLeft: '1px solid rgba(255,255,255,0.035)',
              boxShadow: `0 1px 0 0 rgba(255,255,255,0.04) inset`,
            }

    return (
      <motion.div
        onClick={() => setSelectedDate(date)}
        whileHover={{ scale: 1.015, y: -1 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          relative ${large ? 'min-h-[90px] md:min-h-[140px]' : 'min-h-[55px] md:min-h-[110px]'} p-2 md:p-3 cursor-pointer
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
                ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)'
                : isLoss
                  ? 'linear-gradient(90deg, transparent, rgba(239,68,68,0.35), transparent)'
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
              className="hidden md:inline-block text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {dayTrades.length}
            </span>
          )}
        </div>

        {/* Mobile Dot Indicator */}
        {hasTrades && (
          <div className="md:hidden flex justify-center mt-1 relative z-10">
            <span className={`w-1.5 h-1.5 rounded-full ${isProfit ? 'bg-emerald-400 animate-pulse' : isLoss ? 'bg-red-400' : 'bg-gray-400'}`} />
          </div>
        )}

        {/* P&L */}
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
    for (let row = 0; row < cells.length / 7; row++) {
      const weekCells = cells.slice(row * 7, row * 7 + 7)
      let weekPnl = 0
      for (let d = 0; d < 7; d++) {
        const dayNum = row * 7 + d - firstDay + 1
        if (dayNum > 0 && dayNum <= daysInMonth) {
          const date = new Date(currentYear, currentMonth, dayNum)
          const dateStr = date.toISOString().slice(0, 10)
          const dayTrades = tradesByDate[dateStr] || []
          weekPnl += calcPnL(dayTrades)
        }
      }

      weekRows.push(
        <div key={row} className="grid grid-cols-7 md:grid-cols-[repeat(7,1fr)_80px]">
          {weekCells}
          {/* Week total — liquid glass cell */}
          <div
            className="hidden md:flex min-h-[110px] flex-col items-center justify-center px-2"
            style={{
              background: `linear-gradient(160deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%), rgba(10,11,18,0.7)`,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
            }}
          >
            <span className="text-[9px] text-gray-600 uppercase tracking-[0.1em] font-semibold mb-1.5">Total</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                weekPnl > 0 ? 'text-emerald-400' : weekPnl < 0 ? 'text-red-400' : 'text-gray-600'
              }`}
              style={{
                textShadow: weekPnl > 0
                  ? '0 0 16px rgba(16,185,129,0.2)'
                  : weekPnl < 0
                    ? '0 0 16px rgba(239,68,68,0.18)'
                    : 'none',
              }}
            >
              {weekPnl !== 0 ? (weekPnl > 0 ? '+' : '') + fmt(weekPnl) : '—'}
            </span>
          </div>
        </div>
      )
    }

    return (
      <div
        className="card rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16`,
        }}
      >
        {/* Day headers */}
        <div
          className="grid grid-cols-7 md:grid-cols-[repeat(7,1fr)_80px]"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div
              key={d}
              className="px-3 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
              style={{
                background: 'rgba(255,255,255,0.015)',
              }}
            >
              {d}
            </div>
          ))}
          <div
            className="hidden md:block px-3 py-3 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
            style={{
              background: 'rgba(255,255,255,0.015)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            Week
          </div>
        </div>

        {weekRows}
      </div>
    )
  }

  /* ═══════════════════ WEEK VIEW ═══════════════════ */
  const renderWeekView = () => {
    const weekPnl = weekDates.reduce((s, d) => {
      const k = d.toISOString().slice(0, 10)
      return s + calcPnL(tradesByDate[k] || [])
    }, 0)

    return (
      <div
        className="card rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16`,
        }}
      >
        {/* Day headers */}
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
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
          className="flex items-center justify-between px-5 py-3.5"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: `linear-gradient(160deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%), rgba(10,11,18,0.6)`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
          }}
        >
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-[0.1em]">Week Total</span>
          <span
            className={`text-base font-bold tabular-nums ${
              weekPnl > 0 ? 'text-emerald-400' : weekPnl < 0 ? 'text-red-400' : 'text-gray-500'
            }`}
            style={{
              textShadow: weekPnl > 0
                ? '0 0 16px rgba(16,185,129,0.25)'
                : weekPnl < 0
                  ? '0 0 16px rgba(239,68,68,0.2)'
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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25) inset, 0 1px 0 rgba(255,255,255,0.04)',
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
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                          color: '#c7d2fe',
                          border: '1px solid rgba(99,102,241,0.25)',
                          boxShadow: '0 0 10px rgba(99,102,241,0.12), 0 1px 0 rgba(255,255,255,0.1) inset',
                        }
                      : {
                          color: '#6b7280',
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
                  color: '#9ca3af',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
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
                  color: '#9ca3af',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
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
              color: monthStats.pnl > 0 ? '#34d399' : monthStats.pnl < 0 ? '#f87171' : '#9ca3af',
              icon: monthStats.pnl >= 0 ? <TrendUp /> : <TrendDown />,
              iconColor: monthStats.pnl >= 0 ? '#10b981' : '#ef4444',
              glow: monthStats.pnl > 0 ? 'rgba(16,185,129,0.06)' : monthStats.pnl < 0 ? 'rgba(239,68,68,0.05)' : undefined,
            },
            {
              label: 'Win Rate',
              value: `${monthStats.winRate}%`,
              color: monthStats.winRate >= 50 ? '#34d399' : '#f87171',
              glow: monthStats.winRate >= 50 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
            },
            {
              label: 'Wins',
              value: monthStats.wins.toString(),
              color: '#34d399',
            },
            {
              label: 'Losses',
              value: monthStats.losses.toString(),
              color: '#f87171',
            },
            {
              label: 'Total Trades',
              value: monthStats.totalTrades.toString(),
              color: '#e5e7eb',
            },
            {
              label: 'Best Day',
              value: monthStats.bestDay > 0 ? '+' + fmt(monthStats.bestDay) : '—',
              color: '#34d399',
              glow: monthStats.bestDay > 0 ? 'rgba(16,185,129,0.06)' : undefined,
            },
            {
              label: 'Worst Day',
              value: monthStats.worstDay < 0 ? fmt(monthStats.worstDay) : '—',
              color: '#f87171',
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
                  textShadow: `0 0 20px ${stat.color}33`,
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
                        color: selectedDayPnL > 0 ? '#34d399' : selectedDayPnL < 0 ? '#f87171' : '#9ca3af',
                        textShadow: selectedDayPnL > 0
                          ? '0 0 24px rgba(16,185,129,0.3)'
                          : selectedDayPnL < 0
                            ? '0 0 24px rgba(239,68,68,0.25)'
                            : 'none',
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
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {[
                      {
                        label: 'Win Rate',
                        value: `${calcWinRate(selectedDayTrades)}%`,
                        color: calcWinRate(selectedDayTrades) >= 50 ? '#34d399' : '#f87171',
                      },
                      {
                        label: 'Avg Win',
                        value: (() => {
                          const wins = selectedDayTrades.filter((t) => t.profit_loss > 0)
                          return wins.length ? '+' + fmt(calcPnL(wins) / wins.length) : '—'
                        })(),
                        color: '#34d399',
                      },
                      {
                        label: 'Avg Loss',
                        value: (() => {
                          const losses = selectedDayTrades.filter((t) => t.profit_loss < 0)
                          return losses.length ? fmt(calcPnL(losses) / losses.length) : '—'
                        })(),
                        color: '#f87171',
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
                        color: '#e5e7eb',
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="px-6 py-4 flex flex-col gap-1"
                        style={{
                          borderRight: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
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
                                ? '1px solid rgba(255,255,255,0.04)'
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
                              color: trade.profit_loss > 0 ? '#34d399' : trade.profit_loss < 0 ? '#f87171' : '#6b7280',
                              textShadow: trade.profit_loss > 0
                                ? '0 0 16px rgba(16,185,129,0.2)'
                                : trade.profit_loss < 0
                                  ? '0 0 16px rgba(239,68,68,0.18)'
                                  : 'none',
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
      </div>
    </AuthenticatedLayout>
  )
}
