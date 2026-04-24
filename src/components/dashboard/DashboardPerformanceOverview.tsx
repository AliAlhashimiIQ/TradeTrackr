'use client'

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, LineChart, PieChart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TradeMetrics, PerformanceMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import COLORS, { TRANSITIONS } from '@/lib/colorSystem';
import { CARDS, TEXT, LAYOUT } from '@/lib/designSystem';
import EquityCurve from '@/components/charts/EquityCurve';

// Types for component props
interface DashboardPerformanceOverviewProps {
  dateRange: DateRange;
  metrics: TradeMetrics;
  equityData: { labels: string[], values: number[] };
  advancedMetrics: PerformanceMetrics | null;
}

// Type for mock data (will be replaced later)
type TimeframeOption = '7D' | '30D' | '90D' | 'YTD' | 'ALL';

type ChartType = 'line' | 'bar' | 'pie';

const DashboardPerformanceOverview: React.FC<DashboardPerformanceOverviewProps> = ({ 
  dateRange,
  metrics,
  equityData,
  advancedMetrics 
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30D');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState({ x: 0, y: 0, value: 0, date: '' });
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isLoading, setIsLoading] = useState(false);
  
  // Only show metrics if there are trades
  const hasTrades = metrics?.total_trades && metrics.total_trades > 0;

  // Health score calculation (0-100)
  let healthScore = 0;
  if (hasTrades) {
    const winRate = metrics.win_rate || 0;
    const riskReward = advancedMetrics?.riskRewardRatio || 0;
    const drawdown = advancedMetrics?.maxDrawdownPercent || 0;
    // Weighted formula: Win Rate (40%), Risk/Reward (35%), Drawdown (25%)
    healthScore = Math.round(
      (winRate * 100) * 0.4 +
      Math.min(riskReward * 50, 35) + // Cap risk/reward contribution
      Math.max(0, 25 - drawdown * 2.5) // Lower score for higher drawdown
    );
    healthScore = Math.max(0, Math.min(100, healthScore));
  }
  
  // Use the real metrics if available
  const displayMetrics = {
    pnl: metrics?.total_pnl ?? 0,
    winRate: metrics?.win_rate !== undefined ? (metrics.win_rate * 100) : 0,
    avgWin: metrics?.avg_win ?? 0,
    avgLoss: metrics?.avg_loss ?? 0,
    totalTrades: metrics?.total_trades ?? 0
  };
  
  // Use advanced metrics if available
  const riskMetrics = advancedMetrics ? {
    maxDrawdown: advancedMetrics.maxDrawdownPercent?.toFixed(2) || '0.00',
    avgRiskReward: advancedMetrics.riskRewardRatio?.toFixed(2) || '0.00',
    sharpeRatio: advancedMetrics.sharpeRatio?.toFixed(2) || '0.00',
    successRate: advancedMetrics.winRate?.toFixed(1) || '0.0',
    averageDaysHeld: '2.3' // This would need to be calculated from trade data
  } : {
    maxDrawdown: '0.00',
    avgRiskReward: '0.00',
    sharpeRatio: '0.00',
    successRate: '0.0',
    averageDaysHeld: '0.0'
  };
  
  // Format equity data for the selected chart
  const formattedEquityData = equityData.labels.map((date, index) => ({
    date,
    value: equityData.values[index]
  }));
  
  // Sample performance metrics to display
  const displayMetricsSample = [
    { label: 'Win Rate', value: hasTrades ? `${(metrics.win_rate * 100).toFixed(1)}%` : 'N/A', color: 'text-blue-400' },
    { label: 'Profit Factor', value: hasTrades && advancedMetrics ? advancedMetrics.profitFactor.toFixed(2) : 'N/A', color: 'text-green-400' },
    { label: 'Avg. Win', value: hasTrades ? `$${metrics.avg_win.toFixed(2)}` : 'N/A', color: 'text-green-400' },
    { label: 'Avg. Loss', value: hasTrades ? `$${metrics.avg_loss.toFixed(2)}` : 'N/A', color: 'text-red-400' },
    { label: 'Risk/Reward', value: hasTrades && advancedMetrics ? advancedMetrics.riskRewardRatio.toFixed(2) : 'N/A', color: 'text-purple-400' },
    { label: 'Max Drawdown', value: hasTrades && advancedMetrics ? `${advancedMetrics.maxDrawdownPercent.toFixed(2)}%` : 'N/A', color: 'text-amber-400' },
  ];
  
  return (
    <div className={`${CARDS.panel} overflow-hidden`}>
      {/* Header with timeframe selector */}
      <div className={`p-4 border-b border-[${COLORS.border.primary}] ${LAYOUT.flexBetween}`}>
        <h2 className={TEXT.heading.h2}>Performance Overview</h2>
        
        <div className={TEXT.body.regular}>
          Showing data for: <span className={`text-[${COLORS.primary}]`}>{dateRange.toUpperCase()}</span>
        </div>
      </div>
      
      {/* Chart Type Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-white">Performance Overview</h3>
        
        <div className="flex items-center bg-[#1a1e2d] rounded-lg p-1 space-x-1">
          <button 
            onClick={() => setChartType('line')}
            className={`p-2 rounded-md ${chartType === 'line' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            } transition-colors`}
          >
            <LineChart size={16} />
          </button>
          <button 
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-md ${chartType === 'bar' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            } transition-colors`}
          >
            <BarChart size={16} />
          </button>
          <button 
            onClick={() => setChartType('pie')}
            className={`p-2 rounded-md ${chartType === 'pie' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            } transition-colors`}
          >
            <PieChart size={16} />
          </button>
        </div>
      </div>
      
      {/* Chart display */}
      <div className="bg-[#1a1e2d] rounded-xl overflow-hidden mb-6 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : hasTrades && equityData.values.length > 0 ? (
          <div className="h-80">
            <EquityCurve 
              data={formattedEquityData}
              type={chartType}
              initialCapital={10000}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-80 text-gray-400">
            No performance data available for the selected period
          </div>
        )}
      </div>
      
      {/* Health Score */}
      <div className="my-6 flex flex-col items-center">
        {hasTrades ? (
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{healthScore}/100</div>
            <div className="text-sm text-gray-400">Trading Health Score</div>
          </div>
        ) : (
          <div className="text-gray-400 text-center">Add more trades to see your Trading Health Score.</div>
        )}
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {displayMetricsSample.map((metric, index) => (
          <div 
            key={index}
            className="bg-[#1a1e2d] rounded-lg p-4"
          >
            <div className="text-sm text-gray-400 mb-1">{metric.label}</div>
            <div className={`text-xl font-bold ${metric.color}`}>{metric.value}</div>
          </div>
        ))}
      </div>
      
      {/* Date Range Info */}
      <div className="mt-6 text-xs text-gray-400 text-center">
        Showing data for: {getDateRangeDescription(dateRange)}
      </div>
    </div>
  );
};

function getDateRangeDescription(range: DateRange): string {
  const now = new Date();
  
  switch (range) {
    case '7d':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return `Last 7 days (${formatDate(sevenDaysAgo)} - ${formatDate(now)})`;
    case '30d':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return `Last 30 days (${formatDate(thirtyDaysAgo)} - ${formatDate(now)})`;
    case '90d':
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      return `Last 90 days (${formatDate(ninetyDaysAgo)} - ${formatDate(now)})`;
    case '1y':
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return `Last year (${formatDate(oneYearAgo)} - ${formatDate(now)})`;
    case 'all':
      return 'All time';
    default:
      return 'Custom date range';
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export default DashboardPerformanceOverview; 
