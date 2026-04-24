'use client'

import React, { useState } from 'react'
import { Trade } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Edit, Trash2, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { deleteTrade } from '@/lib/tradingApi'

interface DashboardRecentActivityProps {
  trades: Trade[]
}

const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({ trades }) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const tradesPerPage = 5

  const handleDelete = async (tradeId: string) => {
    try {
      setLoading(true)
      await deleteTrade(tradeId)
      // After successful delete, close the confirmation dialog
      setDeleteConfirm(null)
      // You would typically refresh the trades list here
      // This could be done via a callback prop or a context update
    } catch (error) {
      console.error('Error deleting trade:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const displayTrades = trades.slice(0, page * tradesPerPage)
  const hasMoreTrades = trades.length > page * tradesPerPage

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <Link 
          href="/trades/new"
          className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus size={16} />
          <span>Add Trade</span>
        </Link>
      </div>
      
      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 mb-4 bg-indigo-500/10 rounded-full flex items-center justify-center">
            <Plus size={24} className="text-indigo-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No trades yet</h4>
          <p className="text-gray-400 mb-4 max-w-sm">Start tracking your trades to see performance insights and improve your strategy.</p>
          <Link 
            href="/trades/new"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-500 hover:to-blue-500 transition-all"
          >
            Add Your First Trade
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {displayTrades.map((trade) => (
              <div 
                key={trade.id} 
                className="relative bg-[#1a1e2d] rounded-lg p-4 transition-all duration-200 hover:bg-[#20253a]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      trade.type === 'Long' 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      <span className="text-lg font-bold">
                        {trade.type === 'Long' ? '↗' : '↘'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{trade.symbol}</div>
                      <div className="text-sm text-gray-400">
                        {formatDistanceToNow(new Date(trade.entry_time), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`font-medium ${
                        trade.profit_loss > 0 
                          ? 'text-green-400' 
                          : trade.profit_loss < 0 
                            ? 'text-red-400' 
                            : 'text-gray-400'
                      }`}>
                        {trade.profit_loss > 0 ? '+' : ''}{trade.profit_loss != null ? trade.profit_loss.toFixed(2) : '--'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {((trade.exit_price - trade.entry_price) / trade.entry_price * 100).toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Edit button */}
                      <Link href={`/trades/${trade.id}/edit`}>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                      </Link>
                      
                      {/* Delete button */}
                      <button 
                        onClick={() => setDeleteConfirm(trade.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Trade details section */}
                <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                  <div className="text-gray-400">
                    Entry: <span className="text-white">${trade.entry_price != null ? trade.entry_price.toFixed(2) : '--'}</span>
                  </div>
                  <div className="text-gray-400">
                    Exit: <span className="text-white">${trade.exit_price != null ? trade.exit_price.toFixed(2) : '--'}</span>
                  </div>
                  {trade.tags && trade.tags.length > 0 && (
                    <div className="col-span-2 mt-2 flex flex-wrap gap-1">
                      {trade.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs rounded-full bg-indigo-500/10 text-indigo-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Delete confirmation */}
                <AnimatePresence>
                  {deleteConfirm === trade.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute inset-0 bg-[#1e2235]/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-4 z-10"
                    >
                      <div className="text-center">
                        <h4 className="text-white font-medium mb-2">Delete this trade?</h4>
                        <p className="text-gray-400 text-sm mb-4">This action cannot be undone.</p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(trade.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2"
                            disabled={loading}
                          >
                            {loading && (
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          
          {/* Load more button */}
          {hasMoreTrades && (
            <button
              onClick={() => setPage(page + 1)}
              className="w-full mt-4 py-2 text-center text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1"
            >
              <span>Load more</span>
              <ChevronRight size={16} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default DashboardRecentActivity 
