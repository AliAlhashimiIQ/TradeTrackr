'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { TradeDistribution } from '@/lib/tradeMetrics';

interface WinLossDistributionProps {
  data: TradeDistribution[];
  loading?: boolean;
}

interface StatsData {
  winningTrades: number;
  losingTrades: number;
  winPercentage: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
}

// Consistent color system
const COLORS = {
  win: '#10b981', // Green
  loss: '#ef4444', // Red
  highlight: '#3b82f6', // Blue
  background: '#1a1f2c',
  lightBackground: '#252a38',
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    tertiary: '#6b7280'
  }
};

const calculateStats = (data: TradeDistribution[]): StatsData => {
  let winningTrades = 0;
  let losingTrades = 0;
  let winningTotal = 0;
  let losingTotal = 0;
  let largestWin = 0;
  let largestLoss = 0;
  
  data.forEach(item => {
    const values = item.range.split(' to ').map(parseFloat);
    const midPoint = (values[0] + values[1]) / 2;
    
    if (midPoint >= 0) {
      winningTrades += item.count;
      winningTotal += midPoint * item.count;
      largestWin = Math.max(largestWin, values[1]);
    } else {
      losingTrades += item.count;
      losingTotal += midPoint * item.count;
      largestLoss = Math.min(largestLoss, values[0]);
    }
  });
  
  const totalTrades = winningTrades + losingTrades;
  const winPercentage = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const averageWin = winningTrades > 0 ? winningTotal / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? losingTotal / losingTrades : 0;
  
  return {
    winningTrades,
    losingTrades,
    winPercentage,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss
  };
};

// Consistent formatting functions that work the same on server and client
const formatCurrency = (value: number) => {
  return `$${Math.abs(value).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
};

const customLabel = (props: any) => {
  const { x, y, width, value } = props;
  
  // Only show labels for bars with significant percentages
  if (value < 3) return null;
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 10} 
      fill="#9ca3af" 
      textAnchor="middle" 
      fontSize={10}
    >
      {value}%
    </text>
  );
};

/**
 * WinLossDistribution component displays a histogram of P&L distribution
 * with winning and losing trades color-coded
 */
const WinLossDistribution: React.FC<WinLossDistributionProps> = ({
  data,
  loading = false,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [highlightWins, setHighlightWins] = useState(false);
  const [highlightLosses, setHighlightLosses] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  
  // Only enable interactive features after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);
  
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

  // Function to determine if a range represents a win or loss
  const isWinningRange = (range: string): boolean => {
    const values = range.split(' to ').map(parseFloat);
    return values[0] >= 0 || values[1] > 0;
  };
  
  // Get midpoint value of each range for sorting
  const getMidpoint = (range: string): number => {
    const values = range.split(' to ').map(parseFloat);
    return (values[0] + values[1]) / 2;
  };
  
  // Sort the data by range values
  const sortedData = [...data].sort((a, b) => getMidpoint(a.range) - getMidpoint(b.range));
  
  // Calculate statistics
  const stats = calculateStats(data);
  
  // Format for display
  const formattedStats = {
    riskRewardRatio: Math.abs(stats.averageWin / stats.averageLoss).toFixed(2),
    winRate: stats.winPercentage.toFixed(1) + '%',
    averageWin: formatCurrency(stats.averageWin),
    averageLoss: formatCurrency(stats.averageLoss),
    largestWin: formatCurrency(stats.largestWin),
    largestLoss: formatCurrency(stats.largestLoss),
  };
  
  // Find the zero point for reference line
  const zeroIndex = sortedData.findIndex(item => {
    const values = item.range.split(' to ').map(parseFloat);
    return values[0] <= 0 && values[1] >= 0;
  });
  
  // Custom tooltip with more information
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const values = item.range.split(' to ').map(parseFloat);
      const midPoint = (values[0] + values[1]) / 2;
      const isWin = midPoint >= 0;
      
      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            {isWin ? 'Winning' : 'Losing'} Trades Range
          </p>
          <p className="text-slate-650 dark:text-slate-300 mb-1">Range: <span className="font-mono font-semibold">{formatCurrency(values[0])} to {formatCurrency(values[1])}</span></p>
          <p className="text-slate-655 dark:text-slate-300 mb-1">Frequency: <span className="font-mono font-semibold">{item.percentage.toFixed(2)}%</span></p>
          <p className="text-slate-655 dark:text-slate-300">Count: <span className="font-mono font-bold text-slate-900 dark:text-white">{item.count} trades</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Win/Loss Distribution
        </div>
        {isClient && (
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1.5 text-slate-600 dark:text-gray-305 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-300 dark:border-white/10 dark:bg-slate-900"
              />
              <span>Show Labels</span>
            </label>
          </div>
        )}
      </div>
      
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-baseline gap-1.5">
            {formattedStats.winRate}
            <span className="text-[10px] text-slate-405 dark:text-gray-500 font-semibold font-mono">
              ({stats.winningTrades}/{stats.winningTrades + stats.losingTrades})
            </span>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Risk/Reward</div>
          <div className={`text-base font-bold ${Number(formattedStats.riskRewardRatio) >= 1 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'}`}>
            {formattedStats.riskRewardRatio}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-green-400 uppercase tracking-wider mb-0.5">Avg Win</div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{formattedStats.averageWin}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-rose-600 dark:text-red-400 uppercase tracking-wider mb-0.5">Avg Loss</div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{formattedStats.averageLoss}</div>
          </div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 5, left: 5, bottom: 30 }}
            onMouseMove={isClient ? (e) => {
              if (e && e.activeTooltipIndex !== undefined) {
                const isWin = isWinningRange(sortedData[e.activeTooltipIndex].range);
                setHighlightWins(isWin);
                setHighlightLosses(!isWin);
              }
            } : undefined}
            onMouseLeave={isClient ? () => {
              setHighlightWins(false);
              setHighlightLosses(false);
            } : undefined}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.4} />
            <XAxis
              dataKey="range"
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={{ stroke: '#334155' }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={50}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={{ stroke: '#334155' }}
              label={{ 
                value: 'Frequency (%)', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#94a3b8', fontSize: 11 } 
              }}
            />
            <Tooltip
              content={customTooltip}
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
            
            {/* Add reference line at zero */}
            <ReferenceLine 
              x={zeroIndex !== -1 ? sortedData[zeroIndex].range : undefined}
              stroke="#64748b" 
              strokeDasharray="3 4"
              label={{
                value: 'Break Even',
                position: 'top',
                fill: '#94a3b8',
                fontSize: 10
              }}
            />
            
            <Bar 
              dataKey="percentage" 
              name="Distribution" 
            >
              {isClient && showLabels && <LabelList content={customLabel} position="top" />}
              {sortedData.map((entry, index) => {
                const isWin = isWinningRange(entry.range);
                // Opacity based on hover highlight
                const opacity = 
                  (!isClient || (highlightWins && isWin) || 
                  (highlightLosses && !isWin) || 
                  (!highlightWins && !highlightLosses)) ? 0.8 : 0.2;
                  
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isWin ? COLORS.win : COLORS.loss} 
                    fillOpacity={opacity}
                    stroke={isWin ? '#34d399' : '#f87171'}
                    strokeWidth={0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Insights */}
      <div className="text-xs text-slate-400 mt-4 bg-slate-900/50 border border-slate-800 p-2 rounded-lg">
        <p>
          {stats.winPercentage > 50 
            ? "You have a positive win rate. " 
            : "Your win rate is below 50%. "}
          
          {stats.averageWin > Math.abs(stats.averageLoss)
            ? "Your average win is larger than your average loss, which is optimal for long-term profitability."
            : "Your average loss is larger than your average win. Consider adjusting your risk management strategy."}
        </p>
      </div>
    </div>
  );
};

export default WinLossDistribution; 
