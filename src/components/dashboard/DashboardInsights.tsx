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

const DashboardInsights: React.FC<DashboardInsightsProps> = ({ 
  dateRange,
  trades,
  metrics
}) => {
  const [activeTab, setActiveTab] = useState<InsightTab>('Strategy');
  
  // Generate insights from real trade data
  const insightsData = useMemo(() => {
    if (!trades || trades.length === 0) {
      return null;
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
    // Timing performance (by hour and day)
    const dayMap = new Map<string, { trades: number; winCount: number; total: number }>();
    const hourMap = new Map<string, { trades: number; winCount: number; total: number }>();
    // Process trade data
    trades.forEach(trade => {
      // Strategy
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
      // Instrument
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
      // Timing (by day and hour)
      const entryDate = new Date(trade.entry_time);
      const day = entryDate.toLocaleString('en-US', { weekday: 'short' });
      const hour = entryDate.getHours();
      if (!dayMap.has(day)) dayMap.set(day, { trades: 0, winCount: 0, total: 0 });
      if (!hourMap.has(hour.toString())) hourMap.set(hour.toString(), { trades: 0, winCount: 0, total: 0 });
      const dayData = dayMap.get(day)!;
      const hourData = hourMap.get(hour.toString())!;
      dayData.trades += 1;
      hourData.trades += 1;
      if (trade.profit_loss > 0) {
        dayData.winCount += 1;
        hourData.winCount += 1;
      }
      dayData.total += trade.profit_loss;
      hourData.total += trade.profit_loss;
    });
    // Convert to arrays
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
    const dayPerformance = Array.from(dayMap.entries())
      .map(([day, data]) => ({
        day,
        trades: data.trades,
        winRate: (data.winCount / data.trades) * 100,
        avgPnL: data.total / data.trades
      }))
      .sort((a, b) => b.avgPnL - a.avgPnL);
    const hourPerformance = Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        trades: data.trades,
        winRate: (data.winCount / data.trades) * 100,
        avgPnL: data.total / data.trades
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    return {
      strategyPerformance,
      instrumentPerformance,
      dayPerformance,
      hourPerformance
    };
  }, [trades]);
  
  // Helper to get color based on win rate
  const getWinRateColor = (winRate: number): string => {
    if (winRate >= 60) return 'text-emerald-400';
    if (winRate >= 50) return 'text-indigo-300';
    return 'text-red-400';
  };
  
  // Render strategy performance tab
  const renderStrategyPerformance = () => {
    if (!insightsData || insightsData.strategyPerformance.length === 0) {
      return <div className="text-xs text-slate-400">Not enough data for strategy insights.</div>;
    }
    const strategies = insightsData.strategyPerformance;
    return (
      <div>
        <h3 className="text-sm font-medium text-slate-100 mb-4">Performance by Strategy</h3>
        <div className="space-y-3">
          {strategies.map((strategy, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-slate-100 font-medium">{strategy.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{strategy.trades} trades</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getWinRateColor(strategy.winRate)}`}>
                    {strategy.winRate != null ? strategy.winRate.toFixed(1) : '--'}% win rate
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strategy.winRate >= 60 ? 'bg-emerald-400' : strategy.winRate >= 50 ? 'bg-indigo-300' : 'bg-red-400'}`}
                  style={{ width: `${strategy.winRate}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render instrument performance tab
  const renderInstrumentPerformance = () => {
    if (!insightsData || insightsData.instrumentPerformance.length === 0) {
      return <div className="text-xs text-slate-400">Not enough data for instrument insights.</div>;
    }
    const instruments = insightsData.instrumentPerformance;
    return (
      <div>
        <h3 className="text-sm font-medium text-slate-100 mb-4">Performance by Instrument</h3>
        
        <div className="space-y-3">
          {instruments.map((instrument, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-slate-100 font-medium">{instrument.symbol}</span>
                  <span className="ml-2 text-xs text-slate-400">{instrument.trades} trades</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getWinRateColor(instrument.winRate)}`}>
                    {instrument.winRate != null ? instrument.winRate.toFixed(1) : '--'}% win rate
                  </span>
                </div>
              </div>
              
              {/* Win rate bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${instrument.winRate >= 60 ? 'bg-emerald-400' : instrument.winRate >= 50 ? 'bg-indigo-300' : 'bg-red-400'}`}
                  style={{ width: `${instrument.winRate}%` }}
                ></div>
              </div>
              
              <div className="mt-2 text-xs text-slate-400">
                Avg. P&L: <span className={getValueColorClass(instrument.avgPnL)}>{formatCurrency(instrument.avgPnL)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render day performance tab
  const renderDayPerformance = () => {
    if (!insightsData || insightsData.dayPerformance.length === 0) {
      return <div className="text-xs text-slate-400">Not enough data for day insights.</div>;
    }
    const days = insightsData.dayPerformance;
    return (
      <div>
        <h3 className="text-sm font-medium text-slate-100 mb-4">Performance by Day</h3>
        
        <div className="space-y-3">
          {days.map((day, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-slate-100 font-medium">{day.day}</span>
                  <span className="ml-2 text-xs text-slate-400">{day.trades} trades</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getWinRateColor(day.winRate)}`}>
                    {day.winRate != null ? day.winRate.toFixed(1) : '--'}% win rate
                  </span>
                </div>
              </div>
              
              {/* Win rate bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${day.winRate >= 60 ? 'bg-emerald-400' : day.winRate >= 50 ? 'bg-indigo-300' : 'bg-red-400'}`}
                  style={{ width: `${day.winRate}%` }}
                ></div>
              </div>
              
              <div className="mt-2 text-xs text-slate-400">
                Avg. P&L: <span className={getValueColorClass(day.avgPnL)}>{formatCurrency(day.avgPnL)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render hour performance tab
  const renderHourPerformance = () => {
    if (!insightsData || insightsData.hourPerformance.length === 0) {
      return <div className="text-xs text-slate-400">Not enough data for hour insights.</div>;
    }
    const hours = insightsData.hourPerformance;
    return (
      <div>
        <h3 className="text-sm font-medium text-slate-100 mb-4">Performance by Hour</h3>
        
        <div className="space-y-3">
          {hours.map((hour, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-slate-100 font-medium">{hour.hour}:00</span>
                  <span className="ml-2 text-xs text-slate-400">{hour.trades} trades</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getWinRateColor(hour.winRate)}`}>
                    {hour.winRate != null ? hour.winRate.toFixed(1) : '--'}% win rate
                  </span>
                </div>
              </div>
              
              {/* Win rate bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${hour.winRate >= 60 ? 'bg-emerald-400' : hour.winRate >= 50 ? 'bg-indigo-300' : 'bg-red-400'}`}
                  style={{ width: `${hour.winRate}%` }}
                ></div>
              </div>
              
              <div className="mt-2 text-xs text-slate-400">
                Avg. P&L: <span className={getValueColorClass(hour.avgPnL)}>{formatCurrency(hour.avgPnL)}</span>
              </div>
            </div>
          ))}
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
        return renderHourPerformance();
      default:
        return renderStrategyPerformance();
    }
  };
  
  return (
    <div className="rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-slate-100">Trading Insights</h2>
        <div className="text-sm text-slate-400 mt-1">Analysis for {dateRange.toUpperCase()}</div>
      </div>
      
      {/* Tab navigation */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex space-x-2">
          {(['Strategy', 'Instrument', 'Timing'] as InsightTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab content */}
      <div className="p-5">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DashboardInsights; 
