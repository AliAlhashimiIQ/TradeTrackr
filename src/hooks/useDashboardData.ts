import { useState, useEffect } from 'react';
import type { Trade, TradeMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { PerformanceMetrics, calculatePerformanceMetrics, generateEquityCurveData } from '@/lib/tradeMetrics';
import { getAllTrades } from '@/lib/tradingApi';

function getDateRangeBounds(dateRange: DateRange): { startDate?: string; endDate?: string } {
  if (dateRange === 'all') {
    return {};
  }

  const endDate = new Date();
  const startDate = new Date(endDate);

  if (dateRange === '7d') {
    startDate.setDate(endDate.getDate() - 7);
  } else if (dateRange === '30d') {
    startDate.setDate(endDate.getDate() - 30);
  } else if (dateRange === '90d') {
    startDate.setDate(endDate.getDate() - 90);
  } else if (dateRange === '1y') {
    startDate.setFullYear(endDate.getFullYear() - 1);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

function toTradeMetrics(performance: PerformanceMetrics): TradeMetrics {
  return {
    total_pnl: performance.totalPnL,
    win_rate: performance.winRate / 100,
    avg_win: performance.averageWin,
    avg_loss: performance.averageLoss,
    total_trades: performance.totalTrades,
    winning_trades: performance.winningTrades,
    losing_trades: performance.losingTrades
  };
}

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
        const bounds = getDateRangeBounds(dateRange);
        const tradesResponse = await getAllTrades(userId, bounds);
        const advanced = calculatePerformanceMetrics(tradesResponse);
        const equityCurve = generateEquityCurveData(tradesResponse).map(point => ({
          date: point.date,
          value: point.equity
        }));

        setTrades(tradesResponse);
        setAdvancedMetrics(advanced);
        setMetrics(toTradeMetrics(advanced));
        setEquityData({
          labels: equityCurve.map(point => point.date),
          values: equityCurve.map(point => point.value)
        });
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
