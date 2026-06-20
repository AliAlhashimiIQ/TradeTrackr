import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useTrades } from './useTrades'

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  isStreakActiveToday: boolean
  lastJournaledDate: string | null
}

const countWeekdaysBetween = (d1: Date, d2: Date): number => {
  const start = new Date(d1)
  const end = new Date(d2)
  
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  
  if (start >= end) return 0
  
  let count = 0
  start.setDate(start.getDate() + 1)
  
  while (start < end) {
    const dayOfWeek = start.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) and not Saturday (6)
      count++
    }
    start.setDate(start.getDate() + 1)
  }
  
  return count
}

export function useStreak() {
  const { user } = useAuth()
  const { trades, isLoading: tradesLoading } = useTrades('all')

  const streak = useMemo<StreakInfo>(() => {
    if (!user || !trades || trades.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        isStreakActiveToday: false,
        lastJournaledDate: null,
      }
    }

    const validEntries = trades.filter((t): t is typeof t & { entry_time: string } => !!t.entry_time);

    // Convert entry_times to local YYYY-MM-DD dates
    const localDates = Array.from(
      new Set(
        validEntries.map((t) => {
          const d = new Date(t.entry_time)
          // Use local date parts to avoid UTC timezone shifts
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        })
      )
    ).sort()

    if (localDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        isStreakActiveToday: false,
        lastJournaledDate: null,
      }
    }

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const lastJournaledDate = localDates[localDates.length - 1]
    const lastTradeDate = new Date(lastJournaledDate + 'T00:00:00')
    
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    
    const weekdaysSinceLastTrade = countWeekdaysBetween(lastTradeDate, todayDate)
    
    // Streak is active today if we traded today, or if no weekdays (market days) have passed since our last trade
    const todayStr = getLocalDateString(todayDate)
    const isStreakActiveToday = localDates.includes(todayStr) || weekdaysSinceLastTrade === 0

    // Calculate current streak
    let currentStreak = 0
    if (isStreakActiveToday) {
      currentStreak = 1
      let i = localDates.length - 1
      while (i > 0) {
        const dateCurr = new Date(localDates[i] + 'T00:00:00')
        const datePrev = new Date(localDates[i - 1] + 'T00:00:00')
        
        if (countWeekdaysBetween(datePrev, dateCurr) === 0) {
          currentStreak++
          i--
        } else {
          break
        }
      }
    }

    // Calculate longest streak in history
    let longestStreak = 0
    if (localDates.length > 0) {
      let tempStreak = 1
      longestStreak = 1
      
      for (let i = 1; i < localDates.length; i++) {
        const datePrev = new Date(localDates[i - 1] + 'T00:00:00')
        const dateCurr = new Date(localDates[i] + 'T00:00:00')
        
        if (countWeekdaysBetween(datePrev, dateCurr) === 0) {
          tempStreak++
        } else {
          tempStreak = 1
        }
        
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      isStreakActiveToday,
      lastJournaledDate,
    }
  }, [user, trades])

  return { streak, isLoading: tradesLoading, refetch: () => {} }
}
