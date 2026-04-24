'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Trade } from '@/lib/types'
import { getAllTrades, deleteTrade, addTrade } from '@/lib/tradingApi'
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import Link from 'next/link'
import { calculatePerformanceMetrics } from '@/lib/tradeMetrics'
import TradeDetail from '@/components/trades/TradeDetail'
import TagModal from '@/components/trades/TagModal'
import ExportModal from '@/components/trades/ExportModal'
import TradeAIChatBox from '@/components/trades/TradeAIChatBox'
import { motion, AnimatePresence } from 'framer-motion'

const calculateTradesPerWeek = (trades: Trade[]): number => {
  if (!trades.length) return 0;
  const oldestTradeDate = new Date(Math.min(...trades.map(t => new Date(t.entry_time).getTime())));
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - oldestTradeDate.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks > 0 ? trades.length / diffWeeks : trades.length;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

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
  const [showFilters, setShowFilters] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'All' | 'Long' | 'Short'>('All')
  const [dateFilter, setDateFilter] = useState<'All' | '7d' | '30d' | '90d' | '1y'>('All')
  const [sortField, setSortField] = useState<keyof Trade>('entry_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [quickMetrics, setQuickMetrics] = useState({ winRate: 0, profitFactor: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, tradesPerWeek: 0 })
  const [showTagModal, setShowTagModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null)

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading, router])

  useEffect(() => {
    async function fetchTrades() {
      if (user) {
        setIsLoading(true)
        try {
          const tradesData = await getAllTrades(user.id)
          setTrades(tradesData)
          setFilteredTrades(tradesData)
          if (tradesData.length > 0) {
            const metrics = calculatePerformanceMetrics(tradesData);
            setQuickMetrics({ winRate: metrics.winRate, profitFactor: metrics.profitFactor, totalPnL: metrics.totalPnL, avgWin: metrics.averageWin, avgLoss: metrics.averageLoss, tradesPerWeek: calculateTradesPerWeek(tradesData) });
          }
        } catch (error) { console.error('Error fetching trades:', error) }
        finally { setIsLoading(false) }
      }
    }
    if (user) fetchTrades()
  }, [user])
  
  // Apply filters
  useEffect(() => {
    if (!trades.length) return;
    let result = [...trades];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => t.symbol.toLowerCase().includes(term) || t.notes?.toLowerCase().includes(term) || t.tags?.some(tag => tag.toLowerCase().includes(term)));
    }
    if (symbolFilter) result = result.filter(t => t.symbol === symbolFilter);
    if (typeFilter !== 'All') result = result.filter(t => t.type === typeFilter);
    if (dateFilter !== 'All') {
      const now = new Date();
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[dateFilter] || 0;
      const cutoff = new Date(now.getTime() - days * 86400000);
      result = result.filter(t => new Date(t.entry_time) >= cutoff);
    }
    result.sort((a, b) => {
      const fA = a[sortField], fB = b[sortField];
      if (typeof fA === 'string' && typeof fB === 'string') return sortDirection === 'asc' ? fA.localeCompare(fB) : fB.localeCompare(fA);
      return sortDirection === 'asc' ? (fA as number) - (fB as number) : (fB as number) - (fA as number);
    });
    setTotalPages(Math.ceil(result.length / pageSize));
    if (result.length > 0) {
      const metrics = calculatePerformanceMetrics(result);
      setQuickMetrics({ winRate: metrics.winRate, profitFactor: metrics.profitFactor, totalPnL: metrics.totalPnL, avgWin: metrics.averageWin, avgLoss: metrics.averageLoss, tradesPerWeek: calculateTradesPerWeek(result) });
    } else {
      setQuickMetrics({ winRate: 0, profitFactor: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, tradesPerWeek: 0 });
    }
    const start = (currentPage - 1) * pageSize;
    setFilteredTrades(result.slice(start, start + pageSize));
  }, [trades, searchTerm, symbolFilter, typeFilter, dateFilter, sortField, sortDirection, currentPage, pageSize]);

  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol)));

  const handleDeleteTrade = async (tradeId: string) => {
    if (!window.confirm('Delete this trade?')) return;
    setIsDeleting(tradeId);
    try {
      await deleteTrade(tradeId);
      if (user) { const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d); }
    } catch (e) { console.error(e); } finally { setIsDeleting(null); }
  };

  const handleTradeFormSubmit = async (tradeData: Partial<Trade>) => {
    if (selectedTrade && tradeData.id) {
      const updated = trades.map(t => t.id === tradeData.id ? { ...t, ...tradeData } as Trade : t);
      setTrades(updated);
      if (user) { const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d); }
      setShowForm(false); setSelectedTrade(null);
    } else {
      if (!user) return;
      await addTrade({ ...tradeData, user_id: user.id } as Trade);
      const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d);
      setShowForm(false); setSelectedTrade(null);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'export' | 'tag') => {
    if (!selectedTradeIds.length) return;
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedTradeIds.length} trades?`)) return;
      setIsLoading(true);
      await Promise.all(selectedTradeIds.map(id => deleteTrade(id)));
      if (user) { const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d); }
      setSelectedTradeIds([]); setIsLoading(false);
    } else if (action === 'export') setShowExportModal(true);
    else if (action === 'tag') setShowTagModal(true);
  };

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsProcessing(true);
    const selected = trades.filter(t => selectedTradeIds.includes(t.id));
    if (format === 'csv') {
      const headers = ['Symbol','Type','Entry','Exit','Qty','P/L','Entry Time','Exit Time','Tags','Notes'];
      const rows = selected.map(t => [t.symbol,t.type,t.entry_price,t.exit_price,t.quantity,t.profit_loss,t.entry_time,t.exit_time,t.tags?.join(';')||'',t.notes||'']);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'trades.csv'; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'trades.json'; a.click(); URL.revokeObjectURL(url);
    }
    setShowExportModal(false); setIsProcessing(false);
  };

  const handleAddTag = async (tag: string) => {
    setIsProcessing(true);
    setTrades(prev => prev.map(t => selectedTradeIds.includes(t.id) ? { ...t, tags: [...(t.tags || []), tag] } : t));
    setSelectedTradeIds([]); setShowTagModal(false); setIsProcessing(false);
  };

  const handleSort = (field: keyof Trade) => {
    if (field === sortField) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const selectedTradesForAI = trades.filter(t => selectedTradeIds.includes(t.id));

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trades</h1>
            <p className="text-gray-500 text-sm mt-0.5">{trades.length} total trades logged</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text" placeholder="Search..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-44 pl-9 pr-3 py-2 bg-[#0d0e16] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#0d0e16] border-white/[0.06] text-gray-400 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </button>
            <Link href="/trades/new"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Log Trade
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total P&L', value: formatCurrency(quickMetrics.totalPnL), color: quickMetrics.totalPnL >= 0 ? 'emerald' : 'red',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Win Rate', value: `${quickMetrics.winRate.toFixed(1)}%`, color: quickMetrics.winRate >= 50 ? 'emerald' : 'red',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Profit Factor', value: quickMetrics.profitFactor.toFixed(2), color: quickMetrics.profitFactor >= 1 ? 'emerald' : 'red',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
            { label: 'Total Trades', value: trades.length.toString(), color: 'indigo',
              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          ].map((m, i) => (
            <div key={i} className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{m.label}</span>
                <div className={`${m.color === 'emerald' ? 'text-emerald-500/50' : m.color === 'red' ? 'text-red-500/50' : 'text-indigo-500/50'}`}>{m.icon}</div>
              </div>
              <div className={`text-xl font-bold ${m.color === 'emerald' ? 'text-emerald-400' : m.color === 'red' ? 'text-red-400' : 'text-indigo-400'}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden">
              <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Symbol</label>
                    <select value={symbolFilter || ''} onChange={e => setSymbolFilter(e.target.value || null)}
                      className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                      <option value="">All Symbols</option>
                      {uniqueSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Direction</label>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'All' | 'Long' | 'Short')}
                      className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                      <option value="All">All</option><option value="Long">Long</option><option value="Short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Period</label>
                    <select value={dateFilter} onChange={e => setDateFilter(e.target.value as typeof dateFilter)}
                      className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                      <option value="All">All Time</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="1y">1 Year</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => { setSearchTerm(''); setSymbolFilter(null); setTypeFilter('All'); setDateFilter('All'); }}
                      className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white bg-[#151823] border border-white/[0.06] rounded-lg transition-colors">
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedTradeIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-indigo-300 font-medium">{selectedTradeIds.length} selected</span>
                <div className="flex gap-1.5">
                  <button onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">Delete</button>
                  <button onClick={() => handleBulkAction('export')} className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">Export</button>
                  <button onClick={() => handleBulkAction('tag')} className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors">Tag</button>
                </div>
              </div>
              <button onClick={() => setSelectedTradeIds([])} className="text-xs text-gray-500 hover:text-white transition-colors">Clear</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trade List */}
        <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[40px_1.5fr_80px_1fr_1fr_80px_1fr_100px_80px] gap-2 px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.04] bg-[#0a0b12]">
            <div className="flex items-center">
              <input type="checkbox" checked={filteredTrades.length > 0 && selectedTradeIds.length === filteredTrades.length}
                onChange={e => setSelectedTradeIds(e.target.checked ? filteredTrades.map(t => t.id) : [])}
                className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-3.5 h-3.5" />
            </div>
            <div className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => handleSort('symbol')}>
              Symbol {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
            </div>
            <div className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => handleSort('type')}>Side</div>
            <div className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => handleSort('entry_price')}>Entry</div>
            <div className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => handleSort('exit_price')}>Exit</div>
            <div>Lots</div>
            <div className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => handleSort('profit_loss')}>
              P&L {sortField === 'profit_loss' && (sortDirection === 'asc' ? '↑' : '↓')}
            </div>
            <div className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => handleSort('entry_time')}>
              Date {sortField === 'entry_time' && (sortDirection === 'asc' ? '↑' : '↓')}
            </div>
            <div className="text-right">Actions</div>
          </div>

          {/* Rows */}
          {filteredTrades.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="text-gray-600 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="text-gray-400 font-medium mb-1">No trades found</p>
              <p className="text-gray-600 text-sm mb-4">Start by logging your first trade</p>
              <Link href="/trades/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Log Trade
              </Link>
            </div>
          ) : (
            filteredTrades.map((trade, idx) => (
              <div key={trade.id}
                className={`grid grid-cols-1 md:grid-cols-[40px_1.5fr_80px_1fr_1fr_80px_1fr_100px_80px] gap-2 px-4 py-3.5 items-center hover:bg-white/[0.02] transition-colors ${idx !== filteredTrades.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                {/* Checkbox */}
                <div className="hidden md:flex items-center">
                  <input type="checkbox" checked={selectedTradeIds.includes(trade.id)}
                    onChange={e => setSelectedTradeIds(e.target.checked ? [...selectedTradeIds, trade.id] : selectedTradeIds.filter(id => id !== trade.id))}
                    className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-3.5 h-3.5" />
                </div>
                
                {/* Symbol */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${(trade.profit_loss ?? 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {(trade.profit_loss ?? 0) >= 0 ? '↑' : '↓'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{trade.symbol}</div>
                    {trade.tags && trade.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {trade.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{tag}</span>
                        ))}
                        {trade.tags.length > 2 && <span className="text-[9px] text-gray-600">+{trade.tags.length - 2}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Side */}
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${trade.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {trade.type === 'Long' ? 'BUY' : 'SELL'}
                  </span>
                </div>

                {/* Entry */}
                <div className="text-sm font-mono text-gray-300">{(trade.entry_price ?? 0).toFixed(2)}</div>

                {/* Exit */}
                <div className="text-sm font-mono text-gray-300">{(trade.exit_price ?? 0).toFixed(2)}</div>

                {/* Lots */}
                <div className="text-sm text-gray-400">{trade.quantity}</div>

                {/* P&L */}
                <div className={`text-sm font-bold ${(trade.profit_loss ?? 0) > 0 ? 'text-emerald-400' : (trade.profit_loss ?? 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{formatCurrency(trade.profit_loss ?? 0)}
                </div>

                {/* Date */}
                <div className="text-sm text-gray-400">
                  {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  {trade.screenshot_url && (
                    <button onClick={() => setSelectedScreenshotUrl(trade.screenshot_url)}
                      className="p-1.5 text-gray-600 hover:text-indigo-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                  )}
                  <button onClick={() => setSelectedDetailTrade(trade)}
                    className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button onClick={() => { setSelectedTrade(trade); setShowForm(true); }}
                    className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDeleteTrade(trade.id)} disabled={isDeleting === trade.id}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04] disabled:opacity-50">
                    {isDeleting === trade.id ? (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    )}
                  </button>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden col-span-full flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${trade.type === 'Long' ? 'text-emerald-400' : 'text-red-400'}`}>{trade.type}</span>
                    <span className="text-xs text-gray-500">{trade.entry_price} → {trade.exit_price}</span>
                  </div>
                  <span className={`text-sm font-bold ${(trade.profit_loss ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(trade.profit_loss ?? 0) >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss ?? 0)}
                  </span>
                </div>
              </div>
            ))
          )}
          
          {/* Pagination */}
          {filteredTrades.length > 0 && (
            <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-xs text-gray-600">{trades.length} trades total</span>
              <div className="flex items-center gap-1">
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 bg-[#151823] border border-white/[0.06] rounded-lg text-gray-400 text-xs focus:outline-none [color-scheme:dark]">
                  <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                </select>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xs text-gray-400 px-2">{currentPage}/{totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Trade Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-auto flex items-start justify-center p-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0b12] rounded-2xl border border-white/[0.08] w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-white/[0.06] flex justify-between items-center sticky top-0 bg-[#0a0b12] z-10">
              <h2 className="text-lg font-bold text-white">{selectedTrade ? 'Edit Trade' : 'Add Trade'}</h2>
              <button onClick={() => { setShowForm(false); setSelectedTrade(null); }} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <EnhancedTradeForm initialTrade={selectedTrade || undefined} onSubmit={handleTradeFormSubmit} onCancel={() => { setShowForm(false); setSelectedTrade(null); }} />
            </div>
          </motion.div>
        </div>
      )}
      
      {selectedDetailTrade && <TradeDetail trade={selectedDetailTrade} onClose={() => setSelectedDetailTrade(null)} />}
      <TagModal isOpen={showTagModal} onClose={() => setShowTagModal(false)} onConfirm={handleAddTag} isLoading={isProcessing} />
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onConfirm={handleExport} isLoading={isProcessing} />

      {/* Screenshot Modal */}
      {selectedScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedScreenshotUrl(null)}>
          <div className="max-w-4xl w-full relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedScreenshotUrl(null)} className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={selectedScreenshotUrl} alt="Trade Screenshot" className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto" />
          </div>
        </div>
      )}

      <TradeAIChatBox selectedTrades={selectedTradesForAI.length > 0 ? selectedTradesForAI : filteredTrades} />
    </AuthenticatedLayout>
  )
}
