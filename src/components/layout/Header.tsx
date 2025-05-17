'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const navigationItems = [
    { path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard' },
    { path: '/trades', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Trades' },
    { path: '/calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Calendar' },
    { path: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analytics' },
  ]

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  }

  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-indigo-400 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 9L15 3L9 9L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-500">TradeJournal</span>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link 
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-lg flex items-center transition-all duration-200 ${
                  pathname === item.path 
                    ? 'text-white bg-indigo-600 bg-opacity-20' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-3">
            <button className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-700/40 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            <div className="relative">
              <Link 
                href="/profile" 
                className="block h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 p-0.5 transition-transform hover:scale-105"
              >
                <div className="bg-slate-900 rounded-full h-full w-full flex items-center justify-center text-white overflow-hidden">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </Link>
            </div>
            
            {user && (
              <button 
                onClick={handleLogout}
                className="bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 text-sm py-1 px-3 rounded-lg flex items-center transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            )}
            
            {/* Mobile menu button */}
            <button 
              onClick={toggleMobileMenu}
              className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-700/40 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d={mobileMenuOpen 
                    ? "M6 18L18 6M6 6l12 12" 
                    : "M4 6h16M4 12h16M4 18h16"
                  } 
                />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className={`md:hidden pt-3 pb-1 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="flex flex-col space-y-1">
            {navigationItems.map((item) => (
              <Link 
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-lg flex items-center transition-all duration-200 ${
                  pathname === item.path 
                    ? 'text-white bg-indigo-600/20' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
} 