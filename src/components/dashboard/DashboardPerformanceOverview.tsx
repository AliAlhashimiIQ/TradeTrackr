import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { TradeMetrics } from '@/lib/types';
import { PerformanceMetrics } from '@/lib/tradeMetrics';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import COLORS, { TRANSITIONS } from '@/lib/colorSystem';
import { CARDS, TEXT, LAYOUT } from '@/lib/designSystem';

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

const DashboardPerformanceOverview: React.FC<DashboardPerformanceOverviewProps> = ({ 
  dateRange,
  metrics,
  equityData,
  advancedMetrics 
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30D');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState({ x: 0, y: 0, value: 0, date: '' });
  
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
  
  // Draw equity curve with SVG
  const renderEquityCurve = () => {
    // Check if we have any trades first
    if (displayMetrics.totalTrades === 0 || !equityData || equityData.labels.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-gray-400">
          No trade data available
        </div>
      );
    }
    
    const width = 600;
    const height = 150;
    
    // Check if data is valid and has balance values
    const validData = equityData.labels.map((label, i) => ({ 
      date: label, 
      balance: equityData.values[i] 
    })).filter(d => 
      d && d.balance !== undefined && !isNaN(d.balance) && d.date
    );
    
    if (validData.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-gray-400">
          No valid equity data available
        </div>
      );
    }
    
    // Calculate min and max values
    const maxBalance = Math.max(...validData.map(d => d.balance));
    const minBalance = Math.min(...validData.map(d => d.balance));
    
    // Add padding to range to avoid points at edges
    const range = maxBalance - minBalance > 0 
      ? maxBalance - minBalance 
      : 1; // Avoid division by zero
    
    // Create points for the area path
    const points = validData.map((d, i) => {
      const x = validData.length > 1 ? (i / (validData.length - 1)) * width : 0;
      const y = height - ((d.balance - minBalance) / range) * height;
      return { x, y };
    });
    
    // Filter out any invalid points
    const validPoints = points.filter(p => !isNaN(p.x) && !isNaN(p.y));
    
    // Create path string
    let pathD = '';
    
    if (validPoints.length > 0) {
      pathD = `M${validPoints[0].x},${validPoints[0].y}`;
      
      for (let i = 1; i < validPoints.length; i++) {
        pathD += ` L${validPoints[i].x},${validPoints[i].y}`;
      }
      
      // Add the bottom corners to create an area
      pathD += ` L${validPoints[validPoints.length - 1].x},${height}`;
      pathD += ` L${validPoints[0].x},${height}`;
      pathD += ' Z';
    }
    
    return (
      <div className="relative h-40">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Grid lines */}
          <line x1="0" y1={height} x2={width} y2={height} stroke="#374151" strokeWidth="1" strokeDasharray="2" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#374151" strokeWidth="1" strokeDasharray="2" />
          <line x1="0" y1="0" x2={width} y2="0" stroke="#374151" strokeWidth="1" strokeDasharray="2" />
          
          {/* Area gradient */}
          <defs>
            <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          {pathD && (
            <path 
              d={pathD} 
              fill="url(#equityGradient)" 
              stroke="none" 
            />
          )}
          
          {/* Line */}
          {validPoints.length > 1 && (
            <path
              d={`M${validPoints[0].x},${validPoints[0].y} ${validPoints.slice(1).map(p => `L${p.x},${p.y}`).join(' ')}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points */}
          {validPoints.map((point, i) => {
            // Add validation to prevent NaN values
            if (isNaN(point.x) || isNaN(point.y)) return null;
            
            return (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill="#3b82f6"
                onMouseOver={(e) => {
                  if (validData[i]) {
                    setTooltipData({ 
                      x: e.clientX, 
                      y: e.clientY, 
                      value: validData[i].balance, 
                      date: validData[i].date 
                    });
                    setShowTooltip(true);
                  }
                }}
                onMouseLeave={() => setShowTooltip(false)}
              />
            );
          })}
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-gray-400">
          <div>{formatCurrency(maxBalance)}</div>
          <div>{formatCurrency(minBalance + range/2)}</div>
          <div>{formatCurrency(minBalance)}</div>
        </div>
        
        {/* Tooltip */}
        {showTooltip && tooltipData && (
          <div 
            className="absolute bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-10"
            style={{ 
              top: tooltipData.y - 70, 
              left: tooltipData.x - 50,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="font-medium">{tooltipData.date}</div>
            <div>{formatCurrency(tooltipData.value)}</div>
          </div>
        )}
      </div>
    );
  };
  
  // Render monthly performance chart
  const renderMonthlyPerformance = () => {
    // Check if we have any trades first
    if (displayMetrics.totalTrades === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-gray-400">
          No trade data available
        </div>
      );
    }
    
    const data = mockPerformanceData.monthlyPerformance;
    const maxProfit = Math.max(...data.map(d => Math.abs(d.profit)));
    
    return (
      <div className="h-40 flex items-end space-x-2">
        {data.map((month, index) => {
          const barHeight = maxProfit > 0 ? (Math.abs(month.profit) / maxProfit) * 100 : 0;
          const isPositive = month.profit >= 0;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="flex items-end w-full">
                <div 
                  className={`w-full rounded-t ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: `${barHeight}%` }}
                >
                  {/* Win rate indicator */}
                  <div 
                    className={`h-1 rounded-full ${month.winRate > 50 ? 'bg-blue-300' : 'bg-yellow-400'}`} 
                    style={{ width: `${month.winRate}%` }} 
                  />
                </div>
              </div>
              <div className="text-gray-400 text-xs mt-1">{month.month}</div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className={`${CARDS.panel} overflow-hidden`}>
      {/* Header with timeframe selector */}
      <div className={`p-4 border-b border-[${COLORS.border.primary}] ${LAYOUT.flexBetween}`}>
        <h2 className={TEXT.heading.h2}>Performance Overview</h2>
        
        <div className={TEXT.body.regular}>
          Showing data for: <span className={`text-[${COLORS.primary}]`}>{dateRange.toUpperCase()}</span>
        </div>
      </div>
      
      {/* Main metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6">
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Total P&L</div>
          <div className={`${TEXT.heading.h3} ${displayMetrics.pnl >= 0 ? `text-[${COLORS.success}]` : `text-[${COLORS.danger}]`}`}>
            {formatCurrency(displayMetrics.pnl)}
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Win Rate</div>
          <div className={`${TEXT.heading.h3} text-[${COLORS.text.primary}]`}>
            {displayMetrics.winRate?.toFixed(1) ?? "0.0"}%
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Avg. Win</div>
          <div className={`${TEXT.heading.h3} text-[${COLORS.success}]`}>
            {formatCurrency(displayMetrics.avgWin)}
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Avg. Loss</div>
          <div className={`${TEXT.heading.h3} text-[${COLORS.danger}]`}>
            {formatCurrency(displayMetrics.avgLoss)}
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Total Trades</div>
          <div className={`${TEXT.heading.h3} text-[${COLORS.text.primary}]`}>
            {displayMetrics.totalTrades}
          </div>
        </div>
      </div>
      
      {/* Equity curve */}
      <div className="p-6 pt-0">
        <div className={`mb-2 ${LAYOUT.flexBetween}`}>
          <div className={`${TEXT.body.regular} font-medium text-[${COLORS.text.primary}]`}>Equity Curve</div>
        </div>
        
        {renderEquityCurve()}
      </div>
      
      {/* Risk metrics */}
      <div className={`grid grid-cols-5 gap-4 p-4 border-t border-[${COLORS.border.primary}] bg-[${COLORS.background.medium}]`}>
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Max Drawdown</div>
          <div className={`${TEXT.body.regular} font-medium text-[${COLORS.text.primary}]`}>
            {riskMetrics.maxDrawdown}%
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Avg R:R Ratio</div>
          <div className={`${TEXT.body.regular} font-medium text-[${COLORS.text.primary}]`}>
            {riskMetrics.avgRiskReward}
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Sharpe Ratio</div>
          <div className={`${TEXT.body.regular} font-medium text-[${COLORS.text.primary}]`}>
            {riskMetrics.sharpeRatio}
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Success Rate</div>
          <div className={`${TEXT.body.regular} font-medium text-[${COLORS.text.primary}]`}>
            {riskMetrics.successRate}%
          </div>
        </div>
        
        <div>
          <div className={`${TEXT.body.small} text-[${COLORS.text.tertiary}] mb-1`}>Avg Days Held</div>
          <div className={`${TEXT.body.regular} font-medium text-[${COLORS.text.primary}]`}>
            {riskMetrics.averageDaysHeld} days
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPerformanceOverview; 