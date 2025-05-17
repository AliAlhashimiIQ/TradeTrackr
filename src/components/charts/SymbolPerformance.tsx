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
    <div className="w-full h-80 bg-[#131825] rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Top {sortedData.length} symbols by {metric === 'pnL' ? 'P&L' : metric === 'winRate' ? 'Win Rate' : 'Trade Count'}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setMetric('pnL')}
            className={`px-2 py-1 text-xs rounded ${metric === 'pnL' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300'}`}
          >
            P&L
          </button>
          <button
            onClick={() => setMetric('winRate')}
            className={`px-2 py-1 text-xs rounded ${metric === 'winRate' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300'}`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setMetric('trades')}
            className={`px-2 py-1 text-xs rounded ${metric === 'trades' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300'}`}
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
          <CartesianGrid strokeDasharray="3 3" stroke="#212946" horizontal={false} />
          <XAxis
            type="number"
            stroke="#6b7280"
            domain={metric === 'winRate' ? [0, 100] : ['auto', 'auto']}
            tickFormatter={metric === 'pnL' ? formatCurrency : metric === 'winRate' ? formatPercent : undefined}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            width={50}
          />
          <Tooltip
            formatter={(value: number) => [formatTooltipValue(value), metric === 'pnL' ? 'P&L' : metric === 'winRate' ? 'Win Rate' : 'Trades']}
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
          />
          <Bar dataKey={metric} background={{ fill: '#1a1f2c' }}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
            <LabelList dataKey={metric} position="right" formatter={getLabelFormat()} fill="#e5e7eb" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SymbolPerformance; 