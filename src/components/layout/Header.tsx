'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { useStreak } from '@/hooks/useStreak'
import { useTheme } from 'next-themes'

import Logo from '@/components/ui/Logo'
import AccountSwitcher from '@/components/layout/AccountSwitcher'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, user } = useAuth()
  const { streak, isLoading: isLoadingStreak } = useStreak()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await signOut()
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('onboarded')
    }
    router.push('/login')
  }

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navigationItems = [
    { path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard' },
    { path: '/trades', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Trades' },
    { path: '/accounts', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Accounts' },
    { path: '/import', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', label: 'Import' },
    { path: '/calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Calendar' },
    { path: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analytics' },
  ]

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <>
      {/* Mobile Sticky Header */}
      <header className="topbar-liquid sticky top-0 z-50 w-full lg:hidden">
        <div className="w-full px-4 py-2.5">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-slate-950 border border-white/[0.08] rounded-xl flex items-center justify-center shadow-md shadow-black/25">
                <Logo className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">TradeTrackr</span>
            </Link>

            {/* Mobile Menu Button & Streak Badge */}
            <div className="flex items-center gap-2">
              {user && !isLoadingStreak && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-semibold" title={`${streak.currentStreak} day streak`}>
                  <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                  </svg>
                  <span>{streak.currentStreak || 0}d</span>
                </div>
              )}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 w-64 bg-[#0a0b12]/95 border-r border-white/[0.06] backdrop-blur-md hidden lg:flex flex-col justify-between p-5 z-40">
        {/* Top: Logo, search, and nav */}
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group px-2">
            <div className="w-9 h-9 bg-slate-950 border border-white/[0.08] rounded-xl flex items-center justify-center shadow-md shadow-black/25 group-hover:border-indigo-500/30 transition-all">
              <Logo className="w-6.5 h-6.5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">TradeTrackr</span>
          </Link>

          {/* Search bar */}
          <div className="relative w-full group px-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Search trades, symbols..." 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/trades?search=${encodeURIComponent(e.currentTarget.value)}`)
                  e.currentTarget.value = ''
                }
              }}
              className="block w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:bg-white/[0.06] focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path))
              return (
                <Link 
                  key={item.path}
                  href={item.path}
                  className={`group relative px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors duration-200 ${
                    isActive 
                      ? 'text-white font-semibold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/[0.04] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/80 to-blue-600/80 rounded-xl shadow-lg shadow-indigo-500/20 pointer-events-none" />
                  )}
                  <span className="relative z-10 flex items-center gap-3 w-full">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                    </svg>
                    <span>{item.label}</span>
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom: Streak, switcher, profile */}
        <div className="flex flex-col gap-5">
          {/* Consistency Streak */}
          {user && !isLoadingStreak && (
            <div className="px-2">
              {streak.currentStreak > 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold cursor-default select-none shadow-sm shadow-amber-500/5 group relative w-full">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                  </svg>
                  <span>{streak.currentStreak} Day Streak</span>
                  <div className="absolute bottom-4 left-full ml-2 z-50 bg-[#0f1117] border border-white/[0.08] rounded-xl shadow-2xl p-3 w-56 hidden group-hover:block text-left text-white">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Consistency Streak</div>
                    <div className="flex justify-between text-xs py-1 border-b border-white/[0.03]">
                      <span className="text-gray-400">Current Streak:</span>
                      <span className="font-semibold text-amber-400 font-mono">{streak.currentStreak} days</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 mt-1">
                      <span className="text-gray-400">Longest Streak:</span>
                      <span className="font-semibold text-white font-mono">{streak.longestStreak} days</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Log at least one trade daily to keep your consistency streak burning!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.06] text-gray-500 rounded-xl text-xs font-semibold cursor-default select-none group relative w-full">
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                  </svg>
                  <span>0 Day Streak</span>
                  <div className="absolute bottom-4 left-full ml-2 z-50 bg-[#0f1117] border border-white/[0.08] rounded-xl shadow-2xl p-3 w-56 hidden group-hover:block text-left text-white">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Consistency Streak</div>
                    <div className="flex justify-between text-xs py-1 border-b border-white/[0.03]">
                      <span className="text-gray-400">Current Streak:</span>
                      <span className="font-semibold text-gray-400 font-mono">0 days</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 mt-1">
                      <span className="text-gray-400">Longest Streak:</span>
                      <span className="font-semibold text-white font-mono">{streak.longestStreak} days</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Log a trade today to start your journaling streak!
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Switcher */}
          <div className="px-2">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">Active Account</div>
            {user && <AccountSwitcher />}
          </div>

          {/* User profile details, theme switcher, settings, sign out */}
          <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-none mb-0.5">{user?.email?.split('@')[0]}</p>
                  <p className="text-[9px] text-gray-500 truncate leading-none">{user?.email}</p>
                </div>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center shrink-0"
                title="Toggle Theme"
              >
                {!mounted || theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex gap-1.5 px-1 mt-1">
              <Link href="/settings" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/5 border border-white/[0.04] text-[10px] font-medium text-gray-400 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </Link>
              <button 
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-[#0a0b12] border-l border-white/[0.06] z-[1000] lg:hidden p-6 shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-lg font-bold text-white">Menu</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path))
                    return (
                      <Link 
                        key={item.path}
                        href={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                          isActive 
                            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>

                <div className="pt-6 border-t border-white/[0.06] space-y-4">
                  <div className="px-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Account</p>
                        <p className="text-sm font-semibold text-white truncate mt-0.5 max-w-[120px]">{user?.email}</p>
                      </div>
                      <AccountSwitcher />
                    </div>
                  </div>
                  <Link 
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

