'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';
import { useTrades } from '@/hooks/useTrades';
import { useAccount } from '@/hooks/useAccount';

// ─── 6.5 Dynamic (code-split) imports for heavy chart components ──────────────
// Each chart is a separate JS chunk — only loaded when the analytics tab is opened.
const EquityCurve = dynamic(() => import('@/components/charts/EquityCurve'), { ssr: false });
const WinLossDistribution = dynamic(() => import('@/components/charts/WinLossDistribution'), { ssr: false });
const MonthlyPerformance = dynamic(() => import('@/components/charts/MonthlyPerformance'), { ssr: false });
const DrawdownChart = dynamic(() => import('@/components/charts/DrawdownChart'), { ssr: false });
const SymbolPerformance = dynamic(() => import('@/components/charts/SymbolPerformance'), { ssr: false });
const TradeTypePerformance = dynamic(() => import('@/components/charts/TradeTypePerformance'), { ssr: false });
const TimeOfDayPerformance = dynamic(() => import('@/components/charts/TimeOfDayPerformance'), { ssr: false });
const PerformanceHeatmap = dynamic(() => import('@/components/charts/PerformanceHeatmap'), { ssr: false });
const StrategyPerformance = dynamic(() => import('@/components/charts/StrategyPerformance'), { ssr: false });
const MistakesCostChart = dynamic(() => import('@/components/charts/MistakesCostChart'), { ssr: false });

import AdvancedFilters, { FilterOptions } from '@/components/analytics/AdvancedFilters';
import ExportData from '@/components/analytics/ExportData';
import { getAllTrades } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import { isForexPair, formatPips } from '@/lib/forexUtils';
import {
  PerformanceMetrics,
  TimeSeriesPerformance,
  TradeDistribution,
  MonthlyPerformance as MonthlyPerformanceType,
  StrategyPerformance as StrategyPerformanceType,
  SymbolPerformance as SymbolPerformanceType,
  TradeTypePerformance as TradeTypePerformanceType,
  TimeOfDayPerformance as TimeOfDayPerformanceType,
  HeatmapData,
  calculatePerformanceMetrics,
  generateEquityCurveData,
  generatePnLDistributionData,
  generateMonthlyPerformanceData,
  generateStrategyPerformanceData,
  generateSymbolPerformanceData,
  generateTradeTypePerformanceData,
  generateTimeOfDayPerformanceData,
  generatePerformanceHeatmapData,
} from '@/lib/tradeMetrics';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import AIInsights from '@/components/dashboard/AIInsights';
import { AnalyticsSkeleton } from '@/components/ui/SkeletonLoader';
import EmptyState from '@/components/ui/EmptyState';
import PropFirmAnalyticsTab from '@/components/analytics/PropFirmAnalyticsTab';
import { PROP_FIRMS, computeChallengeStatus, ChallengeStatus } from '@/lib/propFirms';
import { supabase } from '@/lib/supabaseClient';

// Time period options for filtering
type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { selectedAccountIds } = useAccount();
  const { trades: cachedTrades, initialCapital = 10000, isLoading: tradesLoading } = useTrades('all', selectedAccountIds);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'mistakes' | 'propfirm'>('overview');
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const [excludedMistakes, setExcludedMistakes] = useState<string[]>([]);
  
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
  const panelClass = 'rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[var(--surface-1)] shadow-sm text-slate-900 dark:text-white';
  const subPanelClass = 'rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[var(--surface-2)] text-slate-900 dark:text-white';
  
  // Auth check and redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  // Fetch trades and calculate metrics from shared SWR hook
  useEffect(() => {
    if (tradesLoading || !user) return;
    
    const processTrades = async () => {
      setLoading(true);
      try {
        setAllTrades(cachedTrades);
        
        // Apply time period filter
        const filtered = filterTradesByTimePeriod(cachedTrades, timePeriod);
        setFilteredTrades(filtered);

        // Load challenge status
        const { data: profileData } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        const s = (profileData?.settings as any) || {};
        if (s.propFirmId && s.propFirmTier) {
          const firm = PROP_FIRMS.find((f: any) => f.id === s.propFirmId);
          const tier = firm?.tiers.find((t: any) => t.tierName === s.propFirmTier);
          if (firm && tier) {
            const startBalance = Number(s.challengeStartBalance) || tier.accountSize;
            const startDate = s.challengeStartDate || new Date().toISOString().slice(0, 10);
            const challengeTrades = cachedTrades.filter((t: any) => t.entry_time >= startDate);
            const totalPnL = challengeTrades.reduce((sum: number, t: any) => sum + t.profit_loss, 0);
            const currentBalance = startBalance + totalPnL;
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayPnL = challengeTrades.filter((t: any) => t.entry_time.startsWith(todayStr)).reduce((sum: number, t: any) => sum + t.profit_loss, 0);
            setChallengeStatus(computeChallengeStatus(firm, tier, startDate, startBalance, currentBalance, todayPnL));
          }
        }
      } catch (error) {
        console.error('Error processing analytics trades:', error);
      } finally {
        setLoading(false);
      }
    };

    processTrades();
  }, [user?.id, cachedTrades, tradesLoading]);
  
  // ── 6.3 Calculate chart metrics for filtered trades ────────────────
  useEffect(() => {
    if (!filteredTrades || !filteredTrades.length) {
      setMetrics(null);
      setEquityCurveData([]);
      setDistributionData([]);
      setMonthlyData([]);
      setStrategyData([]);
      setSymbolData([]);
      setTradeTypeData([]);
      setTimeOfDayData([]);
      setHeatmapData([]);
      setTotalPips(0);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    try {
      const metricsRes = calculatePerformanceMetrics(filteredTrades);
      const equityRes = generateEquityCurveData(filteredTrades);
      const distRes = generatePnLDistributionData(filteredTrades, 10);
      const monthRes = generateMonthlyPerformanceData(filteredTrades);
      const stratRes = generateStrategyPerformanceData(filteredTrades);
      const symRes = generateSymbolPerformanceData(filteredTrades);
      const typeRes = generateTradeTypePerformanceData(filteredTrades);
      const timeRes = generateTimeOfDayPerformanceData(filteredTrades);
      const heatRes = generatePerformanceHeatmapData(filteredTrades);
      const pipsRes = filteredTrades.reduce((s, t) => s + (t.pips || 0), 0);

      setMetrics(metricsRes || null);
      setEquityCurveData(equityRes || []);
      setDistributionData(distRes || []);
      setMonthlyData(monthRes || []);
      setStrategyData(stratRes || []);
      setSymbolData(symRes || []);
      setTradeTypeData(typeRes || []);
      setTimeOfDayData(timeRes || []);
      setHeatmapData(heatRes || []);
      setTotalPips(pipsRes || 0);
    } catch (calcErr) {
      console.error('Analytics calculation error:', calcErr);
    } finally {
      setIsCalculating(false);
    }
  }, [filteredTrades]);
  
  // Apply time period filter
  useEffect(() => {
    if (allTrades.length > 0) {
      let filtered = filterTradesByTimePeriod(allTrades, timePeriod);
      
      // Auto-fallback to 'all' time if 30d produces 0 trades but user has trades in account history
      if (filtered.length === 0 && timePeriod === '30d') {
        setTimePeriod('all');
        filtered = allTrades;
      }

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

  const allMistakesList = useMemo(() => {
    return [...new Set(filteredTrades.flatMap(t => t.mistakes || []))];
  }, [filteredTrades]);

  const simulatedTrades = useMemo(() => {
    if (excludedMistakes.length === 0) return filteredTrades;
    return filteredTrades.filter(t => !(t.mistakes || []).some(m => excludedMistakes.includes(m)));
  }, [filteredTrades, excludedMistakes]);

  const simulatedMetrics = useMemo(() => {
    const actualPnL = filteredTrades.reduce((sum, t) => sum + t.profit_loss, 0);
    const simPnL = simulatedTrades.reduce((sum, t) => sum + t.profit_loss, 0);
    const recoveryProfit = simPnL - actualPnL;

    const wins = simulatedTrades.filter(t => t.profit_loss > 0).length;
    const simWinRate = simulatedTrades.length ? (wins / simulatedTrades.length) * 100 : 0;

    const grossProfit = simulatedTrades.filter(t => t.profit_loss > 0).reduce((sum, t) => sum + t.profit_loss, 0);
    const grossLoss = Math.abs(simulatedTrades.filter(t => t.profit_loss < 0).reduce((sum, t) => sum + t.profit_loss, 0));
    const simProfitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 99 : 0;

    const actualWins = filteredTrades.filter(t => t.profit_loss > 0).length;
    const actualWinRate = filteredTrades.length ? (actualWins / filteredTrades.length) * 100 : 0;
    const actualGrossProfit = filteredTrades.filter(t => t.profit_loss > 0).reduce((sum, t) => sum + t.profit_loss, 0);
    const actualGrossLoss = Math.abs(filteredTrades.filter(t => t.profit_loss < 0).reduce((sum, t) => sum + t.profit_loss, 0));
    const actualProfitFactor = actualGrossLoss > 0 ? (actualGrossProfit / actualGrossLoss) : actualGrossProfit > 0 ? 99 : 0;

    return {
      actualPnL,
      simPnL,
      recoveryProfit,
      actualWinRate,
      simWinRate,
      actualProfitFactor,
      simProfitFactor,
      simTradesCount: simulatedTrades.length
    };
  }, [filteredTrades, simulatedTrades, excludedMistakes]);

  const simulatedEquityCurve = useMemo(() => {
    if (excludedMistakes.length === 0) return [];
    
    // Sort trades chronologically
    const chronTrades = [...simulatedTrades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    
    let balance = initialCapital;
    const curve = [{ date: 'Start', value: balance }];
    
    chronTrades.forEach(trade => {
      balance += trade.profit_loss;
      curve.push({
        date: trade.entry_time.split('T')[0],
        value: balance
      });
    });
    
    return curve;
  }, [simulatedTrades, initialCapital, excludedMistakes]);
  
  if (authLoading || loading || isCalculating) {
    return (
      <AuthenticatedLayout>
        <AnalyticsSkeleton />
      </AuthenticatedLayout>
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
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-slate-100 tracking-tight">Analytics Dashboard</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Track your performance, leaks, and what to improve next.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2.5 bg-slate-50 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-[var(--card-border)] text-slate-700 dark:text-slate-300 rounded-xl text-sm transition-all duration-150"
              >
                <svg className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{timePeriod === 'all' ? 'All Time' : `Last ${timePeriod}`}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[var(--surface-1)] border border-slate-200 dark:border-[var(--card-border)] rounded-xl shadow-lg z-20 overflow-hidden backdrop-blur-md">
                  {(['7d', '30d', '90d', '1y', 'all'] as TimePeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setTimePeriod(period);
                        setShowFilters(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors duration-150"
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
              className="flex items-center px-4 py-2.5 bg-slate-50 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-[var(--card-border)] text-slate-700 dark:text-slate-300 rounded-xl text-sm transition-all duration-150"
            >
              <svg className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Advanced Filters</span>
              {activeFilters && (
                <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {Object.values(activeFilters).flat().filter(Boolean).length}
                </span>
              )}
            </button>
            
            {/* Export Button */}
            <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-all duration-150 shadow-md"
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
              className="text-xs text-slate-400 hover:text-[var(--foreground)] ml-auto"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Analytics Brief */}
        <div className={`${panelClass} p-5 mb-8`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Analytics Brief</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {loading
                  ? 'Preparing your latest performance brief...'
                  : `Analyzing ${filteredTrades.length} trades for ${timePeriod === 'all' ? 'all time' : `last ${timePeriod}`}.`}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <div className={`${subPanelClass} px-4 py-3 min-w-[180px]`}>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Edge</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {bestStrategy ? `${bestStrategy.strategy} (${bestStrategy.winRate.toFixed(0)}% WR)` : 'No strategy edge yet'}
                </div>
              </div>
              <div className={`${subPanelClass} px-4 py-3 min-w-[180px]`}>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Main Leak</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {largestLeak?.mistakes?.[0] || 'No logged mistake leak yet'}
                </div>
              </div>
              <div className={`${subPanelClass} px-4 py-3 min-w-[180px]`}>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Focus This Week</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {metrics ? `Protect DD below ${Math.max(6, Math.round(metrics.maxDrawdownPercent || 0))}%` : 'Add more trades for focus'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex p-1.5 bg-slate-100 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--card-border)] rounded-2xl mb-8 w-fit max-w-full overflow-x-auto shadow-sm gap-1.5" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[var(--surface-3)]'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'overview' ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'breakdown'}
            onClick={() => setActiveTab('breakdown')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 flex items-center gap-2 ${
              activeTab === 'breakdown'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[var(--surface-3)]'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'breakdown' ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Detailed Breakdown
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'mistakes'}
            onClick={() => setActiveTab('mistakes')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 flex items-center gap-2 ${
              activeTab === 'mistakes'
                ? 'bg-white dark:bg-rose-600 text-rose-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[var(--surface-3)]'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'mistakes' ? 'text-rose-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Cost of Mistakes
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'propfirm'}
            onClick={() => setActiveTab('propfirm')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === 'propfirm'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[var(--surface-3)]'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'propfirm' ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
            </svg>
            Prop Firm
            {challengeStatus && !challengeStatus.isViolated && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
            )}
            {challengeStatus?.isViolated && (
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>
        </div>
        
        {activeTab === 'overview' && (
          <div role="tabpanel">
            {filteredTrades.length === 0 && !loading ? (
              <EmptyState variant="analytics" />
            ) : (
            <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {/* Win Rate Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[var(--surface-1)] p-5 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Win Rate</span>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 dark:text-blue-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-2">
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {loading ? '-' : `${metrics?.winRate.toFixed(0)}%`}
                    </div>
                    
                    {!loading && metrics && metrics.winRate > 50 ? (
                      <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>Good</span>
                      </div>
                    ) : !loading && metrics ? (
                      <div className="text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">
                        <span>Improve</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Semicircular Gauge Arc */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
                  <div className="flex justify-center">
                    <svg className="w-[140px] h-[55px]" viewBox="0 0 100 50">
                      <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="currentColor" className="text-slate-100 dark:text-white/[0.06]" strokeWidth="9.5" strokeLinecap="round" />
                      <path
                        d="M 10 45 A 35 35 0 0 1 90 45"
                        fill="none"
                        stroke="url(#winRateGrad)"
                        strokeWidth="9.5"
                        strokeLinecap="round"
                        strokeDasharray="110"
                        strokeDashoffset={110 - (110 * (metrics?.winRate ?? 0)) / 100}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                      <defs>
                        <linearGradient id="winRateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                      <span>{metrics?.winningTrades} Wins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 block" />
                      <span>{metrics ? metrics.totalTrades - metrics.winningTrades : 0} Losses</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* R Distribution (Avg R:R) Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[var(--surface-1)] p-5 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Avg R:R</span>
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-1.5">
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {loading ? '-' : `${metrics?.riskRewardRatio.toFixed(2)}`}
                    </div>
                    <div className="text-slate-400 text-lg font-bold">R</div>
                  </div>
                </div>
                
                {/* Ratio Win vs Loss progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <span>Avg Win</span>
                    <span>Avg Loss</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[var(--surface-3)] overflow-hidden flex">
                    <div
                      style={{
                        width: `${(metrics?.averageWin || 0) + Math.abs(metrics?.averageLoss || 0) > 0 ? ((metrics?.averageWin || 0) / ((metrics?.averageWin || 0) + Math.abs(metrics?.averageLoss || 0))) * 100 : 50}%`,
                        background: 'linear-gradient(90deg, #10b981, #34d399)'
                      }}
                      className="h-full"
                    />
                    <div
                      style={{
                        width: `${(metrics?.averageWin || 0) + Math.abs(metrics?.averageLoss || 0) > 0 ? (Math.abs(metrics?.averageLoss || 0) / ((metrics?.averageWin || 0) + Math.abs(metrics?.averageLoss || 0))) * 100 : 50}%`,
                        background: 'linear-gradient(90deg, #f87171, #ef4444)'
                      }}
                      className="h-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-semibold font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics?.averageWin || 0)}</span>
                    <span className="text-rose-600 dark:text-rose-400">-{formatCurrency(Math.abs(metrics?.averageLoss || 0))}</span>
                  </div>
                </div>
              </div>
              
              {/* Strategy Usage Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[var(--surface-1)] p-5 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Strategy Usage</span>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {loading ? '-' : strategyData.length}
                  </div>
                </div>
                
                {/* Win rate progress bar for top strategy */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
                  {strategyData.length > 0 ? (
                    <>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        <span className="truncate max-w-[70%]">{strategyData[0].strategy} Win Rate</span>
                        <span>{strategyData[0].winRate.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[var(--surface-3)] overflow-hidden flex">
                        <div 
                          style={{ width: `${strategyData[0].winRate}%` }} 
                          className="h-full bg-indigo-500" 
                        />
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Top Strategy</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{formatCurrency(strategyData[0].pnL)} P&L</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 py-3 text-center">No strategies tagged yet</div>
                  )}
                </div>
              </div>

              {/* Total Pips Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[var(--surface-1)] p-5 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Pips</span>
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-1.5">
                    <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${totalPips >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {loading ? '-' : formatPips(totalPips)}
                    </div>
                    <div className="text-slate-400 text-lg font-bold">PIPS</div>
                  </div>
                </div>
                
                {/* Forex vs Other ratio bar */}
                {(() => {
                  const forexCount = filteredTrades.filter(t => isForexPair(t.symbol)).length;
                  const nonForexCount = filteredTrades.length - forexCount;
                  const pct = filteredTrades.length > 0 ? (forexCount / filteredTrades.length) * 100 : 50;
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.05] space-y-2">
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        <span>Forex ({forexCount})</span>
                        <span>Other ({nonForexCount})</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[var(--surface-3)] overflow-hidden flex">
                        <div style={{ width: `${pct}%` }} className="h-full bg-indigo-500" />
                        <div style={{ width: `${100 - pct}%` }} className="h-full bg-blue-500" />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-bold font-mono">
                        <span>{filteredTrades.length > 0 ? `${pct.toFixed(0)}%` : '--'}</span>
                        <span>{filteredTrades.length > 0 ? `${(100 - pct).toFixed(0)}%` : '--'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Advanced Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Sharpe Ratio', value: loading ? '-' : (metrics?.sharpeRatio?.toFixed(2) ?? '—'), desc: 'Risk-adjusted return', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Sortino Ratio', value: loading ? '-' : (metrics?.sortinoRatio?.toFixed(2) ?? '—'), desc: 'Downside risk only', color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Expected Value', value: loading ? '-' : formatCurrency(metrics?.expectedValue ?? 0), desc: 'Per trade on average', color: (metrics?.expectedValue ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400' },
                { label: 'Largest Win', value: loading ? '-' : formatCurrency(metrics?.largestWin ?? 0), desc: `Largest loss: ${loading ? '-' : formatCurrency(Math.abs(metrics?.largestLoss ?? 0))}`, color: 'text-emerald-600 dark:text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className={`${subPanelClass} p-4 hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden shadow-sm`}>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{s.label}</div>
                  <div className={`text-xl font-black font-mono mt-1 ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</div>
                </div>
              ))}
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Equity Curve</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></div>
                      <span className="text-slate-500 dark:text-slate-400">P&L</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30 mr-1.5"></div>
                      <span className="text-slate-500 dark:text-slate-400">Drawdown</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <EquityCurve data={equityChartData} loading={loading} />
                </div>
              </div>
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Trade Distribution</h2>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></div>
                      <span>Profit</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></div>
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
                  <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Monthly Performance</h2>
                  <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl shadow-sm">
                    {!loading && monthlyData.length > 0 ? `${monthlyData.length} ${monthlyData.length === 1 ? 'month' : 'months'}` : 'No data'}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MonthlyPerformance data={monthlyData} loading={loading} />
                </div>
              </div>
              <div className={`${panelClass} p-5 min-h-[400px] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Drawdown Analysis</h2>
                  <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl shadow-sm">
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
                    <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Cost of Mistakes</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Total P&L lost to specific bad habits</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2 py-1 rounded border border-rose-200 dark:border-rose-500/20 uppercase tracking-wider">
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
          </div>
        )}
        
        {activeTab === 'breakdown' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Strategy Performance */}
              <div className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Strategy Performance</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Analysis of your trading strategies</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl shadow-sm">
                    {!loading && strategyData.length > 0 ? `${strategyData.length} ${strategyData.length === 1 ? 'strategy' : 'strategies'}` : 'No data'}
                  </div>
                </div>
                <StrategyPerformance data={strategyData} loading={loading} />
              </div>
              
              {/* Symbol Performance */}
              <div className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Symbol Performance</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Breakdown by trading symbols</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl shadow-sm">
                    {!loading && symbolData.length > 0 ? `${symbolData.length} ${symbolData.length === 1 ? 'symbol' : 'symbols'}` : 'No data'}
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
                    <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Long vs Short</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Directional bias analysis</p>
                  </div>
                </div>
                <TradeTypePerformance data={tradeTypeData} loading={loading} />
              </div>
              
              {/* Time of Day Performance */}
              <div className={`col-span-1 lg:col-span-2 ${panelClass} p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Time of Day Analysis</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Performance across different trading sessions</p>
                  </div>
                </div>
                <TimeOfDayPerformance data={timeOfDayData} loading={loading} />
              </div>
            </div>
            
            {/* Performance Heatmap */}
            <div className={`${panelClass} p-5 mb-8`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">Performance Heatmap</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Trading performance by day and time</p>
                </div>
                <div className="flex space-x-2">
                  <div className="flex items-center text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></div>
                    <span className="text-slate-500 dark:text-slate-400">Profit</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></div>
                    <span className="text-slate-500 dark:text-slate-400">Loss</span>
                  </div>
                </div>
              </div>
              <PerformanceHeatmap data={heatmapData} loading={loading} />
            </div>
            
            {/* Performance Summary */}
            <div className={`${panelClass} p-6 mb-6`}>
              <div className="flex items-start">
                <div className="flex-shrink-0 p-3 bg-blue-500/15 rounded-xl mr-4 text-blue-600 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-2">Performance Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      Based on your trading data, consider focusing on your top-performing strategies and symbols.
                      Your best trading occurs during market hours, especially in the morning session.
                    </p>
                    <div className="bg-rose-50 dark:bg-rose-500/5 rounded-xl p-3.5 border border-rose-200 dark:border-rose-500/15 shadow-sm">
                      <p className="text-rose-600 dark:text-rose-400 text-xs font-bold mb-1 uppercase tracking-wider">Top Mistake to Fix:</p>
                      <p className="text-slate-600 dark:text-slate-300 text-xs italic leading-relaxed">
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
                { label: 'Trades with Mistakes', value: filteredTrades.filter(t => t.mistakes?.length).length.toString(), color: 'text-rose-600 dark:text-rose-400' },
                { label: 'Clean Trades', value: filteredTrades.filter(t => !t.mistakes?.length).length.toString(), color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Psychology Score', value: filteredTrades.length ? `${Math.round((filteredTrades.filter(t => !t.mistakes?.length).length / filteredTrades.length) * 100)}%` : '—', color: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Unique Mistake Types', value: [...new Set(filteredTrades.flatMap(t => t.mistakes || []))].length.toString(), color: 'text-amber-600 dark:text-amber-400' },
              ].map((s, i) => (
                <div key={i} className={`${subPanelClass} p-4 hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden shadow-sm`}>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={`text-3xl font-black font-mono ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* What-If Mistakes Simulator Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Panel: Checklist of Mistakes */}
              <div className={`${panelClass} p-5 border-blue-500/10 flex flex-col`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base">What-If Mistake Excluder</h2>
                    <p className="text-slate-500 dark:text-gray-400 text-xs mt-0.5">Toggle mistakes to exclude them from the curve</p>
                  </div>
                  {excludedMistakes.length > 0 && (
                    <button 
                      onClick={() => setExcludedMistakes([])}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold"
                    >
                      Reset All
                    </button>
                  )}
                </div>
                
                {allMistakesList.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 text-center text-xs text-slate-400 dark:text-gray-500">
                    No mistakes logged in current date range.
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
                    {allMistakesList.map(mistake => {
                      const isChecked = excludedMistakes.includes(mistake);
                      const mTrades = filteredTrades.filter(t => t.mistakes?.includes(mistake));
                      const totalPnL = mTrades.reduce((s, t) => s + t.profit_loss, 0);

                      return (
                        <label 
                          key={mistake} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isChecked 
                              ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/30' 
                              : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-[var(--surface-3)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setExcludedMistakes(prev => prev.filter(m => m !== mistake));
                                } else {
                                  setExcludedMistakes(prev => [...prev, mistake]);
                                }
                              }}
                              className="rounded border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-900 text-indigo-600 focus:ring-indigo-500/50 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">{mistake}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 dark:text-gray-400 block">{mTrades.length} trades</span>
                            <span className={`text-xs font-bold ${totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toFixed(0)}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Middle Panel: Recalculated Stats */}
              <div className={`${panelClass} p-5 border-emerald-500/10 flex flex-col justify-between`}>
                <div>
                  <h2 className="text-slate-900 dark:text-white font-semibold mb-3 text-sm sm:text-base">Simulated Recovery Impact</h2>
                  {excludedMistakes.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
                      Select one or more mistakes to calculate simulated metrics.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Big recovery card */}
                      {(() => {
                        const recPnL = simulatedMetrics?.recoveryProfit ?? 0;
                        const isPositive = recPnL >= 0;
                        return (
                          <div className={`border rounded-2xl p-4 text-center ${
                            isPositive 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-400'
                          }`}>
                            <span className="text-[9px] font-bold uppercase tracking-wider block mb-1">
                              {isPositive ? 'Simulated Recovery Profit' : 'Simulated Net Loss Impact'}
                            </span>
                            <span className="text-3xl font-black">
                              {isPositive ? '+' : '-'}${Math.abs(recPnL).toFixed(0)}
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
                              {isPositive 
                                ? 'By avoiding the selected mistakes, you would have avoided those losses entirely!' 
                                : 'Avoiding these mistake trades would have also removed profitable trades.'}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Stat grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] p-3 rounded-xl text-center">
                          <span className="text-[9px] text-slate-500 dark:text-gray-400 font-bold uppercase block mb-1">Win Rate</span>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {simulatedMetrics?.simWinRate.toFixed(1)}%
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-gray-500">
                            was {simulatedMetrics?.actualWinRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] p-3 rounded-xl text-center">
                          <span className="text-[9px] text-slate-500 dark:text-gray-400 font-bold uppercase block mb-1">Profit Factor</span>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {simulatedMetrics?.simProfitFactor.toFixed(2)}
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-gray-500">
                            was {simulatedMetrics?.actualProfitFactor.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {excludedMistakes.length > 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-gray-400 mt-3 text-center border-t border-slate-100 dark:border-white/[0.04] pt-2">
                    Simulating {simulatedMetrics?.simTradesCount} trades out of {filteredTrades.length}
                  </p>
                )}
              </div>

              {/* Right Panel: Simulated Equity Curve Comparison */}
              <div className={`${panelClass} p-5 border-blue-500/10 min-h-[300px] flex flex-col`}>
                <h2 className="text-slate-900 dark:text-white font-semibold mb-3 text-sm sm:text-base">Simulated Equity Curve</h2>
                <div className="flex-1 min-h-[220px]">
                  <EquityCurve 
                    data={equityChartData} 
                    simulatedData={excludedMistakes.length > 0 ? simulatedEquityCurve : []} 
                    initialCapital={initialCapital} 
                  />
                </div>
              </div>
            </div>

            {/* Cost of Mistakes Chart */}
            <div className={`${panelClass} p-5 mb-6 border-red-500/15`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-slate-900 dark:text-white font-semibold">Dollar Cost of Each Mistake</h2>
                  <p className="text-slate-500 dark:text-gray-400 text-xs mt-0.5">Total P&L impact when this mistake was present</p>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-200 dark:border-red-500/10 uppercase tracking-tighter">Mistake Tracker</div>
              </div>
              <MistakesCostChart trades={filteredTrades} />
            </div>

            {/* Per-Mistake Table */}
            <div className={`${panelClass} overflow-hidden mb-8`}>
              <div className="grid grid-cols-5 gap-4 px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-black/20">
                <div className="col-span-2">Mistake</div>
                <div>Occurrences</div>
                <div>Total P&L Impact</div>
                <div>Win Rate</div>
              </div>
              {(() => {
                const allMistakes = [...new Set(filteredTrades.flatMap(t => t.mistakes || []))];
                if (!allMistakes.length) return (
                  <div className="px-5 py-12 text-center text-slate-500">No mistakes logged yet. Tag mistakes in your trades to see them here.</div>
                );
                return allMistakes.map(mistake => {
                  const mTrades = filteredTrades.filter(t => t.mistakes?.includes(mistake));
                  const totalPnL = mTrades.reduce((s, t) => s + t.profit_loss, 0);
                  const winRate = mTrades.length ? (mTrades.filter(t => t.profit_loss > 0).length / mTrades.length * 100) : 0;
                  return (
                    <div key={mistake} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-slate-200 dark:border-white/[0.03] items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                      <div className="col-span-2">
                        <span className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-900/40">{mistake}</span>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-gray-300">{mTrades.length}</div>
                      <div className={`text-sm font-bold ${totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toFixed(0)}
                      </div>
                      <div className={`text-sm font-bold ${winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
        
        {/* Prop Firm Tab */}
        {activeTab === 'propfirm' && (
          <PropFirmAnalyticsTab trades={allTrades} challengeStatus={challengeStatus} />
        )}

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
    </AuthenticatedLayout>
  );
} 
