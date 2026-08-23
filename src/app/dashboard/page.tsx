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
import MiniSparkline from '@/components/ui/MiniSparkline'
import { addTrade } from '@/lib/tradingApi'
import { useSettings } from '@/providers/SettingsProvider'
import { mutate } from 'swr'
import toast from 'react-hot-toast'
import Confetti from 'react-confetti'
import {
  TrendingUp, TrendingDown, Target, BarChart3, Zap, Activity,
  AlertTriangle, Flame, Shield, ArrowUpRight, BookOpen,
  ChevronRight, Eye, Clock
} from 'lucide-react'

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
  loading: () => <div className="h-64 rounded-2xl bg-white/[0.02] animate-pulse" />
})

// Stagger animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } }
}

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
      const handleResize = () => {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const triggerConfetti = window.sessionStorage.getItem('trigger_trade_logged_confetti');
      if (triggerConfetti === 'true') {
        window.sessionStorage.removeItem('trigger_trade_logged_confetti');
        setShowConfetti(true);
        toast.success('Trade logged successfully. Keep maintaining your routine.', { duration: 5000 });
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
  }, []);

  const handleLoadDemoTrades = async () => {
    if (!user?.id) return;
    setIsDemoLoading(true);
    try {
      const demoTrades: Partial<Trade>[] = [
        {
          symbol: 'EURUSD', type: 'Long', entry_price: 1.08520, exit_price: 1.08940, lots: 1.5, quantity: 1.5,
          profit_loss: 630.00,
          entry_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          notes: 'Took trade at VWAP support. Exit near resistance. Good discipline.',
          tags: ['Breakout', 'Trend'], mistakes: [], pips: 42.0, emotional_state: 'confident'
        },
        {
          symbol: 'XAUUSD', type: 'Short', entry_price: 2320.50, exit_price: 2312.00, lots: 1.0, quantity: 1.0,
          profit_loss: 850.00,
          entry_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          notes: 'Short at double top on Gold. Quick 85 pips scalp.',
          tags: ['Reversal', 'Sniper Entry'], mistakes: [], pips: 85.0, emotional_state: 'calm'
        },
        {
          symbol: 'GBPUSD', type: 'Long', entry_price: 1.26420, exit_price: 1.26120, lots: 2.0, quantity: 2.0,
          profit_loss: -600.00,
          entry_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          notes: 'Tried to catch falling knife. Did not wait for confirmation.',
          tags: [], mistakes: ['FOMO Entry', 'Late Entry'], pips: -30.0, emotional_state: 'anxious'
        },
        {
          symbol: 'US100', type: 'Long', entry_price: 19520.00, exit_price: 19610.00, lots: 0.5, quantity: 0.5,
          profit_loss: 450.00,
          entry_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          notes: 'Rode the indices momentum after CPI release.',
          tags: ['Breakout', 'News'], mistakes: [], pips: 90.0, emotional_state: 'greed'
        },
        {
          symbol: 'BTCUSD', type: 'Short', entry_price: 66420.00, exit_price: 66550.00, lots: 0.1, quantity: 0.1,
          profit_loss: -13.00,
          entry_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
          notes: 'Tiny scalp attempt on Bitcoin. Stopped out quickly.',
          tags: ['Scalp'], mistakes: [], pips: -130.0, emotional_state: 'neutral'
        }
      ];

      const targetAccountId = (
        selectedAccountIds !== 'all' && (selectedAccountIds as string[]).length === 1
          ? (selectedAccountIds as string[])[0]
          : (accounts[0]?.id || null)
      )
      for (const t of demoTrades) {
        await addTrade({ ...t, user_id: user.id, account_id: targetAccountId } as Trade);
      }

      const selKey = selectedAccountIds === 'all' ? 'all' : (selectedAccountIds as string[]).slice().sort().join(',')
      await mutate(['dashboard', user.id, dateRange, selKey])
      await mutate(['trades', user.id, 'all', selKey])

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

  const { trades, allTimeTrades, metrics, equityData, advancedMetrics, initialCapital, isLoading } = useDashboardData(user?.id, dateRange, selectedAccountIds)

  useEffect(() => {
    if (!isLoading && dateRange === '30d' && trades.length === 0 && allTimeTrades.length > 0) {
      setDateRange('all');
    }
  }, [isLoading, dateRange, trades.length, allTimeTrades.length]);

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

  const sparklineData = useMemo(() => {
    if (!equityData.values.length) return { equity: [], winRate: [], pf: [] }
    const equity = equityData.values
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

  useEffect(() => {
    const loadChallenge = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const s = (data?.settings as any) || {};
      if (!s.propFirmId || !s.propFirmTier) { setChallengeStatus(null); return; }
      const firm = PROP_FIRMS.find(f => f.id === s.propFirmId);
      const tier = firm?.tiers.find(t => t.tierName === s.propFirmTier);
      if (!firm || !tier) { setChallengeStatus(null); return; }
      const startBalance = Number(s.challengeStartBalance) || tier.accountSize;
      const startDate = s.challengeStartDate || new Date().toISOString().slice(0, 10);
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
  }, [user?.id, trades]);

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <DashboardSkeleton />
      </AuthenticatedLayout>
    )
  }

  const noTrades = allTimeTrades.length === 0;

  return (
    <AuthenticatedLayout>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="px-4 sm:px-6 lg:px-8 space-y-6 pb-12"
      >

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Command Center</h1>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 ml-10.5 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <DateRangeSelector selectedRange={dateRange} onChange={setDateRange} />
            <Link
              href="/trades/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              <span>+ Log Trade</span>
            </Link>
          </div>
        </div>

        {/* ── Alert Banners ── */}
        {challengeStatus?.isViolated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="text-rose-300 font-extrabold text-xs">Challenge Violation — </span>
              <span className="text-rose-400 text-xs">{challengeStatus.violationReason}</span>
            </div>
          </motion.div>
        )}

        {frozenDates && frozenDates.length > 0 && !noTrades && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl"
          >
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1">
              <span className="text-blue-300 font-extrabold text-xs">Streak Frozen — </span>
              <span className="text-blue-300/80 text-xs">
                Your journaling streak of <strong className="text-blue-300">{journalStreak.currentStreak} days</strong> is protected. (Last frozen: {frozenDates[frozenDates.length - 1]})
              </span>
            </div>
          </motion.div>
        )}

        {challengeStatus && !challengeStatus.isViolated && challengeStatus.dailyDrawdownPercent >= 70 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-300/90 text-xs font-medium">
              Daily loss limit at <strong className="text-amber-300">{challengeStatus.dailyDrawdownPercent.toFixed(0)}%</strong> — consider stopping for the day.
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
            {/* ── 5 Performance Telemetry Stat Cards ── */}
            <ErrorBoundary>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Net P&L',
                    value: fmt(metrics.total_pnl),
                    positive: metrics.total_pnl >= 0,
                    icon: metrics.total_pnl >= 0 ? TrendingUp : TrendingDown,
                    sub: `${metrics.avg_win > 0 ? fmt(metrics.avg_win) : '—'} avg win`,
                    detail: (
                      <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                          <span>Avg Win</span><span>Avg Loss</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                          <div
                            style={{ width: `${(metrics.avg_win + Math.abs(metrics.avg_loss)) > 0 ? (metrics.avg_win / (metrics.avg_win + Math.abs(metrics.avg_loss))) * 100 : 50}%` }}
                            className="h-full bg-emerald-500"
                          />
                          <div
                            style={{ width: `${(metrics.avg_win + Math.abs(metrics.avg_loss)) > 0 ? (Math.abs(metrics.avg_loss) / (metrics.avg_win + Math.abs(metrics.avg_loss))) * 100 : 50}%` }}
                            className="h-full bg-rose-500"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono font-bold">
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
                    detail: (
                      <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <div className="flex justify-center">
                          <svg className="w-[130px] h-[52px]" viewBox="0 0 100 50" aria-label="Win Rate Arc">
                            <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" strokeLinecap="round" />
                            <path
                              d="M 10 45 A 35 35 0 0 1 90 45"
                              fill="none"
                              stroke={metrics.win_rate >= 0.5 ? '#10b981' : '#f43f5e'}
                              strokeWidth="9"
                              strokeLinecap="round"
                              strokeDasharray="110"
                              strokeDashoffset={110 - (110 * metrics.win_rate * 100) / 100}
                              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-600 font-bold px-1">
                          <span className="text-emerald-600">{metrics.winning_trades} Wins</span>
                          <span className="text-rose-600">{metrics.losing_trades} Losses</span>
                        </div>
                      </div>
                    )
                  },
                  {
                    label: 'Profit Factor',
                    value: advancedMetrics ? (advancedMetrics.profitFactor === Infinity ? '∞' : advancedMetrics.profitFactor.toFixed(2)) : '—',
                    positive: advancedMetrics ? advancedMetrics.profitFactor >= 1 : true,
                    icon: BarChart3,
                    sub: advancedMetrics && advancedMetrics.profitFactor >= 1.5 ? 'Strong edge' : 'Build edge',
                    detail: (() => {
                      const pfVal = advancedMetrics?.profitFactor ?? 0;
                      const gpRatio = pfVal > 0 ? (pfVal / (pfVal + 1)) * 100 : 50;
                      return (
                        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-600 font-medium leading-tight max-w-[55%]">Gross profit vs gross loss ratio</span>
                          <svg className="w-10 h-10 shrink-0 -rotate-90" viewBox="0 0 36 36" aria-label="PF Gauge">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f43f5e" strokeWidth="5" />
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="5"
                              strokeDasharray={`${gpRatio} 100`} className="transition-all duration-500" />
                          </svg>
                        </div>
                      );
                    })()
                  },
                  {
                    label: 'Total Trades',
                    value: metrics.total_trades.toString(),
                    positive: true,
                    icon: BookOpen,
                    sub: `${trades.filter(t => t.type === 'Long').length}L · ${trades.filter(t => t.type === 'Short').length}S`,
                    detail: (() => {
                      const longCount = trades.filter(t => t.type === 'Long').length;
                      const shortCount = trades.filter(t => t.type === 'Short').length;
                      const total = longCount + shortCount;
                      const longPct = total > 0 ? (longCount / total) * 100 : 50;
                      return (
                        <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-600">
                            <span>Buy ({longCount})</span><span>Sell ({shortCount})</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                            <div style={{ width: `${longPct}%` }} className="h-full bg-emerald-500" />
                            <div style={{ width: `${100 - longPct}%` }} className="h-full bg-rose-500" />
                          </div>
                        </div>
                      );
                    })()
                  },
                  {
                    label: 'Avg R:R',
                    value: advancedMetrics ? advancedMetrics.riskRewardRatio.toFixed(2) : '—',
                    positive: advancedMetrics ? advancedMetrics.riskRewardRatio >= 1 : true,
                    icon: Zap,
                    sub: 'Target: 2.00:1',
                    detail: (() => {
                      const rrVal = advancedMetrics?.riskRewardRatio ?? 0;
                      const fillPct = Math.min(100, Math.max(0, (rrVal / 2) * 100));
                      return (
                        <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1.5">
                          <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                            <div style={{ width: `${fillPct}%` }} className="h-full bg-violet-500 transition-all duration-500" />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono font-bold">
                            <span className="text-violet-400">{rrVal.toFixed(2)}:1</span>
                            <span className="text-gray-600">2.00:1</span>
                          </div>
                        </div>
                      );
                    })()
                  }
                ].map((s, i) => {
                  const Icon = s.icon;
                  const accentColor = s.positive ? '#10b981' : '#f43f5e';
                  return (
                    <motion.div
                      key={i}
                      variants={item}
                      className="relative rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4 overflow-hidden group hover:border-white/[0.10] transition-all duration-300 flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
                        <div className="p-1.5 rounded-lg" style={{ background: `${accentColor}14` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight" style={{ color: accentColor }}>
                        {s.value}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{s.sub}</div>
                      {s.detail}
                      {/* Subtle ambient glow */}
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse, ${accentColor}0a 0%, transparent 70%)` }} />
                    </motion.div>
                  );
                })}
              </motion.div>
            </ErrorBoundary>

            {/* ── Equity Curve + Challenge Widget ── */}
            <ErrorBoundary>
              <div className={`grid gap-4 ${challengeStatus ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.38 }}
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
                {challengeStatus && <ChallengeDashboardWidget status={challengeStatus} trades={trades} />}
              </div>
            </ErrorBoundary>

            {/* ── Intelligence Cards Row ── */}
            <ErrorBoundary>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

                {/* Journaling Streak */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Journal Streak</div>
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${journalStreak.currentStreak > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-gray-500'}`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-3xl font-black text-white font-mono">{journalStreak.currentStreak}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">Consecutive days</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>Best</span>
                      <span className="text-white font-mono font-bold">{journalStreak.longestStreak}d</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[{ name: 'Bronze', t: 3 }, { name: 'Silver', t: 5 }, { name: 'Gold', t: 10 }, { name: 'Master', t: 20 }].map((b) => {
                        const earned = journalStreak.currentStreak >= b.t;
                        return (
                          <span key={b.name} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wide transition-all ${
                            earned ? 'text-amber-400 border-amber-400/25 bg-amber-400/5' : 'text-gray-700 border-white/[0.04] opacity-40'
                          }`}>{b.name}</span>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>

                {/* Win/Loss Streak */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Trade Streak</div>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black ${
                      streak.type === 'win' ? 'bg-emerald-500/15 text-emerald-400' 
                      : streak.type === 'loss' ? 'bg-rose-500/15 text-rose-400' 
                      : 'bg-white/[0.04] text-gray-500'
                    }`}>
                      {streak.count}
                    </div>
                    <div>
                      <div className={`text-sm font-extrabold ${streak.type === 'win' ? 'text-emerald-400' : streak.type === 'loss' ? 'text-rose-400' : 'text-gray-500'}`}>
                        {streak.type === 'win' ? 'Win Streak' : streak.type === 'loss' ? 'Loss Streak' : 'No Streak'}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">Consecutive {streak.type === 'win' ? 'wins' : streak.type === 'loss' ? 'losses' : 'trades'}</div>
                    </div>
                  </div>
                  {streak.type === 'loss' && streak.count >= 2 && (
                    <div className="mt-3 px-2.5 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      <p className="text-rose-400 text-[10px] font-medium">Consider reducing size or pausing.</p>
                    </div>
                  )}
                </motion.div>

                {/* Max Drawdown */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Max Drawdown</div>
                  <div className={`text-3xl font-black font-mono ${drawdown.percentage > 10 ? 'text-rose-400' : drawdown.percentage > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {drawdown.percentage.toFixed(1)}%
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                      <span>0%</span><span className="text-amber-500/60">10% limit</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${drawdown.percentage > 10 ? 'bg-rose-500' : drawdown.percentage > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, drawdown.percentage * 10)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">{drawdown.amount > 0 ? `${fmt(drawdown.amount)} from peak` : 'No drawdown'}</div>
                  </div>
                </motion.div>

                {/* Psychology Score */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Psychology Score</div>
                  <div className={`text-3xl font-black font-mono ${psychScore >= 80 ? 'text-emerald-400' : psychScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {psychScore}%
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${psychScore >= 80 ? 'bg-emerald-500' : psychScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${psychScore}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {trades.filter(t => t.mistakes?.length).length} of {trades.length} trades had mistakes
                    </div>
                  </div>
                </motion.div>

                {/* Today's P&L */}
                <motion.div variants={item} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Today's P&L</div>
                  <div className={`text-3xl font-black font-mono ${todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {todayPnL >= 0 ? '+' : ''}{fmt(todayPnL)}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1 font-mono">{todayTrades.length} trades today</div>
                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Best Session</div>
                    <div className="text-[11px] text-indigo-400 font-semibold">{bestSession}</div>
                  </div>
                </motion.div>
              </motion.div>
            </ErrorBoundary>

            {/* ── Forex Pips (conditional) ── */}
            {forexCount > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4 flex items-center gap-5">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Pips (Forex)</div>
                  <div className={`text-lg font-black font-mono ${totalPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPips(totalPips)}
                  </div>
                </div>
                <div className="text-gray-600 text-xs ml-2 font-mono">{forexCount} forex trades tracked</div>
                <Link href="/analytics" className="ml-auto text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                  Full Breakdown <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* ── Recent Trades ── */}
            <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <h2 className="text-white font-extrabold text-sm">Recent Executions</h2>
                <Link href="/trades" className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {recent.length === 0 ? (
                  <div className="p-8 text-center text-gray-600 text-xs">No trades in this period</div>
                ) : recent.map((trade) => {
                  const pnlPositive = trade.profit_loss >= 0;
                  const isLong = trade.type === 'Long';
                  return (
                    <Link
                      href={`/trades/${trade.id}`}
                      key={trade.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Direction badge */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        pnlPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {isLong ? 'B' : 'S'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-white">{trade.symbol}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                            isLong
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}>
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                          {trade.mistakes && trade.mistakes.length > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-900/20 text-rose-400 border-rose-900/30">
                              {trade.mistakes.length} mistake{trade.mistakes.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {trade.strategy && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/20 text-indigo-400 bg-indigo-500/10 hidden sm:inline-block">
                              {trade.strategy}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-0.5 font-mono">
                          {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {isForexPair(trade.symbol) && trade.pips !== undefined && trade.pips !== null && (
                            <span className={`ml-2 ${trade.pips >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatPips(trade.pips)} pips
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`text-sm font-black font-mono ${pnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.profit_loss >= 0 ? '+' : ''}{fmt(trade.profit_loss)}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ── AI Insights Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Behavior Alert</div>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  {behaviors.behaviors[0]?.message || 'No reactive behavior spikes detected.'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Setup Leak</div>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  {tagPerf.worst && tagPerf.worst.count >= 3
                    ? `"${tagPerf.worst.tag}" — ${tagPerf.worst.winRate.toFixed(0)}% WR. Investigate this setup.`
                    : 'No significant setup leak detected yet.'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Win / Loss Ratio</div>
                </div>
                <div className="flex gap-4 mt-1">
                  <div>
                    <div className="text-[10px] text-gray-600">Avg Win</div>
                    <div className="text-sm font-black font-mono text-emerald-400">{fmt(advancedMetrics?.averageWin || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600">Avg Loss</div>
                    <div className="text-sm font-black font-mono text-rose-400">{fmt(advancedMetrics?.averageLoss || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600">Sharpe</div>
                    <div className="text-sm font-black font-mono text-blue-400">{(advancedMetrics?.sharpeRatio || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Action Footer ── */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/trades/new"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl text-center transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                Log a Planned Trade
              </Link>
              <Link
                href="/analytics"
                className="flex-1 py-3 bg-white/[0.04] border border-white/[0.07] text-white text-xs font-extrabold rounded-xl text-center hover:bg-white/[0.07] transition-all"
              >
                View Full Analytics
              </Link>
              <Link
                href="/trades"
                className="flex-1 py-3 bg-white/[0.04] border border-white/[0.07] text-gray-400 text-xs font-extrabold rounded-xl text-center hover:bg-white/[0.07] transition-all"
              >
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
