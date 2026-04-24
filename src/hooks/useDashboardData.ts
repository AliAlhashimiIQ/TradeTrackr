import { useState, useEffect } from 'react';
import type { Trade, TradeMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { PerformanceMetrics, calculatePerformanceMetrics } from '@/lib/tradeMetrics';
import { getRecentTrades, getTradeMetrics, getEquityCurveData } from '@/lib/tradingApi';

// Custom hook for dashboard data (NO MOCK DATA)
export function useDashboardData(userId: string | undefined, dateRange: DateRange = '30d') {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<TradeMetrics>({
    total_pnl: 0,
    win_rate: 0,
    avg_win: 0,
    avg_loss: 0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0
  });
  const [equityData, setEquityData] = useState<{ labels: string[], values: number[] }>({
    labels: [],
    values: []
  });
  const [advancedMetrics, setAdvancedMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setTrades([]);
      setMetrics({
        total_pnl: 0,
        win_rate: 0,
        avg_win: 0,
        avg_loss: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0
      });
      setEquityData({ labels: [], values: [] });
      setAdvancedMetrics(null);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        // Fetch all trades for advanced metrics
        const [tradesResponse, metricsResponse, equityDataResponse] = await Promise.all([
          getRecentTrades(userId, 1000), // fetch all or a large number for metrics
          getTradeMetrics(userId),
          getEquityCurveData(userId)
        ]);
        setTrades(tradesResponse);
        setMetrics(metricsResponse);
        setEquityData(equityDataResponse);
        // Calculate advanced metrics from real trades
        setAdvancedMetrics(calculatePerformanceMetrics(tradesResponse));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setHasError(true);
        setTrades([]);
        setMetrics({
          total_pnl: 0,
          win_rate: 0,
          avg_win: 0,
          avg_loss: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0
        });
        setEquityData({ labels: [], values: [] });
        setAdvancedMetrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId, dateRange]);

  return {
    trades,
    metrics,
    equityData,
    advancedMetrics,
    allTrades: trades,
    isLoading,
    hasError
  };
} 
