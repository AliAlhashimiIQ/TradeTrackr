'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, User } from 'lucide-react'
import Link from 'next/link'
import COLORS, { TRANSITIONS } from '@/lib/colorSystem';
import { TEXT, CARDS } from '@/lib/designSystem';

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
    // Navigation is handled by the auth hook
  }

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${TEXT.heading.h1} flex items-center bg-clip-text text-transparent bg-gradient-to-r from-[${COLORS.text.primary}] to-[${COLORS.text.secondary}]`}>
            Welcome back, {displayName} <span className={`ml-2 text-[${COLORS.text.primary}]`}>👋</span>
          </h1>
          <p className={`${TEXT.body.regular} text-[${COLORS.text.secondary}] mt-1 flex items-center`}>
            <span className={`inline-block w-2 h-2 rounded-full bg-[${COLORS.primary}] mr-2`}></span>
            {sessionInfo} · {formattedDate}
          </p>
        </div>
        
        <div className={`flex items-center px-5 py-2.5 bg-gradient-to-r from-[${COLORS.background.dark}] to-[${COLORS.background.medium}] rounded-xl border border-[${COLORS.border.primary}] shadow-lg ${TRANSITIONS.medium}`}>
          <div className={`mr-3 h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[${COLORS.warning}] to-[${COLORS.danger}] bg-opacity-20`}>
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <div className={`font-medium text-[${COLORS.text.primary}]`}>{streakDays}-day streak!</div>
            <div className={`${TEXT.body.small} text-[${COLORS.text.secondary}]`}>Keep up the momentum</div>
          </div>
        </div>

        <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium cursor-pointer"
          >
            {userName?.[0]?.toUpperCase() || 'U'}
          </motion.div>
          
          {/* Profile dropdown menu */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-14 left-0 w-56 bg-[#151823] rounded-xl shadow-2xl border border-indigo-900/20 p-2 z-50"
              >
                <div className="text-white font-medium px-3 py-2 border-b border-gray-700 mb-1">
                  {userName}
                </div>
                
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-gray-300">
                  <User size={16} />
                  <span>Profile</span>
                </Link>
                
                <Link href="/settings" className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-gray-300">
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-red-400 w-full text-left"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
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
