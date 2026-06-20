'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

interface SettingsContextType {
  colorblindMode: boolean;
  setColorblindMode: (enabled: boolean) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  timezone: string;
  setTimezone: (timezone: string) => void;
  streakFreezes: number;
  setStreakFreezes: (count: number) => Promise<void>;
  frozenDates: string[];
  setFrozenDates: (dates: string[]) => Promise<void>;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const [colorblindMode, setColorblindModeState] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('UTC')
  const [streakFreezes, setStreakFreezesState] = useState(1)
  const [frozenDates, setFrozenDatesState] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const setColorblindMode = (enabled: boolean) => {
    setColorblindModeState(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_colorblindMode', String(enabled))
      window.dispatchEvent(new Event('settings_changed'))
    }
  };

  const setStreakFreezes = async (count: number) => {
    setStreakFreezesState(count)
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_streakFreezes', String(count))
    }
    if (!user) return
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
      const currentSettings = (profile?.settings as any) || {}
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          settings: {
            ...currentSettings,
            streakFreezes: count
          },
          updated_at: new Date().toISOString()
        })
    } catch (err) {
      console.error('Failed to save streak freezes:', err)
    }
  }

  const setFrozenDates = async (dates: string[]) => {
    setFrozenDatesState(dates)
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_frozenDates', JSON.stringify(dates))
    }
    if (!user) return
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
      const currentSettings = (profile?.settings as any) || {}
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          settings: {
            ...currentSettings,
            frozenDates: dates
          },
          updated_at: new Date().toISOString()
        })
    } catch (err) {
      console.error('Failed to save frozen dates:', err)
    }
  }

  const loadSettings = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      // First try localStorage for instant mount load
      if (typeof window !== 'undefined') {
        const localCb = localStorage.getItem('settings_colorblindMode')
        if (localCb !== null) {
          setColorblindModeState(localCb === 'true')
        }
        const localCurr = localStorage.getItem('settings_currency')
        if (localCurr) setCurrency(localCurr)
        const localTz = localStorage.getItem('settings_timezone')
        if (localTz) setTimezone(localTz)
        const localSf = localStorage.getItem('settings_streakFreezes')
        if (localSf !== null) setStreakFreezesState(Number(localSf))
        const localFd = localStorage.getItem('settings_frozenDates')
        if (localFd !== null) {
          try { setFrozenDatesState(JSON.parse(localFd)) } catch {}
        }
      }

      // Then fetch from supabase for source of truth
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (!error && data?.settings) {
        const settings = data.settings as any
        if (settings.colorblindMode !== undefined) {
          const cb = !!settings.colorblindMode
          setColorblindModeState(cb)
          localStorage.setItem('settings_colorblindMode', String(cb))
        }
        if (settings.currency) {
          setCurrency(settings.currency)
          localStorage.setItem('settings_currency', settings.currency)
        }
        if (settings.timezone) {
          setTimezone(settings.timezone)
          localStorage.setItem('settings_timezone', settings.timezone)
        }
        if (settings.streakFreezes !== undefined) {
          const sf = Number(settings.streakFreezes)
          setStreakFreezesState(sf)
          localStorage.setItem('settings_streakFreezes', String(sf))
        }
        if (settings.frozenDates !== undefined && Array.isArray(settings.frozenDates)) {
          setFrozenDatesState(settings.frozenDates)
          localStorage.setItem('settings_frozenDates', JSON.stringify(settings.frozenDates))
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [user])

  // Sync colorblind HTML class when colorblindMode changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (colorblindMode) {
        document.documentElement.classList.add('colorblind')
        document.body.classList.add('colorblind')
      } else {
        document.documentElement.classList.remove('colorblind')
        document.body.classList.remove('colorblind')
      }
    }
  }, [colorblindMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleSettingsChanged = () => {
      const localCb = localStorage.getItem('settings_colorblindMode')
      if (localCb !== null) {
        setColorblindModeState(localCb === 'true')
      }
      const localCurr = localStorage.getItem('settings_currency')
      if (localCurr) setCurrency(localCurr)
      const localTz = localStorage.getItem('settings_timezone')
      if (localTz) setTimezone(localTz)
      const localSf = localStorage.getItem('settings_streakFreezes')
      if (localSf !== null) setStreakFreezesState(Number(localSf))
      const localFd = localStorage.getItem('settings_frozenDates')
      if (localFd !== null) {
        try { setFrozenDatesState(JSON.parse(localFd)) } catch {}
      }
    }
    window.addEventListener('settings_changed', handleSettingsChanged)
    return () => {
      window.removeEventListener('settings_changed', handleSettingsChanged)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{
      colorblindMode,
      setColorblindMode,
      currency,
      setCurrency,
      timezone,
      setTimezone,
      streakFreezes,
      setStreakFreezes,
      frozenDates,
      setFrozenDates,
      loading,
      refreshSettings: loadSettings
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
