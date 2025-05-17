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
        <div className="bg-[#1f2937] p-3 rounded-lg shadow-lg border border-gray-700 text-xs">
          <p className="font-bold text-white mb-1">
            {isWin ? 'Winning' : 'Losing'} Trades
          </p>
          <p className="text-gray-300 mb-1">Range: {formatCurrency(values[0])} to {formatCurrency(values[1])}</p>
          <p className="text-gray-300">Frequency: {item.percentage.toFixed(2)}%</p>
          <p className="text-gray-300">Count: {item.count} trades</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#131825] rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Win/Loss Distribution
        </div>
        {isClient && (
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1 text-gray-300 text-xs">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
              />
              <span>Show Labels</span>
            </label>
          </div>
        )}
      </div>
      
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="text-lg font-semibold text-white">
            {formattedStats.winRate}
            <span className="text-xs text-gray-500 ml-2">
              ({stats.winningTrades}/{stats.winningTrades + stats.losingTrades})
            </span>
          </div>
        </div>
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <div className="text-xs text-gray-400 mb-1">Risk/Reward</div>
          <div className={`text-lg font-semibold ${Number(formattedStats.riskRewardRatio) >= 1 ? 'text-green-400' : 'text-red-400'}`}>
            {formattedStats.riskRewardRatio}
          </div>
        </div>
        <div className="bg-[#1a1f2c] p-2 rounded-md flex justify-between">
          <div>
            <div className="text-xs text-green-400">Avg Win</div>
            <div className="text-sm font-semibold text-white">{formattedStats.averageWin}</div>
          </div>
          <div>
            <div className="text-xs text-red-400">Avg Loss</div>
            <div className="text-sm font-semibold text-white">{formattedStats.averageLoss}</div>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#212946" />
            <XAxis
              dataKey="range"
              stroke="#6b7280"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={50}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
              label={{ 
                value: 'Frequency (%)', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fill: '#9ca3af', fontSize: 12 } 
              }}
            />
            <Tooltip
              content={customTooltip}
              cursor={{ fill: 'rgba(107, 114, 128, 0.2)' }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            
            {/* Add reference line at zero */}
            <ReferenceLine 
              x={zeroIndex !== -1 ? sortedData[zeroIndex].range : undefined}
              stroke="#6b7280" 
              strokeDasharray="3 3"
              label={{
                value: 'Break Even',
                position: 'top',
                fill: '#9ca3af',
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
                    stroke={isWin ? '#059669' : '#dc2626'}
                    strokeWidth={1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Insights */}
      <div className="text-xs text-gray-400 mt-4 bg-[#1a1f2c]/50 p-2 rounded-lg">
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