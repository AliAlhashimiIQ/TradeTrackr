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

// Colors for strategies
const STRATEGY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
];

/**
 * StrategyPerformance component displays performance metrics by trading strategy
 */
const StrategyPerformance: React.FC<StrategyPerformanceProps> = ({
  data,
  loading = false,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
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
  
  // Get only strategies with trades
  const strategies = data.filter(d => d.trades > 0);
  
  // For radar chart, normalize values to 0-100 scale
  const normalizedData = strategies.map((item, index) => {
    // Find max values for normalization
    const maxPnL = Math.max(...strategies.map(s => Math.abs(s.pnL)));
    const maxTrades = Math.max(...strategies.map(s => s.trades));
    
    // Normalize values to 0-100 scale
    const normalizedPnL = maxPnL ? (Math.abs(item.pnL) / maxPnL) * 100 : 0;
    const normalizedTrades = maxTrades ? (item.trades / maxTrades) * 100 : 0;
    
    return {
      ...item,
      normalizedPnL,
      normalizedTrades,
      color: STRATEGY_COLORS[index % STRATEGY_COLORS.length]
    };
  });
  
  // Format tooltip value based on metric
  const formatTooltipValue = (value: number, name: string, entry: any) => {
    if (name === 'pnL' || name === 'normalizedPnL') return [formatCurrency(entry.payload.pnL), 'P&L'];
    if (name === 'winRate') return [formatPercent(value), 'Win Rate'];
    if (name === 'trades' || name === 'normalizedTrades') return [entry.payload.trades, 'Trades'];
    return [value, name];
  };
  
  return (
    <div className="w-full h-80 rounded-xl p-2">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-400">
          Strategy Performance
        </div>
        <div className="flex items-center space-x-3">
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
          <div className="flex space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${chartType === 'bar' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('radar')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${chartType === 'radar' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              Radar
            </button>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        {chartType === 'bar' ? (
          <BarChart
            data={strategies}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
              dataKey="strategy"
              stroke="#64748b"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              width={110}
            />
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{ backgroundColor: 'rgba(2,6,23,0.95)', borderColor: '#334155', color: '#e2e8f0', borderRadius: '12px' }}
            />
            <Bar dataKey={metric} background={{ fill: '#0f172a' }} barSize={24} radius={[0, 8, 8, 0]}>
              {strategies.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={normalizedData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="strategy" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: '#94a3b8' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Radar
              name="Win Rate"
              dataKey="winRate"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.5}
            />
            <Radar
              name="P&L"
              dataKey="normalizedPnL"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.5}
            />
            <Radar
              name="Trades"
              dataKey="normalizedTrades"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.5}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{ backgroundColor: 'rgba(2,6,23,0.95)', borderColor: '#334155', color: '#e2e8f0', borderRadius: '12px' }} 
            />
          </RadarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default StrategyPerformance; 
