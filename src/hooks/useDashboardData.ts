import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { 
  getRecentTrades, 
  getTradeMetrics, 
  getEquityCurveData
} from '@/lib/tradingApi';
import type { Trade, TradeMetrics, ChartData } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { 
  calculatePerformanceMetrics, 
  generateEquityCurveData, 
  PerformanceMetrics, 
  TimeSeriesPerformance 
} from '@/lib/tradeMetrics';

// Fetch function for SWR
async function fetcher(url: string, userId: string, dateRange: DateRange) {
  const parts = url.split('/');
  const resource = parts[parts.length - 1];

  switch (resource) {
    case 'trades':
      return getRecentTrades(userId, 5);
    case 'metrics':
      const allTrades = await getAllTradesWithinRange(userId, dateRange);
      return getCalculatedMetrics(allTrades);
    case 'equity-curve':
      const trades = await getAllTradesWithinRange(userId, dateRange);
      const data = generateEquityCurveData(trades);
      // Convert to format expected by EquityChart
      return {
        labels: data.map(d => d.date),
        values: data.map(d => d.equity)
      };
    case 'all-trades':
      return getAllTradesWithinRange(userId, dateRange);
    default:
      throw new Error(`Unknown resource: ${resource}`);
  }
}

// Helper function to get all trades within a date range
async function getAllTradesWithinRange(userId: string, dateRange: DateRange): Promise<Trade[]> {
  try {
    let query = supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_time', { ascending: false });

    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case '1y':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }
      
      query = query.gte('entry_time', startDate.toISOString());
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data as Trade[] || [];
  } catch (error) {
    console.error('Error fetching trades within range:', error);
    return [];
  }
}

// Helper function to calculate extended metrics from trades
function getCalculatedMetrics(trades: Trade[]): TradeMetrics {
  // If no trades, return default values
  if (trades.length === 0) {
    return {
      total_pnl: 0,
      win_rate: 0,
      avg_win: 0,
      avg_loss: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0
    };
  }
  
  // Calculate metrics from real data
  const winningTrades = trades.filter(trade => trade.profit_loss > 0);
  const losingTrades = trades.filter(trade => trade.profit_loss <= 0);
  
  const totalPnL = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const totalWinAmount = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const totalLossAmount = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit_loss, 0));
  
  return {
    total_pnl: totalPnL,
    win_rate: winningTrades.length / trades.length,
    avg_win: winningTrades.length > 0 ? totalWinAmount / winningTrades.length : 0,
    avg_loss: losingTrades.length > 0 ? totalLossAmount / losingTrades.length : 0,
    total_trades: trades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length
  };
}

// Custom hook for dashboard data with SWR caching
export function useDashboardData(userId: string | undefined, dateRange: DateRange = '30d') {
  const tradesKey = userId ? ['/api/dashboard/trades', userId, dateRange] : null;
  const metricsKey = userId ? ['/api/dashboard/metrics', userId, dateRange] : null;
  const equityCurveKey = userId ? ['/api/dashboard/equity-curve', userId, dateRange] : null;
  const allTradesKey = userId ? ['/api/dashboard/all-trades', userId, dateRange] : null;

  // Use SWR for data fetching with caching
  const { data: trades, error: tradesError, isLoading: tradesLoading } = useSWR(
    tradesKey, 
    ([url, id, range]) => fetcher(url, id, range),
    { revalidateOnFocus: false, dedupingInterval: 60000 } // Revalidate every 60 seconds
  );

  const { data: metrics, error: metricsError, isLoading: metricsLoading } = useSWR(
    metricsKey, 
    ([url, id, range]) => fetcher(url, id, range),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: equityData, error: equityError, isLoading: equityLoading } = useSWR(
    equityCurveKey, 
    ([url, id, range]) => fetcher(url, id, range),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: allTrades, error: allTradesError, isLoading: allTradesLoading } = useSWR(
    allTradesKey, 
    ([url, id, range]) => fetcher(url, id, range),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Calculate advanced metrics
  const [advancedMetrics, setAdvancedMetrics] = useState<PerformanceMetrics | null>(null);
  
  useEffect(() => {
    if (allTrades && allTrades.length > 0) {
      const metrics = calculatePerformanceMetrics(allTrades);
      setAdvancedMetrics(metrics);
    }
  }, [allTrades]);

  // Aggregate errors and loading states
  const isLoading = tradesLoading || metricsLoading || equityLoading || allTradesLoading;
  const hasError = tradesError || metricsError || equityError || allTradesError;

  return {
    trades: trades || [],
    metrics: metrics || {
      total_pnl: 0,
      win_rate: 0,
      avg_win: 0,
      avg_loss: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0
    },
    equityData: equityData || { labels: [], values: [] },
    advancedMetrics,
    allTrades: allTrades || [],
    isLoading,
    hasError
  };
} 