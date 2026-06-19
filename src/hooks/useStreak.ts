import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from './useAuth'

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  isStreakActiveToday: boolean
  lastJournaledDate: string | null
}

export function useStreak() {
  const { user } = useAuth()
  const [streak, setStreak] = useState<StreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
    isStreakActiveToday: false,
    lastJournaledDate: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      // Query entry_time for all trades of this user
      const { data, error } = await supabase
        .from('trades')
        .select('entry_time')
        .eq('user_id', user.id)

      if (error) throw error

      if (!data || data.length === 0) {
        setStreak({
          currentStreak: 0,
          longestStreak: 0,
          isStreakActiveToday: false,
          lastJournaledDate: null,
        })
        setIsLoading(false)
        return
      }

      const validEntries = (data || []).filter((t): t is { entry_time: string } => !!t.entry_time);

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
        setStreak({
          currentStreak: 0,
          longestStreak: 0,
          isStreakActiveToday: false,
          lastJournaledDate: null,
        })
        setIsLoading(false)
        return
      }

      // Helper to get local date string YYYY-MM-DD
      const getLocalDateString = (d: Date) => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const todayStr = getLocalDateString(new Date())
      
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = getLocalDateString(yesterday)

      const isStreakActiveToday = localDates.includes(todayStr)
      const hasJournaledYesterday = localDates.includes(yesterdayStr)

      let currentStreak = 0
      const lastJournaledDate = localDates[localDates.length - 1]

      // Calculate current streak
      if (isStreakActiveToday || hasJournaledYesterday) {
        let checkDate = isStreakActiveToday ? new Date() : yesterday
        let checkStr = getLocalDateString(checkDate)

        while (localDates.includes(checkStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
          checkStr = getLocalDateString(checkDate)
        }
      }

      // Calculate longest streak
      let longestStreak = 0
      let tempStreak = 0
      let prevDate: Date | null = null

      for (const dateStr of localDates) {
        const currentDate = new Date(dateStr + 'T00:00:00') // Force local midnight parsing
        
        if (prevDate === null) {
          tempStreak = 1
        } else {
          // Check if exactly 1 day difference
          const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            tempStreak++
          } else if (diffDays > 1) {
            tempStreak = 1
          }
        }
        
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
        prevDate = currentDate
      }

      setStreak({
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        isStreakActiveToday,
        lastJournaledDate,
      })
    } catch (err) {
      console.error('Error fetching journaling streak:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStreak()
  }, [fetchStreak])

  return { streak, isLoading, refetch: fetchStreak }
}
