'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import EquityCurve from '@/components/charts/EquityCurve';
import WinLossDistribution from '@/components/charts/WinLossDistribution';
import MonthlyPerformance from '@/components/charts/MonthlyPerformance';
import DrawdownChart from '@/components/charts/DrawdownChart';
import SymbolPerformance from '@/components/charts/SymbolPerformance';
import TradeTypePerformance from '@/components/charts/TradeTypePerformance';
import TimeOfDayPerformance from '@/components/charts/TimeOfDayPerformance';
import PerformanceHeatmap from '@/components/charts/PerformanceHeatmap';
import StrategyPerformance from '@/components/charts/StrategyPerformance';
import MistakesCostChart from '@/components/charts/MistakesCostChart';
import AdvancedFilters, { FilterOptions } from '@/components/analytics/AdvancedFilters';
import ExportData from '@/components/analytics/ExportData';
import { getAllTrades } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import { isForexPair, formatPips } from '@/lib/forexUtils';
import {
  calculatePerformanceMetrics,
  generateEquityCurveData,
  generatePnLDistributionData,
  generateMonthlyPerformanceData,
  generateStrategyPerformanceData,
  generateSymbolPerformanceData,
  generateTradeTypePerformanceData,
  generateTimeOfDayPerformanceData,
  generatePerformanceHeatmapData,
  PerformanceMetrics,
  TimeSeriesPerformance,
  TradeDistribution,
  MonthlyPerformance as MonthlyPerformanceType,
  StrategyPerformance as StrategyPerformanceType,
  SymbolPerformance as SymbolPerformanceType,
  TradeTypePerformance as TradeTypePerformanceType,
  TimeOfDayPerformance as TimeOfDayPerformanceType,
  HeatmapData
} from '@/lib/tradeMetrics';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import AIInsights from '@/components/dashboard/AIInsights';

// Time period options for filtering
type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'mistakes'>('overview');
  
  // New states for advanced filters and export
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterOptions | null>(null);
  
  // Performance data states
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [equityCurveData, setEquityCurveData] = useState<TimeSeriesPerformance[]>([]);
  const [distributionData, setDistributionData] = useState<TradeDistribution[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformanceType[]>([]);
  const [strategyData, setStrategyData] = useState<StrategyPerformanceType[]>([]);
  const [symbolData, setSymbolData] = useState<SymbolPerformanceType[]>([]);
  const [tradeTypeData, setTradeTypeData] = useState<TradeTypePerformanceType[]>([]);
  const [timeOfDayData, setTimeOfDayData] = useState<TimeOfDayPerformanceType[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [totalPips, setTotalPips] = useState(0);
  const panelClass = 'rounded-2xl border border-slate-800/80 bg-slate-950/65 backdrop-blur-sm';
  const subPanelClass = 'rounded-xl border border-slate-800 bg-slate-900/60';
  
  // Auth check and redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  // Fetch trades and calculate metrics
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        const trades = await getAllTrades(user.id);
        setAllTrades(trades);
        
        // Apply time period filter
        const filtered = filterTradesByTimePeriod(trades, timePeriod);
        setFilteredTrades(filtered);
      } catch (error) {
        console.error('Error fetching trades:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrades();
  }, [user]);
  
  // Calculate metrics when filtered trades change
  useEffect(() => {
    if (filteredTrades.length > 0) {
      // Calculate all metrics and data for charts
      const metrics = calculatePerformanceMetrics(filteredTrades);
      setMetrics(metrics);
      
      const equityCurveData = generateEquityCurveData(filteredTrades);
      setEquityCurveData(equityCurveData);
      
      const distributionData = generatePnLDistributionData(filteredTrades, 10);
      setDistributionData(distributionData);
      
      const monthlyData = generateMonthlyPerformanceData(filteredTrades);
      setMonthlyData(monthlyData);
      
      const strategyData = generateStrategyPerformanceData(filteredTrades);
      setStrategyData(strategyData);
      
      // New data for additional charts
      const symbolData = generateSymbolPerformanceData(filteredTrades);
      setSymbolData(symbolData);
      
      const tradeTypeData = generateTradeTypePerformanceData(filteredTrades);
      setTradeTypeData(tradeTypeData);
      
      const timeOfDayData = generateTimeOfDayPerformanceData(filteredTrades);
      setTimeOfDayData(timeOfDayData);
      
      const heatmapData = generatePerformanceHeatmapData(filteredTrades);
      setHeatmapData(heatmapData);
      
      const pips = filteredTrades.reduce((sum, t) => sum + (t.pips || 0), 0);
      setTotalPips(pips);
    }
  }, [filteredTrades]);
  
  // Apply time period filter
  useEffect(() => {
    if (allTrades.length > 0) {
      let filtered = filterTradesByTimePeriod(allTrades, timePeriod);
      
      // Apply advanced filters if any
      if (activeFilters) {
        filtered = applyAdvancedFilters(filtered, activeFilters);
      }
      
      setFilteredTrades(filtered);
    }
  }, [timePeriod, allTrades, activeFilters]);
  
  // Helper function to filter trades by time period
  const filterTradesByTimePeriod = (trades: Trade[], period: TimePeriod): Trade[] => {
    if (period === 'all') return trades;
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (period) {
      case '7d':
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        cutoffDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        cutoffDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case '1y':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return trades;
    }
    
    return trades.filter(trade => new Date(trade.entry_time) >= cutoffDate);
  };
  
  // Helper function to apply advanced filters
  const applyAdvancedFilters = (trades: Trade[], filters: FilterOptions): Trade[] => {
    return trades.filter(trade => {
      // Filter by symbols
      if (filters.symbols.length > 0 && !filters.symbols.includes(trade.symbol)) {
        return false;
      }
      
      // Filter by strategies
      if (filters.strategies.length > 0 && (!trade.strategy || !filters.strategies.includes(trade.strategy))) {
        return false;
      }
      
      // Filter by trade types
      if (filters.tradeTypes.length > 0 && !filters.tradeTypes.includes(trade.type)) {
        return false;
      }
      
      // Filter by date range
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        const tradeDate = new Date(trade.entry_time);
        if (tradeDate < startDate) {
          return false;
        }
      }
      
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        const tradeDate = new Date(trade.entry_time);
        if (tradeDate > endDate) {
          return false;
        }
      }
      
      // Filter by profit range
      if (filters.profitRange.min !== null && trade.profit_loss < filters.profitRange.min) {
        return false;
      }
      
      if (filters.profitRange.max !== null && trade.profit_loss > filters.profitRange.max) {
        return false;
      }
      
      // Filter by tags
      if (filters.tags.length > 0) {
        if (!trade.tags || !trade.tags.some(tag => filters.tags.includes(tag))) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Handle applying advanced filters
  const handleApplyFilters = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('en-US', {
      maximumFractionDigits: 0
    })}`;
  };

  const bestStrategy = strategyData.length > 0 ? strategyData[0] : null;
  const largestLeak = filteredTrades.length > 0
    ? filteredTrades
        .filter((trade) => (trade.mistakes || []).length > 0 && trade.profit_loss < 0)
        .sort((a, b) => a.profit_loss - b.profit_loss)[0]
    : null;
  const equityChartData = equityCurveData.map((point) => ({
    date: point.date,
    value: point.equity
  }));
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Prevents flash before redirect
  }
  
  return (
    <AuthenticatedLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100 tracking-tight">Analytics Dashboard</h1>
            <p className="text-slate-400 mt-1">Track your performance, leaks, and what to improve next.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-sm transition-colors duration-150"
              >
                <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{timePeriod === 'all' ? 'All Time' : `Last ${timePeriod}`}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  {(['7d', '30d', '90d', '1y', 'all'] as TimePeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setTimePeriod(period);
                        setShowFilters(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors duration-150"
                    >
                      {period === 'all' ? 'All Time' : `Last ${period}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Filters Button */}
            <button 
              onClick={() => setShowAdvancedFilters(true)}
              className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-sm transition-colors duration-150"
            >
              <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Advanced Filters</span>
              {activeFilters && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {Object.values(activeFilters).flat().filter(Boolean).length}
                </span>
              )}
            </button>
            
            {/* Export Button */}
            <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg text-sm font-medium transition-colors duration-150"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Export Data</span>
            </button>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {activeFilters && (
          <div className={`mb-6 ${panelClass} p-3 flex flex-wrap items-center gap-2`}>
            <span className="text-sm text-slate-400 mr-2">Active Filters:</span>
            
            {activeFilters.symbols.length > 0 && (
              <div className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded-md flex items-center">
                <span>Symbols: {activeFilters.symbols.length}</span>
                <button 
                  onClick={() => {
                    setActiveFilters({
                      ...activeFilters,
                      symbols: []
                    });
                  }}
                  className="ml-2 text-blue-400 hover:text-blue-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {activeFilters.strategies.length > 0 && (
              <div className="bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded-md flex items-center">
                <span>Strategies: {activeFilters.strategies.length}</span>
                <button 
                  onClick={() => {
                    setActiveFilters({
                      ...activeFilters,
                      strategies: []
                    });
                  }}
                  className="ml-2 text-purple-400 hover:text-purple-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {activeFilters.tradeTypes.length > 0 && (
              <div className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-md flex items-center">
                <span>Types: {activeFilters.tradeTypes.join(', ')}</span>
                <button 
                  onClick={() => {
                    setActiveFilters({
                      ...activeFilters,
                      tradeTypes: []
                    });
                  }}
                  className="ml-2 text-green-400 hover:text-green-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {(activeFilters.dateRange.start || activeFilters.dateRange.end) && (
              <div className="bg-amber-600/20 text-amber-400 text-xs px-2 py-1 rounded-md flex items-center">
                <span>Date Range</span>
                <button 
                  onClick={() => {
                    setActiveFilters({
                      ...activeFilters,
                      dateRange: { start: null, end: null }
                    });
                  }}
                  className="ml-2 text-amber-400 hover:text-amber-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {activeFilters.tags.length > 0 && (
              <div className="bg-indigo-600/20 text-indigo-400 text-xs px-2 py-1 rounded-md flex items-center">
                <span>Tags: {activeFilters.tags.length}</span>
                <button 
                  onClick={() => {
                    setActiveFilters({
                      ...activeFilters,
                      tags: []
                    });
                  }}
                  className="ml-2 text-indigo-400 hover:text-indigo-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setActiveFilters(null)}
              className="text-xs text-slate-400 hover:text-white ml-auto"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Analytics Brief */}
        <div className={`${panelClass} p-5 mb-8`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Analytics Brief</h2>
              <p className="text-sm text-slate-400 mt-1">
                {loading
                  ? 'Preparing your latest performance brief...'
                  : `Analyzing ${filteredTrades.length} trades for ${timePeriod === 'all' ? 'all time' : `last ${timePeriod}`}.`}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <div className={`${subPanelClass} px-4 py-3 min-w-[180px]`}>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Edge</div>
                <div className="text-sm text-slate-100 mt-1">
                  {bestStrategy ? `${bestStrategy.strategy} (${bestStrategy.winRate.toFixed(0)}% WR)` : 'No strategy edge yet'}
                </div>
              </div>
              <div className={`${subPanelClass} px-4 py-3 min-w-[180px]`}>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Main Leak</div>
                <div className="text-sm text-slate-100 mt-1">
                  {largestLeak?.mistakes?.[0] || 'No logged mistake leak yet'}
                </div>
              </div>
              <div className={`${subPanelClass} px-4 py-3 min-w-[180px]`}>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Focus This Week</div>
                <div className="text-sm text-slate-100 mt-1">
                  {metrics ? `Protect DD below ${Math.max(6, Math.round(metrics.maxDrawdownPercent || 0))}%` : 'Add more trades for focus'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'breakdown'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Detailed Breakdown
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'mistakes'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Cost of Mistakes
          </button>
        </div>
        
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`${panelClass} overflow-hidden`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-gray-300 text-sm font-medium uppercase tracking-wider">Win Rate</h2>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-1">
                    <div className="text-4xl font-bold text-white">
                      {loading ? '-' : `${metrics?.winRate.toFixed(0)}%`}
                    </div>
                    
                    {!loading && metrics && metrics.winRate > 50 ? (
                      <div className="text-green-400 text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>Good</span>
                      </div>
                    ) : !loading && metrics ? (
                      <div className="text-yellow-400 text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Improve</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div className="bg-[#0d0f16] px-6 py-3 border-t border-[#1c2033]">
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-gray-400">
                      {loading ? '-' : `${metrics?.winningTrades} / ${metrics?.totalTrades} trades`}
                    </div>
                    <div className="text-green-400 font-medium">
                      {loading ? '' : `${metrics?.profitFactor.toFixed(2)} profit factor`}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`${panelClass} overflow-hidden`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-gray-300 text-sm font-medium uppercase tracking-wider">R Distribution</h2>
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-1">
                    <div className="text-4xl font-bold text-white">
                      {loading ? '-' : `${metrics?.riskRewardRatio.toFixed(2)}`}
                    </div>
                    <div className="text-gray-400 text-xl">R</div>
                  </div>
                </div>
                
                <div className="bg-[#0d0f16] px-6 py-3 border-t border-[#1c2033]">
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-green-400">
                      {loading ? '-' : `${formatCurrency(metrics?.averageWin || 0)} avg win`}
                    </div>
                    <div className="text-red-400">
                      {loading ? '-' : `${formatCurrency(metrics?.averageLoss || 0)} avg loss`}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`${panelClass} overflow-hidden`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-gray-300 text-sm font-medium uppercase tracking-wider">Strategy Usage</h2>
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="text-4xl font-bold text-white">
                    {loading ? '-' : strategyData.length}
                  </div>
                </div>
                
                <div className="bg-[#0d0f16] px-6 py-3 border-t border-[#1c2033]">
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-gray-400">
                      {loading || !strategyData.length ? '-' : 
                        `${strategyData[0].strategy}: ${strategyData[0].winRate.toFixed(0)}% WR`}
                    </div>
                    <div className="text-blue-400">
                      {loading || !strategyData.length ? '-' : 
                        `${formatCurrency(strategyData[0].pnL)} P&L`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Pips Card (New for Forex) */}
              <div className={`${panelClass} overflow-hidden`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-gray-300 text-sm font-medium uppercase tracking-wider">Total Pips</h2>
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-1">
                    <div className={`text-4xl font-bold ${totalPips >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {loading ? '-' : formatPips(totalPips)}
                    </div>
                    <div className="text-gray-500 text-xl font-medium ml-1">PIPS</div>
                  </div>
                </div>
                
                <div className="bg-[#0d0f16] px-6 py-3 border-t border-[#1c2033]">
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-gray-400">
                      Forex Performance
                    </div>
                    <div className="text-indigo-400 font-medium">
                      {filteredTrades.filter(t => isForexPair(t.symbol)).length} forex trades
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Sharpe Ratio', value: loading ? '-' : (metrics?.sharpeRatio?.toFixed(2) ?? '—'), desc: 'Risk-adjusted return', color: 'text-blue-400' },
                { label: 'Sortino Ratio', value: loading ? '-' : (metrics?.sortinoRatio?.toFixed(2) ?? '—'), desc: 'Downside risk only', color: 'text-violet-400' },
                { label: 'Expected Value', value: loading ? '-' : formatCurrency(metrics?.expectedValue ?? 0), desc: 'Per trade on average', color: (metrics?.expectedValue ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Largest Win', value: loading ? '-' : formatCurrency(metrics?.largestWin ?? 0), desc: `Largest loss: ${loading ? '-' : formatCurrency(Math.abs(metrics?.largestLoss ?? 0))}`, color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</div>
                  <div className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-gray-600 mt-0.5">{s.desc}</div>
                </div>
              ))}
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white text-base font-medium">Equity Curve</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                      <span className="text-gray-400">P&L</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 rounded-full bg-red-500/30 mr-1"></div>
                      <span className="text-gray-400">Drawdown</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                <EquityCurve data={equityChartData} loading={loading} />
                </div>
              </div>
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white text-base font-medium">Trade Distribution</h2>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                      <span>Profit</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                      <span>Loss</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                <WinLossDistribution data={distributionData} loading={loading} />
              </div>
            </div>
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white text-base font-medium">Monthly Performance</h2>
                  <div className="bg-[#0d0f16] text-xs text-gray-400 px-2 py-1 rounded-md">
                    {!loading && monthlyData.length > 0 ? `${monthlyData.length} months` : 'No data'}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                <MonthlyPerformance data={monthlyData} loading={loading} />
                </div>
              </div>
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white text-base font-medium">Drawdown Analysis</h2>
                  <div className="bg-[#0d0f16] text-xs text-gray-400 px-2 py-1 rounded-md">
                    {!loading && metrics ? `Max: ${metrics.maxDrawdownPercent.toFixed(1)}%` : 'No data'}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                <DrawdownChart data={equityCurveData} loading={loading} />
                </div>
              </div>
              
              {/* Cost of Mistakes - Now in Overview because it's CRITICAL */}
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-white text-base font-medium">Cost of Mistakes</h2>
                    <p className="text-gray-500 text-xs mt-0.5">Total P&L lost to specific bad habits</p>
                  </div>
                  <div className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter">
                    Critical Insights
                  </div>
                </div>
                <div className="flex-1">
                  <MistakesCostChart trades={filteredTrades} />
                </div>
              </div>
            </div>
            
            {/* Key Insights */}
            <AIInsights trades={filteredTrades} isLoading={loading} />
          </>
        )}
        
        {activeTab === 'breakdown' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Strategy Performance */}
              <div className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white text-base font-medium">Strategy Performance</h2>
                    <p className="text-gray-400 text-xs mt-1">Analysis of your trading strategies</p>
                  </div>
                  <div className="bg-[#0d0f16] text-xs text-gray-400 px-2 py-1 rounded-md">
                    {!loading && strategyData.length > 0 ? `${strategyData.length} strategies` : 'No data'}
                  </div>
                </div>
                <StrategyPerformance data={strategyData} loading={loading} />
              </div>
              
              {/* Symbol Performance */}
              <div className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white text-base font-medium">Symbol Performance</h2>
                    <p className="text-gray-400 text-xs mt-1">Breakdown by trading symbols</p>
                  </div>
                  <div className="bg-[#0d0f16] text-xs text-gray-400 px-2 py-1 rounded-md">
                    {!loading && symbolData.length > 0 ? `${symbolData.length} symbols` : 'No data'}
                  </div>
                </div>
                <SymbolPerformance data={symbolData} loading={loading} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Trade Type Performance */}
              <div className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white text-base font-medium">Long vs Short</h2>
                    <p className="text-gray-400 text-xs mt-1">Directional bias analysis</p>
                  </div>
                </div>
                <TradeTypePerformance data={tradeTypeData} loading={loading} />
              </div>
              
              {/* Time of Day Performance */}
              <div className={`col-span-1 lg:col-span-2 ${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white text-base font-medium">Time of Day Analysis</h2>
                    <p className="text-gray-400 text-xs mt-1">Performance across different trading sessions</p>
                  </div>
                </div>
                <TimeOfDayPerformance data={timeOfDayData} loading={loading} />
              </div>
            </div>
            
            {/* Performance Heatmap */}
            <div className={`${panelClass} p-5 mb-8`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white text-base font-medium">Performance Heatmap</h2>
                  <p className="text-gray-400 text-xs mt-1">Trading performance by day and time</p>
                </div>
                <div className="flex space-x-2">
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 rounded-full bg-green-500/80 mr-1"></div>
                    <span className="text-gray-400">Profit</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 mr-1"></div>
                    <span className="text-gray-400">Loss</span>
                  </div>
                </div>
              </div>
              <PerformanceHeatmap data={heatmapData} loading={loading} />
            </div>
            
            {/* Performance Summary */}
            <div className={`${panelClass} p-6 mb-6`}>
              <div className="flex items-start">
                <div className="flex-shrink-0 p-3 bg-blue-500/20 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-lg font-medium mb-2">Performance Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="text-gray-300 text-sm">
                      Based on your trading data, consider focusing on your top-performing strategies and symbols.
                      Your best trading occurs during market hours, especially in the morning session.
                    </p>
                    <div className="bg-[#0d0f16]/50 rounded-lg p-3 border border-red-500/20">
                      <p className="text-red-400 text-xs font-bold mb-1 uppercase">Top Mistake to Fix:</p>
                      <p className="text-gray-300 text-sm italic">
                        {filteredTrades.some(t => t.mistakes?.length) 
                          ? "Check the 'Cost of Mistakes' chart above. Eliminating your #1 mistake could increase your bottom line significantly."
                          : "Start logging mistakes in your trades to unlock powerful 'Cost of Mistakes' analytics."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'mistakes' && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Trades with Mistakes', value: filteredTrades.filter(t => t.mistakes?.length).length.toString(), color: 'text-red-400' },
                { label: 'Clean Trades', value: filteredTrades.filter(t => !t.mistakes?.length).length.toString(), color: 'text-emerald-400' },
                { label: 'Psychology Score', value: filteredTrades.length ? `${Math.round((filteredTrades.filter(t => !t.mistakes?.length).length / filteredTrades.length) * 100)}%` : '—', color: 'text-indigo-400' },
                { label: 'Unique Mistake Types', value: [...new Set(filteredTrades.flatMap(t => t.mistakes || []))].length.toString(), color: 'text-yellow-400' },
              ].map((s, i) => (
                <div key={i} className="bg-[#151823] rounded-xl border border-[#1c2033] p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Cost of Mistakes Chart */}
            <div className="bg-[#151823] rounded-xl border border-red-500/10 p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-white font-medium">Dollar Cost of Each Mistake</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Total P&L impact when this mistake was present</p>
                </div>
                <div className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter">TradeZella Killer</div>
              </div>
              <MistakesCostChart trades={filteredTrades} />
            </div>

            {/* Per-Mistake Table */}
            <div className="bg-[#151823] rounded-xl border border-[#1c2033] overflow-hidden mb-8">
              <div className="grid grid-cols-5 gap-4 px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.04] bg-[#0a0b12]">
                <div className="col-span-2">Mistake</div>
                <div>Occurrences</div>
                <div>Total P&L Impact</div>
                <div>Win Rate</div>
              </div>
              {(() => {
                const allMistakes = [...new Set(filteredTrades.flatMap(t => t.mistakes || []))];
                if (!allMistakes.length) return (
                  <div className="px-5 py-12 text-center text-gray-600">No mistakes logged yet. Tag mistakes in your trades to see them here.</div>
                );
                return allMistakes.map(mistake => {
                  const mTrades = filteredTrades.filter(t => t.mistakes?.includes(mistake));
                  const totalPnL = mTrades.reduce((s, t) => s + t.profit_loss, 0);
                  const winRate = mTrades.length ? (mTrades.filter(t => t.profit_loss > 0).length / mTrades.length * 100) : 0;
                  return (
                    <div key={mistake} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-white/[0.03] items-center hover:bg-white/[0.02] transition-colors">
                      <div className="col-span-2">
                        <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-medium border border-red-900/40">{mistake}</span>
                      </div>
                      <div className="text-sm text-gray-300">{mTrades.length}</div>
                      <div className={`text-sm font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toFixed(0)}
                      </div>
                      <div className={`text-sm font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {winRate.toFixed(0)}%
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}

        <AdvancedFilters
          isOpen={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onApplyFilters={handleApplyFilters}
          trades={allTrades}
        />
        
        {/* Export Data Modal */}
        <ExportData
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          trades={filteredTrades}
          metrics={metrics}
          equityCurveData={equityCurveData}
          distributionData={distributionData}
          monthlyData={monthlyData}
          strategyData={strategyData}
          symbolData={symbolData}
          tradeTypeData={tradeTypeData}
          heatmapData={heatmapData}
        />
      </div>
      
      <footer className="bg-[#0f1117] py-6 mt-auto border-t border-[#1a1f2c]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 sm:mb-0">© 2025 TradeJournal. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors duration-150">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors duration-150">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors duration-150">
              Help Center
            </a>
          </div>
        </div>
      </footer>
    </AuthenticatedLayout>
  );
} 
