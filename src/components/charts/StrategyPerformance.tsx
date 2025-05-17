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
    <div className="w-full h-80 bg-[#131825] rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Strategy Performance
        </div>
        <div className="flex items-center space-x-4">
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
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('bar')}
              className={`px-2 py-1 text-xs rounded ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('radar')}
              className={`px-2 py-1 text-xs rounded ${chartType === 'radar' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300'}`}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#212946" horizontal={false} />
            <XAxis
              type="number"
              stroke="#6b7280"
              domain={metric === 'winRate' ? [0, 100] : ['auto', 'auto']}
              tickFormatter={metric === 'pnL' ? formatCurrency : metric === 'winRate' ? formatPercent : undefined}
            />
            <YAxis
              type="category"
              dataKey="strategy"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
            />
            <Bar dataKey={metric} background={{ fill: '#1a1f2c' }}>
              {strategies.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={normalizedData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="strategy" tick={{ fill: '#d1d5db', fontSize: 10 }} />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: '#9ca3af' }}
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
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} 
            />
          </RadarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default StrategyPerformance; 