'use client'

import React, { useState, useMemo } from 'react'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts'
import { Sliders, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react'

interface Props {
  accountSize?: number
  targetPercent?: number
  maxTotalLossPercent?: number
}

export default function PropFirmSimulator({ 
  accountSize = 100000, 
  targetPercent = 8, 
  maxTotalLossPercent = 10 
}: Props) {
  // Simulator State
  const [winRate, setWinRate] = useState(55) // 0-100%
  const [riskReward, setRiskReward] = useState(2.0) // RR ratio, e.g. 2.0 for 1:2
  const [riskPerTrade, setRiskPerTrade] = useState(1.0) // % of account risk per trade
  const [tradesPerDay, setTradesPerDay] = useState(1.5) // Avg trades per day

  const targetAmount = accountSize * (targetPercent / 100)
  const maxLossAmount = accountSize * (maxTotalLossPercent / 100)
  
  const targetBalance = accountSize + targetAmount
  const liquidationBalance = accountSize - maxLossAmount

  // Projection Calculations
  const stats = useMemo(() => {
    const wr = winRate / 100
    const riskAmt = accountSize * (riskPerTrade / 100)
    const winAmt = riskAmt * riskReward
    const lossAmt = riskAmt

    // Expected Value (EV) per trade
    const expectedValue = (wr * winAmt) - ((1 - wr) * lossAmt)
    
    // Daily Expected Profit
    const dailyExpectedProfit = expectedValue * tradesPerDay

    // Projected Days to Target
    let projectedDays = 0
    if (dailyExpectedProfit > 0) {
      projectedDays = Math.ceil(targetAmount / dailyExpectedProfit)
    }

    // Risk of ruin simulation (simplified statistical approximation)
    // Based on risk of ruin formula: ruin = ((1-a)/(1+a))^n where a = edge, n = units to ruin
    const edge = wr * riskReward - (1 - wr)
    let riskOfDrawdown = 0
    if (edge <= 0) {
      riskOfDrawdown = 100 // statistical certainty of breach with negative edge
    } else {
      // ratio-based approximation
      const unitsToRuin = maxTotalLossPercent / riskPerTrade
      const r = ((1 - edge / (riskReward + 1)) / (1 + edge / (riskReward + 1)))
      riskOfDrawdown = Math.min(100, Math.max(0, Math.pow(r, unitsToRuin) * 100))
    }

    return {
      expectedValue,
      dailyExpectedProfit,
      projectedDays,
      riskOfDrawdown,
      winAmt,
      lossAmt
    }
  }, [winRate, riskReward, riskPerTrade, tradesPerDay, accountSize, targetAmount, maxTotalLossPercent, riskPerTrade])

  // Generate 45-day path data points
  const pathData = useMemo(() => {
    const points = []
    let balance = accountSize
    const wr = winRate / 100
    const dailyEv = stats.dailyExpectedProfit

    // Add starting point
    points.push({
      day: 'Day 0',
      Projected: Math.round(balance),
      Target: targetBalance,
      Drawdown: liquidationBalance
    })

    // Simulate average performance over 40 days
    const totalDays = Math.max(20, Math.min(60, stats.projectedDays > 0 ? stats.projectedDays * 1.5 : 30))
    
    for (let day = 1; day <= totalDays; day++) {
      balance += dailyEv
      // Cap at target balance to look like a completed challenge
      const currentProj = Math.round(balance)
      
      points.push({
        day: `Day ${day}`,
        Projected: currentProj,
        Target: targetBalance,
        Drawdown: liquidationBalance
      })
    }

    return points
  }, [accountSize, winRate, stats.dailyExpectedProfit, stats.projectedDays, targetBalance, liquidationBalance])

  return (
    <div className="card rounded-2xl border border-white/[0.07] bg-[#0d0e16] p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-white font-bold text-base">Interactive Challenge Projection Simulator</h2>
        </div>
        <div className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/25 uppercase tracking-wide">
          Phase 1 Gating
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Control Panel */}
        <div className="space-y-4 lg:col-span-1 bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span>Trading Parameters</span>
          </h3>

          {/* Win Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Estimated Win Rate</span>
              <span className="text-indigo-400">{winRate}%</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="85" 
              value={winRate} 
              onChange={(e) => setWinRate(Number(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Risk to Reward */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Risk-to-Reward Ratio</span>
              <span className="text-indigo-400">{riskReward.toFixed(1)}:1</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="5.0" 
              step="0.1"
              value={riskReward} 
              onChange={(e) => setRiskReward(Number(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Risk Per Trade */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Risk Per Trade</span>
              <span className="text-indigo-400">{riskPerTrade.toFixed(1)}%</span>
            </div>
            <input 
              type="range" 
              min="0.2" 
              max="3.0" 
              step="0.1"
              value={riskPerTrade} 
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Trades Per Day</span>
              <span className="text-indigo-400">{tradesPerDay.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="5.0" 
              step="0.1"
              value={tradesPerDay} 
              onChange={(e) => setTradesPerDay(Number(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Projections Dashboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Projected Days */}
            <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Projected Days to Pass
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${stats.projectedDays > 0 && stats.projectedDays <= 30 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {stats.projectedDays > 0 ? `${stats.projectedDays} Days` : 'Never'}
                </span>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 block">
                {stats.dailyExpectedProfit > 0 ? `At $${Math.round(stats.dailyExpectedProfit)} avg profit/day` : 'Negative expected value'}
              </span>
            </div>

            {/* Expected Value */}
            <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Expected Value (EV)
              </span>
              <span className={`text-2xl font-black ${stats.expectedValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.expectedValue >= 0 ? '+' : ''}${Math.round(stats.expectedValue)}
              </span>
              <span className="text-[9px] text-gray-500 mt-1 block">
                Average return per logged trade
              </span>
            </div>

            {/* Ruin Probability */}
            <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Drawdown Breach Risk
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-2xl font-black ${stats.riskOfDrawdown > 50 ? 'text-red-400' : stats.riskOfDrawdown > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stats.riskOfDrawdown.toFixed(1)}%
                </span>
                {stats.riskOfDrawdown > 30 && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </div>
              <span className="text-[9px] text-gray-500 mt-1 block">
                Probability of hitting -{maxTotalLossPercent}% max DD
              </span>
            </div>
          </div>

          {/* Projection Chart Container */}
          <div className="h-[200px] w-full bg-white/[0.01] border border-white/[0.04] rounded-xl p-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pathData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.25} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  domain={[
                    Math.floor(liquidationBalance * 0.98), 
                    Math.ceil(targetBalance * 1.02)
                  ]}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0e16', border: '1px solid #1f2937', borderRadius: '8px' }}
                  labelStyle={{ fontSize: 10, color: '#9ca3af' }}
                  itemStyle={{ fontSize: 12, color: '#f3f4f6' }}
                />
                <ReferenceLine y={targetBalance} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.8} />
                <ReferenceLine y={liquidationBalance} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.8} />
                <Line 
                  type="monotone" 
                  dataKey="Projected" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={false}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Legend Labels Overlaid */}
            <div className="absolute top-3 left-4 flex gap-4 text-[9px] font-bold tracking-wider uppercase">
              <span className="text-indigo-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block" /> Projected Growth
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Profit Target (${targetBalance.toLocaleString()})
              </span>
              <span className="text-red-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" /> Max Drawdown (${liquidationBalance.toLocaleString()})
              </span>
            </div>
          </div>
          
          {/* Advice Warning */}
          {stats.riskOfDrawdown > 25 && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 p-2.5 rounded-lg leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>High Drawdown Risk Warning:</strong> Your parameters have a {stats.riskOfDrawdown.toFixed(0)}% chance of breaching the maximum drawdown limit. Consider lowering your Risk Per Trade to <strong>0.5%</strong> or increasing your Win Rate / R:R ratio to ensure safety.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
