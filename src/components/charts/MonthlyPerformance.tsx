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

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
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
      <div className="w-full h-64 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/[0.05]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/[0.05]">
        <p className="text-slate-400 dark:text-gray-500">No data available</p>
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pnlVal = payload.find((p: any) => p.name === 'P&L')?.value;
      const wrVal = payload.find((p: any) => p.name === 'Win Rate')?.value;
      const tradesVal = payload.find((p: any) => p.name === 'Trades')?.value;

      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">{label}</p>
          {pnlVal !== undefined && (
            <p className={`text-xs font-semibold ${pnlVal >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'} mb-1`}>
              P&L: <span className="font-mono font-bold">{formatCurrency(pnlVal)}</span>
            </p>
          )}
          {wrVal !== undefined && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
              Win Rate: <span className="font-mono font-bold">{formatPercent(wrVal)}</span>
            </p>
          )}
          {tradesVal !== undefined && (
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Trades: <span className="font-mono font-bold">{tradesVal}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80 bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Monthly Performance
        </div>
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
          <button
            onClick={() => setActiveMetric('pnL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeMetric === 'pnL' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-650 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            P&L
          </button>
          <button
            onClick={() => setActiveMetric('winRate')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeMetric === 'winRate' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-650 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Win Rate
          </button>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={sortedData}
            margin={{ top: 5, right: 5, left: -10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" vertical={false} />
            <XAxis 
              dataKey="month"
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              yAxisId="left"
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
              tickFormatter={(value) => formatCurrency(value)}
              domain={['auto', 'auto']}
              hide={activeMetric === 'winRate'}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              hide={activeMetric === 'pnL'}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(128, 128, 128, 0.05)' }}
            />
            <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
            
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
                  fill={entry.pnL >= 0 ? '#10b981' : '#ef4444'} 
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
            
            {/* Win Rate Line */}
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="winRate" 
              name="Win Rate" 
              stroke="#f59e0b" 
              strokeWidth={2.5}
              dot={{ fill: '#f59e0b', r: 4 }}
              activeDot={{ r: 6 }}
              hide={activeMetric === 'pnL'}
            />

            {/* Trades helper line for tooltip */}
            <Line 
              yAxisId="right"
              type="monotone"
              dataKey="trades"
              name="Trades"
              stroke="transparent"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyPerformance;
