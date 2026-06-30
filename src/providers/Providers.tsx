'use client'

import { useState, useEffect } from 'react'
import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { SettingsProvider } from './SettingsProvider'
import { AccountProvider } from './AccountProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import CommandPalette from '@/components/layout/CommandPalette'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const isPlaceholder = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isPlaceholder) {
    return (
      <div className="min-h-screen bg-[#06070b] flex items-center justify-center text-white p-6 font-sans">
        <div className="max-w-md w-full bg-[#0d0e16] border border-white/[0.06] rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="text-amber-500 font-bold text-lg flex items-center justify-center gap-2">
            ⚠️ Setup Required
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Database Credentials Missing</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            TradeTrackr compiled successfully! However, you must configure your Supabase project keys in your hosting environment to start using the app.
          </p>
          <div className="bg-black/35 p-4 rounded-xl text-xs font-mono text-left text-gray-300 space-y-2 border border-white/[0.04]">
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_URL</span>
              <span className="text-red-400 font-semibold">Missing</span>
            </div>
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <span className="text-red-400 font-semibold">Missing</span>
            </div>
            <div className="flex justify-between">
              <span>DB_ENCRYPTION_KEY</span>
              <span className="text-red-400 font-semibold">Missing</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Configure these in <b>Vercel Project Settings → Environment Variables</b>, then trigger a redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <AccountProvider>
          <SettingsProvider>
            <LayoutContent>{children}</LayoutContent>
          </SettingsProvider>
        </AccountProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed') === 'true'
      setSidebarCollapsed(saved)
      
      const handleCollapseChange = () => {
        setSidebarCollapsed(localStorage.getItem('sidebar_collapsed') === 'true')
      }
      
      window.addEventListener('sidebar_collapse_changed', handleCollapseChange)
      return () => window.removeEventListener('sidebar_collapse_changed', handleCollapseChange)
    }
  }, [])

  const noHeaderPaths = ['/login', '/signup', '/welcome', '/auth/reset-password', '/auth/callback']
  const showHeader = user && !noHeaderPaths.some(p => pathname === p || pathname?.startsWith(p + '/'))

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#06070b]">
      {showHeader && <Header />}
      <div className={`flex-1 flex flex-col w-full relative transition-all duration-300 ease-in-out ${showHeader ? (sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-56') : ''}`}>
        {children}
      </div>
      {user && <CommandPalette />}
    </div>
  )
}

 
