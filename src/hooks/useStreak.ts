import { useMemo, useEffect } from 'react'
import { useAuth } from './useAuth'
import { useTrades } from './useTrades'
import { useSettings } from '@/providers/SettingsProvider'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

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
  const { streakFreezes, setStreakFreezes, frozenDates, setFrozenDates } = useSettings()

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
    const tradeDates = Array.from(
      new Set(
        validEntries.map((t) => {
          const d = new Date(t.entry_time)
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        })
      )
    )

    // Merge trade dates with frozen dates
    const activeDates = Array.from(
      new Set([...tradeDates, ...frozenDates])
    ).sort()

    if (activeDates.length === 0) {
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

    const lastJournaledDate = activeDates[activeDates.length - 1]
    const lastActiveDate = new Date(lastJournaledDate + 'T00:00:00')
    
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    
    const weekdaysSinceLastActive = countWeekdaysBetween(lastActiveDate, todayDate)
    
    // Streak is active today if we active today, or if no weekdays have passed since last active
    const todayStr = getLocalDateString(todayDate)
    const isStreakActiveToday = activeDates.includes(todayStr) || weekdaysSinceLastActive === 0

    // Calculate current streak
    let currentStreak = 0
    if (isStreakActiveToday) {
      currentStreak = 1
      let i = activeDates.length - 1
      while (i > 0) {
        const dateCurr = new Date(activeDates[i] + 'T00:00:00')
        const datePrev = new Date(activeDates[i - 1] + 'T00:00:00')
        
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
    if (activeDates.length > 0) {
      let tempStreak = 1
      longestStreak = 1
      
      for (let i = 1; i < activeDates.length; i++) {
        const datePrev = new Date(activeDates[i - 1] + 'T00:00:00')
        const dateCurr = new Date(activeDates[i] + 'T00:00:00')
        
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
  }, [user, trades, frozenDates])

  // Check for auto-freeze and milestones
  useEffect(() => {
    if (tradesLoading || !user || !trades.length) return

    const runChecks = async () => {
      // Find trade dates
      const tradeDates = Array.from(
        new Set(
          trades
            .filter((t): t is typeof t & { entry_time: string } => !!t.entry_time)
            .map((t) => {
              const d = new Date(t.entry_time)
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            })
        )
      ).sort()

      if (tradeDates.length === 0) return

      const lastTradeStr = tradeDates[tradeDates.length - 1]
      const lastTradeDate = new Date(lastTradeStr + 'T00:00:00')
      
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      
      // Calculate weekdays since last trade
      const weekdaysSinceLastTrade = countWeekdaysBetween(lastTradeDate, todayDate)

      // Yesterday YYYY-MM-DD
      const getYesterdayWeekdayStr = () => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        if (d.getDay() === 0) d.setDate(d.getDate() - 2) // Sun -> Fri
        else if (d.getDay() === 6) d.setDate(d.getDate() - 1) // Sat -> Fri
        
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      const yesterdayStr = getYesterdayWeekdayStr()

      // 1. STREAK FREEZE TRIGGER:
      const alreadyFrozen = frozenDates.includes(yesterdayStr)
      const alreadyTraded = tradeDates.includes(yesterdayStr)

      if (weekdaysSinceLastTrade === 1 && streakFreezes > 0 && !alreadyFrozen && !alreadyTraded) {
        const newFrozen = [...frozenDates, yesterdayStr]
        await setFrozenDates(newFrozen)
        await setStreakFreezes(streakFreezes - 1)
        toast.success(`❄️ Journaling Streak Frozen! Yesterday's streak was saved using a Streak Freeze token. (${streakFreezes - 1} remaining)`, {
          duration: 5000,
          icon: '❄️'
        })
        return
      }

      // 2. MILESTONE REWARDS CHECK:
      if (streak.currentStreak > 0 && streak.currentStreak % 5 === 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single()
        
        const settings = (profile?.settings as any) || {}
        const lastMilestone = Number(settings.lastAwardedMilestone) || 0
        
        if (streak.currentStreak > lastMilestone) {
          const nextFreezes = Math.min(3, streakFreezes + 1)
          
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email || '',
              settings: {
                ...settings,
                streakFreezes: nextFreezes,
                lastAwardedMilestone: streak.currentStreak
              },
              updated_at: new Date().toISOString()
            })
          
          await setStreakFreezes(nextFreezes)
          
          toast.success(`🎉 Milestone reached! You earned a Streak Freeze token for maintaining a ${streak.currentStreak}-day streak!`, {
            duration: 6000,
            icon: '🎉'
          })
        }
      }
    }

    runChecks()
  }, [user, trades, tradesLoading, frozenDates, streakFreezes, streak.currentStreak])

  return { streak, isLoading: tradesLoading, refetch: () => {} }
}
