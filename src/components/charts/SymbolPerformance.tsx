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
  return `${value.toFixed(0)}%`;
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
      <div className="w-full h-64 rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 rounded-xl flex items-center justify-center">
        <p className="text-slate-400">No data available</p>
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

  return (
    <div className="w-full h-80 rounded-xl p-2">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-400">
          Top {sortedData.length} symbols by {metric === 'pnL' ? 'P&L' : metric === 'winRate' ? 'Win Rate' : 'Trade Count'}
        </div>
        <div className="flex space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setMetric('pnL')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${metric === 'pnL' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            P&L
          </button>
          <button
            onClick={() => setMetric('winRate')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${metric === 'winRate' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setMetric('trades')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${metric === 'trades' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Trades
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.35} horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            domain={metric === 'winRate' ? [0, 100] : ['auto', 'auto']}
            tickFormatter={metric === 'pnL' ? formatCurrency : metric === 'winRate' ? formatPercent : undefined}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            stroke="#64748b"
            tick={{ fill: '#cbd5e1', fontSize: 11 }}
            width={90}
          />
          <Tooltip
            formatter={(value: number) => [formatTooltipValue(value), metric === 'pnL' ? 'P&L' : metric === 'winRate' ? 'Win Rate' : 'Trades']}
            contentStyle={{ backgroundColor: 'rgba(2,6,23,0.95)', borderColor: '#334155', color: '#e2e8f0', borderRadius: '12px' }}
          />
          <Bar dataKey={metric} background={{ fill: '#0f172a' }} barSize={24} radius={[0, 8, 8, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
            <LabelList dataKey={metric} position="right" formatter={getLabelFormat()} fill="#cbd5e1" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SymbolPerformance; 
