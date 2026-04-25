'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TimeSeriesPerformance } from '@/lib/tradeMetrics';

interface DrawdownChartProps {
  data: TimeSeriesPerformance[];
  loading?: boolean;
}

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * DrawdownChart component displays the drawdown percentage over time
 * to visualize periods of losses and recovery
 */
const DrawdownChart: React.FC<DrawdownChartProps> = ({
  data,
  loading = false,
}) => {
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

  // Find maximum drawdown for referencing
  const maxDrawdownPercent = Math.max(...data.map(d => d.drawdownPercent));
  
  // Add reference lines at specific drawdown percentages
  const referenceLevels = [5, 10, 20, 30].filter(level => level <= maxDrawdownPercent * 1.5);
  
  return (
    <div className="w-full h-64 rounded-xl p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.4} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#64748b"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={{ stroke: '#334155' }}
            tickFormatter={formatPercentage}
            // Invert Y-axis to show drawdowns going down
            orientation="right"
            domain={[0, Math.ceil(maxDrawdownPercent * 1.2)]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(2,6,23,0.95)', borderColor: '#334155', color: '#e2e8f0', borderRadius: '12px' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
            labelFormatter={(label) => formatDate(label)}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
          
          {/* Reference lines for drawdown levels */}
          {referenceLevels.map(level => (
            <ReferenceLine 
              key={`ref-${level}`}
              y={level} 
              stroke="#f87171" 
              strokeDasharray="3 4"
              strokeOpacity={0.55} 
              label={{ 
                value: `${level}%`, 
                position: 'right', 
                fill: '#fca5a5', 
                fontSize: 10 
              }} 
            />
          ))}
          
          {/* Drawdown Area */}
          <Area
            type="monotone"
            dataKey="drawdownPercent"
            name="Drawdown"
            fill="#f87171"
            fillOpacity={0.22}
            stroke="#f87171"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DrawdownChart; 
