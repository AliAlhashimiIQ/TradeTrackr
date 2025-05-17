'use client'

import React, { useState, useMemo } from 'react';
import { formatCurrency, getValueColorClass } from '@/lib/utils';
import { Trade, TradeMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';

interface DashboardInsightsProps {
  dateRange: DateRange;
  trades: Trade[];
  metrics: TradeMetrics;
}

// Insight tabs
type InsightTab = 'Strategy' | 'Instrument' | 'Timing';

// For mock development purposes - will be replaced by real data
const mockInsightsData = {
  instrumentPerformance: [
    { symbol: 'EURUSD', trades: 28, winRate: 68, avgPnL: 42.6 },
    { symbol: 'GBPUSD', trades: 19, winRate: 58, avgPnL: 31.2 },
    { symbol: 'BTCUSD', trades: 15, winRate: 53, avgPnL: 124.5 },
    { symbol: 'AAPL', trades: 12, winRate: 75, avgPnL: 52.8 },
    { symbol: 'XAUUSD', trades: 10, winRate: 60, avgPnL: 64.3 }
  ],
  dayOfWeekPerformance: [
    { day: 'Mon', trades: 18, winRate: 55, pnl: 420 },
    { day: 'Tue', trades: 22, winRate: 68, pnl: 860 },
    { day: 'Wed', trades: 25, winRate: 72, pnl: 1240 },
    { day: 'Thu', trades: 20, winRate: 65, pnl: 760 },
    { day: 'Fri', trades: 15, winRate: 53, pnl: 320 }
  ],
  timeOfDayPerformance: [
    { time: '8-10', trades: 15, winRate: 60, pnl: 540 },
    { time: '10-12', trades: 28, winRate: 71, pnl: 980 },
    { time: '12-14', trades: 22, winRate: 64, pnl: 720 },
    { time: '14-16', trades: 25, winRate: 68, pnl: 850 },
    { time: '16-18', trades: 10, winRate: 50, pnl: 210 }
  ],
  strategyPerformance: [
    { name: 'Breakout', trades: 32, winRate: 65, avgPnL: 48.5, totalPnL: 1552 },
    { name: 'Trend Following', trades: 28, winRate: 71, avgPnL: 62.3, totalPnL: 1744.4 },
    { name: 'Support/Resistance', trades: 24, winRate: 58, avgPnL: 37.8, totalPnL: 907.2 },
    { name: 'Scalping', trades: 16, winRate: 56, avgPnL: 22.4, totalPnL: 358.4 }
  ],
  psychologicalInsights: [
    { mood: 'Calm', trades: 42, winRate: 76, avgPnL: 58.2 },
    { mood: 'Excited', trades: 24, winRate: 54, avgPnL: 32.5 },
    { mood: 'Tired', trades: 18, winRate: 44, avgPnL: 21.3 },
    { mood: 'Stressed', trades: 16, winRate: 38, avgPnL: 18.6 }
  ],
  learningPoints: [
    { type: 'success', text: 'Trades with predefined stop loss have 23% higher win rate' },
    { type: 'success', text: 'Morning trades outperform afternoon trades by 18%' },
    { type: 'mistake', text: 'Entering trades against major trend leads to 65% failure rate' },
    { type: 'mistake', text: 'Overtrading on Fridays results in 40% more losses' }
  ],
  timingInsights: {
    bestDays: [
      { day: 'Mon', winRate: 70 },
      { day: 'Tue', winRate: 68 },
      { day: 'Wed', winRate: 65 },
      { day: 'Thu', winRate: 60 },
      { day: 'Fri', winRate: 55 }
    ],
    bestTimes: [
      { time: '8-10', winRate: 70 },
      { time: '10-12', winRate: 71 },
      { time: '12-14', winRate: 64 },
      { time: '14-16', winRate: 68 },
      { time: '16-18', winRate: 50 }
    ],
    optimalHoldingTime: {
      value: '3 days',
      winRate: 72
    }
  }
};

const DashboardInsights: React.FC<DashboardInsightsProps> = ({ 
  dateRange,
  trades,
  metrics
}) => {
  const [activeTab, setActiveTab] = useState<InsightTab>('Strategy');
  
  // Generate insights from real trade data
  const insightsData = useMemo(() => {
    if (!trades || trades.length === 0) {
      return mockInsightsData;
    }
    
    // Strategy performance calculation
    const strategyMap = new Map<string, {
      trades: number;
      winCount: number;
      lossCount: number;
      total: number;
    }>();
    
    // Instrument performance calculation
    const instrumentMap = new Map<string, {
      trades: number;
      winCount: number;
      lossCount: number;
      total: number;
    }>();
    
    // Process trade data
    trades.forEach(trade => {
      // Handle strategy performance
      const strategy = trade.strategy || 'Unknown';
      if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, { trades: 0, winCount: 0, lossCount: 0, total: 0 });
      }
      const stratData = strategyMap.get(strategy)!;
      stratData.trades += 1;
      if (trade.profit_loss > 0) {
        stratData.winCount += 1;
      } else {
        stratData.lossCount += 1;
      }
      stratData.total += trade.profit_loss;
      
      // Handle instrument performance
      if (!instrumentMap.has(trade.symbol)) {
        instrumentMap.set(trade.symbol, { trades: 0, winCount: 0, lossCount: 0, total: 0 });
      }
      const instData = instrumentMap.get(trade.symbol)!;
      instData.trades += 1;
      if (trade.profit_loss > 0) {
        instData.winCount += 1;
      } else {
        instData.lossCount += 1;
      }
      instData.total += trade.profit_loss;
    });
    
    // Convert to array and sort by profitability
    const strategyPerformance = Array.from(strategyMap.entries())
      .map(([strategy, data]) => ({
        name: strategy,
        trades: data.trades,
        winRate: (data.winCount / data.trades) * 100,
        avgPnL: data.total / data.trades
      }))
      .sort((a, b) => b.avgPnL - a.avgPnL);
    
    const instrumentPerformance = Array.from(instrumentMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        trades: data.trades,
        winRate: (data.winCount / data.trades) * 100,
        avgPnL: data.total / data.trades
      }))
      .sort((a, b) => b.avgPnL - a.avgPnL);
    
    // For timing insights, we'd need more detailed data analysis
    // Using mock data for now
    const timingInsights = mockInsightsData.timingInsights;
    
    return {
      strategyPerformance,
      instrumentPerformance,
      timingInsights
    };
  }, [trades]);
  
  // Helper to get color based on win rate
  const getWinRateColor = (winRate: number): string => {
    if (winRate >= 60) return 'text-green-400';
    if (winRate >= 50) return 'text-blue-400';
    return 'text-red-400';
  };
  
  // Render strategy performance tab
  const renderStrategyPerformance = () => {
    const strategies = insightsData.strategyPerformance || mockInsightsData.strategyPerformance;
    
    return (
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Performance by Strategy</h3>
        
        <div className="space-y-3">
          {strategies.map((strategy, index) => (
            <div key={index} className="bg-[#1a1f2c] rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-white font-medium">{strategy.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{strategy.trades} trades</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getWinRateColor(strategy.winRate)}`}>
                    {strategy.winRate.toFixed(1)}% win rate
                  </span>
                </div>
              </div>
              
              {/* Win rate bar */}
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${strategy.winRate >= 70 ? 'bg-green-500' : strategy.winRate >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: `${strategy.winRate}%` }}
                ></div>
              </div>
              
              <div className="mt-2 text-xs text-gray-400">
                Avg. P&L: <span className={getValueColorClass(strategy.avgPnL)}>{formatCurrency(strategy.avgPnL)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render instrument performance tab
  const renderInstrumentPerformance = () => {
    const instruments = insightsData.instrumentPerformance || mockInsightsData.instrumentPerformance;
    
    return (
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Performance by Instrument</h3>
        
        <div className="space-y-3">
          {instruments.map((instrument, index) => (
            <div key={index} className="bg-[#1a1f2c] rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-white font-medium">{instrument.symbol}</span>
                  <span className="ml-2 text-xs text-gray-400">{instrument.trades} trades</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getWinRateColor(instrument.winRate)}`}>
                    {instrument.winRate.toFixed(1)}% win rate
                  </span>
                </div>
              </div>
              
              {/* Win rate bar */}
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${instrument.winRate >= 70 ? 'bg-green-500' : instrument.winRate >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: `${instrument.winRate}%` }}
                ></div>
              </div>
              
              <div className="mt-2 text-xs text-gray-400">
                Avg. P&L: <span className={getValueColorClass(instrument.avgPnL)}>{formatCurrency(instrument.avgPnL)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render timing insights tab
  const renderTimingInsights = () => {
    return (
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Trading Timing Insights</h3>
        
        <div className="space-y-4">
          {/* Best days */}
          <div className="bg-[#1a1f2c] rounded-lg p-3">
            <div className="text-sm font-medium text-white mb-2">Best Trading Days</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mockInsightsData.timingInsights.bestDays.map((day, index) => (
                <div key={index} className="bg-[#131825] rounded p-2 text-center">
                  <div className="text-white font-medium">{day.day}</div>
                  <div className="text-xs text-green-400">{day.winRate}% win rate</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Best times */}
          <div className="bg-[#1a1f2c] rounded-lg p-3">
            <div className="text-sm font-medium text-white mb-2">Best Trading Hours</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mockInsightsData.timingInsights.bestTimes.map((time, index) => (
                <div key={index} className="bg-[#131825] rounded p-2 text-center">
                  <div className="text-white font-medium">{time.time}</div>
                  <div className="text-xs text-green-400">{time.winRate}% win rate</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Holding time */}
          <div className="bg-[#1a1f2c] rounded-lg p-3">
            <div className="text-sm font-medium text-white mb-2">Optimal Holding Time</div>
            <div className="text-white text-center mb-2">
              {mockInsightsData.timingInsights.optimalHoldingTime.value}
              <span className="text-xs text-gray-400 ml-1">
                ({mockInsightsData.timingInsights.optimalHoldingTime.winRate}% win rate)
              </span>
            </div>
            <div className="text-xs text-gray-400 text-center">
              Your trades with this holding time perform best
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Strategy':
        return renderStrategyPerformance();
      case 'Instrument':
        return renderInstrumentPerformance();
      case 'Timing':
        return renderTimingInsights();
      default:
        return renderStrategyPerformance();
    }
  };
  
  return (
    <div className="bg-[#0d1017] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Trading Insights</h2>
        <div className="text-sm text-gray-400 mt-1">Analysis for {dateRange.toUpperCase()}</div>
      </div>
      
      {/* Tab navigation */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex space-x-4">
          {(['Strategy', 'Instrument', 'Timing'] as InsightTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-lg ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab content */}
      <div className="p-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DashboardInsights; 