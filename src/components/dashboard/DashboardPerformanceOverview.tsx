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

// Mock performance data for initial development
const mockPerformanceData = {
  accountStats: {
    balance: 25432.78,
    totalPnL: 4328.92,
    percentageGain: 17.28,
    winRate: 62.5,
    profitFactor: 2.35
  },
  riskMetrics: {
    maxDrawdown: 8.4,
    avgRiskReward: 1.8,
    sharpeRatio: 1.34,
    successRate: 63.2,
    averageDaysHeld: 3.5
  },
  // Mock equity curve data - dates and balance values
  equityCurveData: [
    { date: '2023-01-01', balance: 21000 },
    { date: '2023-02-01', balance: 22100 },
    { date: '2023-03-01', balance: 21800 },
    { date: '2023-04-01', balance: 22500 },
    { date: '2023-05-01', balance: 23100 },
    { date: '2023-06-01', balance: 22800 },
    { date: '2023-07-01', balance: 23500 },
    { date: '2023-08-01', balance: 24200 },
    { date: '2023-09-01', balance: 24800 },
    { date: '2023-10-01', balance: 25100 },
    { date: '2023-11-01', balance: 24700 },
    { date: '2023-12-01', balance: 25400 }
  ],
  // Monthly performance data
  monthlyPerformance: [
    { month: 'Jan', profit: 1100, trades: 12, winRate: 66 },
    { month: 'Feb', profit: -300, trades: 8, winRate: 38 },
    { month: 'Mar', profit: 700, trades: 10, winRate: 70 },
    { month: 'Apr', profit: 600, trades: 9, winRate: 55 },
    { month: 'May', profit: -300, trades: 11, winRate: 45 },
    { month: 'Jun', profit: 700, trades: 14, winRate: 64 },
    { month: 'Jul', profit: 700, trades: 13, winRate: 62 },
    { month: 'Aug', profit: 600, trades: 12, winRate: 58 },
    { month: 'Sep', profit: 300, trades: 7, winRate: 57 },
    { month: 'Oct', profit: -400, trades: 9, winRate: 33 },
    { month: 'Nov', profit: 700, trades: 10, winRate: 70 }
  ],
  // Current trading streak
  currentStreak: {
    type: 'win', // 'win' or 'loss'
    count: 4
  }
};

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
    { label: 'Win Rate', value: `${(metrics.win_rate * 100).toFixed(1)}%`, color: 'text-blue-400' },
    { label: 'Profit Factor', value: advancedMetrics?.profitFactor.toFixed(2) || 'N/A', color: 'text-green-400' },
    { label: 'Avg. Win', value: `$${metrics.avg_win.toFixed(2)}`, color: 'text-green-400' },
    { label: 'Avg. Loss', value: `$${metrics.avg_loss.toFixed(2)}`, color: 'text-red-400' },
    { label: 'Risk/Reward', value: advancedMetrics?.riskRewardRatio.toFixed(2) || 'N/A', color: 'text-purple-400' },
    { label: 'Max Drawdown', value: advancedMetrics ? `${advancedMetrics.maxDrawdownPercent.toFixed(2)}%` : 'N/A', color: 'text-amber-400' },
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
        ) : equityData.values.length > 0 ? (
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