'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { MonthlyPerformance as MonthlyPerformanceType } from '@/lib/tradeMetrics';

interface MonthlyPerformanceProps {
  data: MonthlyPerformanceType[];
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

/**
 * MonthlyPerformance component displays monthly trading results
 * with P&L bars and win rate line
 */
const MonthlyPerformance: React.FC<MonthlyPerformanceProps> = ({
  data,
  loading = false,
}) => {
  const [activeMetric, setActiveMetric] = useState<'pnL' | 'winRate'>('pnL');

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

  // Sort data by date
  const sortedData = [...data].sort((a, b) => {
    const [aMonth, aYear] = a.month.split(' ');
    const [bMonth, bYear] = b.month.split(' ');
    
    if (aYear !== bYear) {
      return parseInt(aYear) - parseInt(bYear);
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(aMonth) - months.indexOf(bMonth);
  });

  return (
    <div className="w-full h-64 rounded-xl p-2">
      <div className="flex justify-end mb-2">
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex text-xs">
          <button
            onClick={() => setActiveMetric('pnL')}
            className={`px-3 py-1 ${
              activeMetric === 'pnL' 
                ? 'bg-slate-200 text-slate-900' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            P&L
          </button>
          <button
            onClick={() => setActiveMetric('winRate')}
            className={`px-3 py-1 ${
              activeMetric === 'winRate' 
                ? 'bg-slate-200 text-slate-900' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Win Rate
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={sortedData}
          margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.4} />
          <XAxis 
            dataKey="month"
            stroke="#64748b"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={{ stroke: '#334155' }}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis 
            yAxisId="left"
            stroke="#64748b"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={{ stroke: '#334155' }}
            tickFormatter={(value) => formatCurrency(value)}
            domain={['auto', 'auto']}
            hide={activeMetric === 'winRate'}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={{ stroke: '#334155' }}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            hide={activeMetric === 'pnL'}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(2,6,23,0.95)', borderColor: '#334155', color: '#e2e8f0', borderRadius: '12px' }}
            formatter={(value: number, name: string) => {
              if (name === 'P&L') return [formatCurrency(value), name];
              if (name === 'Win Rate') return [`${value.toFixed(1)}%`, name];
              if (name === 'Trades') return [value, name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
          
          {/* P&L Bars */}
          <Bar 
            yAxisId="left"
            dataKey="pnL" 
            name="P&L" 
            radius={[4, 4, 0, 0]}
            hide={activeMetric === 'winRate'}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.pnL >= 0 ? '#34d399' : '#f87171'} 
                fillOpacity={0.88}
              />
            ))}
          </Bar>
          
          {/* Win Rate Line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="winRate"
            name="Win Rate"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={{ fill: '#60a5fa', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#60a5fa', stroke: '#1e3a8a', strokeWidth: 1 }}
            hide={activeMetric === 'pnL'}
          />
          
          {/* Trades Bar (hidden by default but available in tooltip) */}
          <Bar
            yAxisId="left"
            dataKey="trades"
            name="Trades"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            hide={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyPerformance; 
