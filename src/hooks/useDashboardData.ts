import { useState, useEffect } from 'react';
import type { Trade, TradeMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { PerformanceMetrics } from '@/lib/tradeMetrics';
import { getRecentTrades, getTradeMetrics, getEquityCurveData } from '@/lib/tradingApi';
import { generateEquityCurveData } from '@/lib/tradeMetrics';

// Mock data for initial rendering
const mockTrades: Trade[] = [
  {
    id: '1',
    user_id: 'user123',
    symbol: 'AAPL',
    type: 'Long',
    entry_price: 145.23,
    exit_price: 150.45,
    entry_time: '2023-05-15T09:30:00Z',
    exit_time: '2023-05-15T16:30:00Z',
    quantity: 10,
    profit_loss: 52.20,
    created_at: '2023-05-15T09:30:00Z',
    updated_at: '2023-05-15T16:30:00Z',
    strategy: 'Breakout',
    tags: ['breakout', 'tech', 'trend-following']
  },
  {
    id: '2',
    user_id: 'user123',
    symbol: 'MSFT',
    type: 'Short',
    entry_price: 290.45,
    exit_price: 285.30,
    entry_time: '2023-05-16T10:15:00Z',
    exit_time: '2023-05-16T15:45:00Z',
    quantity: 5,
    profit_loss: 25.75,
    created_at: '2023-05-16T10:15:00Z',
    updated_at: '2023-05-16T15:45:00Z',
    strategy: 'Reversal',
    tags: ['reversal', 'tech', 'overbought']
  }
];

const mockMetrics: TradeMetrics = {
  total_pnl: 1250.75,
  win_rate: 0.68,
  avg_win: 125.45,
  avg_loss: 65.30,
  total_trades: 25,
  winning_trades: 17,
  losing_trades: 8
};

const mockEquityData = {
  labels: [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (30 - i));
    return date.toISOString().split('T')[0];
  }),
  values: [...Array(30)].map((_, i) => 10000 + (i * 100) + (Math.random() * 200 - 100))
};

// Mock advanced metrics
const mockAdvancedMetrics: PerformanceMetrics = {
  totalTrades: 25,
  winningTrades: 17,
  losingTrades: 8,
  breakEvenTrades: 0,
  winRate: 0.68,
  profitFactor: 3.2,
  totalPnL: 1250.75,
  grossProfit: 2134.50,
  grossLoss: -883.75,
  averageWin: 125.45,
  averageLoss: -65.30,
  largestWin: 350.25,
  largestLoss: -140.80,
  riskRewardRatio: 1.92,
  maxDrawdown: 450.20,
  maxDrawdownPercent: 4.5,
  maxDrawdownDuration: 12,
  currentDrawdown: 150.75,
  sharpeRatio: 1.8,
  sortinoRatio: 2.5,
  expectedValue: 30.75
};

// Custom hook for dashboard data
export function useDashboardData(userId: string | undefined, dateRange: DateRange = '30d') {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
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

  // Fetch data from API
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // Fetch all data in parallel
        const [tradesResponse, metricsResponse, equityDataResponse] = await Promise.all([
          getRecentTrades(userId, 10),
          getTradeMetrics(userId),
          getEquityCurveData(userId)
        ]);
        
        setTrades(tradesResponse);
        setMetrics(metricsResponse);
        setEquityData(equityDataResponse);
        
        // Generate advanced metrics from trades data
        // In a real implementation, this would be calculated on the server
        if (tradesResponse.length > 0) {
          // Use the mock data for now - in production this would be calculated
          setAdvancedMetrics(mockAdvancedMetrics);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setHasError(true);
        
        // Use mock data as fallback
        setTrades(mockTrades);
        setMetrics({
          total_pnl: 1250.75,
          win_rate: 0.68,
          avg_win: 125.45,
          avg_loss: 65.30,
          total_trades: 25,
          winning_trades: 17,
          losing_trades: 8
        });
        setEquityData({
          labels: [...Array(30)].map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - i));
            return date.toISOString().split('T')[0];
          }),
          values: [...Array(30)].map((_, i) => 10000 + (i * 100) + (Math.random() * 200 - 100))
        });
        setAdvancedMetrics(mockAdvancedMetrics);
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