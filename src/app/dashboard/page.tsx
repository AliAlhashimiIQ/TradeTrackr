'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import DateRangeSelector, { DateRange } from '@/components/dashboard/DateRangeSelector'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAuth } from '@/hooks/useAuth'
import type { Trade } from '@/lib/types'
import { calculateMaxDrawdown } from '@/lib/tradeMetrics'
import { detectStreaksAndBehaviors, analyzeTagPerformance } from '@/lib/ai/aiService'
import { isForexPair, formatPips } from '@/lib/forexUtils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
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

function EquityAreaChart({ data }: { data: { date: string; equity: number }[] }) {
  if (!data.length) return (
    <div className="h-64 flex items-center justify-center text-gray-600 text-sm">No equity data yet</div>
  )
  const min = Math.min(...data.map(d => d.equity))
  const max = Math.max(...data.map(d => d.equity))
  const isUp = data[data.length - 1].equity >= data[0].equity
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
        <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} tickLine={false} axisLine={false}
          tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          interval={Math.floor(data.length / 6)} />
        <YAxis domain={[min * 0.99, max * 1.01]} tick={{ fill: '#4b5563', fontSize: 10 }} tickLine={false}
          axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} width={50} />
        <Tooltip
          contentStyle={{ background: '#0f1117', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: isUp ? '#10b981' : '#ef4444' }}
          formatter={(v: number) => [fmt(v), 'Equity']}
          labelFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        />
        <ReferenceLine y={data[0]?.equity} stroke="#374151" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="equity" stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const card = 'rounded-2xl border border-white/[0.06] bg-[#0d0e16]'

export default function Dashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  const { trades, metrics, equityData, advancedMetrics, isLoading } = useDashboardData(user?.id, dateRange)

  const equityChartData = useMemo(() =>
    equityData.labels.map((d, i) => ({ date: d, equity: equityData.values[i] })),
    [equityData]
  )

  const sorted = useMemo(() =>
    [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()),
    [trades]
  )
  const recent = sorted.slice(0, 8)
  const streak = useMemo(() => getStreak(trades), [trades])
  const psychScore = useMemo(() => getPsychologyScore(trades), [trades])
  const bestSession = useMemo(() => getBestSession(trades), [trades])
  const drawdown = useMemo(() => calculateMaxDrawdown(trades), [trades])
  const behaviors = useMemo(() => detectStreaksAndBehaviors(recent), [recent])
  const tagPerf = useMemo(() => analyzeTagPerformance(recent), [recent])
  const totalPips = useMemo(() => trades.filter(t => isForexPair(t.symbol)).reduce((s, t) => s + (t.pips || 0), 0), [trades])
  const forexCount = useMemo(() => trades.filter(t => isForexPair(t.symbol)).length, [trades])

  const todayTrades = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return trades.filter(t => t.entry_time.startsWith(today))
  }, [trades])
  const todayPnL = todayTrades.reduce((s, t) => s + t.profit_loss, 0)

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
          <div className="h-20 rounded-2xl bg-white/[0.04]" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.04]" />)}
          </div>
          <div className="h-72 rounded-2xl bg-white/[0.04]" />
        </div>
      </AuthenticatedLayout>
    )
  }

  const noTrades = trades.length === 0

  return (
    <AuthenticatedLayout>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6 pb-12">

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

        {noTrades ? (
          <div className={`${card} p-12 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No trades yet</h2>
            <p className="text-gray-500 mb-6">Log your first trade to unlock your Command Center.</p>
            <Link href="/trades/new" className="inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors">
              Add Your First Trade
            </Link>
          </div>
        ) : (
          <>
            {/* ── Stat Pills Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Net P&L', value: fmt(metrics.total_pnl), color: metrics.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400', sub: `${dateRange.toUpperCase()} period` },
                { label: 'Win Rate', value: `${(metrics.win_rate * 100).toFixed(1)}%`, color: metrics.win_rate >= 0.5 ? 'text-emerald-400' : 'text-yellow-400', sub: `${metrics.winning_trades}W / ${metrics.losing_trades}L` },
                { label: 'Profit Factor', value: advancedMetrics ? (advancedMetrics.profitFactor === Infinity ? '∞' : advancedMetrics.profitFactor.toFixed(2)) : '—', color: 'text-blue-400', sub: advancedMetrics && advancedMetrics.profitFactor >= 1 ? 'Profitable system' : 'Below target' },
                { label: 'Total Trades', value: metrics.total_trades.toString(), color: 'text-purple-400', sub: `${todayTrades.length} today` },
                { label: 'Avg R:R', value: advancedMetrics ? advancedMetrics.riskRewardRatio.toFixed(2) : '—', color: 'text-indigo-400', sub: `EV: ${advancedMetrics ? fmt(advancedMetrics.expectedValue) : '—'}` },
              ].map((s, i) => (
                <motion.div key={i} whileHover={{ y: -2 }} className={`${card} p-4`}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-gray-600 mt-1">{s.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* ── Equity Curve ── */}
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold">Equity Curve</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Account growth over time</p>
                </div>
                <div className={`text-lg font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {metrics.total_pnl >= 0 ? '+' : ''}{fmt(metrics.total_pnl)}
                </div>
              </div>
              <EquityAreaChart data={equityChartData} />
            </div>

            {/* ── 4 Intelligence Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Streak Card */}
              <div className={`${card} p-5`}>
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
              </div>

              {/* Drawdown Card */}
              <div className={`${card} p-5`}>
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
              </div>

              {/* Psychology Card */}
              <div className={`${card} p-5`}>
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
              </div>

              {/* Best Session / Today Card */}
              <div className={`${card} p-5`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Today's P&L</div>
                <div className={`text-3xl font-black ${todayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {todayPnL >= 0 ? '+' : ''}{fmt(todayPnL)}
                </div>
                <div className="mt-2 text-xs text-gray-500">{todayTrades.length} trades today</div>
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Best Session</div>
                  <div className="text-xs text-indigo-400 font-medium">{bestSession}</div>
                </div>
              </div>
            </div>

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
      </div>
    </AuthenticatedLayout>
  )
}
