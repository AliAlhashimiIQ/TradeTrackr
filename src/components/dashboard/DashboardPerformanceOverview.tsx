'use client'

import React, { useState } from 'react';
import { BarChart, LineChart, PieChart } from 'lucide-react';
import { TradeMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import EquityCurve from '@/components/charts/EquityCurve';

// Types for component props
interface DashboardPerformanceOverviewProps {
  dateRange: DateRange;
  metrics: TradeMetrics;
  equityData: { labels: string[], values: number[] };
  advancedMetrics: any | null;
}

type ChartType = 'line' | 'bar' | 'pie';

const DashboardPerformanceOverview: React.FC<DashboardPerformanceOverviewProps> = ({ 
  dateRange,
  metrics,
  equityData,
  advancedMetrics 
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const isLoading = false;
  
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
    <div className="rounded-2xl overflow-hidden">
      {/* Header with timeframe selector */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Performance Overview</h2>
        
        <div className="text-sm text-slate-400">
          Showing data for: <span className="text-slate-200">{dateRange.toUpperCase()}</span>
        </div>
      </div>
      
      {/* Chart Type Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-5 pt-5 mb-5 gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Equity Curve</h3>
        
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 space-x-1">
          <button 
            onClick={() => setChartType('line')}
            className={`p-2 rounded-md ${chartType === 'line' 
              ? 'bg-slate-200 text-slate-900' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } transition-colors`}
          >
            <LineChart size={16} />
          </button>
          <button 
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-md ${chartType === 'bar' 
              ? 'bg-slate-200 text-slate-900' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } transition-colors`}
          >
            <BarChart size={16} />
          </button>
          <button 
            onClick={() => setChartType('pie')}
            className={`p-2 rounded-md ${chartType === 'pie' 
              ? 'bg-slate-200 text-slate-900' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } transition-colors`}
          >
            <PieChart size={16} />
          </button>
        </div>
      </div>
      
      {/* Chart display */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden mx-5 mb-6 p-4">
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
            <div className="text-4xl font-semibold text-indigo-300 mb-2">{healthScore}/100</div>
            <div className="text-sm text-slate-400">Trading Health Score</div>
          </div>
        ) : (
          <div className="text-slate-400 text-center">Add more trades to see your Trading Health Score.</div>
        )}
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-5">
        {displayMetricsSample.map((metric, index) => (
          <div 
            key={index}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">{metric.label}</div>
            <div className={`text-xl font-bold ${metric.color}`}>{metric.value}</div>
          </div>
        ))}
      </div>
      
      {/* Date Range Info */}
      <div className="mt-6 pb-5 text-xs text-slate-500 text-center">
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
