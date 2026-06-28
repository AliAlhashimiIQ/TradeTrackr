'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { SymbolPerformance as SymbolPerformanceType } from '@/lib/tradeMetrics';

interface SymbolPerformanceProps {
  data: SymbolPerformanceType[];
  loading?: boolean;
}

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

/**
 * SymbolPerformance component displays performance breakdown by trading symbol
 */
const SymbolPerformance: React.FC<SymbolPerformanceProps> = ({
  data,
  loading = false,
}) => {
  const [metric, setMetric] = useState<'pnL' | 'winRate' | 'trades'>('pnL');
  
  if (loading) {
    return (
      <div className="w-full h-80 bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl flex items-center justify-center">
        <p className="text-slate-400 dark:text-gray-500">No data available</p>
      </div>
    );
  }
  
  // Display only top 10 symbols based on selected metric
  const sortedData = [...data].sort((a, b) => {
    if (metric === 'pnL') return b.pnL - a.pnL;
    if (metric === 'winRate') return b.winRate - a.winRate;
    return b.trades - a.trades;
  }).slice(0, 10);

  // Define colors based on metric
  const getBarColor = (entry: SymbolPerformanceType) => {
    if (metric === 'pnL') {
      return entry.pnL >= 0 ? '#10b981' : '#ef4444';
    }
    if (metric === 'winRate') {
      return entry.winRate >= 50 ? '#3b82f6' : '#f59e0b';
    }
    return '#6366f1';
  };
  
  // Format tooltip value based on metric
  const formatTooltipValue = (value: number) => {
    if (metric === 'pnL') return formatCurrency(value);
    if (metric === 'winRate') return formatPercent(value);
    return value;
  };
  
  // Get appropriate label format based on metric
  const getLabelFormat = () => {
    if (metric === 'pnL') return formatCurrency;
    if (metric === 'winRate') return formatPercent;
    return (value: number) => value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const original = sortedData.find(s => s.symbol === label);
      if (!original) return null;

      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">{original.symbol}</p>
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

  return (
    <div className="w-full bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Top {sortedData.length} symbols by {metric === 'pnL' ? 'P&L' : metric === 'winRate' ? 'Win Rate' : 'Trade Count'}
        </div>
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
          <button
            onClick={() => setMetric('pnL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${metric === 'pnL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-650 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            P&L
          </button>
          <button
            onClick={() => setMetric('winRate')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${metric === 'winRate' ? 'bg-indigo-600 text-white shadow' : 'text-slate-650 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setMetric('trades')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${metric === 'trades' ? 'bg-indigo-600 text-white shadow' : 'text-slate-650 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Trades
          </button>
        </div>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
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
              dataKey="symbol"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              width={75}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(128, 128, 128, 0.05)' }}
            />
            <Bar dataKey={metric} barSize={18} radius={[0, 4, 4, 0]}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
              <LabelList dataKey={metric} position="right" formatter={getLabelFormat()} fill="#6b7280" style={{ fontSize: 9, fontWeight: 'bold' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SymbolPerformance;
