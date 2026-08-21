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
        <div className="bg-white dark:bg-[var(--tooltip-bg)] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="text-slate-800 dark:text-slate-100 font-bold mb-1.5">{data.name}</p>
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

  // Calculate Disciplined vs Actual financial impact metrics
  const actualNetPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  
  const cleanTrades = trades.filter((t) => !t.mistakes || t.mistakes.length === 0);
  const disciplinedNetPnL = cleanTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const totalMistakeCost = trades
    .filter((t) => t.mistakes && t.mistakes.length > 0 && t.profit_loss < 0)
    .reduce((sum, t) => sum + t.profit_loss, 0);

  // Calculate profit factors
  const calcPF = (tradeList: Trade[]) => {
    const wins = tradeList.filter((t) => t.profit_loss > 0).reduce((s, t) => s + t.profit_loss, 0);
    const losses = Math.abs(tradeList.filter((t) => t.profit_loss < 0).reduce((s, t) => s + t.profit_loss, 0));
    return losses === 0 ? (wins > 0 ? 99.9 : 0) : wins / losses;
  };

  const actualPF = calcPF(trades);
  const disciplinedPF = calcPF(cleanTrades);
  const pnlDifference = Math.abs(disciplinedNetPnL - actualNetPnL);

  return (
    <div className="w-full space-y-4">
      {/* Financial Leak & Discipline Impact Banner */}
      <div className="bg-slate-50 dark:bg-[var(--surface-0)] border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] mb-1">
              Disciplined Execution Leak Analysis
            </div>
            <div className="text-slate-800 dark:text-slate-200">
              Eliminating mistake trades would adjust net P&L from{' '}
              <span className={`font-mono font-bold ${actualNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {actualNetPnL >= 0 ? '+' : ''}{formatCurrency(actualNetPnL)}
              </span>{' '}
              to{' '}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(disciplinedNetPnL)}
              </span>{' '}
              (<span className="text-emerald-600 dark:text-emerald-400 font-bold">+{formatCurrency(pnlDifference)}</span> recovered).
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-3.5 py-2 rounded-lg shrink-0 font-mono text-[11px] shadow-sm">
            <div>
              <div className="text-slate-500 text-[10px]">Actual PF</div>
              <div className="text-slate-900 dark:text-slate-200 font-bold">{actualPF.toFixed(2)}</div>
            </div>
            <div className="text-slate-400 dark:text-slate-600">→</div>
            <div>
              <div className="text-emerald-600 dark:text-emerald-400 text-[10px]">Disciplined PF</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">{disciplinedPF.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-72">
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
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#475569"
              width={110}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.03)' }} />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.cost < 0 ? '#ef4444' : '#10b981'} 
                  fillOpacity={0.95}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MistakesCostChart;
