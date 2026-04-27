'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Trade } from '@/lib/types'
import { ChallengeStatus } from '@/lib/propFirms'

interface Props {
  trades: Trade[]
  challengeStatus: ChallengeStatus | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(n: number, decimals = 1) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

export default function PropFirmAnalyticsTab({ trades, challengeStatus }: Props) {
  if (!challengeStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl mb-4">🏆</div>
        <h3 className="text-white font-bold text-lg mb-2">No Challenge Active</h3>
        <p className="text-gray-500 text-sm max-w-sm mb-6">
          Set up your prop firm challenge in Settings to track your progress, consistency score, and violation risks.
        </p>
        <Link
          href="/settings?tab=account"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg shadow-indigo-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Set Up Prop Firm
        </Link>
      </div>
    )
  }

  const { firm, tier, startDate, startBalance, currentBalance, pnl, pnlPercent,
    profitTargetAmount, maxDailyLossAmount, maxTotalLossAmount,
    progressPercent, dailyDrawdownPercent, totalDrawdownPercent, daysElapsed, daysRemaining, isViolated } = challengeStatus

  // Filter trades to the challenge window
  const challengeTrades = useMemo(() =>
    trades.filter(t => t.entry_time >= startDate)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()),
    [trades, startDate]
  )

  // Trading days (unique calendar days with at least 1 trade)
  const tradingDays = useMemo(() => {
    const days = new Set(challengeTrades.map(t => t.entry_time.slice(0, 10)))
    return Array.from(days).sort()
  }, [challengeTrades])

  // P&L per trading day
  const pnlByDay = useMemo(() =>
    tradingDays.map(day => {
      const dayTrades = challengeTrades.filter(t => t.entry_time.startsWith(day))
      const pnl = dayTrades.reduce((s, t) => s + t.profit_loss, 0)
      const wins = dayTrades.filter(t => t.profit_loss > 0).length
      return { day, pnl, trades: dayTrades.length, wins, wr: dayTrades.length ? (wins / dayTrades.length) * 100 : 0 }
    }),
    [challengeTrades, tradingDays]
  )

  // Best and worst day
  const bestDay = pnlByDay.length ? [...pnlByDay].sort((a, b) => b.pnl - a.pnl)[0] : null
  const worstDay = pnlByDay.length ? [...pnlByDay].sort((a, b) => a.pnl - b.pnl)[0] : null

  // Consistency score: % of days where best day profit < 40% of total gains
  // (simplified: % of profitable days that didn't exceed 40% of total gain)
  const totalGain = Math.max(pnl, 0)
  const consistencyScore = useMemo(() => {
    if (!pnlByDay.length || !totalGain) return 100
    const violatingDays = pnlByDay.filter(d => d.pnl > 0 && (d.pnl / totalGain) > 0.4).length
    return Math.round(((pnlByDay.length - violatingDays) / pnlByDay.length) * 100)
  }, [pnlByDay, totalGain])

  // Violation days (breached daily limit)
  const dailyLimitViolations = useMemo(() =>
    pnlByDay.filter(d => d.pnl < 0 && Math.abs(d.pnl) >= maxDailyLossAmount),
    [pnlByDay, maxDailyLossAmount]
  )

  // Win rate across challenge
  const wins = challengeTrades.filter(t => t.profit_loss > 0).length
  const winRate = challengeTrades.length ? (wins / challengeTrades.length) * 100 : 0

  const panelClass = 'card rounded-2xl border border-white/[0.06] bg-[#0d0e16] p-5'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Challenge Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl">
            {firm.logo}
          </div>
          <div>
            <h3 className="text-white font-bold">{firm.name} — {tier.tierName}</h3>
            <p className="text-gray-500 text-xs">Started {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Day {daysElapsed}</p>
          </div>
        </div>
        {isViolated && (
          <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
            ⚠ VIOLATED
          </span>
        )}
        {!isViolated && pnl >= profitTargetAmount && (
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            ✓ TARGET HIT
          </span>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Challenge P&L', value: fmt(pnl), sub: pct(pnlPercent), color: pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Progress to Target', value: `${progressPercent.toFixed(1)}%`, sub: `of ${pct(tier.profitTargetPercent, 0)} goal`, color: 'text-indigo-400' },
          { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, sub: `${wins}W / ${challengeTrades.length - wins}L`, color: winRate >= 50 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Trading Days', value: String(tradingDays.length), sub: daysRemaining !== null ? `${daysRemaining}d remaining` : 'No time limit', color: 'text-blue-400' },
          { label: 'Consistency Score', value: `${consistencyScore}%`, sub: tier.consistencyRule ? 'Required for payout' : 'Good practice', color: consistencyScore >= 80 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Violation Days', value: String(dailyLimitViolations.length), sub: dailyLimitViolations.length > 0 ? 'Daily limit breached' : 'Clean record', color: dailyLimitViolations.length > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Best Day', value: bestDay ? fmt(bestDay.pnl) : '—', sub: bestDay ? new Date(bestDay.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '', color: 'text-emerald-400' },
          { label: 'Worst Day', value: worstDay ? fmt(worstDay.pnl) : '—', sub: worstDay ? new Date(worstDay.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '', color: 'text-red-400' },
        ].map(card => (
          <div key={card.label} className={panelClass}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
            <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Daily Breakdown Table */}
      {pnlByDay.length > 0 && (
        <div className={panelClass}>
          <h4 className="text-white font-semibold mb-4">Daily Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/[0.05]">
                  <th className="text-left pb-2 font-semibold">Date</th>
                  <th className="text-center pb-2 font-semibold">Trades</th>
                  <th className="text-center pb-2 font-semibold">Win Rate</th>
                  <th className="text-right pb-2 font-semibold">P&L</th>
                  <th className="text-right pb-2 font-semibold">% of DD Limit</th>
                  <th className="text-center pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {[...pnlByDay].reverse().map(day => {
                  const ddPct = day.pnl < 0 ? Math.min(100, (Math.abs(day.pnl) / maxDailyLossAmount) * 100) : 0
                  const violated = day.pnl < 0 && Math.abs(day.pnl) >= maxDailyLossAmount
                  return (
                    <tr key={day.day} className={`${violated ? 'bg-red-500/5' : ''}`}>
                      <td className="py-2.5 text-gray-300 font-medium">
                        {new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="py-2.5 text-center text-gray-400">{day.trades}</td>
                      <td className="py-2.5 text-center">
                        <span className={`text-xs font-semibold ${day.wr >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {day.wr.toFixed(0)}%
                        </span>
                      </td>
                      <td className={`py-2.5 text-right font-bold ${day.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {day.pnl >= 0 ? '+' : ''}{fmt(day.pnl)}
                      </td>
                      <td className="py-2.5 text-right">
                        {ddPct > 0 ? (
                          <span className={`text-xs font-semibold ${ddPct >= 80 ? 'text-red-400' : ddPct >= 50 ? 'text-amber-400' : 'text-gray-400'}`}>
                            {ddPct.toFixed(0)}%
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="py-2.5 text-center">
                        {violated ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-bold">VIOLATED</span>
                        ) : day.pnl >= 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">WIN DAY</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-500 font-bold">LOSS DAY</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rules Reminder */}
      <div className={`${panelClass} bg-indigo-500/5 border-indigo-500/20`}>
        <h4 className="text-indigo-300 font-semibold mb-3 text-sm">Challenge Rules Reminder</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Profit Target: <strong className="text-emerald-400 ml-1">{pct(tier.profitTargetPercent, 0)} ({fmt(profitTargetAmount)})</strong>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Daily Loss Limit: <strong className="text-amber-400 ml-1">{pct(-tier.maxDailyLossPercent, 0)} ({fmt(maxDailyLossAmount)})</strong>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            Total Loss Limit: <strong className="text-red-400 ml-1">{pct(-tier.maxTotalLossPercent, 0)} ({fmt(maxTotalLossAmount)})</strong>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Min Trading Days: <strong className="text-blue-400 ml-1">{tier.minTradingDays || 'None'}</strong>
          </div>
          {tier.trailingDrawdown && (
            <div className="flex items-center gap-2 text-amber-400 col-span-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <strong>Trailing Drawdown</strong> — your limit follows your peak equity
            </div>
          )}
          {tier.newsRestrictionMinutes > 0 && (
            <div className="flex items-center gap-2 text-purple-400 col-span-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <strong>No trading ±{tier.newsRestrictionMinutes}min</strong> around high-impact news
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
