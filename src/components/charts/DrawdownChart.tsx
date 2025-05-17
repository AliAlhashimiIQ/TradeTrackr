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

  // Find maximum drawdown for referencing
  const maxDrawdownPercent = Math.max(...data.map(d => d.drawdownPercent));
  
  // Add reference lines at specific drawdown percentages
  const referenceLevels = [5, 10, 20, 30].filter(level => level <= maxDrawdownPercent * 1.5);
  
  return (
    <div className="w-full h-64 bg-[#131825] rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#212946" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#6b7280' }}
            tickFormatter={formatPercentage}
            // Invert Y-axis to show drawdowns going down
            orientation="right"
            domain={[0, Math.ceil(maxDrawdownPercent * 1.2)]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
            labelFormatter={(label) => formatDate(label)}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
          
          {/* Reference lines for drawdown levels */}
          {referenceLevels.map(level => (
            <ReferenceLine 
              key={`ref-${level}`}
              y={level} 
              stroke="#ef4444" 
              strokeDasharray="3 3"
              strokeOpacity={0.6} 
              label={{ 
                value: `${level}%`, 
                position: 'right', 
                fill: '#ef4444', 
                fontSize: 10 
              }} 
            />
          ))}
          
          {/* Drawdown Area */}
          <Area
            type="monotone"
            dataKey="drawdownPercent"
            name="Drawdown"
            fill="#ef4444"
            fillOpacity={0.4}
            stroke="#ef4444"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DrawdownChart; 