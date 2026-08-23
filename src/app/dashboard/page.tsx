'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import DateRangeSelector, { DateRange } from '@/components/dashboard/DateRangeSelector'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAuth } from '@/hooks/useAuth'
import { useAccount } from '@/hooks/useAccount'
import type { Trade } from '@/lib/types'
import { useStreak } from '@/hooks/useStreak'
import { calculateMaxDrawdown } from '@/lib/tradeMetrics'
import { detectStreaksAndBehaviors, analyzeTagPerformance } from '@/lib/ai/aiService'
import { isForexPair, formatPips } from '@/lib/forexUtils'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/SkeletonLoader'
import EmptyState from '@/components/ui/EmptyState'
import ChallengeDashboardWidget from '@/components/dashboard/ChallengeDashboardWidget'
import { PROP_FIRMS, computeChallengeStatus, ChallengeStatus } from '@/lib/propFirms'
import { supabase } from '@/lib/supabaseClient'
import { addTrade } from '@/lib/tradingApi'
import { useSettings } from '@/providers/SettingsProvider'
import { mutate } from 'swr'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import {
  TrendingUp, TrendingDown, Target, BarChart3, Zap, Activity,
  AlertTriangle, Flame, Shield, ArrowUpRight, BookOpen,
  ChevronRight, Eye, CalendarDays, Minus
} from 'lucide-react'

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtShort = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const toYMD = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay()

// ─── Domain helpers ───────────────────────────────────────────────────────────
function getStreak(trades: Trade[]): { type: 'win' | 'loss' | 'none'; count: number } {
  if (!trades.length) return { type: 'none', count: 0 }
  const sorted = [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
  const first = sorted[0].profit_loss >= 0 ? 'win' : 'loss'
  let count = 0
  for (const t of sorted) {
    const w = t.profit_loss >= 0 ? 'win' : 'loss'
    if (w === first) count++
    else break
  }
  return { type: first, count }
}

function getPsychScore(trades: Trade[]): number {
  if (!trades.length) return 100
  const withMistakes = trades.filter(t => t.mistakes && t.mistakes.length > 0).length
  return Math.round(((trades.length - withMistakes) / trades.length) * 100)
}

function getBestSession(trades: Trade[]): string {
  if (!trades.length) return 'N/A'
  const buckets: Record<string, { wins: number; total: number }> = {}
  trades.forEach(t => {
    const h = new Date(t.entry_time).getHours()
    const s = h < 8 ? 'Pre-Market' : h < 12 ? 'Morning' : h < 16 ? 'Afternoon' : 'Evening'
    if (!buckets[s]) buckets[s] = { wins: 0, total: 0 }
    buckets[s].total++
    if (t.profit_loss > 0) buckets[s].wins++
  })
  let best = '', bestWR = -1
  for (const [s, b] of Object.entries(buckets)) {
    if (b.total < 2) continue
    const wr = b.wins / b.total
    if (wr > bestWR) { bestWR = wr; best = `${s} (${(wr * 100).toFixed(0)}% WR)` }
  }
  return best || 'N/A'
}

// ─── Mini P&L Calendar Heatmap ───────────────────────────────────────────────
function MiniCalendarHeatmap({ trades }: { trades: Trade[] }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const dayMap = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {}
    trades.forEach(t => {
      const d = toYMD(new Date(t.entry_time))
      if (!map[d]) map[d] = { pnl: 0, count: 0 }
      map[d].pnl += t.profit_loss
      map[d].count++
    })
    return map
  }, [trades])

  const maxAbsPnL = useMemo(() => {
    const vals = Object.values(dayMap).map(v => Math.abs(v.pnl))
    return Math.max(...vals, 1)
  }, [dayMap])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const todayStr = toYMD(now)

  // Monthly summary
  const monthlyStats = useMemo(() => {
    let pnl = 0, tradeDays = 0, wins = 0, losses = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const day = dayMap[key]
      if (day) {
        pnl += day.pnl
        tradeDays++
        if (day.pnl > 0) wins++
        else losses++
      }
    }
    return { pnl, tradeDays, wins, losses }
  }, [dayMap, viewYear, viewMonth, daysInMonth])

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-black text-white uppercase tracking-wider">
            {MONTHS[viewMonth]} {viewYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors text-[11px]">‹</button>
          <button onClick={nextMonth} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors text-[11px]">›</button>
        </div>
      </div>

      {/* Monthly summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.03] rounded-xl px-2.5 py-1.5 text-center border border-white/[0.04]">
          <div className={`text-sm font-black font-mono ${monthlyStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {monthlyStats.pnl >= 0 ? '+' : ''}{fmtShort(monthlyStats.pnl)}
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide font-bold mt-0.5">Net P&L</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-2.5 py-1.5 text-center border border-white/[0.04]">
          <div className="text-sm font-black font-mono text-emerald-500">{monthlyStats.wins}</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide font-bold mt-0.5">Green Days</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-2.5 py-1.5 text-center border border-white/[0.04]">
          <div className="text-sm font-black font-mono text-rose-500">{monthlyStats.losses}</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide font-bold mt-0.5">Red Days</div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-black text-gray-600 uppercase py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="aspect-square" />
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const data = dayMap[key]
          const isToday = key === todayStr
          const intensity = data ? Math.min(0.9, Math.abs(data.pnl) / maxAbsPnL) : 0

          let bg = 'bg-white/[0.02]'
          let border = 'border-white/[0.04]'
          if (data && data.pnl > 0) {
            bg = `bg-emerald-500`
            border = 'border-emerald-500/30'
          } else if (data && data.pnl < 0) {
            bg = `bg-rose-500`
            border = 'border-rose-500/30'
          }

          return (
            <div
              key={key}
              title={data ? `${fmtShort(data.pnl)} · ${data.count} trade${data.count > 1 ? 's' : ''}` : undefined}
              className={`relative rounded-md border flex items-center justify-center cursor-default group ${border} ${isToday ? 'ring-1 ring-indigo-500/60' : ''}`}
              style={{
                aspectRatio: '1',
                backgroundColor: data
                  ? data.pnl > 0
                    ? `rgba(16,185,129,${0.15 + intensity * 0.55})`
                    : `rgba(244,63,94,${0.15 + intensity * 0.55})`
                  : 'rgba(255,255,255,0.02)'
              }}
            >
              <span className={`text-[9px] font-bold select-none ${
                data ? (data.pnl > 0 ? 'text-emerald-300' : 'text-rose-300') : 'text-gray-700'
              } ${isToday ? 'text-indigo-300' : ''}`}>
                {day}
              </span>
              {/* Tooltip */}
              {data && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="bg-[#0d0e16] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-[10px] font-mono whitespace-nowrap shadow-xl">
                    <div className={`font-black ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.pnl >= 0 ? '+' : ''}{fmtShort(data.pnl)}
                    </div>
                    <div className="text-gray-500">{data.count} trade{data.count > 1 ? 's' : ''}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[9px] text-gray-600 font-bold pt-0.5">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-rose-500/40" />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-white/[0.05]" />
          <span>No trade</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Profit</span>
          <div className="w-3 h-3 rounded bg-emerald-500/40" />
        </div>
      </div>
    </div>
  )
}

// ─── Equity chart lazy load ───────────────────────────────────────────────────
const EquityAreaChart = dynamic(() => import('@/components/dashboard/EquityAreaChart'), {
  ssr: false,
  loading: () => <div className="h-56 rounded-xl bg-white/[0.02] animate-pulse" />
})

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } }
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { accounts, selectedAccountIds } = useAccount()
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null)
  const { streak: journalStreak } = useStreak()
  const { streakFreezes, frozenDates } = useSettings()
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      const r = () => setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      window.addEventListener('resize', r)
      return () => window.removeEventListener('resize', r)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = window.sessionStorage.getItem('trigger_trade_logged_confetti')
    if (flag === 'true') {
      window.sessionStorage.removeItem('trigger_trade_logged_confetti')
      setShowConfetti(true)
      toast.success('Trade logged. Keep the discipline.')
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [])

  const handleLoadDemoTrades = async () => {
    if (!user?.id) return
    setIsDemoLoading(true)
    try {
      const demoTrades: Partial<Trade>[] = [
        { symbol: 'EURUSD', type: 'Long', entry_price: 1.0852, exit_price: 1.0894, lots: 1.5, quantity: 1.5, profit_loss: 630, entry_time: new Date(Date.now() - 4 * 864e5).toISOString(), exit_time: new Date(Date.now() - 4 * 864e5 + 45 * 6e4).toISOString(), tags: ['Breakout'], mistakes: [], pips: 42, emotional_state: 'confident' },
        { symbol: 'XAUUSD', type: 'Short', entry_price: 2320.5, exit_price: 2312, lots: 1, quantity: 1, profit_loss: 850, entry_time: new Date(Date.now() - 3 * 864e5).toISOString(), exit_time: new Date(Date.now() - 3 * 864e5 + 2 * 36e5).toISOString(), tags: ['Reversal'], mistakes: [], pips: 85, emotional_state: 'calm' },
        { symbol: 'GBPUSD', type: 'Long', entry_price: 1.2642, exit_price: 1.2612, lots: 2, quantity: 2, profit_loss: -600, entry_time: new Date(Date.now() - 2 * 864e5).toISOString(), exit_time: new Date(Date.now() - 2 * 864e5 + 30 * 6e4).toISOString(), tags: [], mistakes: ['FOMO Entry'], pips: -30, emotional_state: 'anxious' },
        { symbol: 'US100', type: 'Long', entry_price: 19520, exit_price: 19610, lots: 0.5, quantity: 0.5, profit_loss: 450, entry_time: new Date(Date.now() - 864e5).toISOString(), exit_time: new Date(Date.now() - 864e5 + 4 * 36e5).toISOString(), tags: ['Breakout'], mistakes: [], pips: 90, emotional_state: 'greed' },
        { symbol: 'BTCUSD', type: 'Short', entry_price: 66420, exit_price: 66550, lots: 0.1, quantity: 0.1, profit_loss: -13, entry_time: new Date(Date.now() - 6 * 36e5).toISOString(), exit_time: new Date(Date.now() - 5.5 * 36e5).toISOString(), tags: ['Scalp'], mistakes: [], pips: -130, emotional_state: 'neutral' },
      ]
      const targetAccountId = selectedAccountIds !== 'all' && (selectedAccountIds as string[]).length === 1
        ? (selectedAccountIds as string[])[0] : (accounts[0]?.id || null)
      for (const t of demoTrades) await addTrade({ ...t, user_id: user.id, account_id: targetAccountId } as Trade)
      const selKey = selectedAccountIds === 'all' ? 'all' : (selectedAccountIds as string[]).slice().sort().join(',')
      await mutate(['dashboard', user.id, dateRange, selKey])
      await mutate(['trades', user.id, 'all', selKey])
      toast.success('Demo trades injected!')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load demo trades')
    } finally {
      setIsDemoLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  const { trades, allTimeTrades, metrics, equityData, advancedMetrics, initialCapital, isLoading } = useDashboardData(user?.id, dateRange, selectedAccountIds)

  useEffect(() => {
    if (!isLoading && dateRange === '30d' && trades.length === 0 && allTimeTrades.length > 0) setDateRange('all')
  }, [isLoading, dateRange, trades.length, allTimeTrades.length])

  const equityChartData = useMemo(() =>
    equityData.labels.map((d, i) => ({ date: d, equity: equityData.values[i] })), [equityData])

  const sorted = useMemo(() =>
    [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()), [trades])
  const recent = useMemo(() => sorted.slice(0, 6), [sorted])
  const streak = useMemo(() => getStreak(trades), [trades])
  const psychScore = useMemo(() => getPsychScore(trades), [trades])
  const bestSession = useMemo(() => getBestSession(trades), [trades])
  const drawdown = useMemo(() => calculateMaxDrawdown(trades, initialCapital), [trades, initialCapital])
  const behaviors = useMemo(() => detectStreaksAndBehaviors(recent), [recent])
  const tagPerf = useMemo(() => analyzeTagPerformance(recent), [recent])
  const totalPips = useMemo(() => trades.filter(t => isForexPair(t.symbol)).reduce((s, t) => s + (t.pips || 0), 0), [trades])
  const forexCount = useMemo(() => trades.filter(t => isForexPair(t.symbol)).length, [trades])
  const todayTrades = useMemo(() => { const t = new Date().toISOString().split('T')[0]; return trades.filter(t2 => t2.entry_time.startsWith(t)) }, [trades])
  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + t.profit_loss, 0), [todayTrades])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('settings').eq('id', user.id).single()
      const s = (data?.settings as any) || {}
      if (!s.propFirmId || !s.propFirmTier) { setChallengeStatus(null); return }
      const firm = PROP_FIRMS.find(f => f.id === s.propFirmId)
      const tier = firm?.tiers.find(t => t.tierName === s.propFirmTier)
      if (!firm || !tier) { setChallengeStatus(null); return }
      const startBalance = Number(s.challengeStartBalance) || tier.accountSize
      const startDate = s.challengeStartDate || new Date().toISOString().slice(0, 10)
      const ct = (trades || []).filter(t => t.entry_time >= startDate)
      const totalPnL = ct.reduce((sum, t) => sum + t.profit_loss, 0)
      const currentBalance = startBalance + totalPnL
      const todayCP = ct.filter(t => t.entry_time.startsWith(new Date().toISOString().slice(0, 10))).reduce((sum, t) => sum + t.profit_loss, 0)
      setChallengeStatus(computeChallengeStatus(firm, tier, startDate, startBalance, currentBalance, todayCP))
    }
    load()
  }, [user?.id, trades])

  if (isLoading) return <AuthenticatedLayout><DashboardSkeleton /></AuthenticatedLayout>

  const noTrades = allTimeTrades.length === 0

  return (
    <AuthenticatedLayout>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="px-4 sm:px-6 lg:px-8 py-6 pb-14 space-y-5 max-w-[1600px] mx-auto"
      >

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Command Center</h1>
            </div>
            <p className="text-gray-500 text-xs font-medium mt-0.5 ml-10">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <DateRangeSelector selectedRange={dateRange} onChange={setDateRange} />
            <Link href="/trades/new" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98]">
              + Log Trade
            </Link>
          </div>
        </div>

        {/* ─── Alert Banners ─── */}
        <AnimatePresence>
          {challengeStatus?.isViolated && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-rose-300 text-xs"><strong>Challenge Violation — </strong>{challengeStatus.violationReason}</p>
            </motion.div>
          )}
          {frozenDates && frozenDates.length > 0 && !noTrades && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-blue-300/90 text-xs">
                <strong className="text-blue-300">Streak Frozen — </strong>
                Your journaling streak of <strong className="text-blue-300">{journalStreak.currentStreak} days</strong> is protected. (Last frozen: {frozenDates[frozenDates.length - 1]})
              </p>
            </motion.div>
          )}
          {challengeStatus && !challengeStatus.isViolated && challengeStatus.dailyDrawdownPercent >= 70 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-300/90 text-xs">Daily loss limit at <strong className="text-amber-300">{challengeStatus.dailyDrawdownPercent.toFixed(0)}%</strong> — consider stopping for the day.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {noTrades ? (
          <div className={`grid gap-5 ${challengeStatus ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
            <EmptyState variant="trades" title="No trades yet"
              subtitle="Log your first trade to unlock your Command Center — equity curves, streaks, psychology scores, and AI-powered insights."
              ctaLabel="Add Your First Trade" ctaHref="/trades/new"
              onManualLogClick={() => router.push('/trades/new')}
              onLoadDemoClick={handleLoadDemoTrades} isDemoLoading={isDemoLoading} />
            {challengeStatus && <ChallengeDashboardWidget status={challengeStatus} trades={trades} />}
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════
                TOP ROW: 5 STAT PILLS
            ═══════════════════════════════════════════════════════════════ */}
            <ErrorBoundary>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Net P&L',
                    value: fmt(metrics.total_pnl),
                    positive: metrics.total_pnl >= 0,
                    icon: metrics.total_pnl >= 0 ? TrendingUp : TrendingDown,
                    sub: `${metrics.avg_win > 0 ? fmt(metrics.avg_win) : '—'} avg win`,
                    extra: (
                      <div className="mt-3 pt-2.5 border-t border-white/[0.05] space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black text-gray-600 uppercase tracking-wider">
                          <span>Avg Win</span><span>Avg Loss</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden flex">
                          <div className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${(metrics.avg_win + Math.abs(metrics.avg_loss)) > 0 ? (metrics.avg_win / (metrics.avg_win + Math.abs(metrics.avg_loss))) * 100 : 50}%` }} />
                          <div className="h-full bg-rose-500"
                            style={{ width: `${(metrics.avg_win + Math.abs(metrics.avg_loss)) > 0 ? (Math.abs(metrics.avg_loss) / (metrics.avg_win + Math.abs(metrics.avg_loss))) * 100 : 50}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono font-bold">
                          <span className="text-emerald-500">{fmt(metrics.avg_win)}</span>
                          <span className="text-rose-500">-{fmt(Math.abs(metrics.avg_loss))}</span>
                        </div>
                      </div>
                    )
                  },
                  {
                    label: 'Win Rate',
                    value: `${(metrics.win_rate * 100).toFixed(1)}%`,
                    positive: metrics.win_rate >= 0.5,
                    icon: Target,
                    sub: `${metrics.winning_trades}W · ${metrics.losing_trades}L`,
                    extra: (
                      <div className="mt-3 pt-2.5 border-t border-white/[0.05]">
                        <div className="flex justify-center">
                          <svg className="w-[110px] h-[44px]" viewBox="0 0 100 50">
                            <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" strokeLinecap="round" />
                            <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none"
                              stroke={metrics.win_rate >= 0.5 ? '#10b981' : '#f43f5e'}
                              strokeWidth="9" strokeLinecap="round" strokeDasharray="110"
                              strokeDashoffset={110 - 110 * metrics.win_rate}
                              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-gray-600 px-1">
                          <span className="text-emerald-600">{metrics.winning_trades} W</span>
                          <span className="text-rose-600">{metrics.losing_trades} L</span>
                        </div>
                      </div>
                    )
                  },
                  {
                    label: 'Profit Factor',
                    value: advancedMetrics ? (advancedMetrics.profitFactor === Infinity ? '∞' : advancedMetrics.profitFactor.toFixed(2)) : '—',
                    positive: advancedMetrics ? advancedMetrics.profitFactor >= 1 : true,
                    icon: BarChart3,
                    sub: advancedMetrics && advancedMetrics.profitFactor >= 1.5 ? '· Strong edge' : '· Build edge',
                    extra: (() => {
                      const pf = advancedMetrics?.profitFactor ?? 0
                      const ratio = pf > 0 ? (pf / (pf + 1)) * 100 : 50
                      return (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center gap-3">
                          <span className="text-[9px] text-gray-600 leading-tight flex-1">Gross profit vs gross loss</span>
                          <svg className="w-9 h-9 shrink-0 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f43f5e" strokeWidth="5" />
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="5"
                              strokeDasharray={`${ratio} 100`} className="transition-all duration-500" />
                          </svg>
                        </div>
                      )
                    })()
                  },
                  {
                    label: 'Total Trades',
                    value: metrics.total_trades.toString(),
                    positive: true,
                    icon: BookOpen,
                    sub: `${trades.filter(t => t.type === 'Long').length}L · ${trades.filter(t => t.type === 'Short').length}S`,
                    extra: (() => {
                      const lc = trades.filter(t => t.type === 'Long').length
                      const sc = trades.filter(t => t.type === 'Short').length
                      const tot = lc + sc
                      const lp = tot > 0 ? (lc / tot) * 100 : 50
                      return (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.05] space-y-1.5">
                          <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-gray-600">
                            <span>Buy ({lc})</span><span>Sell ({sc})</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${lp}%` }} />
                            <div className="h-full bg-rose-500" style={{ width: `${100 - lp}%` }} />
                          </div>
                        </div>
                      )
                    })()
                  },
                  {
                    label: 'Avg R:R',
                    value: advancedMetrics ? advancedMetrics.riskRewardRatio.toFixed(2) : '—',
                    positive: advancedMetrics ? advancedMetrics.riskRewardRatio >= 1 : true,
                    icon: Zap,
                    sub: 'Target: 2.00:1',
                    extra: (() => {
                      const rr = advancedMetrics?.riskRewardRatio ?? 0
                      const fill = Math.min(100, Math.max(0, (rr / 2) * 100))
                      return (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.05] space-y-1.5">
                          <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                            <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${fill}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono font-bold">
                            <span className="text-violet-400">{rr.toFixed(2)}:1</span>
                            <span className="text-gray-600">2.00:1</span>
                          </div>
                        </div>
                      )
                    })()
                  }
                ].map((s, i) => {
                  const Icon = s.icon
                  const accent = s.positive ? '#10b981' : '#f43f5e'
                  return (
                    <motion.div key={i} variants={item}
                      className="relative rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4 overflow-hidden flex flex-col hover:border-white/[0.10] transition-all duration-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
                        <div className="p-1.5 rounded-lg" style={{ background: `${accent}14` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight" style={{ color: accent }}>{s.value}</div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{s.sub}</div>
                      {s.extra}
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse, ${accent}09 0%, transparent 70%)` }} />
                    </motion.div>
                  )
                })}
              </motion.div>
            </ErrorBoundary>

            {/* ═══════════════════════════════════════════════════════════════
                MAIN BENTO GRID: Equity Curve (left) + Calendar (right)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

              {/* Equity Curve */}
              <ErrorBoundary>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-white font-extrabold text-sm">Equity Curve</h2>
                      <p className="text-gray-500 text-[11px] mt-0.5">Account growth over time</p>
                    </div>
                    <div className={`text-base font-black font-mono ${metrics.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {metrics.total_pnl >= 0 ? '+' : ''}{fmt(metrics.total_pnl)}
                    </div>
                  </div>
                  <EquityAreaChart data={equityChartData} initialCapital={initialCapital} />
                </motion.div>
              </ErrorBoundary>

              {/* P&L Calendar Heatmap */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-5"
              >
                <MiniCalendarHeatmap trades={allTimeTrades} />
              </motion.div>
            </div>

            {/* Challenge widget (if active) */}
            {challengeStatus && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <ChallengeDashboardWidget status={challengeStatus} trades={trades} />
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                INTELLIGENCE ROW: 5 mini cards
            ═══════════════════════════════════════════════════════════════ */}
            <ErrorBoundary>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

                {/* Journal Streak */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2.5">Journal Streak</div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${journalStreak.currentStreak > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-gray-600'}`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-3xl font-black text-white font-mono">{journalStreak.currentStreak}</div>
                        <div className="text-[10px] text-gray-600">consecutive days</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>Best</span><span className="font-mono font-bold text-white">{journalStreak.longestStreak}d</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[{ n: 'Bronze', t: 3 }, { n: 'Silver', t: 5 }, { n: 'Gold', t: 10 }, { n: 'Master', t: 20 }].map(b => (
                        <span key={b.n} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wide ${journalStreak.currentStreak >= b.t ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-gray-700 border-white/[0.04] opacity-40'}`}>{b.n}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Trade Streak */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2.5">Trade Streak</div>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${streak.type === 'win' ? 'bg-emerald-500/15 text-emerald-400' : streak.type === 'loss' ? 'bg-rose-500/15 text-rose-400' : 'bg-white/[0.04] text-gray-600'}`}>
                      {streak.count}
                    </div>
                    <div>
                      <div className={`text-sm font-extrabold ${streak.type === 'win' ? 'text-emerald-400' : streak.type === 'loss' ? 'text-rose-400' : 'text-gray-500'}`}>
                        {streak.type === 'win' ? 'Win Streak' : streak.type === 'loss' ? 'Loss Streak' : 'No Streak'}
                      </div>
                      <div className="text-[10px] text-gray-600">Consecutive {streak.type === 'none' ? 'trades' : streak.type + 's'}</div>
                    </div>
                  </div>
                  {streak.type === 'loss' && streak.count >= 2 && (
                    <div className="mt-3 px-2.5 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      <p className="text-rose-400 text-[10px] font-medium">Reduce size or step away.</p>
                    </div>
                  )}
                </motion.div>

                {/* Max Drawdown */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2.5">Max Drawdown</div>
                  <div className={`text-3xl font-black font-mono ${drawdown.percentage > 10 ? 'text-rose-400' : drawdown.percentage > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {drawdown.percentage.toFixed(1)}%
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                      <span>0%</span><span className="text-amber-500/50">10% limit</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${drawdown.percentage > 10 ? 'bg-rose-500' : drawdown.percentage > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, drawdown.percentage * 10)}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">{drawdown.amount > 0 ? `${fmt(drawdown.amount)} from peak` : 'No drawdown'}</div>
                  </div>
                </motion.div>

                {/* Psychology Score */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2.5">Psychology</div>
                  <div className={`text-3xl font-black font-mono ${psychScore >= 80 ? 'text-emerald-400' : psychScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {psychScore}%
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className={`h-full rounded-full ${psychScore >= 80 ? 'bg-emerald-500' : psychScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${psychScore}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {trades.filter(t => t.mistakes?.length).length}/{trades.length} trades with mistakes
                    </div>
                  </div>
                </motion.div>

                {/* Today's P&L */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2.5">Today's P&L</div>
                  <div className={`text-3xl font-black font-mono ${todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {todayPnL >= 0 ? '+' : ''}{fmt(todayPnL)}
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono mt-1">{todayTrades.length} trades today</div>
                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Best Session</div>
                    <div className="text-[11px] text-indigo-400 font-semibold">{bestSession}</div>
                  </div>
                </motion.div>
              </motion.div>
            </ErrorBoundary>

            {/* ═══════════════════════════════════════════════════════════════
                BOTTOM GRID: Recent Trades (left 60%) + Insights (right 40%)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

              {/* Recent Executions */}
              <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
                  <h2 className="text-white font-extrabold text-sm">Recent Executions</h2>
                  <Link href="/trades" className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {recent.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 text-xs">No trades in this period</div>
                  ) : recent.map(trade => {
                    const pos = trade.profit_loss >= 0
                    const isLong = trade.type === 'Long'
                    return (
                      <Link href={`/trades/${trade.id}`} key={trade.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${pos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {isLong ? 'B' : 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-extrabold text-white">{trade.symbol}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${isLong ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                              {isLong ? 'LONG' : 'SHORT'}
                            </span>
                            {trade.mistakes && trade.mistakes.length > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-900/20 text-rose-400 border-rose-900/30">
                                {trade.mistakes.length} err
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5 font-mono">
                            {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {isForexPair(trade.symbol) && trade.pips != null && (
                              <span className={`ml-1.5 ${trade.pips >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatPips(trade.pips)} pips</span>
                            )}
                          </div>
                        </div>
                        <div className={`text-sm font-black font-mono ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.profit_loss >= 0 ? '+' : ''}{fmt(trade.profit_loss)}
                        </div>
                        <ChevronRight className="w-3 h-3 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Right column: Insights + Quick Actions */}
              <div className="space-y-3">
                {/* Behavior Alert */}
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Behavior Alert</div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {behaviors.behaviors[0]?.message || 'No reactive behavior spikes detected.'}
                  </p>
                </div>

                {/* Setup Leak */}
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-3.5 h-3.5 text-rose-400" />
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Setup Leak</div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {tagPerf.worst && tagPerf.worst.count >= 3
                      ? `"${tagPerf.worst.tag}" — ${tagPerf.worst.winRate.toFixed(0)}% WR. Investigate this setup.`
                      : 'No significant setup leak detected yet.'}
                  </p>
                </div>

                {/* Win/Loss Ratios */}
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Edge Stats</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Avg Win', val: fmt(advancedMetrics?.averageWin || 0), color: 'text-emerald-400' },
                      { label: 'Avg Loss', val: fmt(advancedMetrics?.averageLoss || 0), color: 'text-rose-400' },
                      { label: 'Sharpe', val: (advancedMetrics?.sharpeRatio || 0).toFixed(2), color: 'text-blue-400' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className="text-[10px] text-gray-600 mb-0.5">{s.label}</div>
                        <div className={`text-xs font-black font-mono ${s.color}`}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forex Pips (conditional) */}
                {forexCount > 0 && (
                  <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total Pips · Forex</div>
                      <div className={`text-base font-black font-mono ${totalPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPips(totalPips)}
                      </div>
                    </div>
                    <Link href="/analytics" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                      Details <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-2">
                  <Link href="/trades/new"
                    className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl text-center transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99]">
                    + Log a Planned Trade
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/analytics"
                      className="py-2.5 bg-white/[0.04] border border-white/[0.07] text-white text-xs font-extrabold rounded-xl text-center hover:bg-white/[0.07] transition-all">
                      Analytics
                    </Link>
                    <Link href="/calendar"
                      className="py-2.5 bg-white/[0.04] border border-white/[0.07] text-gray-400 text-xs font-extrabold rounded-xl text-center hover:bg-white/[0.07] transition-all">
                      Calendar
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {showConfetti && (
        <Confetti width={windowDimensions.width} height={windowDimensions.height} recycle={false} numberOfPieces={200} />
      )}
    </AuthenticatedLayout>
  )
}
