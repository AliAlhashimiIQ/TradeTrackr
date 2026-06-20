'use client'

import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </ThemeProvider>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()

  const noHeaderPaths = ['/login', '/signup', '/welcome', '/auth/reset-password', '/auth/callback']
  const showHeader = user && !noHeaderPaths.some(p => pathname === p || pathname?.startsWith(p + '/'))

  return (
    <div className="flex flex-col min-h-screen w-full">
      {showHeader && <Header />}
      <div className="flex-1 flex flex-col w-full relative">
        {children}
      </div>
    </div>
  )
}
 
