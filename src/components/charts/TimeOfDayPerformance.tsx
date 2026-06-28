'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TimeOfDayPerformance as TimeOfDayPerformanceType } from '@/lib/tradeMetrics';

interface TimeOfDayPerformanceProps {
  data: TimeOfDayPerformanceType[];
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
 * TimeOfDayPerformance component displays trade performance broken down by time of day
 */
const TimeOfDayPerformance: React.FC<TimeOfDayPerformanceProps> = ({
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

  // Transform the data for the chart
  const chartData = [...data].sort((a, b) => {
    // Sort by the order of time slots (pre-market first, etc.)
    const timeSlots = [
      'Pre-Market (4am-9:30am)',
      'Morning (9:30am-12pm)',
      'Afternoon (12pm-4pm)',
      'Evening (4pm-8pm)',
      'Night (8pm-4am)',
    ];
    return timeSlots.indexOf(a.timeSlot) - timeSlots.indexOf(b.timeSlot);
  }).map(item => ({
    timeSlot: item.timeSlot.split(' ')[0], // Just use first word for display
    fullName: item.timeSlot,
    pnL: item.pnL,
    trades: item.trades,
    winRate: item.winRate,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = chartData.find(d => d.timeSlot === label);
      const fullName = item ? item.fullName : label;
      const pnlVal = payload.find((p: any) => p.dataKey === 'pnL')?.value;
      const wrVal = payload.find((p: any) => p.dataKey === 'winRate')?.value;

      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">{fullName}</p>
          {pnlVal !== undefined && (
            <p className={`text-xs font-semibold ${pnlVal >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'} mb-1`}>
              P&L: <span className="font-mono font-bold">{formatCurrency(pnlVal)}</span>
            </p>
          )}
          {wrVal !== undefined && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Win Rate: <span className="font-mono font-bold">{formatPercent(wrVal)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" vertical={false} />
            <XAxis 
              dataKey="timeSlot" 
              stroke="#6b7280"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              tickLine={{ stroke: '#6b7280' }}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              tickLine={{ stroke: '#6b7280' }}
              tickFormatter={formatPercent}
              domain={[0, 100]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(128, 128, 128, 0.05)' }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            <ReferenceLine yAxisId="left" y={0} stroke="#4b5563" />
            <Bar 
              yAxisId="left"
              dataKey="pnL" 
              name="P&L" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="right"
              dataKey="winRate" 
              name="Win Rate" 
              fill="#f59e0b" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TimeOfDayPerformance; 
