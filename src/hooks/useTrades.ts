import { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { getAllTrades } from '@/lib/tradingApi';
import { useAuth } from './useAuth';
import { DateRange } from '@/components/dashboard/DateRangeSelector';

/**
 * Hook to fetch trade data based on date range
 */
export function useTrades(dateRange: DateRange) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
        
        // Fetch trades
        const tradesData = await getAllTrades(user.id, {
          startDate: startDateStr,
          endDate: endDateStr
        });
        
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

  return { trades, isLoading, error };
} 