import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { formatCurrency } from '@/lib/utils';
import TradeInsights from '@/components/ai/TradeInsights';
import TradeSuggestions from '@/components/ai/TradeSuggestions';
import { useTrades } from '@/hooks/useTrades';
import { calculateMaxDrawdown, calculatePerformanceMetrics } from '@/lib/tradeMetrics';
// ...existing code...

// Types for calendar
type CalendarView = 'month' | 'week';
type MonthData = { [date: string]: { trades: number; pnl: number; type: string } };

interface DashboardAdvancedFeaturesProps {
  dateRange: DateRange;
}

// Helper: Calculate Pearson correlation between two arrays
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.map((xi, i) => (xi - meanX) * (y[i] - meanY)).reduce((a, b) => a + b, 0);
  const denX = Math.sqrt(x.map(xi => (xi - meanX) ** 2).reduce((a, b) => a + b, 0));
  const denY = Math.sqrt(y.map(yi => (yi - meanY) ** 2).reduce((a, b) => a + b, 0));
  return denX && denY ? num / (denX * denY) : 0;
}

// Helper: Calculate instrument correlations
import type { Trade } from '@/lib/types';

function getInstrumentCorrelations(trades: Trade[]): { pair: [string, string]; correlation: number }[] {
  // Group trades by symbol
  const symbolMap: Record<string, Trade[]> = {};
  trades.forEach(trade => {
    if (!symbolMap[trade.symbol]) symbolMap[trade.symbol] = [];
    symbolMap[trade.symbol].push(trade);
  });
  // Only consider symbols with enough trades
  const symbols = Object.keys(symbolMap).filter((s: string) => symbolMap[s].length >= 3);
  const pairs = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const s1 = symbols[i], s2 = symbols[j];
      // Align by date
      const map1: Record<string, number> = {};
      symbolMap[s1].forEach((t: Trade) => { map1[t.entry_time] = t.profit_loss; });
      const map2: Record<string, number> = {};
      symbolMap[s2].forEach((t: Trade) => { map2[t.entry_time] = t.profit_loss; });
      const commonDates = Object.keys(map1).filter((d: string) => d in map2);
      if (commonDates.length >= 3) {
        const x = commonDates.map((d: string) => map1[d]);
        const y = commonDates.map((d: string) => map2[d]);
        const corr = pearsonCorrelation(x, y);
        pairs.push({ pair: [s1, s2], correlation: corr });
      }
    }
  }
  return pairs;
}

// Helper: Check position size consistency
function isPositionSizeConsistent(trades: Trade[], window = 5, threshold = 0.2): boolean {
  if (trades.length < window) return null;
  const recent = trades.slice(-window);
  const sizes = recent.map((t: Trade) => Math.abs(t.quantity));
  const mean = sizes.reduce((a: number, b: number) => a + b, 0) / sizes.length;
  const std = Math.sqrt(sizes.map((s: number) => (s - mean) ** 2).reduce((a: number, b: number) => a + b, 0) / sizes.length);
  return std / mean < threshold;
}

const DashboardAdvancedFeatures: React.FC<DashboardAdvancedFeaturesProps> = ({ dateRange }) => {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('month');
  const [showCorrelation, setShowCorrelation] = useState(false);
  
  // Fetch trades for AI components
  const { trades, isLoading } = useTrades(dateRange);
  
  // Metrics
  const metrics = useMemo(() => calculatePerformanceMetrics(trades), [trades]);
  const drawdown = useMemo(() => calculateMaxDrawdown(trades), [trades]);
  const correlations = useMemo(() => getInstrumentCorrelations(trades), [trades]);
  const consistentPositionSize = useMemo(() => isPositionSizeConsistent(trades), [trades]);
  
  // Health score (same logic as DashboardPerformanceOverview)
  let healthScore = 0;
  if (metrics.totalTrades > 0) {
    const winRate = metrics.winRate || 0;
    const riskReward = metrics.riskRewardRatio || 0;
    const dd = drawdown.percentage || 0;
    healthScore = Math.round(
      winRate * 0.4 +
      Math.min(riskReward * 50, 35) +
      Math.max(0, 25 - dd * 2.5)
    );
    healthScore = Math.max(0, Math.min(100, healthScore));
  }
  
  // Risk alerts
  const riskAlerts = [];
  if (drawdown.percentage > 8) {
    riskAlerts.push({
      id: 'drawdown',
      level: drawdown.percentage > 10 ? 'critical' : 'warning',
      title: 'Drawdown Approaching Limit',
      description: `Current drawdown of ${drawdown.percentage != null ? drawdown.percentage.toFixed(2) : '--'}% is nearing your 10% monthly limit.`,
      time: 'Now'
    });
  }
  if (consistentPositionSize === false) {
    riskAlerts.push({
      id: 'position-size',
      level: 'info',
      title: 'Position Size Inconsistency',
      description: 'Your last 5 trades had inconsistent position sizing. Review your risk management.',
      time: 'Now'
    });
  } else if (consistentPositionSize === true) {
    riskAlerts.push({
      id: 'position-size',
      level: 'info',
      title: 'Position Size Consistency',
      description: 'Your last 5 trades had consistent position sizing - good risk management!',
      time: 'Now'
    });
  }
  const highCorr = correlations.filter(c => Math.abs(c.correlation) > 0.7);
  if (highCorr.length > 0) {
    riskAlerts.push({
      id: 'correlation',
      level: 'critical',
      title: 'Correlated Positions',
      description: `You have multiple positions in highly correlated markets (${highCorr.map(c => c.pair.join(', ')).join('; ')}).`,
      time: 'Now'
    });
  }
  
  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Process calendar data
  // Remove mockCalendarData usage. Replace with real data processing or leave empty if not used.
  const processCalendarData = (): MonthData => {
    const monthData: MonthData = {};
    // TODO: Populate monthData from real trades data
    return monthData;
  };
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayIndex = firstDay.getDay();
    
    // Get number of days in month
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month to fill first row
    const prevMonthDays = firstDayIndex === 0 ? 0 : firstDayIndex;
    
    // Process the data
    const monthData = processCalendarData();
    
    // Generate calendar
    const days = [];
    
    // Add previous month days if needed
    for (let i = 0; i < prevMonthDays; i++) {
      days.push(
        <div key={`prev-${i}`} className="h-10 text-center text-gray-600 p-1">
          {/* Empty cell */}
        </div>
      );
    }
    
    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const dayData = monthData[dateStr];
      
      days.push(
        <div 
          key={i} 
          className={`h-14 text-center border border-gray-800 rounded p-1 relative ${
            dayData ? 'cursor-pointer hover:bg-gray-800/50' : ''
          }`}
          onClick={() => dayData && router.push(`/trades?date=${dateStr}`)}
        >
          <div className="text-xs text-gray-400">{i}</div>
          
          {dayData && (
            <>
              <div 
                className={`absolute inset-0 opacity-20 rounded ${
                  dayData.type === 'profit' ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <div className="relative z-10">
                <div className="text-xs">{dayData.trades} trades</div>
                <div className={`text-xs font-medium ${
                  dayData.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {dayData.pnl >= 0 ? '+' : ''}{formatCurrency(dayData.pnl)}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    return days;
  };
  
  // Get alert level color
  const getAlertLevelColor = (level: string): string => {
    switch (level) {
      case 'critical':
        return 'bg-red-900/20 text-red-400 border-red-500';
      case 'warning':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-500';
      default:
        return 'bg-blue-900/20 text-blue-400 border-blue-500';
    }
  };
  
  // Render correlation heatmap
  const renderCorrelationHeatmap = () => (
      <div className="bg-[#1a1f2c] p-4 rounded-lg mt-4">
        <h4 className="text-sm font-medium text-white mb-3">Instrument Correlation</h4>
      {correlations.length === 0 ? (
        <div className="text-xs text-gray-400">Not enough data to calculate correlations.</div>
      ) : (
        <div className="space-y-2">
          {correlations.map((item, index) => {
            const correlationValue = item.correlation;
            const bgColor = correlationValue < 0.5 
              ? 'bg-green-500' 
              : correlationValue < 0.8 
                ? 'bg-yellow-500' 
                : 'bg-red-500';
            return (
              <div key={index} className="flex items-center">
                <div className="w-36 text-xs text-gray-300">{item.pair[0]} / {item.pair[1]}</div>
                <div className="flex-grow h-5 bg-gray-700 rounded overflow-hidden">
                  <div 
                    className={`h-full ${bgColor}`}
                    style={{ width: `${Math.abs(item.correlation) * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right text-xs text-gray-300">
                  {item.correlation != null ? item.correlation.toFixed(2) : '--'}
                </div>
              </div>
            );
          })}
        </div>
      )}
        <div className="text-xs text-gray-400 mt-3">
          Higher correlation (red) indicates instruments that tend to move together.
        </div>
      </div>
    );
  
  const renderHealthScore = () => (
      <div className="bg-[#1a1f2c] p-4 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3">Trading Health Score</h4>
        <div className="flex items-center mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-indigo-500 mr-4">
          <span className="text-2xl font-bold text-white">{healthScore}</span>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Overall Health</div>
          <div className="text-sm text-gray-300">
            {metrics.totalTrades === 0 ? 'Add more trades to see your health score.' : "Your trading system's health is based on real performance data."}
          </div>
        </div>
      </div>
      {/* Detail metrics could be added here if desired */}
      </div>
    );
  
  // Add a render method for the AI section
  const renderAISection = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <TradeInsights 
            trades={trades || []} 
            loading={isLoading} 
            className="h-full"
          />
        </div>
        <div>
          <TradeSuggestions 
            trades={trades || []} 
            loading={isLoading} 
            className="h-full"
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-[#131825] rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Advanced Features</h2>
        
        <div className="flex space-x-3">
          <select
            className="bg-[#1a1f2c] text-gray-300 rounded border border-gray-700 text-sm px-3 py-1.5"
            value={view}
            onChange={(e) => setView(e.target.value as CalendarView)}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
          </select>
          
          <button
            className="text-gray-300 hover:text-white bg-[#1a1f2c] px-3 py-1.5 rounded-md text-sm border border-gray-700"
            onClick={() => setShowCorrelation(!showCorrelation)}
          >
            {showCorrelation ? 'Hide Correlation' : 'Show Correlation'}
          </button>
        </div>
      </div>
      
      {/* AI Insights and Suggestions Section */}
      {renderAISection()}
      
      {/* Existing sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar section (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a1f2c] rounded-lg overflow-hidden">
            <div className="border-b border-gray-800 p-4">
              <h3 className="text-md font-medium text-white">Trading Calendar</h3>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2">
                <div className="text-center text-sm text-gray-500">Sun</div>
                <div className="text-center text-sm text-gray-500">Mon</div>
                <div className="text-center text-sm text-gray-500">Tue</div>
                <div className="text-center text-sm text-gray-500">Wed</div>
                <div className="text-center text-sm text-gray-500">Thu</div>
                <div className="text-center text-sm text-gray-500">Fri</div>
                <div className="text-center text-sm text-gray-500">Sat</div>
                
                {generateCalendarDays()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Alerts section (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-[#1a1f2c] rounded-lg overflow-hidden">
            <div className="border-b border-gray-800 p-4">
              <h3 className="text-md font-medium text-white">Risk Alerts</h3>
            </div>
            
            <div className="p-0 divide-y divide-gray-800">
              {riskAlerts.length === 0 ? (
                <div className="p-4 text-xs text-gray-400">No risk alerts for your current trades.</div>
              ) : (
                riskAlerts.map(alert => (
                <div 
                  key={alert.id}
                    className={`p-4 ${alert.level === 'critical' ? 'bg-red-900/20 text-red-400 border-red-500' : alert.level === 'warning' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500' : 'bg-blue-900/20 text-blue-400 border-blue-500'} border-l-4`}
                >
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium">{alert.title}</h4>
                    <span className="text-xs text-gray-500">{alert.time}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{alert.description}</p>
                </div>
                ))
              )}
            </div>
          </div>
          
          {/* Trader Health Score */}
          {renderHealthScore()}
        </div>
      </div>
      
      {/* Correlation Heatmap (if showing) */}
      {showCorrelation && renderCorrelationHeatmap()}
    </div>
  );
};

export default DashboardAdvancedFeatures; 
