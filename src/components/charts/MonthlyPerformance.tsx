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
      <div className="w-full h-64 bg-[#131825] rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 bg-[#131825] rounded-lg flex items-center justify-center">
        <p className="text-gray-400">No data available</p>
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
    <div className="w-full h-64 bg-[#131825] rounded-lg p-4">
      <div className="flex justify-end mb-2">
        <div className="bg-[#1a1f2c] rounded-md overflow-hidden flex text-xs">
          <button
            onClick={() => setActiveMetric('pnL')}
            className={`px-3 py-1 ${
              activeMetric === 'pnL' 
                ? 'bg-blue-900/40 text-blue-400' 
                : 'text-gray-400'
            }`}
          >
            P&L
          </button>
          <button
            onClick={() => setActiveMetric('winRate')}
            className={`px-3 py-1 ${
              activeMetric === 'winRate' 
                ? 'bg-blue-900/40 text-blue-400' 
                : 'text-gray-400'
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
          <CartesianGrid strokeDasharray="3 3" stroke="#212946" />
          <XAxis 
            dataKey="month"
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            tickLine={{ stroke: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis 
            yAxisId="left"
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            tickLine={{ stroke: '#6b7280' }}
            tickFormatter={(value) => formatCurrency(value)}
            domain={['auto', 'auto']}
            hide={activeMetric === 'winRate'}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            tickLine={{ stroke: '#6b7280' }}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            hide={activeMetric === 'pnL'}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
            formatter={(value: number, name: string) => {
              if (name === 'P&L') return [formatCurrency(value), name];
              if (name === 'Win Rate') return [`${value.toFixed(1)}%`, name];
              if (name === 'Trades') return [value, name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
          
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
                fillOpacity={0.8}
              />
            ))}
          </Bar>
          
          {/* Win Rate Line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="winRate"
            name="Win Rate"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }}
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