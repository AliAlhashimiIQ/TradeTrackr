'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import DateRangeSelector, { DateRange } from '@/components/dashboard/DateRangeSelector'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAuth } from '@/hooks/useAuth'
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
import MiniSparkline from '@/components/ui/MiniSparkline'
import { addTrade } from '@/lib/tradingApi'
import { useSettings } from '@/providers/SettingsProvider'
import { mutate } from 'swr'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

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

function getPsychologyScore(trades: Trade[]): number {
  if (!trades.length) return 100
  const withMistakes = trades.filter(t => t.mistakes && t.mistakes.length > 0).length
  return Math.round(((trades.length - withMistakes) / trades.length) * 100)
}

function getBestSession(trades: Trade[]): string {
  if (!trades.length) return 'N/A'
  const buckets: Record<string, { wins: number; total: number }> = {}
  trades.forEach(t => {
    const h = new Date(t.entry_time).getHours()
    let session = h < 8 ? 'Pre-Market' : h < 12 ? 'Morning' : h < 16 ? 'Afternoon' : 'Evening'
    if (!buckets[session]) buckets[session] = { wins: 0, total: 0 }
    buckets[session].total++
    if (t.profit_loss > 0) buckets[session].wins++
  })
  let best = '', bestWR = -1
  for (const [s, b] of Object.entries(buckets)) {
    if (b.total < 2) continue
    const wr = b.wins / b.total
    if (wr > bestWR) { bestWR = wr; best = `${s} (${(wr * 100).toFixed(0)}% WR)` }
  }
  return best || 'N/A'
}

const EquityAreaChart = dynamic(() => import('@/components/dashboard/EquityAreaChart'), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center text-gray-500/50 text-sm">Loading chart...</div>
})

const card = 'card rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0e16]'

// Stagger animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 }
  }
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

export default function Dashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
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
      const handleResize = () => {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleLoadDemoTrades = async () => {
    if (!user?.id) return;
    setIsDemoLoading(true);
    try {
      const demoTrades: Partial<Trade>[] = [
        {
          symbol: 'EURUSD',
          type: 'Long',
          entry_price: 1.08520,
          exit_price: 1.08940,
          lots: 1.5,
          quantity: 1.5,
          profit_loss: 630.00,
          entry_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          notes: 'Took trade at VWAP support. Exit near resistance. Good discipline.',
          tags: ['Breakout', 'Trend'],
          mistakes: [],
          pips: 42.0,
          emotional_state: 'confident'
        },
        {
          symbol: 'XAUUSD',
          type: 'Short',
          entry_price: 2320.50,
          exit_price: 2312.00,
          lots: 1.0,
          quantity: 1.0,
          profit_loss: 850.00,
          entry_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          notes: 'Short at double top on Gold. Quick 85 pips scalp.',
          tags: ['Reversal', 'Sniper Entry'],
          mistakes: [],
          pips: 85.0,
          emotional_state: 'calm'
        },
        {
          symbol: 'GBPUSD',
          type: 'Long',
          entry_price: 1.26420,
          exit_price: 1.26120,
          lots: 2.0,
          quantity: 2.0,
          profit_loss: -600.00,
          entry_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          notes: 'Tried to catch falling knife. Did not wait for confirmation.',
          tags: [],
          mistakes: ['FOMO Entry', 'Late Entry'],
          pips: -30.0,
          emotional_state: 'anxious'
        },
        {
          symbol: 'US100',
          type: 'Long',
          entry_price: 19520.00,
          exit_price: 19610.00,
          lots: 0.5,
          quantity: 0.5,
          profit_loss: 450.00,
          entry_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          notes: 'Rode the indices momentum after CPI release.',
          tags: ['Breakout', 'News'],
          mistakes: [],
          pips: 90.0,
          emotional_state: 'greed'
        },
        {
          symbol: 'BTCUSD',
          type: 'Short',
          entry_price: 66420.00,
          exit_price: 66550.00,
          lots: 0.1,
          quantity: 0.1,
          profit_loss: -13.00,
          entry_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
          notes: 'Tiny scalp attempt on Bitcoin. Stopped out quickly.',
          tags: ['Scalp'],
          mistakes: [],
          pips: -130.0,
          emotional_state: 'neutral'
        }
      ];

      for (const t of demoTrades) {
        await addTrade({ ...t, user_id: user.id } as Trade);
      }
      
      await mutate(['dashboard', user.id, dateRange])
      await mutate(['trades', user.id, 'all'])
      
      toast.success('Demo trades injected successfully!');
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



  const { trades, metrics, equityData, advancedMetrics, initialCapital, isLoading } = useDashboardData(user?.id, dateRange)

  const equityChartData = useMemo(() =>
    equityData.labels.map((d, i) => ({ date: d, equity: equityData.values[i] })),
    [equityData]
  )

  const sorted = useMemo(() =>
    [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()),
    [trades]
  )
  const recent = useMemo(() => sorted.slice(0, 8), [sorted])
  const streak = useMemo(() => getStreak(trades), [trades])
  const psychScore = useMemo(() => getPsychologyScore(trades), [trades])
  const bestSession = useMemo(() => getBestSession(trades), [trades])
  const drawdown = useMemo(() => calculateMaxDrawdown(trades, initialCapital), [trades, initialCapital])
  const behaviors = useMemo(() => detectStreaksAndBehaviors(recent), [recent])
  const tagPerf = useMemo(() => analyzeTagPerformance(recent), [recent])
  const totalPips = useMemo(() => trades.filter(t => isForexPair(t.symbol)).reduce((s, t) => s + (t.pips || 0), 0), [trades])
  const forexCount = useMemo(() => trades.filter(t => isForexPair(t.symbol)).length, [trades])

  // Generate sparkline data series from equity curve for stat pills
  const sparklineData = useMemo(() => {
    if (!equityData.values.length) return { equity: [], winRate: [], pf: [] }
    const equity = equityData.values
    // Build a running win-rate sparkline (last N trades)
    const winRateSeries: number[] = []
    const pfSeries: number[] = []
    const window = Math.min(10, sorted.length)
    for (let i = 0; i < Math.min(20, sorted.length); i++) {
      const slice = sorted.slice(i, i + window)
      const wins = slice.filter(t => t.profit_loss > 0).length
      winRateSeries.push(wins / (slice.length || 1) * 100)
      const grossWin = slice.filter(t => t.profit_loss > 0).reduce((s, t) => s + t.profit_loss, 0)
      const grossLoss = Math.abs(slice.filter(t => t.profit_loss < 0).reduce((s, t) => s + t.profit_loss, 0))
      pfSeries.push(grossLoss ? grossWin / grossLoss : grossWin > 0 ? 2 : 0)
    }
    return { equity: equity.slice(-20), winRate: winRateSeries.reverse(), pf: pfSeries.reverse() }
  }, [equityData.values, sorted])

  const todayTrades = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return trades.filter(t => t.entry_time.startsWith(today))
  }, [trades])
  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + t.profit_loss, 0), [todayTrades])


  // Compute challenge status after trades are loaded
  useEffect(() => {
    const loadChallenge = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const s = (data?.settings as any) || {};
      if (!s.propFirmId || !s.propFirmTier) {
        setChallengeStatus(null);
        return;
      }
      const firm = PROP_FIRMS.find(f => f.id === s.propFirmId);
      const tier = firm?.tiers.find(t => t.tierName === s.propFirmTier);
      if (!firm || !tier) {
        setChallengeStatus(null);
        return;
      }
      const startBalance = Number(s.challengeStartBalance) || tier.accountSize;
      const startDate = s.challengeStartDate || new Date().toISOString().slice(0, 10);
      // All-time P&L since challenge start
      const challengeTrades = (trades || []).filter(t => t.entry_time >= startDate);
      const totalPnL = challengeTrades.reduce((sum, t) => sum + t.profit_loss, 0);
      const currentBalance = startBalance + totalPnL;
      const todayChallengePnL = challengeTrades
        .filter(t => t.entry_time.startsWith(new Date().toISOString().slice(0, 10)))
        .reduce((sum, t) => sum + t.profit_loss, 0);
      const status = computeChallengeStatus(firm, tier, startDate, startBalance, currentBalance, todayChallengePnL);
      setChallengeStatus(status);
    };
    loadChallenge();
  }, [user, trades]);

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <DashboardSkeleton />
      </AuthenticatedLayout>
    )
  }

  const noTrades = trades.length === 0;
  
  return (
    <AuthenticatedLayout>
      <motion.div 
        initial={{ opacity: 0, y: 4 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="px-4 sm:px-6 lg:px-8 space-y-6 pb-12"
      >

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector selectedRange={dateRange} onChange={setDateRange} />
            <Link href="/trades/new"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all">
              + Log Trade
            </Link>
          </div>
        </div>

        {/* ── Violation Alert Banner (4.4) ── */}
        {challengeStatus?.isViolated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-3 bg-red-500/15 border border-red-500/40 rounded-xl"
          >
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="text-red-300 font-bold text-sm">Challenge Violation — </span>
              <span className="text-red-300 text-sm">{challengeStatus.violationReason}</span>
            </div>
          </motion.div>
        )}

        {/* ── Streak Frozen Banner ── */}
        {frozenDates && frozenDates.length > 0 && !noTrades && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl"
          >
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18m-3-6L6 18M6 6l12 12" />
            </svg>
            <div className="flex-1">
              <span className="text-blue-300 font-bold text-sm">Streak Frozen — </span>
              <span className="text-blue-300 text-sm">
                Your journaling streak of <strong>{journalStreak.currentStreak} days</strong> is frozen and protected! (Last frozen: {frozenDates[frozenDates.length - 1]}).
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Daily Drawdown Warning (near limit) ── */}
        {challengeStatus && !challengeStatus.isViolated && challengeStatus.dailyDrawdownPercent >= 70 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl"
          >
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-300 text-sm font-medium">
              ⚠️ You are at <strong>{challengeStatus.dailyDrawdownPercent.toFixed(0)}%</strong> of your daily loss limit — consider stopping for the day.
            </span>
          </motion.div>
        )}

        {noTrades ? (
          <div className={`grid gap-6 ${challengeStatus ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
            <EmptyState
              variant="trades"
              title="No trades yet"
              subtitle="Log your first trade to unlock your Command Center — equity curves, streaks, psychology scores, and AI-powered insights."
              ctaLabel="Add Your First Trade"
              ctaHref="/trades/new"
              onManualLogClick={() => router.push('/trades/new')}
              onLoadDemoClick={handleLoadDemoTrades}
              isDemoLoading={isDemoLoading}
            />
            {challengeStatus && (
              <ChallengeDashboardWidget status={challengeStatus} trades={trades} />
            )}
          </div>
        ) : (
          <>
            {/* ── Stat Pills Row ── */}
            <ErrorBoundary>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  {
                    label: 'Net P&L',
                    value: fmt(metrics.total_pnl),
                    color: metrics.total_pnl >= 0 ? '#34d399' : '#f87171',
                    glow: metrics.total_pnl >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  },
                  {
                    label: 'Win Rate',
                    value: `${(metrics.win_rate * 100).toFixed(1)}%`,
                    color: metrics.win_rate >= 0.5 ? '#34d399' : '#f87171',
                    glow: metrics.win_rate >= 0.5 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  },
                  {
                    label: 'Profit Factor',
                    value: advancedMetrics ? (advancedMetrics.profitFactor === Infinity ? '∞' : advancedMetrics.profitFactor.toFixed(2)) : '—',
                    color: advancedMetrics && advancedMetrics.profitFactor >= 1 ? '#34d399' : '#f87171',
                    glow: advancedMetrics && advancedMetrics.profitFactor >= 1 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  },
                  {
                    label: 'Total Trades',
                    value: metrics.total_trades.toString(),
                    color: '#818cf8',
                    glow: 'rgba(99,102,241,0.05)',
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  },
                  {
                    label: 'Avg R:R',
                    value: advancedMetrics ? advancedMetrics.riskRewardRatio.toFixed(2) : '—',
                    color: '#a78bfa',
                    glow: 'rgba(139,92,246,0.05)',
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  }
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    variants={item}
                    className="stat-card group relative p-5 overflow-hidden hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{s.label}</span>
                        <div className="p-2 rounded-lg group-hover:scale-110 transition-transform duration-300" style={{ background: `${s.color}12`, color: `${s.color}99` }}>{s.icon}</div>
                      </div>
                      <div className="text-2xl font-bold tracking-tight relative z-10" style={{ color: s.color, textShadow: `0 0 20px ${s.color}33` }}>
                        {s.value}
                      </div>
                    </div>

                    {/* Inspiring Custom Visual Charts inside Dashboard Cards */}
                    {s.label === 'Net P&L' && (
                      <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                        <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                          <span>Avg Win</span>
                          <span>Avg Loss</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                          <div
                            style={{
                              width: `${(metrics.avg_win + Math.abs(metrics.avg_loss)) > 0 ? (metrics.avg_win / (metrics.avg_win + Math.abs(metrics.avg_loss))) * 100 : 50}%`,
                              background: 'linear-gradient(90deg, #10b981, #34d399)'
                            }}
                            className="h-full"
                          />
                          <div
                            style={{
                              width: `${(metrics.avg_win + Math.abs(metrics.avg_loss)) > 0 ? (Math.abs(metrics.avg_loss) / (metrics.avg_win + Math.abs(metrics.avg_loss))) * 100 : 50}%`,
                              background: 'linear-gradient(90deg, #f87171, #ef4444)'
                            }}
                            className="h-full"
                          />
                        </div>
                        <div className="flex justify-between text-xs font-semibold font-mono tabular-nums">
                          <span className="text-emerald-400">{fmt(metrics.avg_win)}</span>
                          <span className="text-red-400">-{fmt(Math.abs(metrics.avg_loss))}</span>
                        </div>
                      </div>
                    )}

                    {s.label === 'Win Rate' && (
                      <div className="mt-3 pt-2 border-t border-white/[0.04] relative z-10 space-y-1.5">
                        <div className="flex justify-center">
                          <svg className="w-[140px] h-[55px]" viewBox="0 0 100 50">
                            <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9.5" strokeLinecap="round" />
                            <path
                              d="M 10 45 A 35 35 0 0 1 90 45"
                              fill="none"
                              stroke="url(#winRateGradDash)"
                              strokeWidth="9.5"
                              strokeLinecap="round"
                              strokeDasharray="110"
                              strokeDashoffset={110 - (110 * metrics.win_rate * 100) / 100}
                              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                            />
                            <defs>
                              <linearGradient id="winRateGradDash" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="50%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400 font-semibold tracking-wide px-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
                            <span>{metrics.winning_trades} Wins</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400 block" />
                            <span>{metrics.losing_trades} Losses</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {s.label === 'Profit Factor' && (() => {
                      const pfVal = advancedMetrics?.profitFactor ?? 0;
                      const gpRatio = pfVal > 0 ? (pfVal / (pfVal + 1)) * 100 : 50;
                      return (
                        <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-3 relative z-10">
                          <div className="text-xs text-gray-400 leading-normal font-medium max-w-[65%]">
                            <span>Proportion of gross profit vs gross loss</span>
                          </div>
                          <svg className="w-12 h-12 shrink-0 transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="5.5" className="opacity-95" />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="5.5"
                              strokeDasharray={`${gpRatio} 100`}
                              className="transition-all duration-500"
                            />
                          </svg>
                        </div>
                      );
                    })()}

                    {s.label === 'Total Trades' && (() => {
                      const longCount = trades.filter(t => t.type === 'Long').length;
                      const shortCount = trades.filter(t => t.type === 'Short').length;
                      const total = longCount + shortCount;
                      const longPct = total > 0 ? (longCount / total) * 100 : 50;
                      return (
                        <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                          <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                            <span>Buy ({longCount})</span>
                            <span>Sell ({shortCount})</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                            <div style={{ width: `${longPct}%` }} className="h-full bg-emerald-500" />
                            <div style={{ width: `${100 - longPct}%` }} className="h-full bg-red-500" />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 font-bold px-0.5">
                            <span>{total > 0 ? `${longPct.toFixed(0)}%` : '--'}</span>
                            <span>{total > 0 ? `${(100 - longPct).toFixed(0)}%` : '--'}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {s.label === 'Avg R:R' && (() => {
                      const rrVal = advancedMetrics?.riskRewardRatio ?? 0;
                      const targetRR = 2.0;
                      const fillPct = Math.min(100, Math.max(0, (rrVal / targetRR) * 100));
                      return (
                        <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                          <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                            <span>Current R:R</span>
                            <span>Target R:R</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                            <div 
                              style={{ 
                                width: `${fillPct}%`,
                                background: 'linear-gradient(90deg, #6366f1, #818cf8)'
                              }} 
                              className="h-full" 
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 font-bold px-0.5">
                            <span>{rrVal.toFixed(2)}:1</span>
                            <span>{targetRR.toFixed(2)}:1</span>
                          </div>
                        </div>
                      );
                    })()}

                    {s.glow && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-[50px] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${s.glow} 0%, transparent 70%)` }} />}
                  </motion.div>
                ))}
              </motion.div>
            </ErrorBoundary>

            {/* ── Equity Curve + Challenge Widget ── */}
            <ErrorBoundary>
              <div className={`grid gap-4 ${challengeStatus ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-white font-semibold">Equity Curve</h2>
                      <p className="text-gray-500 text-xs mt-0.5">Account growth over time</p>
                    </div>
                    <div className={`text-lg font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {metrics.total_pnl >= 0 ? '+' : ''}{fmt(metrics.total_pnl)}
                    </div>
                  </div>
                  <EquityAreaChart data={equityChartData} initialCapital={initialCapital} />
                </motion.div>
                {challengeStatus && <ChallengeDashboardWidget status={challengeStatus} trades={trades} />}
              </div>
            </ErrorBoundary>

            {/* ── 4 Intelligence Cards ── */}
            <ErrorBoundary>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Journaling Streak Card */}
                <motion.div variants={item} className={`${card} p-5 flex flex-col justify-between`}>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Journaling Streak</div>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${journalStreak.currentStreak > 0 ? 'bg-amber-500/15' : 'bg-white/[0.04]'}`}>
                        {journalStreak.currentStreak > 0 ? (
                          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-3xl font-black text-white font-mono">
                          {journalStreak.currentStreak}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">Consecutive active days</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-between text-xs text-gray-500">
                    <span>Longest Streak:</span>
                    <span className="font-semibold text-white font-mono">{journalStreak.longestStreak} days</span>
                  </div>
                </motion.div>

                {/* Streak Card */}
                <motion.div variants={item} className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Current Streak</div>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black
                    ${streak.type === 'win' ? 'bg-emerald-500/15 text-emerald-400' : streak.type === 'loss' ? 'bg-red-500/15 text-red-400' : 'bg-gray-800 text-gray-500'}`}>
                    {streak.count}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${streak.type === 'win' ? 'text-emerald-400' : streak.type === 'loss' ? 'text-red-400' : 'text-gray-500'}`}>
                      {streak.type === 'win' ? 'Win Streak' : streak.type === 'loss' ? 'Loss Streak' : 'No Streak'}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Consecutive {streak.type === 'win' ? 'wins' : streak.type === 'loss' ? 'losses' : 'trades'}</div>
                  </div>
                </div>
                {streak.type === 'loss' && streak.count >= 2 && (
                  <div className="mt-3 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-red-400 text-xs">Consider taking a break or reducing size.</p>
                  </div>
                )}
              </motion.div>

              {/* Drawdown Card */}
              <motion.div variants={item} className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Max Drawdown</div>
                <div className={`text-3xl font-black ${drawdown.percentage > 10 ? 'text-red-400' : drawdown.percentage > 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {drawdown.percentage.toFixed(1)}%
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>0%</span><span className="text-yellow-500/70">10% limit</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${drawdown.percentage > 10 ? 'bg-red-500' : drawdown.percentage > 5 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, drawdown.percentage * 10)}%` }} />
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">{drawdown.amount > 0 ? `${fmt(drawdown.amount)} from peak` : 'No drawdown'}</div>
              </motion.div>

              {/* Psychology Card */}
              <motion.div variants={item} className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Psychology Score</div>
                <div className={`text-3xl font-black ${psychScore >= 80 ? 'text-emerald-400' : psychScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {psychScore}%
                </div>
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${psychScore >= 80 ? 'bg-emerald-500' : psychScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${psychScore}%` }} />
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {trades.filter(t => t.mistakes?.length).length} of {trades.length} trades had mistakes
                </div>
              </motion.div>

              {/* Best Session / Today Card */}
              <motion.div variants={item} className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Today's P&L</div>
                <div className={`text-3xl font-black ${todayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {todayPnL >= 0 ? '+' : ''}{fmt(todayPnL)}
                </div>
                <div className="mt-2 text-xs text-gray-500">{todayTrades.length} trades today</div>
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Best Session</div>
                  <div className="text-xs text-indigo-400 font-medium">{bestSession}</div>
                </div>
              </motion.div>
              </motion.div>
            </ErrorBoundary>

            {/* ── Forex Pips (if applicable) ── */}
            {forexCount > 0 && (
              <div className={`${card} p-4 flex items-center gap-6`}>
                <div className="p-2.5 rounded-xl bg-indigo-500/10">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Pips (Forex)</div>
                  <div className={`text-xl font-bold ${totalPips >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPips(totalPips)}
                  </div>
                </div>
                <div className="text-gray-600 text-sm ml-2">{forexCount} forex trades tracked</div>
                <Link href="/analytics" className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  View full breakdown →
                </Link>
              </div>
            )}

            {/* ── Recent Trades ── */}
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
                <h2 className="text-white font-semibold">Recent Trades</h2>
                <Link href="/trades" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View all →</Link>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {recent.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">No trades in this period</div>
                ) : recent.map((trade) => (
                  <div key={trade.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${trade.profit_loss >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {trade.type === 'Long' ? 'B' : 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{trade.symbol}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {trade.type === 'Long' ? 'BUY' : 'SELL'}
                        </span>
                        {trade.mistakes && trade.mistakes.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-900/30 text-red-400 border border-red-900/40">
                            {trade.mistakes.length} mistake{trade.mistakes.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isForexPair(trade.symbol) && trade.pips !== undefined && trade.pips !== null && (
                          <span className={`ml-2 ${trade.pips >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatPips(trade.pips)} pips
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${trade.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.profit_loss >= 0 ? '+' : ''}{fmt(trade.profit_loss)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Insights Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Top Behavior Alert</div>
                <div className="text-sm text-white">
                  {behaviors.behaviors[0]?.message || 'No reactive behavior spikes detected.'}
                </div>
              </div>
              <div className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Setup Leak</div>
                <div className="text-sm text-white">
                  {tagPerf.worst && tagPerf.worst.count >= 3
                    ? `"${tagPerf.worst.tag}" has a ${tagPerf.worst.winRate.toFixed(0)}% win rate — investigate this setup.`
                    : 'No significant setup leak detected yet.'}
                </div>
              </div>
              <div className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Avg Win vs Avg Loss</div>
                <div className="flex gap-4 mt-1">
                  <div>
                    <div className="text-xs text-gray-600">Avg Win</div>
                    <div className="text-sm font-bold text-emerald-400">{fmt(advancedMetrics?.averageWin || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Avg Loss</div>
                    <div className="text-sm font-bold text-red-400">{fmt(advancedMetrics?.averageLoss || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Sharpe</div>
                    <div className="text-sm font-bold text-blue-400">{(advancedMetrics?.sharpeRatio || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Action Footer ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/trades/new"
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-xl text-center hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg shadow-indigo-500/20">
                Log a Planned Trade
              </Link>
              <Link href="/analytics"
                className="flex-1 py-3 bg-white/[0.05] border border-white/[0.08] text-white text-sm font-bold rounded-xl text-center hover:bg-white/[0.08] transition-all">
                View Full Analytics
              </Link>
              <Link href="/trades"
                className="flex-1 py-3 bg-white/[0.05] border border-white/[0.08] text-gray-400 text-sm font-bold rounded-xl text-center hover:bg-white/[0.08] transition-all">
                Review All Trades
              </Link>
            </div>
          </>
        )}
      </motion.div>
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
    </AuthenticatedLayout>
  )
}
