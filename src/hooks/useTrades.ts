import useSWR from 'swr'
import { getAllTrades } from '@/lib/tradingApi'
import { useAuth } from './useAuth'
import { DateRange } from '@/components/dashboard/DateRangeSelector'
import { supabase } from '@/lib/supabaseClient'
import { AccountSelection } from '@/providers/AccountProvider'

/**
 * Optimized Hook to fetch trade data based on date range using SWR caching.
 * accountSelection: 'all' | string[] (multi-account support)
 */
export function useTrades(dateRange: DateRange, accountSelection?: AccountSelection) {
  const { user } = useAuth()

  const fetcher = async () => {
    if (!user) return { trades: [], initialCapital: 10000 }
    
    // Calculate date range
    const endDate = new Date()
    let startDate = new Date()
    
    switch (dateRange) {
      case '7d':  startDate.setDate(endDate.getDate() - 7);   break
      case '30d': startDate.setDate(endDate.getDate() - 30);  break
      case '90d': startDate.setDate(endDate.getDate() - 90);  break
      case '1y':  startDate.setDate(endDate.getDate() - 365); break
      case 'all': startDate = new Date(0);                    break
      default:    startDate.setDate(endDate.getDate() - 30)
    }
    
    const startDateStr = startDate.toISOString()
    const endDateStr   = endDate.toISOString()

    // Resolve account filter
    const accountIds: string[] | undefined =
      !accountSelection || accountSelection === 'all'
        ? undefined
        : accountSelection

    // Fetch trades and initial capital in parallel
    const [tradesData, profileRes, accountsRes] = await Promise.all([
      getAllTrades(user.id, {
        startDate: startDateStr,
        endDate:   endDateStr,
        accountIds,
      }),
      supabase.from('profiles').select('settings').eq('id', user.id).single(),
      accountIds && accountIds.length > 0
        ? supabase.from('trading_accounts').select('balance').in('id', accountIds)
        : supabase.from('trading_accounts').select('balance').eq('user_id', user.id),
    ])
    
    const settings = (profileRes.data?.settings as any) || {}
    const profileStartingBalance = Number(settings.startingBalance) || 10000
    
    let cap = profileStartingBalance
    const accountsList = (accountsRes.data as any[]) || []
    if (accountsList.length > 0) {
      const totalBalance = accountsList.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
      if (totalBalance > 0) cap = totalBalance
    }
    
    return { trades: tradesData, initialCapital: cap }
  }

  // Serialize key so SWR re-fetches on selection change
  const selectionKey = !accountSelection || accountSelection === 'all'
    ? 'all'
    : (accountSelection as string[]).slice().sort().join(',')

  const { data, error, mutate } = useSWR(
    user ? ['trades', user.id, dateRange, selectionKey] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  return {
    trades:         data?.trades        || [],
    initialCapital: data?.initialCapital ?? 10000,
    isLoading:      !data && !error,
    error:          error || null,
    mutate,
  }
}
