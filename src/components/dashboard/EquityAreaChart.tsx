'use client'

import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface EquityAreaChartProps {
  data: { date: string; equity: number }[];
  initialCapital: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function EquityAreaChart({ data, initialCapital }: EquityAreaChartProps) {
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false}
          tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          interval={Math.floor(data.length / 6)} />
        <YAxis domain={[min * 0.99, max * 1.01]} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false}
          axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} width={50} />
        <Tooltip
          contentStyle={{ background: 'var(--tooltip-bg, #0f1117)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: isUp ? '#10b981' : '#ef4444' }}
          formatter={(v: number) => [fmt(v), 'Equity']}
          labelFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        />
        <ReferenceLine y={initialCapital} stroke="#374151" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="equity" stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
