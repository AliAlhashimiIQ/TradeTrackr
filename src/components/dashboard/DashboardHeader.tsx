'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, User } from 'lucide-react'
import Link from 'next/link'

interface DashboardHeaderProps {
  userName?: string;
  sessionInfo?: string;
  streakDays?: number;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  sessionInfo = 'London Session',
  streakDays = 7
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const displayName = userName || user?.email?.split('@')[0] || 'Trader'
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="mb-8 text-gray-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white bg-clip-text">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
            {sessionInfo} · {formattedDate}
          </p>
        </div>
        
        <div className="flex items-center px-5 py-2.5 bg-white dark:bg-[#131825] rounded-xl border border-black/10 dark:border-white/5 shadow-lg transition-all duration-305">
          <div className="mr-3 h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-red-500 bg-opacity-20">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">{streakDays}-day streak!</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Keep up the momentum</div>
          </div>
        </div>

        <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold cursor-pointer shadow-md"
          >
            {displayName[0]?.toUpperCase() || 'U'}
          </motion.div>
          
          {/* Profile dropdown menu */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-14 right-0 w-56 bg-white dark:bg-[#151823] rounded-xl shadow-2xl border border-black/10 dark:border-indigo-900/20 p-2 z-50 text-gray-900 dark:text-white"
              >
                <div className="text-gray-900 dark:text-white font-bold px-3 py-2 border-b border-black/10 dark:border-gray-700 mb-1 text-sm">
                  {displayName}
                </div>
                
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-650 dark:text-gray-300">
                  <User size={16} />
                  <span className="text-sm font-medium">Profile</span>
                </Link>
                
                <Link href="/settings" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-650 dark:text-gray-300">
                  <Settings size={16} />
                  <span className="text-sm font-medium">Settings</span>
                </Link>
                
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-red-500 w-full text-left"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-medium">Sign out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
