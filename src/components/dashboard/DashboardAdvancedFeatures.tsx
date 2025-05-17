import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { formatCurrency } from '@/lib/utils';
import TradeInsights from '@/components/ai/TradeInsights';
import TradeSuggestions from '@/components/ai/TradeSuggestions';
import { useTrades } from '@/hooks/useTrades'; // Assume this hook exists to fetch trades

// Mock data for the advanced features
const mockCalendarData = [
  { date: '2023-11-01', trades: 2, pnl: 145.25, type: 'profit' },
  { date: '2023-11-02', trades: 1, pnl: -62.10, type: 'loss' },
  { date: '2023-11-05', trades: 3, pnl: 215.75, type: 'profit' },
  { date: '2023-11-07', trades: 2, pnl: 78.30, type: 'profit' },
  { date: '2023-11-08', trades: 1, pnl: -45.20, type: 'loss' },
  { date: '2023-11-10', trades: 2, pnl: 124.85, type: 'profit' },
  { date: '2023-11-13', trades: 3, pnl: -98.45, type: 'loss' },
  { date: '2023-11-15', trades: 1, pnl: 56.70, type: 'profit' },
  { date: '2023-11-16', trades: 2, pnl: 185.30, type: 'profit' },
  { date: '2023-11-20', trades: 1, pnl: -75.60, type: 'loss' },
  { date: '2023-11-22', trades: 2, pnl: 112.40, type: 'profit' },
  { date: '2023-11-24', trades: 1, pnl: 45.00, type: 'profit' },
  { date: '2023-11-27', trades: 4, pnl: 314.28, type: 'profit' },
  { date: '2023-11-28', trades: 3, pnl: 62.45, type: 'profit' }
];

const mockRiskAlerts = [
  { 
    id: '1', 
    level: 'warning', 
    title: 'Drawdown Approaching Limit', 
    description: 'Current drawdown of 8.4% is nearing your 10% monthly limit.',
    time: '2 hours ago'
  },
  { 
    id: '2', 
    level: 'info', 
    title: 'Position Size Consistency', 
    description: 'Your last 5 trades had consistent position sizing - good risk management!',
    time: '1 day ago'
  },
  { 
    id: '3', 
    level: 'critical', 
    title: 'Correlated Positions', 
    description: 'You have multiple positions in correlated markets (EURUSD, GBPUSD).',
    time: '15 minutes ago'
  }
];

const mockInstrumentCorrelation = [
  { pair: ['EURUSD', 'GBPUSD'], correlation: 0.82 },
  { pair: ['EURUSD', 'XAUUSD'], correlation: 0.45 },
  { pair: ['BTCUSD', 'ETHUSD'], correlation: 0.89 },
  { pair: ['XAUUSD', 'XAGUSD'], correlation: 0.72 },
  { pair: ['SPX500', 'NSDQ100'], correlation: 0.91 }
];

const mockHealthMetrics = {
  overall: 78,
  consistency: 82,
  discipline: 70,
  performance: 85,
  risk: 75
};

// Types for calendar
type CalendarView = 'month' | 'week';
type MonthData = { [date: string]: { trades: number; pnl: number; type: string } };

interface DashboardAdvancedFeaturesProps {
  dateRange: DateRange;
}

const DashboardAdvancedFeatures: React.FC<DashboardAdvancedFeaturesProps> = ({ dateRange }) => {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('month');
  const [showCorrelation, setShowCorrelation] = useState(false);
  
  // Fetch trades for AI components
  const { trades, isLoading } = useTrades(dateRange);
  
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
  const processCalendarData = (): MonthData => {
    const monthData: MonthData = {};
    
    mockCalendarData.forEach(day => {
      monthData[day.date] = {
        trades: day.trades,
        pnl: day.pnl,
        type: day.type
      };
    });
    
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
  const renderCorrelationHeatmap = () => {
    return (
      <div className="bg-[#1a1f2c] p-4 rounded-lg mt-4">
        <h4 className="text-sm font-medium text-white mb-3">Instrument Correlation</h4>
        
        <div className="space-y-2">
          {mockInstrumentCorrelation.map((item, index) => {
            const correlationValue = item.correlation;
            // Color based on correlation strength: Green = low, Yellow = medium, Red = high
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
                    style={{ width: `${item.correlation * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right text-xs text-gray-300">
                  {item.correlation.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-xs text-gray-400 mt-3">
          Higher correlation (red) indicates instruments that tend to move together.
        </div>
      </div>
    );
  };
  
  const renderHealthScore = () => {
    return (
      <div className="bg-[#1a1f2c] p-4 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3">Trading Health Score</h4>
        
        {/* Overall score */}
        <div className="flex items-center mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-indigo-500 mr-4">
            <span className="text-2xl font-bold text-white">{mockHealthMetrics.overall}</span>
          </div>
          
          <div>
            <div className="font-medium text-white mb-1">Overall Health</div>
            <div className="text-sm text-gray-300">Your trading system is working well, but there's room for improvement.</div>
          </div>
        </div>
        
        {/* Detail metrics */}
        <div className="space-y-3">
          {Object.entries(mockHealthMetrics).map(([key, value]) => {
            if (key === 'overall') return null;
            
            return (
              <div key={key} className="flex items-center">
                <div className="w-32 text-sm text-gray-300 capitalize">{key}</div>
                <div className="flex-grow h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      value >= 80 ? 'bg-green-500' : 
                      value >= 60 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
                <div className="w-8 text-right text-xs text-gray-300 ml-2">
                  {value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
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
              {mockRiskAlerts.map(alert => (
                <div 
                  key={alert.id}
                  className={`p-4 ${getAlertLevelColor(alert.level)} border-l-4`}
                >
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium">{alert.title}</h4>
                    <span className="text-xs text-gray-500">{alert.time}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{alert.description}</p>
                </div>
              ))}
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