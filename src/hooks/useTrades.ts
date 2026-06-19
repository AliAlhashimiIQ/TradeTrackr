import { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { getAllTrades } from '@/lib/tradingApi';
import { useAuth } from './useAuth';
import { DateRange } from '@/components/dashboard/DateRangeSelector';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook to fetch trade data based on date range
 */
export function useTrades(dateRange: DateRange) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initialCapital, setInitialCapital] = useState<number>(10000);

  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) {
        setTrades([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case '1y':
            startDate.setDate(endDate.getDate() - 365);
            break;
          case 'all':
            // No date filter
            startDate = new Date(0); // Beginning of time
            break;
          default:
            startDate.setDate(endDate.getDate() - 30); // Default to 30 days
        }
        
        // Convert to ISO format for API
        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();
        
        // Fetch trades and initial capital in parallel
        const [tradesData, profileRes, accountsRes] = await Promise.all([
          getAllTrades(user.id, {
            startDate: startDateStr,
            endDate: endDateStr
          }),
          supabase
            .from('profiles')
            .select('settings')
            .eq('id', user.id)
            .single(),
          supabase
            .from('trading_accounts')
            .select('balance')
            .eq('user_id', user.id)
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
        
        setInitialCapital(cap);
        setTrades(tradesData);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, [user, dateRange]);

  return { trades, isLoading, error, initialCapital };
}
 
