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
      <div className={`flex-1 flex flex-col w-full relative transition-all duration-300 ease-in-out ${showHeader ? (sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-64') : ''}`}>
        {children}
      </div>
      {user && <CommandPalette />}
    </div>
  )
}

 
