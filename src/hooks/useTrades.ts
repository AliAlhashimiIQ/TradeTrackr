import useSWR from 'swr'
import { getAllTrades } from '@/lib/tradingApi'
import { useAuth } from './useAuth'
import { DateRange } from '@/components/dashboard/DateRangeSelector'
import { supabase } from '@/lib/supabaseClient'

/**
 * Optimized Hook to fetch trade data based on date range using SWR caching
 */
export function useTrades(dateRange: DateRange, accountId?: string | 'all') {
  const { user } = useAuth()

  const fetcher = async () => {
    if (!user) return { trades: [], initialCapital: 10000 }
    
    // Calculate date range
    const endDate = new Date()
    let startDate = new Date()
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break;
      case '1y':
        startDate.setDate(endDate.getDate() - 365)
        break;
      case 'all':
        startDate = new Date(0) // Beginning of time
        break;
      default:
        startDate.setDate(endDate.getDate() - 30) // Default to 30 days
    }
    
    const startDateStr = startDate.toISOString()
    const endDateStr = endDate.toISOString()
    const accountFilterId = accountId && accountId !== 'all' ? accountId : undefined;
    
    // Fetch trades and initial capital in parallel
    const [tradesData, profileRes, accountsRes] = await Promise.all([
      getAllTrades(user.id, {
        startDate: startDateStr,
        endDate: endDateStr,
        accountId: accountFilterId
      }),
      supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single(),
      accountFilterId
        ? supabase
            .from('trading_accounts')
            .select('balance')
            .eq('id', accountFilterId)
            .single()
        : supabase
            .from('trading_accounts')
            .select('balance')
            .eq('user_id', user.id)
    ])
    
    const settings = (profileRes.data?.settings as any) || {}
    const profileStartingBalance = Number(settings.startingBalance) || 10000
    
    let cap = profileStartingBalance
    if (accountFilterId) {
      const balance = Number((accountsRes.data as any)?.balance || 0)
      if (balance > 0) {
        cap = balance
      }
    } else {
      const accountsList = (accountsRes.data as any[]) || []
      if (accountsList.length > 0) {
        const totalAccountBalance = accountsList.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
        if (totalAccountBalance > 0) {
          cap = totalAccountBalance
        }
      }
    }
    
    return {
      trades: tradesData,
      initialCapital: cap
    }
  }

  const { data, error } = useSWR(
    user ? ['trades', user.id, dateRange, accountId] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Cache and deduplicate identical queries within 10 seconds
    }
  )

  return {
    trades: data?.trades || [],
    initialCapital: data?.initialCapital ?? 10000,
    isLoading: !data && !error,
    error: error || null,
  }
}
