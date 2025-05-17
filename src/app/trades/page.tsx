'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Trade } from '@/lib/types'
import { getAllTrades, deleteTrade } from '@/lib/tradingApi'
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { calculatePerformanceMetrics } from '@/lib/tradeMetrics'
import TradeDetail from '@/components/trades/TradeDetail'
import COLORS, { TRANSITIONS } from '@/lib/colorSystem'

export default function Trades() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedDetailTrade, setSelectedDetailTrade] = useState<Trade | null>(null)
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState('')
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'All' | 'Long' | 'Short'>('All')
  const [dateFilter, setDateFilter] = useState<'All' | '7d' | '30d' | '90d' | '1y'>('All')
  const [sortField, setSortField] = useState<keyof Trade>('entry_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [quickMetrics, setQuickMetrics] = useState<{
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
    tradesPerWeek: number;
  }>({ 
    winRate: 0, 
    profitFactor: 0, 
    totalPnL: 0, 
    avgWin: 0, 
    avgLoss: 0, 
    tradesPerWeek: 0 
  })
  
  // Toggle filter panel
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchTrades() {
      if (user) {
        setIsLoading(true)
        try {
          const tradesData = await getAllTrades(user.id)
          setTrades(tradesData)
          setFilteredTrades(tradesData)
          
          // Calculate quick metrics
          if (tradesData.length > 0) {
            const metrics = calculatePerformanceMetrics(tradesData);
            
            // Calculate trades per week
            const oldestTradeDate = new Date(Math.min(...tradesData.map(t => new Date(t.entry_time).getTime())));
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - oldestTradeDate.getTime());
            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            const tradesPerWeek = diffWeeks > 0 ? tradesData.length / diffWeeks : tradesData.length;
            
            setQuickMetrics({
              winRate: metrics.winRate,
              profitFactor: metrics.profitFactor,
              totalPnL: metrics.totalPnL,
              avgWin: metrics.averageWin,
              avgLoss: metrics.averageLoss,
              tradesPerWeek
            });
          }
        } catch (error) {
          console.error('Error fetching trades:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (user) {
      fetchTrades()
    }
  }, [user])
  
  // Apply filters and sorting
  useEffect(() => {
    if (!trades.length) return;
    
    let result = [...trades];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(trade => 
        trade.symbol.toLowerCase().includes(term) || 
        (trade.notes && trade.notes.toLowerCase().includes(term))
      );
    }
    
    // Apply symbol filter
    if (symbolFilter) {
      result = result.filter(trade => trade.symbol === symbolFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'All') {
      result = result.filter(trade => trade.type === typeFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'All') {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (dateFilter) {
        case '7d':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          cutoffDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case '1y':
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          cutoffDate = new Date(0); // Beginning of time
      }
      
      result = result.filter(trade => new Date(trade.entry_time) >= cutoffDate);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc' 
          ? fieldA.localeCompare(fieldB) 
          : fieldB.localeCompare(fieldA);
      }
      
      // For numeric fields
      return sortDirection === 'asc' 
        ? (fieldA as number) - (fieldB as number) 
        : (fieldB as number) - (fieldA as number);
    });
    
    setFilteredTrades(result);
    
    // Update metrics for filtered results
    if (result.length > 0) {
      const metrics = calculatePerformanceMetrics(result);
      
      // Calculate trades per week for filtered results
      const oldestTradeDate = new Date(Math.min(...result.map(t => new Date(t.entry_time).getTime())));
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - oldestTradeDate.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      const tradesPerWeek = diffWeeks > 0 ? result.length / diffWeeks : result.length;
      
      setQuickMetrics({
        winRate: metrics.winRate,
        profitFactor: metrics.profitFactor,
        totalPnL: metrics.totalPnL,
        avgWin: metrics.averageWin,
        avgLoss: metrics.averageLoss,
        tradesPerWeek
      });
    } else {
      setQuickMetrics({ 
        winRate: 0, 
        profitFactor: 0, 
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        tradesPerWeek: 0
      });
    }
  }, [trades, searchTerm, symbolFilter, typeFilter, dateFilter, sortField, sortDirection]);

  const uniqueSymbols = Array.from(new Set(trades.map(trade => trade.symbol)));

  const handleAddTrade = () => {
    setSelectedTrade(null)
    setShowForm(true)
  }

  const handleEditTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setShowForm(true)
  }

  const handleDeleteTrade = async (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      setIsDeleting(tradeId)
      try {
        await deleteTrade(tradeId)
        // Update local state
        setTrades(prevTrades => prevTrades.filter(trade => trade.id !== tradeId))
      } catch (error) {
        console.error('Error deleting trade:', error)
        alert('Failed to delete trade. Please try again.')
      } finally {
        setIsDeleting(null)
      }
    }
  }

  const handleTradeFormClose = () => {
    setShowForm(false)
    setSelectedTrade(null)
  }

  const handleTradeFormSubmit = async (tradeData: Partial<Trade>) => {
    // This will update an existing trade
    if (selectedTrade && tradeData.id) {
      try {
        // In a real app, this would call an API to update the trade
        // For now, we'll just update the local state
        const updatedTrades = trades.map(trade => 
          trade.id === tradeData.id ? { ...trade, ...tradeData } as Trade : trade
        );
        setTrades(updatedTrades);
        
        // Close the form
        setShowForm(false);
        setSelectedTrade(null);
      } catch (error) {
        console.error('Error updating trade:', error);
        alert('Failed to update trade. Please try again.');
      }
    }
  }
  
  const handleSort = (field: keyof Trade) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset to desc direction
      setSortField(field);
      setSortDirection('desc');
    }
  }
  
  const getSortIndicator = (field: keyof Trade) => {
    if (field !== sortField) return null;
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // Handle viewing trade details
  const handleViewTradeDetails = (trade: Trade) => {
    setSelectedDetailTrade(trade);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null // This prevents the page from flashing before redirect
  }

  return (
    <div className="bg-[#0a0a10] min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header with Metrics */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Trade History</h1>
              <p className="text-gray-400 mt-1">Track, analyze, and manage your trading activity</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search trades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 p-2 pl-8 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 bg-[#1a1f2c] text-white rounded-lg hover:bg-[#262f3f] transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              
              <Link 
                href="/trades/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Trade
              </Link>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total Trades</div>
                  <div className="text-xl font-bold text-white">{filteredTrades.length}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full ${quickMetrics.winRate >= 60 ? 'bg-green-500/20' : quickMetrics.winRate >= 50 ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center mr-3`}>
                  <svg className={`w-5 h-5 ${quickMetrics.winRate >= 60 ? 'text-green-400' : quickMetrics.winRate >= 50 ? 'text-blue-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Win Rate</div>
                  <div className={`text-xl font-bold ${quickMetrics.winRate >= 60 ? 'text-green-400' : quickMetrics.winRate >= 50 ? 'text-blue-400' : 'text-red-400'}`}>
                    {quickMetrics.winRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full ${quickMetrics.totalPnL >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center mr-3`}>
                  <svg className={`w-5 h-5 ${quickMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total P&L</div>
                  <div className={`text-xl font-bold ${quickMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(quickMetrics.totalPnL)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Profit Factor</div>
                  <div className="text-xl font-bold text-white">{quickMetrics.profitFactor.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Advanced Metrics (conditional on showFilters) */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Avg Win</div>
                <div className="text-lg font-medium text-green-400">{formatCurrency(quickMetrics.avgWin)}</div>
              </div>
              
              <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Avg Loss</div>
                <div className="text-lg font-medium text-red-400">{formatCurrency(Math.abs(quickMetrics.avgLoss))}</div>
              </div>
              
              <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Avg RR Ratio</div>
                <div className="text-lg font-medium text-white">
                  {quickMetrics.avgLoss !== 0 ? (quickMetrics.avgWin / Math.abs(quickMetrics.avgLoss)).toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div className="bg-[#1a1f2c] rounded-lg p-4 border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Trades Per Week</div>
                <div className="text-lg font-medium text-white">{quickMetrics.tradesPerWeek.toFixed(1)}</div>
              </div>
            </div>
          )}
          
          {/* Filter Controls (conditional) */}
          {showFilters && (
            <div className="bg-[#0f1117] rounded-lg p-4 border border-gray-800 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                  <select
                    value={symbolFilter || ''}
                    onChange={(e) => setSymbolFilter(e.target.value || null)}
                    className="w-full p-2 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Symbols</option>
                    {uniqueSymbols.map(symbol => (
                      <option key={symbol} value={symbol}>{symbol}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'All' | 'Long' | 'Short')}
                    className="w-full p-2 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Types</option>
                    <option value="Long">Long Only</option>
                    <option value="Short">Short Only</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time Period</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'All' | '7d' | '30d' | '90d' | '1y')}
                    className="w-full p-2 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSymbolFilter(null);
                      setTypeFilter('All');
                      setDateFilter('All');
                    }}
                    className="w-full p-2 text-gray-400 hover:text-white bg-[#1a1f2c] rounded-lg border border-gray-700 text-sm flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Trade Table */}
        <div className="bg-[#1a1f2c] rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#151823] text-gray-400 text-left border-b border-gray-800">
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('symbol')}>
                    <div className="flex items-center">
                      Symbol {getSortIndicator('symbol')}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('type')}>
                    <div className="flex items-center">
                      Type {getSortIndicator('type')}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('entry_price')}>
                    <div className="flex items-center">
                      Entry {getSortIndicator('entry_price')}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('exit_price')}>
                    <div className="flex items-center">
                      Exit {getSortIndicator('exit_price')}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center">
                      Qty {getSortIndicator('quantity')}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('profit_loss')}>
                    <div className="flex items-center">
                      P/L {getSortIndicator('profit_loss')}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('entry_time')}>
                    <div className="flex items-center">
                      Date {getSortIndicator('entry_time')}
                    </div>
                  </th>
                  <th className="px-6 py-3">
                    <div className="flex items-center">
                      Details
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-400 text-lg mb-2">No trades found</p>
                        <p className="text-gray-500 text-sm">Try adjusting your filters or add a new trade</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-[#1d2333] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-medium text-white">{trade.symbol}</div>
                            {trade.strategy && (
                              <div className="text-xs text-gray-500 mt-1">{trade.strategy}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          trade.type === 'Long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {trade.type}
                        </span>
                        {trade.tags && trade.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {trade.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="inline-block px-1.5 py-0.5 text-xs rounded bg-blue-900/30 text-blue-400">
                                {tag}
                              </span>
                            ))}
                            {trade.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{trade.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-white">{formatCurrency(trade.entry_price)}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(trade.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-white">{formatCurrency(trade.exit_price)}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(trade.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{trade.quantity}</div>
                        {trade.risk && (
                          <div className="text-xs text-gray-500 mt-1">
                            Risk: {formatCurrency(trade.risk)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${
                          trade.profit_loss > 0 ? 'text-green-400' : trade.profit_loss < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {trade.profit_loss > 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                        </div>
                        {trade.r_multiple && (
                          <div className={`text-xs ${
                            trade.r_multiple > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {trade.r_multiple > 0 ? '+' : ''}{trade.r_multiple.toFixed(1)}R
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {new Date(trade.entry_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.entry_time).getFullYear()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {trade.screenshot_url && (
                            <div className="w-2 h-2 rounded-full bg-blue-400" title="Has screenshot"></div>
                          )}
                          {trade.notes && (
                            <div className="w-2 h-2 rounded-full bg-purple-400" title="Has notes"></div>
                          )}
                          <button 
                            onClick={() => handleViewTradeDetails(trade)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleEditTrade(trade)}
                            className="text-gray-400 hover:text-white transition-colors"
                            disabled={isDeleting === trade.id}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            disabled={isDeleting === trade.id}
                          >
                            {isDeleting === trade.id ? (
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Enhanced Pagination */}
          {filteredTrades.length > 0 && (
            <div className="px-6 py-4 bg-[#1a1f2c] border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-sm">
              <div className="text-gray-400 mb-3 sm:mb-0">
                Showing <span className="text-white">{Math.min(filteredTrades.length, 10)}</span> of <span className="text-white">{filteredTrades.length}</span> trades
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="px-3 py-1 rounded-lg bg-blue-900/50 text-blue-400 border border-blue-800">1</button>
                <button className="px-3 py-1 rounded-lg text-gray-400 hover:bg-gray-800">2</button>
                <button className="px-3 py-1 rounded-lg text-gray-400 hover:bg-gray-800">3</button>
                <span className="text-gray-400">...</span>
                <button className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-auto flex items-center justify-center p-4">
          <div className="bg-[#0f1117] rounded-lg shadow-2xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {selectedTrade ? 'Edit Trade' : 'Add New Trade'}
              </h2>
              <button 
                onClick={handleTradeFormClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EnhancedTradeForm
              initialTrade={selectedTrade || undefined}
              onSubmit={handleTradeFormSubmit}
              onCancel={handleTradeFormClose}
            />
          </div>
        </div>
      )}
      
      {/* Trade Detail Modal */}
      {selectedDetailTrade && (
        <TradeDetail 
          trade={selectedDetailTrade} 
          onClose={() => setSelectedDetailTrade(null)} 
        />
      )}
    </div>
  )
} 