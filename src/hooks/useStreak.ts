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

function toLocalDateStr(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const y = parts.find(p => p.type === 'year')?.value ?? ''
    const m = parts.find(p => p.type === 'month')?.value ?? ''
    const d = parts.find(p => p.type === 'day')?.value ?? ''
    return `${y}-${m}-${d}`
  } catch {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
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
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
    start.setDate(start.getDate() + 1)
  }
  return count
}

export function useStreak() {
  const { user } = useAuth()
  const { trades, isLoading: tradesLoading } = useTrades('all')
  const { streakFreezes, setStreakFreezes, frozenDates, setFrozenDates, timezone } = useSettings()

  const tz = useMemo(
    () => timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [timezone]
  )

  // All unique dates where the user has trades, sorted ascending
  const tradeDates = useMemo(() => {
    if (!trades || trades.length === 0) return []
    return Array.from(
      new Set(
        trades
          .filter((t): t is typeof t & { entry_time: string } => !!t.entry_time)
          .map(t => toLocalDateStr(new Date(t.entry_time), tz))
      )
    ).sort()
  }, [trades, tz])

  const streak = useMemo<StreakInfo>(() => {
    if (!user || tradeDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, isStreakActiveToday: false, lastJournaledDate: null }
    }

    const activeDates = Array.from(new Set([...tradeDates, ...frozenDates])).sort()
    if (activeDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, isStreakActiveToday: false, lastJournaledDate: null }
    }

    const todayStr = toLocalDateStr(new Date(), tz)
    const lastJournaledDate = activeDates[activeDates.length - 1]
    const lastActiveDate = new Date(lastJournaledDate + 'T00:00:00')
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)

    const weekdaysSinceLastActive = countWeekdaysBetween(lastActiveDate, todayDate)
    const isStreakActiveToday = activeDates.includes(todayStr) || weekdaysSinceLastActive === 0

    let currentStreak = 0
    if (isStreakActiveToday) {
      currentStreak = 1
      let i = activeDates.length - 1
      while (i > 0) {
        const dateCurr = new Date(activeDates[i] + 'T00:00:00')
        const datePrev = new Date(activeDates[i - 1] + 'T00:00:00')
        if (countWeekdaysBetween(datePrev, dateCurr) === 0) { currentStreak++; i-- }
        else break
      }
    }

    let longestStreak = 0
    if (activeDates.length > 0) {
      let tempStreak = 1
      longestStreak = 1
      for (let i = 1; i < activeDates.length; i++) {
        const datePrev = new Date(activeDates[i - 1] + 'T00:00:00')
        const dateCurr = new Date(activeDates[i] + 'T00:00:00')
        if (countWeekdaysBetween(datePrev, dateCurr) === 0) tempStreak++
        else tempStreak = 1
        if (tempStreak > longestStreak) longestStreak = tempStreak
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      isStreakActiveToday,
      lastJournaledDate,
    }
  }, [user?.id, tradeDates, frozenDates, tz])

  // Derived stats for the panel
  const stats = useMemo(() => {
    const todayStr = toLocalDateStr(new Date(), tz)
    const todayDate = new Date(todayStr + 'T00:00:00')

    const startOfWeek = new Date(todayDate)
    const dow = todayDate.getDay()
    startOfWeek.setDate(todayDate.getDate() - (dow === 0 ? 6 : dow - 1))

    const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

    const thisWeek = tradeDates.filter(d => {
      const date = new Date(d + 'T00:00:00')
      return date >= startOfWeek && date <= todayDate
    }).length

    const thisMonth = tradeDates.filter(d => {
      const date = new Date(d + 'T00:00:00')
      return date >= startOfMonth && date <= todayDate
    }).length

    return { totalDays: tradeDates.length, thisWeek, thisMonth }
  }, [tradeDates, tz])

  useEffect(() => {
    if (tradesLoading || !user?.id || !trades.length) return

    const runChecks = async () => {
      const tradeDatesSorted = Array.from(
        new Set(
          trades
            .filter((t): t is typeof t & { entry_time: string } => !!t.entry_time)
            .map(t => toLocalDateStr(new Date(t.entry_time), tz))
        )
      ).sort()

      if (tradeDatesSorted.length === 0) return

      const lastTradeStr = tradeDatesSorted[tradeDatesSorted.length - 1]
      const lastTradeDate = new Date(lastTradeStr + 'T00:00:00')
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      const weekdaysSinceLastTrade = countWeekdaysBetween(lastTradeDate, todayDate)

      const getYesterdayWeekdayStr = () => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        if (d.getDay() === 0) d.setDate(d.getDate() - 2)
        else if (d.getDay() === 6) d.setDate(d.getDate() - 1)
        return toLocalDateStr(d, tz)
      }
      const yesterdayStr = getYesterdayWeekdayStr()
      const alreadyFrozen = frozenDates.includes(yesterdayStr)
      const alreadyTraded = tradeDatesSorted.includes(yesterdayStr)

      if (weekdaysSinceLastTrade === 1 && streakFreezes > 0 && !alreadyFrozen && !alreadyTraded) {
        const newFrozen = [...frozenDates, yesterdayStr]
        await setFrozenDates(newFrozen)
        await setStreakFreezes(streakFreezes - 1)
        toast.success(`Streak protected. Yesterday's activity was covered by a freeze token. (${streakFreezes - 1} remaining)`, { duration: 5000 })
        return
      }

      if (streak.currentStreak > 0 && streak.currentStreak % 5 === 0) {
        const { data: profile } = await supabase
          .from('profiles').select('settings').eq('id', user.id).single()
        const settings = (profile?.settings as any) || {}
        const lastMilestone = Number(settings.lastAwardedMilestone) || 0
        if (streak.currentStreak > lastMilestone) {
          const nextFreezes = Math.min(3, streakFreezes + 1)
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email || '',
            settings: { ...settings, streakFreezes: nextFreezes, lastAwardedMilestone: streak.currentStreak },
            updated_at: new Date().toISOString()
          })
          await setStreakFreezes(nextFreezes)
          toast.success(`Milestone reached — ${streak.currentStreak}-day streak. Freeze token awarded.`, { duration: 6000 })
        }
      }
    }

    runChecks()
  }, [user?.id, trades, tradesLoading, frozenDates, streakFreezes, streak.currentStreak, tz])

  return {
    streak,
    tradeDates,
    frozenDates,
    streakFreezes,
    totalDays: stats.totalDays,
    thisWeek: stats.thisWeek,
    thisMonth: stats.thisMonth,
    totalTrades: trades.length,
    isLoading: tradesLoading,
    refetch: () => {},
  }
}
