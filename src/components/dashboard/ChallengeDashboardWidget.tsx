'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChallengeStatus } from '@/lib/propFirms'

interface Props {
  status: ChallengeStatus
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export default function ChallengeDashboardWidget({ status }: Props) {
  const {
    firm, tier, pnl, pnlPercent, profitTargetAmount,
    maxDailyLossAmount, maxTotalLossAmount,
    todayPnL, daysElapsed, daysRemaining,
    isViolated, violationReason,
    progressPercent, dailyDrawdownPercent, totalDrawdownPercent,
  } = status

  const dailyDanger = dailyDrawdownPercent >= 80
  const totalDanger = totalDrawdownPercent >= 80
  const isWinning = pnl >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="card rounded-2xl border border-white/[0.07] bg-[#0d0e16] overflow-hidden"
    >
      {/* Violation banner */}
      {isViolated && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-2.5 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-red-300 text-xs font-semibold">{violationReason}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
              {firm.logo}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{firm.name}</p>
              <p className="text-gray-500 text-xs">{tier.tierName}</p>
            </div>
          </div>
          <Link
            href="/settings?tab=account"
            className="text-xs text-gray-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Change
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        {/* Profit Progress */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profit Progress</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-sm font-bold ${isWinning ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(pnl)}
              </span>
              <span className="text-gray-600 text-xs">/ {fmt(profitTargetAmount)}</span>
            </div>
          </div>
          <div className="h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isWinning ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-700 to-red-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-600">0%</span>
            <span className="text-[10px] text-gray-500 font-medium">{progressPercent.toFixed(1)}% of target</span>
            <span className="text-[10px] text-gray-600">{tier.profitTargetPercent}%</span>
          </div>
        </div>

        {/* Daily Loss Meter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Daily DD</span>
            <span className={`text-[11px] font-bold ${dailyDanger ? 'text-red-400' : 'text-gray-300'}`}>
              {fmt(Math.abs(todayPnL < 0 ? todayPnL : 0))} / {fmt(maxDailyLossAmount)}
            </span>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                dailyDanger ? 'bg-red-500' : dailyDrawdownPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${dailyDrawdownPercent}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>

        {/* Total Loss Meter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total DD</span>
            <span className={`text-[11px] font-bold ${totalDanger ? 'text-red-400' : 'text-gray-300'}`}>
              {fmt(Math.abs(pnl < 0 ? pnl : 0))} / {fmt(maxTotalLossAmount)}
            </span>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                totalDanger ? 'bg-red-500' : totalDrawdownPercent >= 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${totalDrawdownPercent}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.35 }}
            />
          </div>
        </div>

        {/* Today P&L */}
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Today's P&L</p>
          <p className={`text-lg font-black ${todayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {todayPnL >= 0 ? '+' : ''}{fmt(todayPnL)}
          </p>
        </div>

        {/* Days */}
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            {daysRemaining !== null ? 'Days Left' : 'Day'}
          </p>
          <p className={`text-lg font-black ${
            daysRemaining !== null && daysRemaining <= 5 ? 'text-amber-400' : 'text-white'
          }`}>
            {daysRemaining !== null ? daysRemaining : `#${daysElapsed}`}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tier.trailingDrawdown && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
              Trailing DD
            </span>
          )}
          {tier.consistencyRule && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
              Consistency Rule
            </span>
          )}
          {tier.newsRestrictionMinutes > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider">
              News ±{tier.newsRestrictionMinutes}m
            </span>
          )}
        </div>
        <Link
          href="/analytics?tab=propfirm"
          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
        >
          Full Report →
        </Link>
      </div>
    </motion.div>
  )
}
