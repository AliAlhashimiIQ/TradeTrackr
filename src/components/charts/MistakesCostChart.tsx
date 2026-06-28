'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Trade } from '@/lib/types';

interface MistakesCostChartProps {
  trades: Trade[];
}

const MistakesCostChart: React.FC<MistakesCostChartProps> = ({ trades }) => {
  // Process trades to get cost per mistake
  const mistakeData: { [key: string]: { name: string, cost: number, count: number } } = {};
  
  trades.forEach(trade => {
    if (trade.mistakes && trade.mistakes.length > 0) {
      trade.mistakes.forEach(mistake => {
        if (!mistakeData[mistake]) {
          mistakeData[mistake] = { name: mistake, cost: 0, count: 0 };
        }
        mistakeData[mistake].cost += trade.profit_loss;
        mistakeData[mistake].count += 1;
      });
    }
  });

  const data = Object.values(mistakeData)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 8); // Keep top mistakes only for readability

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="text-slate-850 dark:text-slate-100 font-bold mb-1.5">{data.name}</p>
          <p className={`text-xs font-semibold ${data.cost < 0 ? 'text-rose-600 dark:text-red-400' : 'text-emerald-600 dark:text-green-400'} mb-1`}>
            Total Impact: <span className="font-mono font-bold">{formatCurrency(data.cost)}</span>
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Occurrences: <span className="font-bold">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-white/[0.05]">
        <svg className="w-12 h-12 text-slate-300 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-slate-400 dark:text-gray-500 text-sm">No mistakes logged yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            stroke="#6b7280"
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.03)' }} />
          <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.cost < 0 ? '#f87171' : '#34d399'} 
                fillOpacity={0.95}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MistakesCostChart;
