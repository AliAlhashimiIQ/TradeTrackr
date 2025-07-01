'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronDown, Search, X, User as UserIcon, Settings, LogOut } from 'lucide-react'
import DashboardPerformanceOverview from '@/components/dashboard/DashboardPerformanceOverview'
import DashboardInsights from '@/components/dashboard/DashboardInsights'
import DashboardRecentActivity from '@/components/dashboard/DashboardRecentActivity'
import DashboardPersonalization from '@/components/dashboard/DashboardPersonalization'
import DashboardAdvancedFeatures from '@/components/dashboard/DashboardAdvancedFeatures'
import DateRangeSelector, { DateRange } from '@/components/dashboard/DateRangeSelector'
import { useDashboardData } from '@/hooks/useDashboardData'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import Header from '@/components/layout/Header'
import { useAuth } from '@/hooks/useAuth'
import { Trade, TradeMetrics, User } from '@/lib/types'
import SparkLineChart from '@/components/charts/SparkLineChart'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

interface ProfileDropdownProps {
  user: User;
}

const SearchOverlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="w-full max-w-2xl bg-[#151823] rounded-xl shadow-2xl border border-indigo-900/20 p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search trades, symbols, or analysis..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
                autoFocus
              />
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const NotificationsPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const notifications = [
    { id: 1, title: 'New Trade Alert', message: 'AAPL position closed with +2.3% profit', time: '2 min ago' },
    { id: 2, title: 'Market Update', message: 'SPY approaching key resistance level', time: '15 min ago' },
    { id: 3, title: 'Account Update', message: 'Monthly performance report available', time: '1 hour ago' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-12 right-0 w-80 bg-[#151823] rounded-xl shadow-2xl border border-indigo-900/20 p-4 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Notifications</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
            </button>
          </div>
          <div className="space-y-4">
            {notifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium text-white mb-1">{notification.title}</div>
                <div className="text-sm text-gray-400">{notification.message}</div>
                <div className="text-xs text-gray-500 mt-2">{notification.time}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const NotificationBell: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <motion.button 
      className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
    >
      <Bell className="w-5 h-5 text-gray-400" />
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    </motion.button>
  )
}

const QuickActions: React.FC<{ user: User }> = ({ user }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-gray-400"
        onClick={() => setIsSearchOpen(true)}
      >
        <Search className="w-5 h-5" />
      </motion.button>
      <div className="relative">
        <NotificationBell onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} />
        <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      </div>
      <ProfileDropdown user={user} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();
  const userInitial = user.email?.[0]?.toUpperCase() || user.user_metadata?.name?.[0]?.toUpperCase() || '?';
  const displayName = user.email?.split('@')[0] || user.user_metadata?.name || 'User';
  
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };
  
  return (
    <motion.div 
      className="relative"
      whileHover={{ scale: 1.02 }}
    >
      <button 
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
          {userInitial}
        </div>
        <span className="text-white">{displayName}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-48 bg-[#151823] rounded-lg shadow-xl border border-indigo-900/20 overflow-hidden z-50"
          >
            <div className="p-2 border-b border-indigo-900/20">
              <div className="px-3 py-2">
                <div className="font-medium text-white">{displayName}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
            </div>
            
            <div className="p-1">
              <Link href="/profile">
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-md transition-colors">
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </Link>
              
              <Link href="/settings">
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-md transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </Link>
            </div>
            
            <div className="p-1 border-t border-indigo-900/20">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [activeView, setActiveView] = useState<'overview' | 'trades' | 'analysis'>('overview')
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])
  
  const { 
    trades, 
    metrics, 
    equityData,
    advancedMetrics,
    isLoading,
    hasError
  } = useDashboardData(user?.id, dateRange)

  // Ensure all data has the correct type
  const typedMetrics = metrics as TradeMetrics
  const typedEquityData = equityData as { labels: string[]; values: number[] }
  const typedTrades = trades as Trade[]

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'trades', label: 'Trades', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { id: 'analysis', label: 'Analysis', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )}
  ]

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0c0d14] to-[#0f1117]">
        <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-indigo-400 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c0d14] to-[#0f1117] text-white">
        <div className="max-w-6xl mx-auto p-6">
          <Header />
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-6 max-w-lg">
              We're having trouble loading your dashboard data. We're showing some fallback data for now.
              Please try refreshing the page or check back later.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all"
            >
              Refresh Page
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  // No trades message
  const noTradesMessage = (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No trades yet</h2>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">
        Start logging your trades to see performance metrics and insights. Your trading journey begins with your first entry.
      </p>
      <Link href="/trades/new">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all"
        >
          Add Your First Trade
        </motion.button>
      </Link>
    </div>
  )

  return (
    <AuthenticatedLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Track and analyze your trading performance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <DateRangeSelector selectedRange={dateRange} onChange={setDateRange} />
            
            <div className="flex gap-2">
              <Link href="/trades/new">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 flex items-center gap-2 w-full lg:w-auto justify-center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Trade
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-[#151823] p-1 rounded-lg border border-indigo-900/20 shadow-lg">
            {navigationItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView(item.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all ${
                  activeView === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>
        
        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {typedTrades.length === 0 ? (
                noTradesMessage
              ) : (
                <>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 p-6 relative overflow-hidden"
                    >
                      <div className="absolute bottom-0 right-0 w-full h-16 opacity-20">
                        <SparkLineChart
                          data={typedEquityData.values.slice(-20)}
                          categories={["value"]}
                          colors={["emerald"]}
                          showAnimation={true}
                          showGradient={true}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="relative">
                        <div className="text-sm text-green-400 mb-1">Total Profit/Loss</div>
                        <div className="text-2xl font-bold text-white">${typedMetrics.total_pnl.toFixed(2)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            typedMetrics.total_pnl >= 0 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {typedMetrics.total_pnl >= 0 ? "+" : ""}{((typedMetrics.total_pnl / 10000) * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20 p-6 relative overflow-hidden"
                    >
                      <div className="absolute bottom-0 right-0 w-full h-16 opacity-20">
                        <SparkLineChart
                          data={[typedMetrics.win_rate * 100]}
                          categories={["value"]}
                          colors={["blue"]}
                          showAnimation={true}
                          showGradient={true}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="relative">
                        <div className="text-sm text-blue-400 mb-1">Win Rate</div>
                        <div className="text-2xl font-bold text-white">{(typedMetrics.win_rate * 100).toFixed(1)}%</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">{typedMetrics.total_trades} trades</span>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 p-6 relative overflow-hidden"
                    >
                      <div className="absolute bottom-0 right-0 w-full h-16 opacity-20">
                        <SparkLineChart
                          data={[typedMetrics.avg_win]}
                          categories={["value"]}
                          colors={["purple"]}
                          showAnimation={true}
                          showGradient={true}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="relative">
                        <div className="text-sm text-purple-400 mb-1">Average Win</div>
                        <div className="text-2xl font-bold text-white">${typedMetrics.avg_win.toFixed(2)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">vs ${typedMetrics.avg_loss.toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-6 relative overflow-hidden"
                    >
                      <div className="absolute bottom-0 right-0 w-full h-16 opacity-20">
                        <SparkLineChart
                          data={[typedMetrics.total_trades]}
                          categories={["value"]}
                          colors={["amber"]}
                          showAnimation={true}
                          showGradient={true}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="relative">
                        <div className="text-sm text-amber-400 mb-1">Total Trades</div>
                        <div className="text-2xl font-bold text-white">{typedMetrics.total_trades}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">{typedMetrics.winning_trades}W</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">{typedMetrics.losing_trades}L</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Performance Overview */}
                  <div className="bg-[#151823] rounded-xl border border-indigo-900/20 shadow-xl overflow-hidden">
                    <DashboardPerformanceOverview
                      dateRange={dateRange}
                      metrics={typedMetrics}
                      equityData={typedEquityData}
                      advancedMetrics={advancedMetrics}
                    />
                  </div>
                  
                  {/* Two Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#151823] rounded-xl border border-indigo-900/20 shadow-xl overflow-hidden">
                      <DashboardRecentActivity trades={typedTrades} />
                    </div>
                    
                    <div className="bg-[#151823] rounded-xl border border-indigo-900/20 shadow-xl overflow-hidden">
                      <DashboardInsights
                        dateRange={dateRange}
                        trades={typedTrades}
                        metrics={typedMetrics}
                      />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeView === 'trades' && (
            <motion.div
              key="trades"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#151823] rounded-xl border border-indigo-900/20 shadow-xl overflow-hidden">
                <DashboardAdvancedFeatures dateRange={dateRange} />
              </div>
            </motion.div>
          )}

          {activeView === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#151823] rounded-xl border border-indigo-900/20 shadow-xl overflow-hidden">
                <DashboardPersonalization />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthenticatedLayout>
  )
} 