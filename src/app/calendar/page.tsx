'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getAllTrades, getMarketEvents, getEconomicEvents, getCustomEvents, addCustomEvent, updateCustomEvent, deleteCustomEvent } from '@/lib/tradingApi'
import { Trade, MarketEvent, EconomicEvent, CustomEvent } from '@/lib/types'
import Link from 'next/link'
import COLORS, { TRANSITIONS } from '@/lib/colorSystem'
import { TEXT, BUTTONS, CARDS, LAYOUT } from '@/lib/designSystem'
import Header from '@/components/layout/Header'
import { analyzeTradePatterns, analyzeTrade } from '@/lib/ai/aiService'
import { TradeAnalysis } from '@/lib/ai/aiService'

// Helper to generate dates for the calendar
const generateCalendarDates = (year: number, month: number) => {
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  
  const dates = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day))
  }
  
  return dates
}

// Helper to generate dates for a week
const generateWeekDates = (date: Date) => {
  const day = date.getDay() // 0 is Sunday, 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  
  const monday = new Date(date)
  monday.setDate(diff)
  
  const week = []
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday)
    nextDay.setDate(monday.getDate() + i)
    week.push(nextDay)
  }
  
  return week
}

// Group trades by date
const groupTradesByDate = (trades: Trade[]) => {
  const grouped: Record<string, Trade[]> = {}
  
  trades.forEach(trade => {
    const date = new Date(trade.entry_time).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(trade)
  })
  
  return grouped
}

// Calculate total P&L for a group of trades
const calculateTotalPnL = (trades: Trade[]) => {
  return trades.reduce((sum, trade) => sum + trade.profit_loss, 0)
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Custom styles for calendar
const calendarStyles = {
  // Base styles
  dayBase: `relative aspect-square p-3 transition-all duration-300 cursor-pointer border-[0.5px] border-[#1c2033]`,
  dayNormal: `bg-[#151823] hover:bg-[#1a1e2d]`,
  daySelected: `bg-[#1a1e2d] border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]`,
  dayToday: `bg-[#151823] border-blue-400/20`,
  dayProfit: `bg-[#1b3a29] hover:bg-[#1f4431]`,
  dayLoss: `bg-[#3a1b1b] hover:bg-[#441f1f]`,
  dayContent: `h-full flex flex-col`,
  dayHeader: `flex items-center justify-between mb-2`,
  dayNumber: `text-sm font-medium`,
  dayNumberToday: `text-blue-400 font-bold`,
  
  // PnL Display
  pnlAmount: `text-xl font-bold tracking-tight`,
  pnlProfit: `text-green-400`,
  pnlLoss: `text-red-400`,
  tradeCount: `text-xs text-gray-400 bg-[#0d0f16] px-2 py-0.5 rounded-full`,
  
  // Week total
  weekTotal: `bg-[#151823] p-4 border-t border-[#1c2033]`,
  weekTotalLabel: `text-sm text-gray-400 mb-1`,
  weekTotalAmount: `text-xl font-bold`,
  
  // Grid layouts
  weekGrid: `grid grid-cols-8 bg-transparent divide-x divide-[#1c2033]`,
  monthGrid: `grid grid-cols-7 bg-transparent divide-x divide-[#1c2033]`,
  
  // Calendar container
  calendarContainer: `rounded-xl overflow-hidden border border-[#1c2033] divide-y divide-[#1c2033] bg-[#151823]`,
  
  // Controls and buttons
  controlButton: `p-2 rounded-xl bg-[#151823] hover:bg-[#1a1e2d] text-gray-400 hover:text-white transition-all duration-300 border border-[#1c2033]`,
  viewButton: `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300`,
  
  // Headers and sections
  monthHeader: `text-3xl font-bold text-white`,
  dayLabel: `p-3 text-center text-sm font-medium text-gray-400 bg-[#151823] border-b border-[#1c2033]`,
  
  // Trade details section
  tradeDetails: {
    container: `mt-8 bg-[#151823] rounded-xl overflow-hidden border border-[#1c2033] shadow-lg transition-all duration-300`,
    header: `p-6 border-b border-[#1c2033]`,
    content: `p-6`,
    tradeCard: `bg-gradient-to-br from-[#1a1e2d] to-[#151823] rounded-xl p-5 hover:shadow-md transition-all duration-300 hover:scale-[1.01] border border-[#1c2033]`,
    tradeType: {
      long: `text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap`,
      short: `text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap`,
    },
    stats: `grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 p-5 bg-[#1a1e2d] rounded-xl border border-[#1c2033]`,
    statItem: `flex flex-col space-y-2`,
    statLabel: `text-sm text-gray-400`,
    statValue: `text-lg font-bold text-white`,
  },
};

// Helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay()
}

const calculateDayPnL = (trades: Trade[]) => {
  return trades.reduce((sum, trade) => sum + trade.profit_loss, 0)
}

// Add new interface for AI notes
interface DayAnalysis {
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  score: number;
  patterns: string[];
  emotionalState?: string;
}

export default function CalendarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[]>([])
  
  // New state variables for calendar integration
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([])
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEconomicCalendar, setShowEconomicCalendar] = useState(false)
  const [showMarketEvents, setShowMarketEvents] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CustomEvent | null>(null)
  const [filterCountries, setFilterCountries] = useState<string[]>(['US'])
  const [filterEventImpact, setFilterEventImpact] = useState<('low' | 'medium' | 'high')[]>(['medium', 'high'])
  const [selectedDayAnalysis, setSelectedDayAnalysis] = useState<DayAnalysis | null>(null)
  
  // Calculate current month's dates
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)
  
  // Get month name
  const monthName = currentDate.toLocaleString('default', { month: 'long' })
  
  // Generate dates for the current month or week
  const monthDates = generateCalendarDates(currentYear, currentMonth)
  const weekDates = generateWeekDates(currentDate)
  
  // Use appropriate dates based on view mode
  const dates = viewMode === 'Month' ? monthDates : weekDates
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])
  
  useEffect(() => {
    const fetchTrades = async () => {
      if (user) {
        const allTrades = await getAllTrades(user.id)
        setTrades(allTrades)
      }
    }
    
    fetchTrades()
  }, [user])
  
  // New useEffect to fetch market events, economic events, and custom events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return
      
      // Format dates for API calls
      const startDate = viewMode === 'Month' 
        ? new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
        : weekDates[0].toISOString().split('T')[0]
        
      const endDate = viewMode === 'Month'
        ? new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
        : weekDates[6].toISOString().split('T')[0]
      
      // Fetch market events if enabled
      if (showMarketEvents) {
        const events = await getMarketEvents(startDate, endDate)
        setMarketEvents(events)
      }
      
      // Fetch economic events if enabled
      if (showEconomicCalendar) {
        const events = await getEconomicEvents(startDate, endDate, filterCountries)
        setEconomicEvents(events.filter(event => filterEventImpact.includes(event.impact)))
      }
      
      // Fetch custom events
      const events = await getCustomEvents(user.id, startDate, endDate)
      setCustomEvents(events)
    }
    
    fetchEvents()
  }, [
    user, 
    currentDate, 
    viewMode, 
    showMarketEvents, 
    showEconomicCalendar, 
    filterCountries, 
    filterEventImpact
  ])
  
  // Group trades by date
  const tradesByDate = groupTradesByDate(trades)
  
  // Set selected date and fetch trades for that day
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dateString = date.toISOString().split('T')[0]
    const dayTrades = tradesByDate[dateString] || []
    setSelectedDayTrades(dayTrades)
    analyzeDayTrades(dayTrades)
  }
  
  // Navigation for month and week views
  const goToPrevious = () => {
    if (viewMode === 'Month') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() - 7)
      setCurrentDate(newDate)
    }
  }
  
  const goToNext = () => {
    if (viewMode === 'Month') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() + 7)
      setCurrentDate(newDate)
    }
  }
  
  // Calculate win rate for selected day
  const calculateWinRate = (trades: Trade[]) => {
    if (trades.length === 0) return 0
    const winningTrades = trades.filter(trade => trade.profit_loss > 0).length
    return Math.round((winningTrades / trades.length) * 100)
  }
  
  // Calculate trading streak
  const calculateTradingStreak = () => {
    // Simplified calculation - just return a placeholder value
    return 5
  }
  
  // New functions for handling custom events
  const handleAddEvent = async (event: Omit<CustomEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return
    
    const newEvent = {
      ...event,
      user_id: user.id,
    }
    
    try {
      const addedEvent = await addCustomEvent(newEvent)
      setCustomEvents([...customEvents, addedEvent])
      setShowEventModal(false)
      setSelectedEvent(null)
    } catch (error) {
      console.error('Error adding custom event:', error)
    }
  }
  
  const handleUpdateEvent = async (event: CustomEvent) => {
    try {
      const updatedEvent = await updateCustomEvent(event)
      setCustomEvents(customEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e))
      setShowEventModal(false)
      setSelectedEvent(null)
    } catch (error) {
      console.error('Error updating custom event:', error)
    }
  }
  
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteCustomEvent(eventId)
      setCustomEvents(customEvents.filter(e => e.id !== eventId))
      setShowEventModal(false)
      setSelectedEvent(null)
    } catch (error) {
      console.error('Error deleting custom event:', error)
    }
  }
  
  const openEventModal = (date: Date, event?: CustomEvent) => {
    if (event) {
      setSelectedEvent(event)
    } else {
      setSelectedEvent(null)
    }
    
    setSelectedDate(date)
    setShowEventModal(true)
  }
  
  // Default to the first day with trades if no day is selected
  useEffect(() => {
    if (trades.length > 0 && !selectedDate) {
      // Find the first day in the current view with trades
      for (const date of dates) {
        const dateString = date.toISOString().split('T')[0]
        if (tradesByDate[dateString]) {
          handleDateClick(date)
          break
        }
      }
    }
  }, [trades, dates])
  
  // When switching view modes, try to keep the selected date visible
  useEffect(() => {
    if (selectedDate) {
      if (viewMode === 'Week') {
        // Set current date to a date in the same week as the selected date
        setCurrentDate(selectedDate)
      }
    }
  }, [viewMode])
  
  // Add function to analyze selected day's trades
  const analyzeDayTrades = async (trades: Trade[]) => {
    if (trades.length === 0) {
      setSelectedDayAnalysis(null)
      return
    }

    try {
      // Get analysis for each trade
      const analyses = await Promise.all(trades.map(trade => analyzeTrade(trade)))
      
      // Combine analyses into a single day analysis
      const dayAnalysis: DayAnalysis = {
        strengths: [...new Set(analyses.flatMap(a => a.strengths))],
        weaknesses: [...new Set(analyses.flatMap(a => a.weaknesses))],
        improvementAreas: [...new Set(analyses.flatMap(a => a.improvementAreas))],
        score: Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length),
        patterns: [],
        emotionalState: trades[0]?.emotional_state
      }
      
      setSelectedDayAnalysis(dayAnalysis)
    } catch (error) {
      console.error('Error analyzing day trades:', error)
      setSelectedDayAnalysis(null)
    }
  }

  // Add function to calculate week's total P&L
  const calculateWeekTotal = (dates: Date[]) => {
    return dates.reduce((total, date) => {
      const dateString = date.toISOString().split('T')[0]
      const dayTrades = tradesByDate[dateString] || []
      return total + calculateTotalPnL(dayTrades)
    }, 0)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  if (!user) {
    return null // This prevents the page from flashing before redirect
  }
  
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  
  const renderWeekView = () => {
    const weekTotal = calculateWeekTotal(weekDates)
    
    return (
      <div className="bg-[#151823] rounded-xl overflow-hidden border border-indigo-900/20">
        <div className="grid grid-cols-7 border-b border-indigo-900/20">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split('T')[0]
            const dayTrades = tradesByDate[dateStr] || []
            const pnl = calculateDayPnL(dayTrades)
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = selectedDate?.toDateString() === date.toDateString()

            return (
              <motion.div
                key={dateStr}
                onClick={() => handleDateClick(date)}
                className={`
                  min-h-[200px] p-4 border-r border-b border-indigo-900/20 cursor-pointer
                  ${isSelected ? 'bg-indigo-900/20' : 'hover:bg-indigo-900/10'}
                  ${isToday ? 'bg-indigo-900/5' : ''}
                  relative
                `}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-lg font-medium ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </span>
                  {dayTrades.length > 0 && (
                    <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/20 text-indigo-400">
                      {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {pnl !== 0 && (
                  <div className={`text-xl font-bold ${pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(pnl)}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
        {/* Add Week Total Section */}
        <div className="p-4 border-t border-indigo-900/20 bg-[#1a1e2d]">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Week Total:</span>
            <span className={`text-xl font-bold ${weekTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(weekTotal)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const days = []
    const totalDays = daysInMonth + firstDayOfMonth
    const rows = Math.ceil(totalDays / 7)

    for (let i = 0; i < rows * 7; i++) {
      const dayNumber = i - firstDayOfMonth + 1
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
      const date = isValidDay ? new Date(currentYear, currentMonth, dayNumber) : null
      const dateStr = date?.toISOString().split('T')[0]
      const dayTrades = dateStr ? (tradesByDate[dateStr] || []) : []
      const pnl = dateStr ? calculateDayPnL(dayTrades) : 0
      const isToday = date?.toDateString() === new Date().toDateString()
      const isSelected = date && selectedDate?.toDateString() === date.toDateString()

      days.push(
        <motion.div
          key={i}
          onClick={() => date && handleDateClick(date)}
          className={`
            min-h-[120px] p-4 border-r border-b border-indigo-900/20
            ${!isValidDay ? 'bg-[#0f1117]/50' : isSelected ? 'bg-indigo-900/20' : 'hover:bg-indigo-900/10'}
            ${isToday ? 'bg-indigo-900/5' : ''}
            ${isValidDay ? 'cursor-pointer' : ''}
            relative
          `}
          whileHover={isValidDay ? { scale: 1.02 } : {}}
          transition={{ duration: 0.2 }}
        >
          {isValidDay && (
            <>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-lg font-medium ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>
                  {dayNumber}
                </span>
                {dayTrades.length > 0 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/20 text-indigo-400">
                    {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {pnl !== 0 && (
                <div className={`text-xl font-bold ${pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(pnl)}
                </div>
              )}
            </>
          )}
        </motion.div>
      )
    }

    return (
      <div className="bg-[#151823] rounded-xl overflow-hidden border border-indigo-900/20">
        <div className="grid grid-cols-7 border-b border-indigo-900/20">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Header />
      
      <div className={`${LAYOUT.container} py-8`}>
        {/* Page Header */}
        <div className="mb-8">
          <div className={LAYOUT.flexBetween}>
            <div>
              <h1 className={`${calendarStyles.monthHeader} bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400`}>
                {monthName} {currentYear}
              </h1>
              <p className="text-gray-400 mt-2">
                Monthly P&L: {formatCurrency(calculateTotalPnL(trades))}
              </p>
            </div>
          
            <div className="flex items-center space-x-3">
              <div className="flex bg-[#151823] rounded-xl p-1 border border-indigo-900/20">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setViewMode('Week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    viewMode === 'Week'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Week
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setViewMode('Month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    viewMode === 'Month'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Month
                </motion.button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar Controls */}
        <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-3">
            <button onClick={goToPrevious} className={calendarStyles.controlButton}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
            <button onClick={goToNext} className={calendarStyles.controlButton}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
            
            <button
              onClick={() => {
                const today = new Date()
                setCurrentDate(today)
                setSelectedDate(today)
                const dateString = today.toISOString().split('T')[0]
                setSelectedDayTrades(tradesByDate[dateString] || [])
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
            >
              Today
            </button>
            </div>
          </div>
          
        {/* Calendar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === 'Week' ? renderWeekView() : renderMonthView()}
          </motion.div>
        </AnimatePresence>
        
        {/* Selected Day Details with AI Analysis */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-6"
          >
            {/* Day Overview */}
            <div className="bg-[#151823] rounded-xl border border-indigo-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              
              {selectedDayTrades.length > 0 && (
                <div className={calendarStyles.tradeDetails.stats}>
                  <div className={calendarStyles.tradeDetails.statItem}>
                    <span className={calendarStyles.tradeDetails.statLabel}>Win Rate</span>
                    <span className={calendarStyles.tradeDetails.statValue}>
                      {Math.round((selectedDayTrades.filter(t => t.profit_loss > 0).length / selectedDayTrades.length) * 100)}%
                    </span>
                  </div>
                  <div className={calendarStyles.tradeDetails.statItem}>
                    <span className={calendarStyles.tradeDetails.statLabel}>Avg. Win</span>
                    <span className={`${calendarStyles.tradeDetails.statValue} text-green-400`}>
                      {formatCurrency(
                        selectedDayTrades.filter(t => t.profit_loss > 0).reduce((sum, t) => sum + t.profit_loss, 0) / 
                        selectedDayTrades.filter(t => t.profit_loss > 0).length || 0
                      )}
                    </span>
                  </div>
                  <div className={calendarStyles.tradeDetails.statItem}>
                    <span className={calendarStyles.tradeDetails.statLabel}>Avg. Loss</span>
                    <span className={`${calendarStyles.tradeDetails.statValue} text-red-400`}>
                      {formatCurrency(
                        selectedDayTrades.filter(t => t.profit_loss < 0).reduce((sum, t) => sum + t.profit_loss, 0) / 
                        selectedDayTrades.filter(t => t.profit_loss < 0).length || 0
                      )}
                    </span>
                  </div>
                  <div className={calendarStyles.tradeDetails.statItem}>
                    <span className={calendarStyles.tradeDetails.statLabel}>Largest Trade</span>
                    <span className={`${calendarStyles.tradeDetails.statValue} ${
                      Math.max(...selectedDayTrades.map(t => t.profit_loss)) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(Math.max(...selectedDayTrades.map(t => Math.abs(t.profit_loss))))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Analysis Section */}
            {selectedDayAnalysis && (
              <div className="bg-[#151823] rounded-xl border border-indigo-900/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Trading Score</span>
                    <span className={`text-lg font-bold ${
                      selectedDayAnalysis.score >= 70 ? 'text-green-400' : 
                      selectedDayAnalysis.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {selectedDayAnalysis.score}/100
                    </span>
                  </div>
                </div>

                {selectedDayAnalysis.emotionalState && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Emotional State</h4>
                    <div className="inline-block px-3 py-1 rounded-full bg-indigo-900/20 text-indigo-400">
                      {selectedDayAnalysis.emotionalState}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Strengths</h4>
                    <ul className="space-y-2">
                      {selectedDayAnalysis.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start space-x-2 text-green-400">
                          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Areas for Improvement</h4>
                    <ul className="space-y-2">
                      {selectedDayAnalysis.improvementAreas.map((area, index) => (
                        <li key={index} className="flex items-start space-x-2 text-blue-400">
                          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Trades List */}
            <div className="space-y-4">
              {selectedDayTrades.map((trade) => (
                <div
                  key={trade.id}
                  className={calendarStyles.tradeDetails.tradeCard}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <span className={calendarStyles.tradeDetails.tradeType[trade.type.toLowerCase() as 'long' | 'short']}>
                        {trade.type === 'Long' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        )}
                        {trade.type}
                      </span>
                      <span className="text-lg font-medium text-white">{trade.symbol}</span>
                    </div>
                    <span className={`text-lg font-bold ${trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(trade.profit_loss)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Entry</span>
                      <div className="font-medium text-white">{formatCurrency(trade.entry_price)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Exit</span>
                      <div className="font-medium text-white">{formatCurrency(trade.exit_price)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Time</span>
                      <div className="font-medium text-white">
                        {new Date(trade.entry_time).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration</span>
                      <div className="font-medium text-white">
                        {Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / (1000 * 60))}m
                      </div>
                    </div>
                  </div>
                  
                  {trade.notes && (
                    <div className="mt-4 pt-4 border-t border-indigo-900/20">
                      <p className="text-gray-400">{trade.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
} 

// Helper function to check if a date is today
function isCurrentDate(date: Date) {
  const today = new Date()
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear()
}

// Add these animations to your global CSS file
const globalStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
`; 