'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { StrategyPerformance as StrategyPerformanceType } from '@/lib/tradeMetrics';

interface StrategyPerformanceProps {
  data: StrategyPerformanceType[];
  loading?: boolean;
}

const STRATEGY_COLORS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const StrategyPerformance: React.FC<StrategyPerformanceProps> = ({ data, loading = false }) => {
  const [metric, setMetric] = useState<'pnL' | 'winRate' | 'trades'>('pnL');
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  // Filter out any strategies with no name or no trades
  const strategies = data.filter((s) => s.strategy && s.trades > 0);

  // Normalize data for radar chart (0-100 scale)
  const maxPnL = Math.max(...strategies.map((s) => Math.abs(s.pnL)), 1);
  const maxTrades = Math.max(...strategies.map((s) => s.trades), 1);

  const normalizedData = strategies.map((s) => {
    // P&L normalized relative to maximum P&L (scaled -100 to 100, shifted to 0-100)
    const normalizedPnL = ((s.pnL / maxPnL) * 50) + 50;
    const normalizedTrades = (s.trades / maxTrades) * 100;

    return {
      strategy: s.strategy,
      winRate: s.winRate,
      normalizedPnL,
      normalizedTrades,
      // Keep actual values for tooltips
      pnL: s.pnL,
      trades: s.trades,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Find matching item in strategies array
      const stratName = payload[0].payload.strategy;
      const original = strategies.find(s => s.strategy === stratName);
      if (!original) return null;

      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">{original.strategy}</p>
          <p className={`text-xs font-semibold ${original.pnL >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'} mb-1`}>
            P&L: <span className="font-mono font-bold">{formatCurrency(original.pnL)}</span>
          </p>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
            Win Rate: <span className="font-mono font-bold">{formatPercent(original.winRate)}</span>
          </p>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Trades: <span className="font-mono font-bold">{original.trades}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (strategies.length === 0) {
    return (
      <div className="w-full h-80 bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl flex items-center justify-center">
        <p className="text-slate-400 dark:text-gray-500">No strategy playbooks logged yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Strategy Performance
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* Metric Selector */}
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setMetric('pnL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${metric === 'pnL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              P&L
            </button>
            <button
              onClick={() => setMetric('winRate')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${metric === 'winRate' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Win Rate
            </button>
            <button
              onClick={() => setMetric('trades')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${metric === 'trades' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Trades
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${chartType === 'bar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('radar')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${chartType === 'radar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Radar
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={strategies}
              layout="vertical"
              margin={{ top: 5, right: 15, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" horizontal={false} />
              <XAxis
                type="number"
                stroke="#6b7280"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                domain={metric === 'winRate' ? [0, 100] : ['auto', 'auto']}
                tickFormatter={metric === 'pnL' ? formatCurrency : metric === 'winRate' ? formatPercent : undefined}
              />
              <YAxis
                type="category"
                dataKey="strategy"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                width={100}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(128, 128, 128, 0.05)' }}
              />
              <Bar dataKey={metric} barSize={18} radius={[0, 4, 4, 0]}>
                {strategies.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={normalizedData}>
              <PolarGrid stroke="rgba(128,128,128,0.15)" />
              <PolarAngleAxis dataKey="strategy" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: '#94a3b8', fontSize: 8 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Radar
                name="Win Rate"
                dataKey="winRate"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.4}
              />
              <Radar
                name="P&L"
                dataKey="normalizedPnL"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.4}
              />
              <Radar
                name="Trades"
                dataKey="normalizedTrades"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.4}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StrategyPerformance;
