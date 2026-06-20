import useSWR from 'swr';
import type { Trade, TradeMetrics } from '@/lib/types';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { PerformanceMetrics, calculatePerformanceMetrics, generateEquityCurveData } from '@/lib/tradeMetrics';
import { getAllTrades } from '@/lib/tradingApi';
import { supabase } from '@/lib/supabaseClient';

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

// Optimized custom hook for dashboard data using SWR caching
export function useDashboardData(userId: string | undefined, dateRange: DateRange = '30d') {
  
  const fetcher = async () => {
    if (!userId) throw new Error('No user ID provided');
    
    const bounds = getDateRangeBounds(dateRange);
    
    // Fetch trades, profile settings, and accounts in parallel
    const [tradesResponse, profileRes, accountsRes] = await Promise.all([
      getAllTrades(userId, bounds),
      supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single(),
      supabase
        .from('trading_accounts')
        .select('balance')
        .eq('user_id', userId)
    ]);

    const settings = (profileRes.data?.settings as any) || {};
    const profileStartingBalance = Number(settings.startingBalance) || 10000;
    
    let cap = profileStartingBalance;
    if (accountsRes.data && accountsRes.data.length > 0) {
      const totalAccountBalance = accountsRes.data.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
      if (totalAccountBalance > 0) {
        cap = totalAccountBalance;
      }
    }

    const advanced = calculatePerformanceMetrics(tradesResponse, cap);
    
    let labels: string[] = [];
    let values: number[] = [];
    
    try {
      const { data: rpcEquityData, error: rpcError } = await (supabase as any).rpc('get_user_equity_curve', {
        p_user_id: userId,
        p_initial_capital: cap,
        p_start_date: bounds.startDate || null,
        p_end_date: bounds.endDate || null,
      });

      if (rpcError || !rpcEquityData) {
        throw rpcError || new Error('No RPC equity curve data returned');
      }
      
      labels = rpcEquityData.map((point: any) => point.date);
      values = rpcEquityData.map((point: any) => Number(point.equity));
    } catch (rpcErr) {
      console.warn('Fallback to client-side equity curve calculations:', rpcErr);
      const equityCurve = generateEquityCurveData(tradesResponse, cap).map(point => ({
        date: point.date,
        value: point.equity
      }));
      labels = equityCurve.map(point => point.date);
      values = equityCurve.map(point => point.value);
    }

    return {
      trades: tradesResponse,
      metrics: toTradeMetrics(advanced),
      equityData: { labels, values },
      advancedMetrics: advanced,
      initialCapital: cap
    };
  };

  const { data, error } = useSWR(
    userId ? ['dashboard', userId, dateRange] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Cache and deduplicate queries within 10 seconds
    }
  );

  return {
    trades: data?.trades || [],
    metrics: data?.metrics || {
      total_pnl: 0,
      win_rate: 0,
      avg_win: 0,
      avg_loss: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0
    },
    equityData: data?.equityData || { labels: [], values: [] },
    advancedMetrics: data?.advancedMetrics || null,
    initialCapital: data?.initialCapital ?? 10000,
    allTrades: data?.trades || [],
    isLoading: !data && !error,
    hasError: !!error
  };
}
