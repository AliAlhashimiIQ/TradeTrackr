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
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const [colorblindMode, setColorblindModeState] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('UTC')
  const [loading, setLoading] = useState(true)

  const setColorblindMode = (enabled: boolean) => {
    setColorblindModeState(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_colorblindMode', String(enabled))
      window.dispatchEvent(new Event('settings_changed'))
    }
  };

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
