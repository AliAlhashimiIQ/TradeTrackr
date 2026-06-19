'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Trade, TradingAccount } from '@/lib/types'
import { getAllTrades, getPagedTrades, deleteTrade, addTrade, updateTrade, getFilteredTradeMetrics, getTradingAccounts, getUserTags, updateTag, deleteTag } from '@/lib/tradingApi'
import { uploadTradeScreenshot, supabase } from '@/lib/supabaseClient'
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import Link from 'next/link'
import { calculatePerformanceMetrics } from '@/lib/tradeMetrics'
import TradeDetail from '@/components/trades/TradeDetail'
import TagModal from '@/components/trades/TagModal'
import ExportModal from '@/components/trades/ExportModal'
import TradeAIChatBox from '@/components/trades/TradeAIChatBox'
import { motion, AnimatePresence } from 'framer-motion'
import { isForexPair, formatLots, formatPips } from '@/lib/forexUtils'
import { TradesListSkeleton } from '@/components/ui/SkeletonLoader'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import { resolveTradingViewUrl, getTagStyle, TAG_COLORS } from '@/lib/utils'

type SavedView = 'all' | 'forex' | 'mistakes' | 'winners' | 'losers' | 'review'
type TableDensity = 'compact' | 'comfortable'

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  checkbox: 52,
  screenshot: 55,
  symbol: 110,
  side: 80,
  entry: 100,
  exit: 100,
  lots: 90,
  pips: 80,
  pnl: 110,
  percentGain: 90,
  commission: 95,
  netProfit: 110,
  date: 95,
  openTime: 140,
  closeTime: 140,
  holdTime: 90,
  stopLoss: 100,
  takeProfit: 100,
  account: 110,
  mindset: 120,
  tags: 180,
  mistakes: 180,
  notes: 240,
  actions: 100,
}

const MIN_COLUMN_WIDTHS: Record<string, number> = {
  checkbox: 40,
  screenshot: 45,
  symbol: 80,
  side: 70,
  entry: 80,
  exit: 80,
  lots: 75,
  pips: 60,
  pnl: 85,
  percentGain: 80,
  commission: 80,
  netProfit: 85,
  date: 75,
  openTime: 100,
  closeTime: 100,
  holdTime: 75,
  stopLoss: 80,
  takeProfit: 80,
  account: 80,
  mindset: 95,
  tags: 120,
  mistakes: 120,
  notes: 150,
  actions: 80,
}


const EMOTIONS = [
  { value: 'confident', label: 'Confident', bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  { value: 'calm', label: 'Calm', bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  { value: 'neutral', label: 'Neutral', bg: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' },
  { value: 'anxious', label: 'Anxious', bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  { value: 'fomo', label: 'FOMO', bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  { value: 'revenge', label: 'Revenge', bg: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  { value: 'fear', label: 'Fear', bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  { value: 'greed', label: 'Greed', bg: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
]

type ReviewReason = 'fomo' | 'oversized' | 'no-plan' | 'large-loss'

const getTradeReviewReasons = (trade: Trade): ReviewReason[] => {
  const reasons: ReviewReason[] = []
  const tags = (trade.tags || []).map(t => t.toLowerCase())
  const mistakes = (trade.mistakes || []).map(m => m.toLowerCase())
  const notes = (trade.notes || '').toLowerCase()

  const hasFomo = tags.includes('fomo') || mistakes.some(m => m.includes('fomo')) || notes.includes('fomo')
  // Avoid over-flagging "No Plan": require explicit signal or low-context trade.
  const hasNoPlan = mistakes.some(m => m.includes('no plan')) || (!tags.includes('plan') && !notes.includes('plan') && (trade.notes || '').trim().length === 0)
  const hasOversized = mistakes.some(m => m.includes('too large')) || mistakes.some(m => m.includes('oversized'))
  const hasLargeLoss = (trade.profit_loss ?? 0) <= -100

  if (hasFomo) reasons.push('fomo')
  if (hasOversized) reasons.push('oversized')
  if (hasNoPlan) reasons.push('no-plan')
  if (hasLargeLoss) reasons.push('large-loss')

  return reasons
}

const getTradeQualityScore = (trade: Trade): number => {
  let score = 100
  const reasons = getTradeReviewReasons(trade)
  if (reasons.includes('fomo')) score -= 30
  if (reasons.includes('oversized')) score -= 25
  if (reasons.includes('no-plan')) score -= 20
  if (reasons.includes('large-loss')) score -= 15
  if ((trade.tags || []).length === 0) score -= 10
  if (!(trade.notes || '').trim()) score -= 8
  return Math.max(0, score)
}

const getQualityBadge = (score: number): { label: string; className: string } => {
  if (score >= 85) return { label: 'A', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' }
  if (score >= 70) return { label: 'B', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' }
  if (score >= 55) return { label: 'C', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' }
  return { label: 'D', className: 'bg-red-500/10 text-red-400 border border-red-500/20' }
}

const getQualityTone = (score: number): string => {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-blue-400'
  if (score >= 55) return 'text-amber-400'
  return 'text-red-400'
}

const getQualityBreakdown = (trade: Trade): string => {
  const reasons = getTradeReviewReasons(trade)
  const penalties: Record<ReviewReason, string> = {
    'fomo': '-30 FOMO',
    'oversized': '-25 Oversized',
    'no-plan': '-20 No Plan',
    'large-loss': '-15 Large Loss'
  }
  const rows = reasons.map(reason => penalties[reason])
  if ((trade.tags || []).length === 0) rows.push('-10 No Tags')
  if (!(trade.notes || '').trim()) rows.push('-8 No Notes')
  return rows.length ? `Quality penalties: ${rows.join(', ')}` : 'No quality penalties'
}

const getReviewReasonLabel = (reason: ReviewReason): string => {
  if (reason === 'fomo') return 'FOMO'
  if (reason === 'oversized') return 'Oversized'
  if (reason === 'no-plan') return 'No Plan'
  return 'Large Loss'
}

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

interface ParsedMetadata {
  notes: string;
  stop_loss?: number;
  take_profit?: number;
  commission?: number;
  swap?: number;
}

// Legacy note metadata parser and serializer removed. Stop Loss, Take Profit, Commission, and Swap are now first-class database columns in public.trades.

interface TagPopoverContentProps {
  trade: Trade;
  isMistake: boolean;
  onClose: () => void;
  onToggleTag: (trade: Trade, tag: string, isMistake: boolean) => void;
  presetsList: string[];
  onDeleteTagGlobally: (tag: string, isMistake: boolean) => void;
  renderUp?: boolean;
  userTagsConfig: any[];
  fetchUserTags: () => Promise<void>;
  user: any;
  onRenameTagGlobally: (oldName: string, newName: string, isMistake: boolean) => Promise<void>;
  onUpdateTagColor: (tag: string, color: string, isMistake: boolean) => Promise<void>;
}

const TagPopoverContent = ({
  trade,
  isMistake,
  onClose,
  onToggleTag,
  presetsList,
  onDeleteTagGlobally,
  renderUp = false,
  userTagsConfig,
  fetchUserTags,
  user,
  onRenameTagGlobally,
  onUpdateTagColor,
}: TagPopoverContentProps) => {
  const [searchTag, setSearchTag] = useState('')
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [newTagNameInput, setNewTagNameInput] = useState('');
  
  // Notion-style tag editing states
  const [editingTag, setEditingTag] = useState<{ id?: string; name: string; color?: string } | null>(null);
  const [tagBeingEdited, setTagBeingEdited] = useState<string>('');

  const currentList = isMistake ? (trade.mistakes || []) : (trade.tags || []);

  const handleUpdateColor = async (colorHex: string) => {
    if (!editingTag) return;
    await onUpdateTagColor(tagBeingEdited, colorHex, isMistake);
    setEditingTag(prev => prev ? { ...prev, color: colorHex } : null);
  };

  const handleRenameTag = async () => {
    if (!editingTag) return;
    const newName = editingTag.name.trim();
    if (!newName || newName === tagBeingEdited) return;
    await onRenameTagGlobally(tagBeingEdited, newName, isMistake);
    setEditingTag(null);
  };

  const handleDeleteTag = async () => {
    if (!editingTag) return;
    await onDeleteTagGlobally(tagBeingEdited, isMistake);
    setEditingTag(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: renderUp ? -6 : 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: renderUp ? -6 : 6, scale: 0.95 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`popover-container absolute left-0 z-40 rounded-2xl p-4 text-left ${
        renderUp ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
      }`}
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTopColor: 'rgba(255,255,255,0.12)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.6), 0 4px 16px -4px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        width: '280px',
      }}
    >
      {editingTag ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="text-left"
        >
          {/* Header with Back button */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setEditingTag(null)}
              className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
              title="Back"
            >
              ← Back
            </button>
            <span className="text-xs font-bold text-gray-200">Edit {isMistake ? 'Mistake' : 'Tag'}</span>
          </div>

          {/* Rename Input */}
          <div className="mb-4">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] block mb-1">Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editingTag.name}
                onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                className="flex-1 px-2.5 py-1.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                placeholder="Tag name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleRenameTag}
                className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 text-xs rounded-lg transition-colors font-medium border border-indigo-500/30"
              >
                Save
              </button>
            </div>
          </div>

          {/* Color Palette Choice */}
          <div className="mb-4">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] block mb-2">Color</label>
            <div className="grid grid-cols-5 gap-2">
              {TAG_COLORS.map(colorPreset => {
                const isSelected = editingTag.color?.toLowerCase() === colorPreset.hex.toLowerCase() || editingTag.color?.toLowerCase() === colorPreset.name.toLowerCase();
                return (
                  <button
                    key={colorPreset.name}
                    type="button"
                    onClick={() => handleUpdateColor(colorPreset.hex)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95`}
                    style={{
                      backgroundColor: colorPreset.bg,
                      borderColor: isSelected ? '#ffffff' : colorPreset.border,
                      boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    }}
                    title={colorPreset.name}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colorPreset.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06] my-3" />

          {/* Delete tag globally */}
          <button
            type="button"
            onClick={handleDeleteTag}
            className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs rounded-lg border border-red-500/20 transition-all font-medium flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Globally
          </button>
        </motion.div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-200">{isMistake ? 'Mistakes' : 'Tags'}</span>
            <button 
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all active:scale-95"
              title="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Tags */}
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-2">Current {isMistake ? 'Mistakes' : 'Tags'}</div>
          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
            {currentList.map((tag) => {
              const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
              const style = getTagStyle(tc?.color, isMistake);
              return (
                <span
                  key={tag}
                  style={style}
                  className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onToggleTag(trade, tag, isMistake)}
                    className="hover:opacity-80 text-[10px] font-bold transition-opacity"
                  >
                    ✕
                  </button>
                </span>
              );
            })}

            {isAddingCustomTag ? (
              <input
                type="text"
                placeholder="New tag..."
                value={newTagNameInput}
                onChange={e => setNewTagNameInput(e.target.value)}
                onBlur={() => {
                  if (!newTagNameInput.trim()) setIsAddingCustomTag(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTagNameInput.trim()) {
                      onToggleTag(trade, newTagNameInput.trim(), isMistake);
                      setNewTagNameInput('');
                      setIsAddingCustomTag(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsAddingCustomTag(false);
                  }
                }}
                className="px-2.5 py-1 bg-[#0d0e16] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-indigo-500/50 w-24 placeholder-gray-700 font-sans"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingCustomTag(true)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white border border-dashed border-white/[0.1] transition-all flex items-center gap-1"
              >
                <span>+ Create Tag</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06] my-2.5" />

          {/* Select a Tag */}
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-2">Select a {isMistake ? 'Mistake' : 'Tag'}</div>
          <input
            type="text"
            placeholder={`Search ${isMistake ? 'mistakes' : 'tags'}...`}
            value={searchTag}
            onChange={e => setSearchTag(e.target.value)}
            className="w-full px-2.5 py-1.5 mb-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />

          <div className="max-h-[160px] overflow-y-auto space-y-1 scrollbar-thin pr-1">
            {presetsList
              .filter(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))
              .map(tag => {
                const isSelected = currentList.includes(tag);
                const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
                const style = getTagStyle(tc?.color, isMistake);
                return (
                  <div
                    key={tag}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors group/item cursor-pointer"
                    onClick={() => onToggleTag(trade, tag, isMistake)}
                  >
                    <span style={style} className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium`}>
                      {tag}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSelected && <span className="text-indigo-400 font-bold text-xs">✓</span>}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const tagConfig = userTagsConfig.find(tc => tc.name.toLowerCase() === tag.toLowerCase());
                          setTagBeingEdited(tag);
                          setEditingTag({
                            id: tagConfig?.id,
                            name: tag,
                            color: tagConfig?.color || (isMistake ? '#ef4444' : '#6366f1')
                          });
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"
                        title="Edit tag"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            
            {searchTag.trim() && !presetsList.some(t => t.toLowerCase() === searchTag.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => {
                  onToggleTag(trade, searchTag.trim(), isMistake);
                  setSearchTag('');
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 font-semibold transition-colors"
              >
                + Create "{searchTag.trim()}"
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
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
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [userAccounts, setUserAccounts] = useState<TradingAccount[]>([])
  const [sortField, setSortField] = useState<keyof Trade>('entry_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.pageSize')
      if (saved) {
        const parsed = Number(saved)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
    }
    return 10
  })
  const [totalPages, setTotalPages] = useState(1)
  const [quickMetrics, setQuickMetrics] = useState({ winRate: 0, profitFactor: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, tradesPerWeek: 0 })
  const [showTagModal, setShowTagModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null)
  const [screenshotEditTrade, setScreenshotEditTrade] = useState<Trade | null>(null)
  const [screenshotEditTab, setScreenshotEditTab] = useState<'upload' | 'embed'>('upload')
  const [screenshotEditEmbedUrl, setScreenshotEditEmbedUrl] = useState('')
  const [userTagsConfig, setUserTagsConfig] = useState<any[]>([])
  const [activeView, setActiveView] = useState<SavedView>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.activeView')
      if (saved) return saved as SavedView
    }
    return 'all'
  })
  const [showIntelligence, setShowIntelligence] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.showIntelligence')
      if (saved !== null) return saved === 'true'
    }
    return false
  })
  const [tableDensity, setTableDensity] = useState<TableDensity>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.tableDensity')
      if (saved) return saved as TableDensity
    }
    return 'comfortable'
  })
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.visibleColumns')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {}
      }
    }
    return {
      side: true,
      entry: true,
      exit: true,
      lots: true,
      pips: true,
      pnl: true,
      date: true,
      mindset: true,
      tags: true,
      mistakes: true,
      notes: true,
      openTime: false,
      closeTime: false,
      commission: false,
      netProfit: false,
      percentGain: false,
      holdTime: false,
      stopLoss: false,
      takeProfit: false,
      account: false,
    }
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.columnWidths')
      if (saved) {
        try {
          return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) }
        } catch {}
      }
    }
    return DEFAULT_COLUMN_WIDTHS
  })

  const [wrapTags, setWrapTags] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.wrapTags')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('trades.columnWidths', JSON.stringify(columnWidths))
    }
  }, [columnWidths])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('trades.wrapTags', String(wrapTags))
    }
  }, [wrapTags])

  // Mouse drag-to-resize columns
  const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey]

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const minW = MIN_COLUMN_WIDTHS[colKey] || 50
      const newWidth = Math.max(minW, startWidth + deltaX)
      setColumnWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const resetColumnWidth = (colKey: string) => {
    setColumnWidths(prev => ({
      ...prev,
      [colKey]: DEFAULT_COLUMN_WIDTHS[colKey]
    }))
  }

  const renderResizeHandle = (colKey: string) => {
    return (
      <div
        onMouseDown={(e) => handleMouseDown(e, colKey)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          resetColumnWidth(colKey);
        }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/80 active:bg-indigo-500 z-20 group-hover/header:bg-white/[0.08] transition-colors"
        title="Drag to resize, double-click to reset"
      />
    );
  }

  // Notion-Style Inline Editing States
  const [activePopover, setActivePopover] = useState<{ tradeId: string; type: 'tags' | 'mistakes' | 'note-preview' | 'mindset' } | null>(null)

  // Close active popovers when clicking outside popover-container and popover-trigger
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // If the target element is no longer in the document, it was probably deleted/detached
      if (!document.body.contains(target)) {
        return;
      }
      if (target.closest('.popover-container') || target.closest('.popover-trigger')) {
        return;
      }
      setActivePopover(null);
      setShowColumnMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [inlineNewRowIndex, setInlineNewRowIndex] = useState<number | null>(null)
  const [inlineRowData, setInlineRowData] = useState<Partial<Trade> | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [uploadingTradeId, setUploadingTradeId] = useState<string | null>(null)

  const totals = useMemo(() => {
    if (filteredTrades.length === 0) return null;
    
    let totalPnL = 0;
    let totalLots = 0;
    let totalPips = 0;
    let forexCount = 0;
    let totalPctGain = 0;
    let totalCommission = 0;
    let totalHoldTimeMs = 0;
    let holdTimeCount = 0;
    
    filteredTrades.forEach(t => {
      totalPnL += (t.profit_loss ?? 0);
      totalLots += (t.lots !== undefined && t.lots !== null ? Number(t.lots) : Number(t.quantity || 0));
      
      if (isForexPair(t.symbol) && t.pips !== undefined && t.pips !== null) {
        totalPips += Number(t.pips);
        forexCount++;
      }
      
      if (t.entry_price && t.quantity) {
        totalPctGain += ((t.profit_loss ?? 0) / (t.entry_price * t.quantity)) * 100;
      }
      
      totalCommission += Number((t as any).commission ?? 0);
      
      if (t.entry_time && t.exit_time) {
        totalHoldTimeMs += (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime());
        holdTimeCount++;
      }
    });
    
    const avgPips = forexCount > 0 ? totalPips / forexCount : 0;
    const avgPctGain = filteredTrades.length > 0 ? totalPctGain / filteredTrades.length : 0;
    
    let avgHoldTimeStr = '--';
    if (holdTimeCount > 0) {
      const avgMins = Math.round((totalHoldTimeMs / holdTimeCount) / 60000);
      avgHoldTimeStr = avgMins >= 60 ? `${Math.floor(avgMins / 60)}h ${avgMins % 60}m` : `${avgMins}m`;
    }
    
    return {
      totalPnL,
      totalLots,
      avgPips,
      avgPctGain,
      totalCommission,
      totalNetProfit: totalPnL - totalCommission,
      avgHoldTimeStr,
    };
  }, [filteredTrades]);

  const renderTotalsRow = () => {
    if (!totals) return null;
    return (
      <div
        className="grid gap-2 px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-[#0d0e16]/95 border-t border-b border-white/[0.06] sticky bottom-0 z-10 backdrop-blur-md items-center min-w-full"
        style={{ gridTemplateColumns: getGridTemplateColumns() }}
      >
        {/* Checkbox Col */}
        <div />

        {/* Screenshot Col */}
        <div />

        {/* Symbol Col */}
        <div className="font-bold text-white text-[10px]">TOTALS ({filteredTrades.length})</div>

        {/* Side Col */}
        {visibleColumns.side && <div />}

        {/* Entry Price Col */}
        {visibleColumns.entry && <div />}

        {/* Exit Price Col */}
        {visibleColumns.exit && <div />}

        {/* Lots Col */}
        {visibleColumns.lots && (
          <div className="text-right font-mono text-gray-300 tabular-nums">
            {formatLots(totals.totalLots)}
          </div>
        )}

        {/* Pips Col */}
        {visibleColumns.pips && (
          <div className="text-right font-mono text-gray-300 tabular-nums">
            {totals.avgPips !== 0 ? `${totals.avgPips.toFixed(1)} avg` : '--'}
          </div>
        )}

        {/* P&L Col */}
        {visibleColumns.pnl && (
          <div
            className="text-right font-bold tabular-nums"
            style={{
              color: totals.totalPnL > 0 ? '#34d399' : totals.totalPnL < 0 ? '#f87171' : '#9ca3af',
              textShadow: totals.totalPnL !== 0 ? `0 0 10px ${totals.totalPnL > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)'}` : 'none'
            }}
          >
            {totals.totalPnL > 0 ? '+' : ''}{formatCurrency(totals.totalPnL)}
          </div>
        )}

        {/* % Gain Col */}
        {visibleColumns.percentGain && (
          <div
            className="text-right font-mono tabular-nums"
            style={{ color: totals.avgPctGain > 0 ? '#34d399' : totals.avgPctGain < 0 ? '#f87171' : '#9ca3af' }}
          >
            {totals.avgPctGain !== 0 ? `${totals.avgPctGain.toFixed(2)}% avg` : '--'}
          </div>
        )}

        {/* Commission Col */}
        {visibleColumns.commission && (
          <div className="text-right font-mono text-gray-400 tabular-nums">
            {formatCurrency(totals.totalCommission)}
          </div>
        )}

        {/* Net Profit Col */}
        {visibleColumns.netProfit && (
          <div
            className="text-right font-mono font-bold tabular-nums"
            style={{
              color: totals.totalNetProfit > 0 ? '#34d399' : totals.totalNetProfit < 0 ? '#f87171' : '#9ca3af',
              textShadow: totals.totalNetProfit !== 0 ? `0 0 10px ${totals.totalNetProfit > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)'}` : 'none'
            }}
          >
            {totals.totalNetProfit > 0 ? '+' : ''}{formatCurrency(totals.totalNetProfit)}
          </div>
        )}

        {/* Date Col */}
        {visibleColumns.date && <div />}

        {/* Open Time Col */}
        {visibleColumns.openTime && <div />}

        {/* Close Time Col */}
        {visibleColumns.closeTime && <div />}

        {/* Hold Time Col */}
        {visibleColumns.holdTime && (
          <div className="text-right font-mono text-gray-300 tabular-nums">
            {totals.avgHoldTimeStr}
          </div>
        )}

        {/* Stop Loss Col */}
        {visibleColumns.stopLoss && <div />}

        {/* Take Profit Col */}
        {visibleColumns.takeProfit && <div />}

        {/* Account Col */}
        {visibleColumns.account && <div />}

        {/* Mindset Col */}
        {visibleColumns.mindset && <div />}

        {/* Strategy Tags Col */}
        {visibleColumns.tags && <div />}

        {/* Mistake Tags Col */}
        {visibleColumns.mistakes && <div />}

        {/* Learnings Col */}
        {visibleColumns.notes && <div />}

        {/* Actions Col */}
        <div />
      </div>
    );
  };

  const [deletedPresets, setDeletedPresets] = useState<string[]>([]);
  const [deletedMistakePresets, setDeletedMistakePresets] = useState<string[]>([]);
  const [notesModalTrade, setNotesModalTrade] = useState<Trade | null>(null);
  const [notesModalText, setNotesModalText] = useState('');

  const handleDeleteTagGlobally = async (tag: string, isMistake = false) => {
    if (!window.confirm(`Delete tag "${tag}" globally?`)) return;
    
    // Update local presets filter state
    if (isMistake) {
      setDeletedMistakePresets(prev => [...prev, tag]);
    } else {
      setDeletedPresets(prev => [...prev, tag]);
    }

    // Update local trades list to remove this tag
    const updated = trades.map(t => {
      const current = isMistake ? (t.mistakes || []) : (t.tags || []);
      const next = current.filter(x => x !== tag);
      return { ...t, [isMistake ? 'mistakes' : 'tags']: next };
    });
    setTrades(updated);

    try {
      if (user) {
        await supabase
          .from('tags')
          .delete()
          .eq('user_id', user.id)
          .eq('name', tag);
          
        if (isMistake) {
          const { data, error } = await supabase
            .from('trades')
            .select('id, mistakes')
            .eq('user_id', user.id)
            .contains('mistakes', [tag]);
          if (!error && data) {
            for (const tradeRow of data) {
              const updatedMistakes = (tradeRow.mistakes || []).filter((m: string) => m !== tag);
              await supabase
                .from('trades')
                .update({ mistakes: updatedMistakes })
                .eq('id', tradeRow.id);
            }
          }
        }
      }
      toast.success(`Tag "${tag}" deleted globally`);
      await fetchUserTags();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete tag');
    }
  };

  const handleUpdateTagColor = async (tag: string, colorHex: string, isMistake = false) => {
    if (!user) return;
    try {
      const existing = userTagsConfig.find(tc => tc.name.toLowerCase() === tag.toLowerCase());
      if (existing) {
        const success = await updateTag(existing.id, { color: colorHex });
        if (!success) throw new Error('Failed to update tag');
      } else {
        await supabase
          .from('tags')
          .insert({
            name: tag,
            user_id: user.id,
            color: colorHex
          });
      }
      await fetchUserTags();
      toast.success('Color updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update color');
    }
  };

  const handleRenameTagGlobally = async (oldName: string, newName: string, isMistake = false) => {
    if (!user) return;
    try {
      const existing = userTagsConfig.find(tc => tc.name.toLowerCase() === oldName.toLowerCase());
      if (existing) {
        const success = await updateTag(existing.id, { name: newName });
        if (!success) throw new Error('Failed to rename tag');
      } else {
        await supabase
          .from('tags')
          .insert({
            name: newName,
            user_id: user.id,
            color: isMistake ? '#ef4444' : '#6366f1'
          });
      }

      // Update local state
      const updated = trades.map(t => {
        const current = isMistake ? (t.mistakes || []) : (t.tags || []);
        if (current.includes(oldName)) {
          const next = current.map(x => x === oldName ? newName : x);
          return { ...t, [isMistake ? 'mistakes' : 'tags']: next };
        }
        return t;
      });
      setTrades(updated);

      if (isMistake) {
        const { data, error } = await supabase
          .from('trades')
          .select('id, mistakes')
          .eq('user_id', user.id)
          .contains('mistakes', [oldName]);
        if (!error && data) {
          for (const tradeRow of data) {
            const updatedMistakes = (tradeRow.mistakes || []).map((m: string) => m === oldName ? newName : m);
            await supabase
              .from('trades')
              .update({ mistakes: updatedMistakes })
              .eq('id', tradeRow.id);
          }
        }
      }

      await fetchUserTags();
      toast.success(`Tag renamed to "${newName}"`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to rename tag');
    }
  };

  const renderTagsPopover = (trade: Trade, isMistake: boolean, renderUp = false) => {
    if (!trade) return null;
    return (
      <TagPopoverContent
        trade={trade}
        isMistake={isMistake}
        onClose={() => setActivePopover(null)}
        onToggleTag={handleToggleTag}
        presetsList={isMistake ? allExistingMistakes : allExistingTags}
        onDeleteTagGlobally={handleDeleteTagGlobally}
        renderUp={renderUp}
        userTagsConfig={userTagsConfig}
        fetchUserTags={fetchUserTags}
        user={user}
        onRenameTagGlobally={handleRenameTagGlobally}
        onUpdateTagColor={handleUpdateTagColor}
      />
    );
  };

  const getGridTemplateColumns = () => {
    const getWidth = (key: string, def: string) => {
      const w = columnWidths[key];
      return w ? `${w}px` : def;
    };
    const cols = [
      getWidth('checkbox', '52px'),  // Checkbox/actions col
      getWidth('screenshot', '55px'),  // Screenshot
      getWidth('symbol', '110px'), // Symbol
      visibleColumns.side ? getWidth('side', '80px') : '',
      visibleColumns.entry ? getWidth('entry', '100px') : '',
      visibleColumns.exit ? getWidth('exit', '100px') : '',
      visibleColumns.lots ? getWidth('lots', '90px') : '',
      visibleColumns.pips ? getWidth('pips', '80px') : '',
      visibleColumns.pnl ? getWidth('pnl', '110px') : '',
      visibleColumns.percentGain ? getWidth('percentGain', '90px') : '',
      visibleColumns.commission ? getWidth('commission', '95px') : '',
      visibleColumns.netProfit ? getWidth('netProfit', '110px') : '',
      visibleColumns.date ? getWidth('date', '95px') : '',
      visibleColumns.openTime ? getWidth('openTime', '140px') : '',
      visibleColumns.closeTime ? getWidth('closeTime', '140px') : '',
      visibleColumns.holdTime ? getWidth('holdTime', '90px') : '',
      visibleColumns.stopLoss ? getWidth('stopLoss', '100px') : '',
      visibleColumns.takeProfit ? getWidth('takeProfit', '100px') : '',
      visibleColumns.account ? getWidth('account', '110px') : '',
      visibleColumns.mindset ? getWidth('mindset', '120px') : '',
      visibleColumns.tags ? getWidth('tags', '180px') : '',
      visibleColumns.mistakes ? getWidth('mistakes', '180px') : '',
      visibleColumns.notes ? getWidth('notes', '240px') : '',
      getWidth('actions', '100px'), // Actions
    ];
    return cols.filter(Boolean).join(' ');
  };



  const handleToggleTag = async (trade: Trade, tag: string, isMistake = false) => {
    if (trade.id === 'new-row') {
      const current = isMistake ? (inlineRowData?.mistakes || []) : (inlineRowData?.tags || []);
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      setInlineRowData(prev => prev ? { ...prev, [isMistake ? 'mistakes' : 'tags']: next } : null);
      return;
    }

    const current = isMistake ? (trade.mistakes || []) : (trade.tags || []);
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    
    // Snappy local UI update
    const updated = trades.map(t => t.id === trade.id ? { ...t, [isMistake ? 'mistakes' : 'tags']: next } : t);
    setTrades(updated);
    
    try {
      await updateTrade({
        ...trade,
        [isMistake ? 'mistakes' : 'tags']: next
      });
      toast.success(isMistake ? 'Mistake tag updated' : 'Strategy tag updated');
      
      // If we added a tag that doesn't exist in userTagsConfig, refetch config
      if (!isMistake && !userTagsConfig.some(t => t.name.toLowerCase() === tag.toLowerCase())) {
        fetchUserTags();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update tags');
    }
  };

  const handleSaveNote = async (trade: Trade) => {
    setEditingNoteId(null);
    if (noteText.trim() === (trade.notes || '').trim()) return;
    
    const updated = trades.map(t => t.id === trade.id ? { ...t, notes: noteText } : t);
    setTrades(updated);
    
    try {
      await updateTrade({ ...trade, notes: noteText });
      toast.success('Notes saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save notes');
    }
  };

  const handleUploadScreenshot = async (trade: Trade, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingTradeId(trade.id);
    try {
      const url = await uploadTradeScreenshot(file, user?.id || '', trade.id);
      if (url) {
        const updated = trades.map(t => t.id === trade.id ? { ...t, screenshot_url: url } : t);
        setTrades(updated);
        await updateTrade({ ...trade, screenshot_url: url });
        toast.success('Screenshot uploaded successfully!');
      } else {
        toast.error('Upload failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload screenshot');
    } finally {
      setUploadingTradeId(null);
    }
  };

  const handleUpdateScreenshot = async (trade: Trade, url: string) => {
    const updated = trades.map(t => t.id === trade.id ? { ...t, screenshot_url: url } : t);
    setTrades(updated);
    try {
      await updateTrade({ ...trade, screenshot_url: url });
      toast.success('Screenshot updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update screenshot');
    }
  };

  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    ['Breakout', 'Reversal', 'Trend', 'Scalp', 'Swing', 'News', 'Supply/Demand', 'Prop Firm', 'Sniper Entry'].forEach(tag => set.add(tag));
    return Array.from(set).filter(t => !deletedPresets.includes(t));
  }, [trades, deletedPresets]);

  const allExistingMistakes = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => (t.mistakes || []).forEach(m => set.add(m)));
    ['FOMO Entry', 'Revenge Trade', 'Moved Stop Loss', 'Too Large Size', 'Early Exit', 'Late Entry', 'No Plan', 'Overtrading', 'Held Through News'].forEach(m => set.add(m));
    return Array.from(set).filter(m => !deletedMistakePresets.includes(m));
  }, [trades, deletedMistakePresets]);


  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.activeView', activeView)
  }, [activeView])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.tableDensity', tableDensity)
  }, [tableDensity])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.showIntelligence', String(showIntelligence))
  }, [showIntelligence])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.visibleColumns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.pageSize', String(pageSize))
  }, [pageSize])

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading, router])

  const fetchUserTags = useCallback(async () => {
    if (!user?.id) return;
    try {
      const tags = await getUserTags(user.id);
      setUserTagsConfig(tags);
    } catch (err) {
      console.error('Error fetching user tags:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      getTradingAccounts(user.id).then(setUserAccounts)
      fetchUserTags();
    }
  }, [user?.id, fetchUserTags])

  // ── Server-side paginated fetch (6.1 / 6.2) ──────────────────────────────
  // Fetches only one page of trades from Supabase at a time.
  // Runs whenever filters, sort, or page changes.
  const fetchPagedTrades = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { trades: page, total } = await getPagedTrades({
        userId: user.id,
        page: currentPage,
        pageSize,
        search: searchTerm || undefined,
        symbol: symbolFilter || undefined,
        type: typeFilter,
        dateFilter,
        sortField: String(sortField),
        sortDirection,
        accountId: accountFilter || undefined,
      });
      const enrichedPage = page.map(t => {
        return {
          ...t,
          notes: t.notes ? t.notes.replace(/\[SL=([\d.-]+)?;TP=([\d.-]+)?;Comm=([\d.-]+)?;Swap=([\d.-]+)?\]/, '').trim() : '',
          stop_loss: t.stop_loss ?? undefined,
          take_profit: t.take_profit ?? undefined,
          commission: t.commission ?? undefined,
          swap: t.swap ?? undefined,
        };
      });
      setTrades(enrichedPage);          // current page only
      setFilteredTrades(enrichedPage);  // same slice — view filters applied below
      setTotalPages(Math.ceil(total / pageSize));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [user?.id, currentPage, pageSize, searchTerm, symbolFilter, typeFilter, dateFilter, sortField, sortDirection, accountFilter]);

  // ── Fetch global metrics for the current filter set ──────────────────────
  const fetchGlobalMetrics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fullTrades = await getFilteredTradeMetrics({
        userId: user.id,
        search: searchTerm || undefined,
        symbol: symbolFilter || undefined,
        type: typeFilter,
        dateFilter,
        accountId: accountFilter || undefined,
      });
      
      let result = [...fullTrades];
      // Apply activeView-only client filter to the global metrics as well
      if (activeView === 'forex') result = result.filter(t => isForexPair(t.symbol));
      if (activeView === 'mistakes') result = result.filter(t => (t.mistakes?.length || 0) > 0);
      if (activeView === 'winners') result = result.filter(t => (t.profit_loss ?? 0) > 0);
      if (activeView === 'losers') result = result.filter(t => (t.profit_loss ?? 0) < 0);
      if (activeView === 'review') result = result.filter(t => getTradeReviewReasons(t).length > 0);

      if (result.length > 0) {
        const metrics = calculatePerformanceMetrics(result);
        setQuickMetrics({ 
          winRate: metrics.winRate, 
          profitFactor: metrics.profitFactor, 
          totalPnL: metrics.totalPnL, 
          avgWin: metrics.averageWin, 
          avgLoss: metrics.averageLoss, 
          tradesPerWeek: calculateTradesPerWeek(result) 
        });
      } else {
        setQuickMetrics({ winRate: 0, profitFactor: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, tradesPerWeek: 0 });
      }
    } catch (err) { console.error(err); }
  }, [user?.id, searchTerm, symbolFilter, typeFilter, dateFilter, activeView, accountFilter]);

  useEffect(() => { if (user?.id) fetchPagedTrades(); }, [fetchPagedTrades, user?.id]);
  useEffect(() => { if (user?.id) fetchGlobalMetrics(); }, [fetchGlobalMetrics, user?.id]);
  
  // Apply activeView-only client filter on the already-fetched page (6.1)
  // All other filters are handled server-side by fetchPagedTrades.
  useEffect(() => {
    if (!trades.length) { setFilteredTrades([]); return; }
    let result = [...trades];
    if (activeView === 'forex') result = result.filter(t => isForexPair(t.symbol));
    if (activeView === 'mistakes') result = result.filter(t => (t.mistakes?.length || 0) > 0);
    if (activeView === 'winners') result = result.filter(t => (t.profit_loss ?? 0) > 0);
    if (activeView === 'losers') result = result.filter(t => (t.profit_loss ?? 0) < 0);
    if (activeView === 'review') result = result.filter(t => getTradeReviewReasons(t).length > 0);
    setFilteredTrades(result);
  }, [trades, activeView]);

  // ── 6.3 Memoized heavy derivations ───────────────────────────────────────
  const uniqueSymbols = useMemo(() => Array.from(new Set(trades.map(t => t.symbol))), [trades]);

  const accountsMap = useMemo(() => new Map(userAccounts.map(a => [a.id, a.name])), [userAccounts]);

  const reviewQueue = useMemo(() =>
    trades
      .map(trade => ({ trade, reasons: getTradeReviewReasons(trade), quality: getTradeQualityScore(trade) }))
      .filter(item => item.reasons.length > 0)
      .sort((a, b) => (a.quality - b.quality) || ((a.trade.profit_loss ?? 0) - (b.trade.profit_loss ?? 0)))
      .slice(0, 5),
    [trades]
  );

  const topMistakeCost = useMemo(() => {
    const mistakeCost = trades.reduce<Record<string, number>>((acc, trade) => {
      const pnl = trade.profit_loss ?? 0
      if (pnl >= 0 || !trade.mistakes?.length) return acc
      trade.mistakes.forEach(mistake => {
        acc[mistake] = (acc[mistake] || 0) + Math.abs(pnl)
      })
      return acc
    }, {});
    return Object.entries(mistakeCost).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [trades]);

  const handleDeleteTrade = async (tradeId: string) => {
    if (!window.confirm('Delete this trade?')) return;
    setIsDeleting(tradeId);
    try {
      await deleteTrade(tradeId);
      if (user) { const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d); }
      toast.success('Trade deleted successfully');
    } catch (e) { console.error(e); toast.error('Failed to delete trade'); } finally { setIsDeleting(null); }
  };

  const handleTradeFormSubmit = async (tradeData: Partial<Trade>) => {
    if (selectedTrade && tradeData.id) {
      const updated = trades.map(t => t.id === tradeData.id ? { ...t, ...tradeData } as Trade : t);
      setTrades(updated);
      if (user) { const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d); }
      setShowForm(false); setSelectedTrade(null);
      toast.success(selectedTrade ? 'Trade updated' : 'Trade saved');
    } else {
      if (!user) return;
      await addTrade({ ...tradeData, user_id: user.id } as Trade);
      const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d);
      setShowForm(false); setSelectedTrade(null);
      toast.success('Trade saved successfully');
    }
  };

  const handleStartInlineAdd = (index: number) => {
    setInlineNewRowIndex(index);
    setInlineRowData({
      symbol: '',
      type: 'Long',
      entry_price: 0,
      exit_price: 0,
      lots: 0.10,
      quantity: 10,
      profit_loss: 0,
      entry_time: new Date().toISOString(),
      exit_time: new Date().toISOString(),
      tags: [],
      mistakes: [],
      notes: '',
      emotional_state: 'neutral',
      stop_loss: undefined,
      take_profit: undefined,
      commission: undefined,
    });
  };

  const handleInlineChange = (field: keyof Trade, value: any) => {
    setInlineRowData(prev => {
      if (!prev) return null;
      const next = { ...prev, [field]: value };
      
      // Auto-calculate profit_loss & pips if entry_price, exit_price, lots/quantity, type, or symbol changes
      if (['entry_price', 'exit_price', 'quantity', 'type', 'lots', 'symbol'].includes(field as string)) {
        const entry = parseFloat(String(next.entry_price)) || 0;
        const exit = parseFloat(String(next.exit_price)) || 0;
        const lotsVal = parseFloat(String(next.lots)) || 0;
        const qtyVal = parseFloat(String(next.quantity)) || 0;
        const qty = lotsVal > 0 ? lotsVal : (qtyVal > 0 ? qtyVal : 1);
        const dir = next.type || 'Long';
        
        if (entry > 0 && exit > 0 && qty > 0) {
          let pnl = 0;
          if (isForexPair(next.symbol || '')) {
            const lotSize = 100000;
            pnl = (dir === 'Long' ? (exit - entry) : (entry - exit)) * lotSize * (lotsVal > 0 ? lotsVal : 0.1);
          } else {
            pnl = (dir === 'Long' ? (exit - entry) : (entry - exit)) * qty;
          }
          next.profit_loss = Math.round(pnl * 100) / 100;
        }

        if (entry > 0 && exit > 0 && isForexPair(next.symbol || '')) {
          const isJpy = (next.symbol || '').toUpperCase().includes('JPY');
          const pipMultiplier = isJpy ? 100 : 10000;
          const calculatedPips = (dir === 'Long' ? (exit - entry) : (entry - exit)) * pipMultiplier;
          next.pips = Math.round(calculatedPips * 10) / 10;
        }
      }
      return next;
    });
  };

  const handleInlineSave = async () => {
    if (!user) return;
    if (!inlineRowData?.symbol) {
      toast.error('Symbol is required');
      return;
    }
    
    setIsLoading(true);
    try {
      const newTrade = {
        ...inlineRowData,
        user_id: user.id,
      } as Trade;
      
      await addTrade(newTrade);
      toast.success('Trade saved inline successfully!');
      
      // Refresh list using the server-side pagination & filter settings
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      
      // Clear edit state
      setInlineNewRowIndex(null);
      setInlineRowData(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save trade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineCancel = () => {
    setInlineNewRowIndex(null);
    setInlineRowData(null);
  };

  const handleBulkAction = async (action: 'delete' | 'export' | 'tag') => {
    if (!selectedTradeIds.length) return;
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedTradeIds.length} trades?`)) return;
      setIsLoading(true);
      await Promise.all(selectedTradeIds.map(id => deleteTrade(id)));
      if (user) { const d = await getAllTrades(user.id); setTrades(d); setFilteredTrades(d); }
      setSelectedTradeIds([]); setIsLoading(false);
      toast.success(`${selectedTradeIds.length} trades deleted`);
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
    toast.success(`Exported ${selected.length} trades as ${format.toUpperCase()}`);
  };

  const handleAddTag = async (tag: string) => {
    setIsProcessing(true);
    try {
      const selectedTrades = trades.filter(t => selectedTradeIds.includes(t.id))
      await Promise.all(
        selectedTrades.map(trade => {
          const nextTags = Array.from(new Set([...(trade.tags || []), tag]))
          return updateTrade({ ...trade, tags: nextTags } as Trade)
        })
      )
      if (user) {
        const refreshed = await getAllTrades(user.id)
        setTrades(refreshed)
        setFilteredTrades(refreshed)
      }
      setSelectedTradeIds([])
      setShowTagModal(false)
      toast.success(`Tag "${tag}" added to ${selectedTrades.length} trades`)
    } catch (error) {
      console.error('Failed to persist tags:', error)
      toast.error('Failed to add tag')
    } finally {
      setIsProcessing(false)
    }
  };

  const handleSort = (field: keyof Trade) => {
    if (field === sortField) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const selectedTradesForAI = trades.filter(t => selectedTradeIds.includes(t.id));

  const renderInlineEditorRow = () => {
    if (!inlineRowData) return null;
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInlineSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleInlineCancel();
      }
    };

    return (
      <div
        className="grid gap-2 px-5 py-3.5 items-center relative z-10 animate-fade-in min-w-full"
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
          backgroundColor: '#0d0e16',
          backgroundImage: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 50%, rgba(99, 102, 241, 0.08) 100%)',
          borderTop: '1px solid rgba(99, 102, 241, 0.25)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.8), 0 0 16px rgba(99, 102, 241, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Actions Col 1 (indicator/status) */}
        <div className="flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_12px_#818cf8]" title="Draft Trade" />
        </div>

        {/* Screenshot */}
        <div className="flex items-center justify-center">
          <div className="w-11 h-8 rounded border border-dashed border-white/[0.15] bg-white/[0.02] flex items-center justify-center text-gray-500" title="Screenshot (upload after saving)">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        </div>

        {/* Symbol */}
        <div>
          <input
            type="text"
            value={inlineRowData.symbol || ''}
            onChange={e => handleInlineChange('symbol', e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none font-bold uppercase transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
            placeholder="EURUSD"
            autoFocus
          />
        </div>

        {/* Side */}
        {visibleColumns.side && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleInlineChange('type', inlineRowData.type === 'Long' ? 'Short' : 'Long')}
              className={`w-full py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 border hover:scale-[1.02] active:scale-[0.98] ${
                inlineRowData.type === 'Long'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30 hover:border-red-500/50 shadow-[0_0_16px_rgba(239,68,68,0.12)]'
              }`}
            >
              {inlineRowData.type === 'Long' ? 'BUY' : 'SELL'}
            </button>
          </div>
        )}

        {/* Entry Price */}
        {visibleColumns.entry && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.entry_price || ''}
              onChange={e => handleInlineChange('entry_price', parseFloat(e.target.value) || 0)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Exit Price */}
        {visibleColumns.exit && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.exit_price || ''}
              onChange={e => handleInlineChange('exit_price', parseFloat(e.target.value) || 0)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Lots */}
        {visibleColumns.lots && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.lots || ''}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                handleInlineChange('lots', val);
                handleInlineChange('quantity', val);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.10"
            />
          </div>
        )}

        {/* Pips */}
        {visibleColumns.pips && (
          <div className="text-right text-xs font-mono text-gray-500 tabular-nums">
            {inlineRowData.pips !== undefined ? inlineRowData.pips : '--'}
          </div>
        )}

        {/* P&L */}
        {visibleColumns.pnl && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.profit_loss || ''}
              onChange={e => handleInlineChange('profit_loss', parseFloat(e.target.value) || 0)}
              onKeyDown={handleKeyDown}
              className={`w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-600 focus:outline-none font-mono font-bold transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset] ${
                (inlineRowData.profit_loss || 0) > 0 ? 'text-emerald-400' : (inlineRowData.profit_loss || 0) < 0 ? 'text-red-400' : 'text-white'
              }`}
              placeholder="0.00"
            />
          </div>
        )}

        {/* Percent Gain */}
        {visibleColumns.percentGain && (
          <div className="text-right text-xs font-mono text-gray-500">
            {inlineRowData.entry_price && inlineRowData.profit_loss
              ? `${(((inlineRowData.profit_loss) / (inlineRowData.entry_price * (inlineRowData.lots || inlineRowData.quantity || 1))) * 100).toFixed(2)}%`
              : '--'}
          </div>
        )}

        {/* Commission */}
        {visibleColumns.commission && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.commission ?? ''}
              onChange={e => handleInlineChange('commission', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Net Profit */}
        {visibleColumns.netProfit && (
          <div className="text-right text-xs font-mono text-gray-500">
            {inlineRowData.profit_loss !== undefined
              ? formatCurrency(inlineRowData.profit_loss - (inlineRowData.commission || 0))
              : '$0.00'}
          </div>
        )}

        {/* Date */}
        {visibleColumns.date && (
          <div>
            <input
              type="date"
              value={inlineRowData.entry_time ? inlineRowData.entry_time.split('T')[0] : ''}
              onChange={e => {
                const dateVal = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                handleInlineChange('entry_time', dateVal);
                handleInlineChange('exit_time', dateVal);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark] transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
            />
          </div>
        )}

        {/* Extra toggled columns */}
        {visibleColumns.openTime && (
          <div>
            <input
              type="datetime-local"
              value={inlineRowData.entry_time ? new Date(inlineRowData.entry_time).toISOString().slice(0, 16) : ''}
              onChange={e => handleInlineChange('entry_time', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark] transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
            />
          </div>
        )}
        {visibleColumns.closeTime && (
          <div>
            <input
              type="datetime-local"
              value={inlineRowData.exit_time ? new Date(inlineRowData.exit_time).toISOString().slice(0, 16) : ''}
              onChange={e => handleInlineChange('exit_time', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark] transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
            />
          </div>
        )}
        {visibleColumns.holdTime && (
          <div className="text-right text-xs font-mono text-gray-500">
            {inlineRowData.entry_time && inlineRowData.exit_time ? (
              (() => {
                const m = Math.round((new Date(inlineRowData.exit_time).getTime() - new Date(inlineRowData.entry_time).getTime()) / 60000);
                return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
              })()
            ) : '--'}
          </div>
        )}
        {visibleColumns.stopLoss && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.stop_loss ?? ''}
              onChange={e => handleInlineChange('stop_loss', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.00"
            />
          </div>
        )}
        {visibleColumns.takeProfit && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.take_profit ?? ''}
              onChange={e => handleInlineChange('take_profit', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.00"
            />
          </div>
        )}
        {visibleColumns.account && (
          <div>
            <select
              value={inlineRowData.account_id || ''}
              onChange={e => handleInlineChange('account_id', e.target.value || null)}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark] transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
            >
              <option value="">No Account</option>
              {userAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Mindset */}
        {visibleColumns.mindset && (
          <div className="relative flex items-center gap-1 pr-4 min-w-0">
            {inlineRowData.emotional_state ? (
              <button
                type="button"
                onClick={() => setActivePopover(activePopover?.tradeId === 'new-row' && activePopover?.type === 'mindset' ? null : { tradeId: 'new-row', type: 'mindset' })}
                className={`popover-trigger text-[11px] px-3 py-1.5 rounded-xl border font-bold capitalize tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  EMOTIONS.find(e => e.value === inlineRowData.emotional_state)?.bg || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
              >
                {inlineRowData.emotional_state}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActivePopover(activePopover?.tradeId === 'new-row' && activePopover?.type === 'mindset' ? null : { tradeId: 'new-row', type: 'mindset' })}
                className="popover-trigger w-6 h-6 rounded-full bg-white/[0.03] hover:bg-indigo-500/20 border border-white/[0.06] hover:border-indigo-500/40 text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              >
                +
              </button>
            )}

            <AnimatePresence>
              {activePopover?.tradeId === 'new-row' && activePopover?.type === 'mindset' && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="popover-container absolute left-0 top-full mt-1.5 z-30 bg-[#151823] border border-white/[0.08] rounded-xl shadow-2xl p-2 w-[160px] space-y-1"
                >
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">Set Mindset</div>
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    {EMOTIONS.map(emotion => {
                      const isSelected = inlineRowData.emotional_state === emotion.value;
                      return (
                        <button
                          key={emotion.value}
                          type="button"
                          onClick={() => {
                            setActivePopover(null);
                            handleInlineChange('emotional_state', emotion.value);
                          }}
                          className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'text-gray-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="capitalize">{emotion.label}</span>
                          {isSelected && <span className="text-indigo-400 font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Strategy Tags */}
        {visibleColumns.tags && (
          <div className="relative flex items-center gap-1.5 pr-4 min-w-0 w-full">
            <div className={`flex items-center ${wrapTags ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-none'} gap-1.5 min-w-0 max-w-[calc(100%-28px)] overflow-hidden`}>
              {inlineRowData.tags && inlineRowData.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 transition-colors duration-150 font-medium group/pill shrink-0"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleToggleTag(inlineRowData as Trade, tag, false)}
                    className="hover:text-red-400 text-gray-500 text-[10px] font-bold transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActivePopover(activePopover?.tradeId === 'new-row' && activePopover?.type === 'tags' ? null : { tradeId: 'new-row', type: 'tags' })}
              className="popover-trigger w-6 h-6 rounded-full bg-white/[0.03] hover:bg-indigo-500/20 border border-white/[0.06] hover:border-indigo-500/40 text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.2)] shrink-0"
            >
              +
            </button>
            
            <AnimatePresence>
              {activePopover?.tradeId === 'new-row' && activePopover?.type === 'tags' && renderTagsPopover(inlineRowData as Trade, false, true)}
            </AnimatePresence>
          </div>
        )}

        {/* Mistake Tags */}
        {visibleColumns.mistakes && (
          <div className="relative flex items-center gap-1.5 pr-4 min-w-0 w-full">
            <div className={`flex items-center ${wrapTags ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-none'} gap-1.5 min-w-0 max-w-[calc(100%-28px)] overflow-hidden`}>
              {inlineRowData.mistakes && inlineRowData.mistakes.map((mistake) => (
                <span
                  key={mistake}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 flex items-center gap-1.5 transition-colors duration-150 font-medium group/pill shrink-0"
                >
                  {mistake}
                  <button
                    type="button"
                    onClick={() => handleToggleTag(inlineRowData as Trade, mistake, true)}
                    className="hover:text-red-400 text-gray-500 text-[10px] font-bold transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActivePopover(activePopover?.tradeId === 'new-row' && activePopover?.type === 'mistakes' ? null : { tradeId: 'new-row', type: 'mistakes' })}
              className="popover-trigger w-6 h-6 rounded-full bg-white/[0.03] hover:bg-red-500/20 border border-white/[0.06] hover:border-red-500/40 text-gray-400 hover:text-red-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.2)] shrink-0"
            >
              +
            </button>
            
            <AnimatePresence>
              {activePopover?.tradeId === 'new-row' && activePopover?.type === 'mistakes' && renderTagsPopover(inlineRowData as Trade, true, true)}
            </AnimatePresence>
          </div>
        )}

        {/* Learnings */}
        {visibleColumns.notes && (
          <div>
            <input
              type="text"
              value={inlineRowData.notes || ''}
              onChange={e => handleInlineChange('notes', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="Notes..."
            />
          </div>
        )}

        {/* Actions (Save / Cancel) */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleInlineSave}
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
            title="Save Trade"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          </button>
          <button
            type="button"
            onClick={handleInlineCancel}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.1)]"
            title="Cancel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    );
  };

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <TradesListSkeleton />
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.06))',
                  border: '1px solid rgba(99,102,241,0.2)',
                  boxShadow: '0 0 16px rgba(99,102,241,0.1), 0 1px 0 rgba(255,255,255,0.08) inset',
                  color: '#818cf8',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">Trades</h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              <span className="text-gray-400 font-medium">{trades.length}</span> trades logged
              {quickMetrics.totalPnL !== 0 && (
                <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${quickMetrics.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {quickMetrics.totalPnL >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(quickMetrics.totalPnL))}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative group">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text" placeholder="Search trades..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-52 pl-9 pr-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2) inset, 0 1px 0 rgba(255,255,255,0.04)',
                }}
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${showFilters ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-500/10' : 'bg-[#0d0e16]/80 backdrop-blur-sm border-white/[0.06] text-gray-400 hover:text-white hover:border-white/[0.12]'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </button>
            <button onClick={() => handleStartInlineAdd(0)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Log Trade
            </button>
          </div>
        </div>

        {/* Saved Views */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.2) inset' }}>
          {[
            { id: 'all', label: 'All Trades', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
            { id: 'forex', label: 'Forex', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { id: 'mistakes', label: 'Mistakes', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg> },
            { id: 'winners', label: 'Winners', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
            { id: 'losers', label: 'Losers', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg> },
            { id: 'review', label: 'Review', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
          ].map(view => (
            <button
              key={view.id}
            onClick={() => { setActiveView(view.id as SavedView); setCurrentPage(1); }}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5"
              style={activeView === view.id
                ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 10px rgba(99,102,241,0.1), 0 1px 0 rgba(255,255,255,0.08) inset' }
                : { color: '#6b7280', border: '1px solid transparent' }
              }
            >
              {view.icon}
              {view.label}
            </button>
          ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Density</span>
            <div className="flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.25) inset' }}>
              <button
                onClick={() => setTableDensity('compact')}
                className="px-2.5 py-1 text-xs rounded-md transition-all duration-200"
                style={tableDensity === 'compact' ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 10px rgba(99,102,241,0.12), 0 1px 0 rgba(255,255,255,0.1) inset' } : { color: '#6b7280', border: '1px solid transparent' }}
              >
                Compact
              </button>
              <button
                onClick={() => setTableDensity('comfortable')}
                className="px-2.5 py-1 text-xs rounded-md transition-all duration-200"
                style={tableDensity === 'comfortable' ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 10px rgba(99,102,241,0.12), 0 1px 0 rgba(255,255,255,0.1) inset' } : { color: '#6b7280', border: '1px solid transparent' }}
              >
                Comfortable
              </button>
            </div>
            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="popover-trigger px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5"
                style={showColumnMenu
                  ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.06))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 0 12px rgba(99,102,241,0.1)' }
                  : { background: 'rgba(255,255,255,0.03)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }
                }
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                Columns
              </button>
              {showColumnMenu && (
                <div
                  className="popover-container absolute right-0 top-full mt-2 z-30 rounded-2xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderTopColor: 'rgba(255,255,255,0.12)',
                    boxShadow: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.6), 0 4px 16px -4px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(12px)',
                    width: '220px',
                  }}
                >
                  <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em]">Toggle Columns</div>
                  </div>
                  <div className="p-1.5 max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
                    {[
                      { section: 'Core', items: [
                        { key: 'side', label: 'Side' },
                        { key: 'entry', label: 'Entry Price' },
                        { key: 'exit', label: 'Exit Price' },
                        { key: 'lots', label: 'Volume / Lots' },
                        { key: 'pips', label: 'Pips' },
                        { key: 'pnl', label: 'Profit / Loss' },
                        { key: 'date', label: 'Date' },
                      ]},
                      { section: 'Time', items: [
                        { key: 'openTime', label: 'Open Time' },
                        { key: 'closeTime', label: 'Close Time' },
                        { key: 'holdTime', label: 'Hold Time' },
                      ]},
                      { section: 'Financial', items: [
                        { key: 'commission', label: 'Commission' },
                        { key: 'netProfit', label: 'Net Profit' },
                        { key: 'percentGain', label: 'Percent Gain' },
                      ]},
                      { section: 'Risk', items: [
                        { key: 'stopLoss', label: 'Stop Loss' },
                        { key: 'takeProfit', label: 'Take Profit' },
                      ]},
                      { section: 'Journal', items: [
                        { key: 'mindset', label: 'Mindset' },
                        { key: 'tags', label: 'Strategy Tags' },
                        { key: 'mistakes', label: 'Mistake Tags' },
                        { key: 'notes', label: 'Learnings' },
                        { key: 'account', label: 'Account' },
                      ]},
                    ].map(group => (
                      <div key={group.section}>
                        <div className="px-2.5 py-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-[0.12em]">{group.section}</div>
                        {group.items.map(col => (
                          <button
                            key={col.key}
                            onClick={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] text-xs rounded-lg transition-all duration-150 hover:bg-white/[0.04] group/col"
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                              style={visibleColumns[col.key]
                                ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 8px rgba(99,102,241,0.3), 0 1px 0 rgba(255,255,255,0.15) inset' }
                                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }
                              }
                            >
                              {visibleColumns[col.key] && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`${visibleColumns[col.key] ? 'text-gray-200' : 'text-gray-500'} group-hover/col:text-gray-200 transition-colors`}>
                              {col.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  {/* Wrap Tags & Cells Toggle */}
                  <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => setWrapTags(!wrapTags)}
                      className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:bg-white/[0.04] transition-colors"
                    >
                      <span>Wrap Tags & Cells</span>
                      <div
                        className="w-8 h-4 rounded-full relative transition-colors duration-200 shrink-0"
                        style={{
                          background: wrapTags ? '#4f46e5' : 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full bg-white absolute top-[1px] transition-transform duration-200"
                          style={{
                            left: '1px',
                            transform: wrapTags ? 'translateX(16px)' : 'translateX(0px)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                          }}
                        />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence Strip */}
        <div className="mb-6">
          <button
            onClick={() => setShowIntelligence(prev => !prev)}
            className="mb-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0d0e16] border border-white/[0.06] text-gray-300 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            <span>{showIntelligence ? 'Hide' : 'Show'} Intelligence</span>
            <svg
              className={`w-4 h-4 transition-transform ${showIntelligence ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {showIntelligence && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Top Mistake Cost</h3>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Realized Loss Impact</span>
            </div>
            {topMistakeCost.length === 0 ? (
              <div className="text-sm text-gray-500">No mistake-linked losses yet.</div>
            ) : (
              <div className="space-y-2">
                {topMistakeCost.map(([mistake, cost]) => (
                  <div key={mistake} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{mistake}</span>
                    <span className="text-red-400 font-semibold">-${cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Smart Review Queue</h3>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Needs Attention</span>
            </div>
            {reviewQueue.length === 0 ? (
              <div className="text-sm text-gray-500">No high-priority reviews right now.</div>
            ) : (
              <div className="space-y-2">
                {reviewQueue.map(({ trade, reasons, quality }) => (
                  <button
                    key={trade.id}
                    onClick={() => setSelectedDetailTrade(trade)}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{trade.symbol}</div>
                      <div className="text-xs text-gray-400">{reasons.slice(0, 2).map(getReviewReasonLabel).join(' · ')}</div>
                    </div>
                    {reasons.length >= 3 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-400 border border-red-500/20">High Risk</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Review</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total P&L', value: formatCurrency(quickMetrics.totalPnL), color: quickMetrics.totalPnL >= 0 ? '#34d399' : '#f87171', glow: quickMetrics.totalPnL >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Win Rate', value: `${quickMetrics.winRate.toFixed(1)}%`, color: quickMetrics.winRate >= 50 ? '#34d399' : '#f87171', glow: quickMetrics.winRate >= 50 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Profit Factor', value: quickMetrics.profitFactor.toFixed(2), color: quickMetrics.profitFactor >= 1 ? '#34d399' : '#f87171', glow: quickMetrics.profitFactor >= 1 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
            { label: 'Total Trades', value: trades.length.toString(), color: '#818cf8', glow: 'rgba(99,102,241,0.05)',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          ].map((m, i) => (
            <div key={i} className="stat-card group relative p-5 overflow-hidden hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{m.label}</span>
                  <div className="p-2 rounded-lg group-hover:scale-110 transition-transform duration-300" style={{ background: `${m.color}12`, color: `${m.color}99` }}>{m.icon}</div>
                </div>
                <div className="text-2xl font-bold tracking-tight relative z-10" style={{ color: m.color, textShadow: `0 0 20px ${m.color}33` }}>
                  {m.value}
                </div>
              </div>

              {/* Inspiring Custom Visual Charts */}
              {m.label === 'Total P&L' && (
                <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                  <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                    <span>Avg Win</span>
                    <span>Avg Loss</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                    <div
                      style={{
                        width: `${(quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss)) > 0 ? (quickMetrics.avgWin / (quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss))) * 100 : 50}%`,
                        background: 'linear-gradient(90deg, #10b981, #34d399)'
                      }}
                      className="h-full"
                    />
                    <div
                      style={{
                        width: `${(quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss)) > 0 ? (Math.abs(quickMetrics.avgLoss) / (quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss))) * 100 : 50}%`,
                        background: 'linear-gradient(90deg, #f87171, #ef4444)'
                      }}
                      className="h-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-semibold font-mono tabular-nums">
                    <span className="text-emerald-400">{formatCurrency(quickMetrics.avgWin)}</span>
                    <span className="text-red-400">-{formatCurrency(Math.abs(quickMetrics.avgLoss))}</span>
                  </div>
                </div>
              )}

              {m.label === 'Win Rate' && (
                <div className="mt-3 pt-2 border-t border-white/[0.04] relative z-10 space-y-1.5">
                  <div className="flex justify-center">
                    <svg className="w-[140px] h-[55px]" viewBox="0 0 100 50">
                      <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9.5" strokeLinecap="round" />
                      <path
                        d="M 10 45 A 35 35 0 0 1 90 45"
                        fill="none"
                        stroke="url(#winRateGrad)"
                        strokeWidth="9.5"
                        strokeLinecap="round"
                        strokeDasharray="110"
                        strokeDashoffset={110 - (110 * quickMetrics.winRate) / 100}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                      <defs>
                        <linearGradient id="winRateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 font-semibold tracking-wide px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
                      <span>{Math.round((quickMetrics.winRate / 100) * filteredTrades.length)} Wins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400 block" />
                      <span>{filteredTrades.length - Math.round((quickMetrics.winRate / 100) * filteredTrades.length)} Losses</span>
                    </div>
                  </div>
                </div>
              )}

              {m.label === 'Profit Factor' && (() => {
                const gpRatio = quickMetrics.profitFactor > 0 ? (quickMetrics.profitFactor / (quickMetrics.profitFactor + 1)) * 100 : 50;
                return (
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-3 relative z-10">
                    <div className="text-xs text-gray-400 leading-normal font-medium max-w-[65%]">
                      <span>Proportion of gross profit vs gross loss</span>
                    </div>
                    <svg className="w-12 h-12 shrink-0 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="5.5" className="opacity-95" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="5.5"
                        strokeDasharray={`${gpRatio} 100`}
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                );
              })()}

              {m.label === 'Total Trades' && (() => {
                const longCount = filteredTrades.filter(t => t.type === 'Long').length;
                const shortCount = filteredTrades.filter(t => t.type === 'Short').length;
                const total = longCount + shortCount;
                const longPct = total > 0 ? (longCount / total) * 100 : 50;
                return (
                  <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                    <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                      <span>Buy ({longCount})</span>
                      <span>Sell ({shortCount})</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                      <div style={{ width: `${longPct}%` }} className="h-full bg-emerald-500" />
                      <div style={{ width: `${100 - longPct}%` }} className="h-full bg-red-500" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-bold px-0.5">
                      <span>{total > 0 ? `${longPct.toFixed(0)}%` : '--'}</span>
                      <span>{total > 0 ? `${(100 - longPct).toFixed(0)}%` : '--'}</span>
                    </div>
                  </div>
                );
              })()}

              {m.glow && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-[50px] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${m.glow} 0%, transparent 70%)` }} />}
            </div>
          ))}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden">
              <div className="card rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Account</label>
                    <select value={accountFilter || ''} onChange={e => setAccountFilter(e.target.value || null)}
                      className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                      <option value="">All Accounts</option>
                      {userAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_number})</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => { setSearchTerm(''); setSymbolFilter(null); setTypeFilter('All'); setDateFilter('All'); setAccountFilter(null); }}
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
        <div className="hidden md:block card rounded-2xl overflow-x-auto scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
          <div style={{ minWidth: '1100px' }} className="min-w-full w-max">
            {/* Table Header */}
            <div className={`hidden md:grid gap-2 px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] sticky top-0 z-10 min-w-full`}
              style={{
                gridTemplateColumns: getGridTemplateColumns(),
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(10,11,18,0.9)',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="relative group/header flex items-center justify-center h-full">
                <input type="checkbox" checked={filteredTrades.length > 0 && selectedTradeIds.length === filteredTrades.length}
                  onChange={e => setSelectedTradeIds(e.target.checked ? filteredTrades.map(t => t.id) : [])}
                  className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-4 h-4 cursor-pointer" />
                {renderResizeHandle('checkbox')}
              </div>
              <div className="relative group/header text-center flex items-center justify-center h-full">
                <span className="truncate">Trade</span>
                {renderResizeHandle('screenshot')}
              </div>
              <div className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full" onClick={() => handleSort('symbol')}>
                <span className="truncate">Symbol {sortField === 'symbol' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
                {renderResizeHandle('symbol')}
              </div>
              {visibleColumns.side && (
                <div className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full" onClick={() => handleSort('type')}>
                  <span className="truncate">Side</span>
                  {renderResizeHandle('side')}
                </div>
              )}
              {visibleColumns.entry && (
                <div className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center justify-end gap-1 text-right h-full w-full" onClick={() => handleSort('entry_price')}>
                  <span className="truncate">Entry {sortField === 'entry_price' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
                  {renderResizeHandle('entry')}
                </div>
              )}
              {visibleColumns.exit && (
                <div className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center justify-end gap-1 text-right h-full w-full" onClick={() => handleSort('exit_price')}>
                  <span className="truncate">Exit {sortField === 'exit_price' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
                  {renderResizeHandle('exit')}
                </div>
              )}
              {visibleColumns.lots && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Lots / Qty</span>
                  {renderResizeHandle('lots')}
                </div>
              )}
              {visibleColumns.pips && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Pips</span>
                  {renderResizeHandle('pips')}
                </div>
              )}
              {visibleColumns.pnl && (
                <div className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center justify-end gap-1 text-right h-full w-full" onClick={() => handleSort('profit_loss')}>
                  <span className="truncate">P&L {sortField === 'profit_loss' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
                  {renderResizeHandle('pnl')}
                </div>
              )}
              {visibleColumns.percentGain && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">% Gain</span>
                  {renderResizeHandle('percentGain')}
                </div>
              )}
              {visibleColumns.commission && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Commission</span>
                  {renderResizeHandle('commission')}
                </div>
              )}
              {visibleColumns.netProfit && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Net Profit</span>
                  {renderResizeHandle('netProfit')}
                </div>
              )}
              {visibleColumns.date && (
                <div className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full" onClick={() => handleSort('entry_time')}>
                  <span className="truncate">Date {sortField === 'entry_time' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
                  {renderResizeHandle('date')}
                </div>
              )}
              {visibleColumns.openTime && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Open Time</span>
                  {renderResizeHandle('openTime')}
                </div>
              )}
              {visibleColumns.closeTime && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Close Time</span>
                  {renderResizeHandle('closeTime')}
                </div>
              )}
              {visibleColumns.holdTime && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Hold Time</span>
                  {renderResizeHandle('holdTime')}
                </div>
              )}
              {visibleColumns.stopLoss && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Stop Loss</span>
                  {renderResizeHandle('stopLoss')}
                </div>
              )}
              {visibleColumns.takeProfit && (
                <div className="relative group/header text-right flex items-center justify-end h-full w-full">
                  <span className="truncate">Take Profit</span>
                  {renderResizeHandle('takeProfit')}
                </div>
              )}
              {visibleColumns.account && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Account</span>
                  {renderResizeHandle('account')}
                </div>
              )}
              {visibleColumns.mindset && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Mindset</span>
                  {renderResizeHandle('mindset')}
                </div>
              )}
              {visibleColumns.tags && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Strategy Tags</span>
                  {renderResizeHandle('tags')}
                </div>
              )}
              {visibleColumns.mistakes && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Mistake Tags</span>
                  {renderResizeHandle('mistakes')}
                </div>
              )}
              {visibleColumns.notes && (
                <div className="relative group/header text-left flex items-center h-full">
                  <span className="truncate">Learnings</span>
                  {renderResizeHandle('notes')}
                </div>
              )}
              <div className="relative group/header text-right flex items-center justify-end h-full">
                <span>Actions</span>
              </div>
            </div>

            {/* Rows */}
            {filteredTrades.length === 0 && inlineNewRowIndex === null ? (
              <EmptyState variant="trades" />
            ) : (
              <>
              {inlineNewRowIndex === 0 && filteredTrades.length === 0 && renderInlineEditorRow()}
              {filteredTrades.map((trade, idx) => (
                <div key={trade.id} className="relative min-w-full">
                  {idx === inlineNewRowIndex && renderInlineEditorRow()}
                  {/* Notion-style hover insert line between rows */}
                  {idx > 0 && (
                    <div
                      className="group/insert absolute -top-[1px] left-0 right-0 h-[2px] z-[5] cursor-pointer"
                      onClick={() => handleStartInlineAdd(idx)}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover/insert:opacity-100 transition-opacity duration-200">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />
                      </div>
                      <div
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/insert:opacity-100 transition-all duration-200 flex items-center gap-1.5"
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                          style={{
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            boxShadow: '0 0 8px rgba(99,102,241,0.4), 0 1px 0 rgba(255,255,255,0.15) inset',
                          }}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" /></svg>
                        </div>
                      </div>
                    </div>
                  )}
                <div
                  className={`grid gap-2 px-5 ${tableDensity === 'compact' ? 'py-3' : 'py-4'} items-center hover:bg-indigo-500/[0.03] transition-all duration-200 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'} ${idx !== filteredTrades.length - 1 ? 'border-b border-white/[0.04]' : ''} group/row min-w-full`}
                  style={{ gridTemplateColumns: getGridTemplateColumns() }}>
                  {/* Checkbox + inline add button */}
                  <div className="hidden md:flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleStartInlineAdd(idx + 1)}
                      className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-indigo-500/25 border border-white/[0.04] text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all opacity-20 group-hover/row:opacity-100 hover:scale-105 active:scale-95"
                      title="Add trade"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" /></svg>
                    </button>
                    <input type="checkbox" checked={selectedTradeIds.includes(trade.id)}
                      onChange={e => setSelectedTradeIds(e.target.checked ? [...selectedTradeIds, trade.id] : selectedTradeIds.filter(id => id !== trade.id))}
                      className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-4 h-4 cursor-pointer" />
                  </div>

                  {/* Trade / Screenshot Upload */}
                  <div className="relative group flex items-center justify-center">
                    {uploadingTradeId === trade.id ? (
                      <div className="w-11 h-8 rounded bg-white/[0.02] flex items-center justify-center border border-white/[0.06]">
                        <div className="w-3.5 h-3.5 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : trade.screenshot_url ? (
                      <div 
                        onClick={() => setSelectedScreenshotUrl(trade.screenshot_url || null)}
                        className="relative w-11 h-8 rounded border border-white/[0.15] overflow-hidden cursor-pointer hover:scale-105 transition-all group"
                      >
                        <img
                          src={resolveTradingViewUrl(trade.screenshot_url)}
                          alt="trade chart"
                          className="w-full h-full object-cover"
                        />
                        {/* Preview Eye Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm("Remove screenshot?")) {
                              await handleUpdateScreenshot(trade, "");
                            }
                          }}
                          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hover:scale-110 active:scale-95"
                          title="Delete screenshot"
                        >
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshotEditTrade(trade);
                          setScreenshotEditTab('upload');
                          setScreenshotEditEmbedUrl('');
                        }}
                        className="w-11 h-8 rounded border border-dashed border-white/[0.25] bg-white/[0.04] hover:border-indigo-500/70 hover:bg-indigo-500/[0.08] transition-all flex items-center justify-center cursor-pointer text-gray-400 hover:text-indigo-300"
                        title="Add screenshot"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Symbol */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`${tableDensity === 'compact' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-xs'} rounded-lg flex items-center justify-center font-bold flex-shrink-0 transition-transform duration-200 group-hover/row:scale-105 ${(trade.profit_loss ?? 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'}`}>
                      {(trade.profit_loss ?? 0) >= 0 ? '↑' : '↓'}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-bold text-white group-hover/row:text-indigo-300 transition-colors duration-200 truncate`}>{trade.symbol}</span>
                        {trade.account_id && accountsMap.has(trade.account_id) && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase tracking-wider flex-shrink-0">
                            {accountsMap.get(trade.account_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Side */}
                  {visibleColumns.side && (
                  <div className="flex items-center">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-flex items-center"
                      style={trade.type === 'Long'
                        ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 8px rgba(16,185,129,0.08)' }
                        : { background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.04))', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 8px rgba(239,68,68,0.08)' }
                      }
                    >
                      {trade.type === 'Long' ? 'BUY' : 'SELL'}
                    </span>
                  </div>
                  )}

                  {/* Entry */}
                  {visibleColumns.entry && <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-300 text-right tabular-nums`}>{(trade.entry_price ?? 0).toFixed(isForexPair(trade.symbol) ? 5 : 2)}</div>}

                  {/* Exit */}
                  {visibleColumns.exit && <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-300 text-right tabular-nums`}>{(trade.exit_price ?? 0).toFixed(isForexPair(trade.symbol) ? 5 : 2)}</div>}

                  {/* Lots / Qty */}
                  {visibleColumns.lots && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-400 text-right font-mono tabular-nums`}>
                    {trade.lots !== undefined && trade.lots !== null ? formatLots(trade.lots) : trade.quantity}
                  </div>
                  )}

                  {/* Pips */}
                  {visibleColumns.pips && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-right tabular-nums ${!isForexPair(trade.symbol) ? 'text-gray-600' : (trade.pips ?? 0) >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                    {isForexPair(trade.symbol) ? formatPips(trade.pips) : '--'}
                  </div>
                  )}

                  {/* P&L */}
                  {visibleColumns.pnl && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-bold tabular-nums text-right`}>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg"
                      style={{
                        color: (trade.profit_loss ?? 0) > 0 ? '#34d399' : (trade.profit_loss ?? 0) < 0 ? '#f87171' : '#9ca3af',
                        background: (trade.profit_loss ?? 0) > 0 ? 'rgba(16,185,129,0.06)' : (trade.profit_loss ?? 0) < 0 ? 'rgba(239,68,68,0.06)' : 'transparent',
                        textShadow: (trade.profit_loss ?? 0) !== 0 ? `0 0 12px ${(trade.profit_loss ?? 0) > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.18)'}` : 'none',
                      }}
                    >
                      {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{formatCurrency(trade.profit_loss ?? 0)}
                    </span>
                  </div>
                  )}

                  {/* Percent Gain */}
                  {visibleColumns.percentGain && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-right tabular-nums ${(trade.profit_loss ?? 0) >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                    {trade.entry_price ? `${(((trade.profit_loss ?? 0) / (trade.entry_price * (trade.quantity || 1))) * 100).toFixed(2)}%` : '--'}
                  </div>
                  )}

                  {/* Commission */}
                  {visibleColumns.commission && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-500 text-right tabular-nums`}>
                    {(trade as any).commission != null ? formatCurrency((trade as any).commission) : '$0.00'}
                  </div>
                  )}

                  {/* Net Profit */}
                  {visibleColumns.netProfit && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-right tabular-nums ${(trade.profit_loss ?? 0) > 0 ? 'text-emerald-400' : (trade.profit_loss ?? 0) < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{formatCurrency((trade.profit_loss ?? 0) - ((trade as any).commission ?? 0))}
                  </div>
                  )}

                  {/* Date */}
                  {visibleColumns.date && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-500 text-left`}>
                    {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  )}

                  {/* Open Time */}
                  {visibleColumns.openTime && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-500 text-left tabular-nums`}>
                    {new Date(trade.entry_time).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  )}

                  {/* Close Time */}
                  {visibleColumns.closeTime && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-500 text-left tabular-nums`}>
                    {new Date(trade.exit_time).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  )}

                  {/* Hold Time */}
                  {visibleColumns.holdTime && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-500 text-right tabular-nums`}>
                    {(() => { const m = Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()}
                  </div>
                  )}

                  {/* Stop Loss */}
                  {visibleColumns.stopLoss && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-500 text-right tabular-nums`}>
                    {(trade as any).stop_loss ? (trade as any).stop_loss.toFixed(isForexPair(trade.symbol) ? 5 : 2) : '--'}
                  </div>
                  )}

                  {/* Take Profit */}
                  {visibleColumns.takeProfit && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-500 text-right tabular-nums`}>
                    {(trade as any).take_profit ? (trade as any).take_profit.toFixed(isForexPair(trade.symbol) ? 5 : 2) : '--'}
                  </div>
                  )}

                  {/* Account */}
                  {visibleColumns.account && (
                  <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-500 text-left truncate`}>
                    {trade.account_id && accountsMap.has(trade.account_id) ? accountsMap.get(trade.account_id) : '--'}
                  </div>
                  )}

                  {/* Mindset Column (Inline Selection) */}
                  {visibleColumns.mindset && (
                    <div className="relative flex items-center gap-1 pr-4 min-w-0">
                      {trade.emotional_state ? (
                        <button
                          onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'mindset' ? null : { tradeId: trade.id, type: 'mindset' })}
                          className={`popover-trigger text-[10px] px-2.5 py-1 rounded-lg border font-semibold capitalize tracking-wide transition-all ${
                            EMOTIONS.find(e => e.value === trade.emotional_state)?.bg || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}
                        >
                          {trade.emotional_state}
                        </button>
                      ) : (
                        <button
                          onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'mindset' ? null : { tradeId: trade.id, type: 'mindset' })}
                          className="popover-trigger w-5 h-5 rounded-full bg-white/[0.04] hover:bg-indigo-500/25 border border-white/[0.04] text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95"
                          title="Set mindset"
                        >
                          +
                        </button>
                      )}

                      <AnimatePresence>
                        {activePopover?.tradeId === trade.id && activePopover?.type === 'mindset' && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                            className="popover-container absolute left-0 top-full mt-1 z-30 bg-[#151823] border border-white/[0.08] rounded-xl shadow-2xl p-2 w-[160px] space-y-1"
                          >
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">Set Mindset</div>
                            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                              {EMOTIONS.map(emotion => {
                                const isSelected = trade.emotional_state === emotion.value;
                                return (
                                  <button
                                    key={emotion.value}
                                    onClick={async () => {
                                      setActivePopover(null);
                                      setTrades(prevTrades => prevTrades.map(t => t.id === trade.id ? { ...t, emotional_state: emotion.value } : t));
                                      try {
                                        await updateTrade({ ...trade, emotional_state: emotion.value });
                                        toast.success(`Mindset set to ${emotion.label}`);
                                      } catch (e) {
                                        console.error(e);
                                        toast.error('Failed to update mindset');
                                      }
                                    }}
                                    className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'text-gray-300 hover:bg-white/[0.04]'
                                    }`}
                                  >
                                    <span className="capitalize">{emotion.label}</span>
                                    {isSelected && <span className="text-indigo-400 font-bold">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {trade.emotional_state && (
                              <button
                                onClick={async () => {
                                  setActivePopover(null);
                                  setTrades(prevTrades => prevTrades.map(t => t.id === trade.id ? { ...t, emotional_state: undefined } : t));
                                  try {
                                    await updateTrade({ ...trade, emotional_state: null as any });
                                    toast.success('Mindset cleared');
                                  } catch (e) {
                                    console.error(e);
                                    toast.error('Failed to clear mindset');
                                  }
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Clear Mindset
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Strategy Tags (Inline Selection) */}
                  {visibleColumns.tags && (
                    <div className="relative flex items-center gap-1.5 pr-4 min-w-0 w-full">
                      <div className={`flex items-center ${wrapTags ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-none'} gap-1.5 min-w-0 max-w-[calc(100%-24px)] overflow-hidden`}>
                        {trade.tags && trade.tags.map((tag) => {
                          const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
                          const style = getTagStyle(tc?.color, false);
                          return (
                            <span
                              key={tag}
                              style={style}
                              className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors duration-150 font-medium group/pill shrink-0"
                            >
                              {tag}
                              <button
                                onClick={() => handleToggleTag(trade, tag, false)}
                                className="hover:opacity-80 text-[10px] font-bold transition-opacity"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'tags' ? null : { tradeId: trade.id, type: 'tags' })}
                        className="popover-trigger w-5 h-5 rounded-full bg-white/[0.04] hover:bg-indigo-500/25 border border-white/[0.04] text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shrink-0"
                      >
                        +
                      </button>
                      
                      <AnimatePresence>
                        {activePopover?.tradeId === trade.id && activePopover?.type === 'tags' && renderTagsPopover(trade, false, idx >= filteredTrades.length - 2)}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Mistake Tags (Inline Selection) */}
                  {visibleColumns.mistakes && (
                    <div className="relative flex items-center gap-1.5 pr-4 min-w-0 w-full">
                      <div className={`flex items-center ${wrapTags ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-none'} gap-1.5 min-w-0 max-w-[calc(100%-24px)] overflow-hidden`}>
                        {trade.mistakes && trade.mistakes.map((mistake) => {
                          const tc = userTagsConfig.find(c => c.name.toLowerCase() === mistake.toLowerCase());
                          const style = getTagStyle(tc?.color, true);
                          return (
                            <span
                              key={mistake}
                              style={style}
                              className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors duration-150 font-medium group/pill shrink-0"
                            >
                              {mistake}
                              <button
                                onClick={() => handleToggleTag(trade, mistake, true)}
                                className="hover:opacity-80 text-[10px] font-bold transition-opacity"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'mistakes' ? null : { tradeId: trade.id, type: 'mistakes' })}
                        className="popover-trigger w-5 h-5 rounded-full bg-white/[0.04] hover:bg-red-500/25 border border-white/[0.04] text-gray-400 hover:text-red-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shrink-0"
                      >
                        +
                      </button>
                      
                      <AnimatePresence>
                        {activePopover?.tradeId === trade.id && activePopover?.type === 'mistakes' && renderTagsPopover(trade, true, idx >= filteredTrades.length - 2)}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Learnings / Notes (Modal trigger) */}
                  {visibleColumns.notes && (
                    <div className="relative pr-4 min-w-0 overflow-hidden">
                      <div
                        onClick={() => {
                          setNotesModalTrade(trade);
                          setNotesModalText(trade.notes || '');
                        }}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer select-none truncate hover:bg-white/[0.02] p-1.5 rounded-lg border border-transparent hover:border-white/[0.04] transition-all min-h-[24px]"
                        title="Click to view/edit learnings"
                      >
                        {trade.notes || <span className="text-gray-600 italic text-[10px]">Click to add note...</span>}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {trade.screenshot_url && (
                      <button onClick={() => setSelectedScreenshotUrl(trade.screenshot_url ?? null)}
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
              </div>
              ))
              }
              {inlineNewRowIndex === filteredTrades.length && filteredTrades.length > 0 && renderInlineEditorRow()}

              {/* Totals Summary Row */}
              {renderTotalsRow()}

              {/* Notion-style add row button at bottom */}
              <button
                onClick={() => handleStartInlineAdd(filteredTrades.length)}
                className="w-full flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/[0.03] transition-all duration-200 group/add border-t border-white/[0.04]"
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 group-hover/add:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" /></svg>
                </div>
                <span className="text-xs font-medium">New Trade</span>
              </button>
              </>
            )}
          </div>
          
          {/* Pagination */}
          {filteredTrades.length > 0 && (
            <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between bg-[#0a0b12]/50">
              <span className="text-xs text-gray-500">
                Showing <span className="text-gray-300 font-medium">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, trades.length)}</span> of <span className="text-gray-300 font-medium">{trades.length}</span> trades
              </span>
              <div className="flex items-center gap-3">
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2.5 py-1.5 bg-[#151823] border border-white/[0.06] rounded-lg text-gray-400 text-xs focus:outline-none hover:border-white/[0.12] transition-colors [color-scheme:dark]">
                  <option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option>
                </select>
                <div className="flex items-center gap-1 bg-[#151823] rounded-lg border border-white/[0.06] p-0.5">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-xs text-gray-300 px-3 py-1 font-medium tabular-nums">
                    {currentPage} <span className="text-gray-600">of</span> {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Trades List */}
        <div className="md:hidden space-y-4">
          {filteredTrades.length === 0 ? (
            <EmptyState variant="trades" />
          ) : (
            <>
              {filteredTrades.map((trade) => {
                const isLong = trade.type === 'Long';
                const pnlValue = trade.profit_loss ?? 0;
                const isProfit = pnlValue > 0;
                const isLoss = pnlValue < 0;
                const duration = Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000);
                const durationStr = duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`;
                
                return (
                  <div
                    key={trade.id}
                    className="card p-4 rounded-2xl relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16',
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderWidth: '1px',
                    }}
                  >
                    {/* Colored Glow at the bottom of the card */}
                    {pnlValue !== 0 && (
                      <div
                        className="absolute bottom-[-20px] right-[-20px] w-24 h-24 rounded-full pointer-events-none blur-[40px]"
                        style={{
                          background: isProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        }}
                      />
                    )}

                    {/* Card Header: Symbol, Type, P&L */}
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">{trade.symbol}</span>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider"
                          style={
                            isLong
                              ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
                              : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
                          }
                        >
                          {isLong ? 'BUY' : 'SELL'}
                        </span>
                        {trade.account_id && accountsMap.has(trade.account_id) && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase tracking-wider">
                            {accountsMap.get(trade.account_id)}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-lg"
                        style={{
                          color: isProfit ? '#34d399' : isLoss ? '#f87171' : '#9ca3af',
                          background: isProfit ? 'rgba(16,185,129,0.06)' : isLoss ? 'rgba(239,68,68,0.06)' : 'transparent',
                        }}
                      >
                        {pnlValue > 0 ? '+' : ''}{formatCurrency(pnlValue)}
                      </span>
                    </div>

                    {/* Details Grid: Date, Price, Lots, Pips */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mb-3 border-y border-white/[0.04] py-2 relative z-10">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="text-gray-300 font-medium">
                          {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lots / Qty</span>
                        <span className="text-gray-300 font-mono font-medium">
                          {trade.lots !== undefined && trade.lots !== null ? formatLots(trade.lots) : trade.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Execution</span>
                        <span className="text-gray-300 font-mono">
                          {trade.entry_price?.toFixed(isForexPair(trade.symbol) ? 5 : 2)} → {trade.exit_price?.toFixed(isForexPair(trade.symbol) ? 5 : 2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pips / Duration</span>
                        <span className="text-gray-300">
                          {isForexPair(trade.symbol) ? `${formatPips(trade.pips)} pips` : durationStr}
                        </span>
                      </div>
                    </div>

                    {/* Badges: Tags, Mindset, Mistakes */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 relative z-10">
                      {trade.emotional_state && (
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-lg border font-semibold capitalize tracking-wide ${
                          EMOTIONS.find(e => e.value === trade.emotional_state)?.bg || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {trade.emotional_state}
                        </span>
                      )}
                      {trade.tags && trade.tags.map((tag) => {
                        const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
                        const style = getTagStyle(tc?.color, false);
                        return (
                          <span key={tag} style={style} className="text-[9px] px-2.5 py-0.5 rounded-lg border font-medium">
                            {tag}
                          </span>
                        );
                      })}
                      {trade.mistakes && trade.mistakes.map((mistake) => {
                        const tc = userTagsConfig.find(c => c.name.toLowerCase() === mistake.toLowerCase());
                        const style = getTagStyle(tc?.color, true);
                        return (
                          <span key={mistake} style={style} className="text-[9px] px-2.5 py-0.5 rounded-lg border font-medium">
                            {mistake}
                          </span>
                        );
                      })}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] relative z-10">
                      {/* Notes / Learnings Summary */}
                      <div className="flex-1 mr-4 min-w-0">
                        <p
                          onClick={() => {
                            setNotesModalTrade(trade);
                            setNotesModalText(trade.notes || '');
                          }}
                          className="text-[10px] text-gray-500 hover:text-white cursor-pointer select-none truncate font-medium italic"
                          title="Click to view or edit learnings notes"
                        >
                          {trade.notes ? `Learnings: "${trade.notes}"` : '+ Add learning note...'}
                        </p>
                      </div>

                      {/* Quick Action Icons */}
                      <div className="flex items-center gap-1">
                        {trade.screenshot_url && (
                          <button
                            onClick={() => setSelectedScreenshotUrl(trade.screenshot_url ?? null)}
                            className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                            title="View screenshot"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDetailTrade(trade);
                          }}
                          className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTrade(trade);
                            setShowForm(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          title="Edit trade"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          disabled={isDeleting === trade.id}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete trade"
                        >
                          {isDeleting === trade.id ? (
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Pagination */}
              <div className="card p-4 flex flex-col items-center gap-3 bg-[#0a0b12]/50 rounded-2xl border border-white/[0.06] mt-4">
                <span className="text-xs text-gray-500">
                  Showing <span className="text-gray-300 font-medium">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, trades.length)}</span> of <span className="text-gray-300 font-medium">{trades.length}</span> trades
                </span>
                <div className="flex items-center gap-3 w-full justify-between">
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2.5 py-1.5 bg-[#151823] border border-white/[0.06] rounded-lg text-gray-400 text-xs focus:outline-none hover:border-white/[0.12] transition-colors [color-scheme:dark]">
                    <option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option>
                  </select>
                  
                  <div className="flex items-center gap-1 bg-[#151823] rounded-lg border border-white/[0.06] p-0.5">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-xs text-gray-300 px-3 py-1 font-medium tabular-nums">
                      {currentPage} <span className="text-gray-600">of</span> {totalPages}
                    </span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
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
            <img src={resolveTradingViewUrl(selectedScreenshotUrl)} alt="Trade Screenshot" className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto" />
          </div>
        </div>
      )}

      {/* Screenshot Edit/Embed Modal */}
      {screenshotEditTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setScreenshotEditTrade(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0d0e16] rounded-2xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-[#0d0e16]">
              <h2 className="text-base font-bold text-white">Add Screenshot to {screenshotEditTrade.symbol}</h2>
              <button onClick={() => setScreenshotEditTrade(null)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setScreenshotEditTab('upload')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    screenshotEditTab === 'upload'
                      ? 'text-indigo-400 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setScreenshotEditTab('embed')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    screenshotEditTab === 'embed'
                      ? 'text-indigo-400 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Embed Link
                </button>
              </div>
              
              <div>
                {screenshotEditTab === 'upload' ? (
                  <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all cursor-pointer">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-400">Choose an image file or <span className="text-indigo-400 font-semibold">browse</span></span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleUploadScreenshot(screenshotEditTrade, file);
                          setScreenshotEditTrade(null);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={screenshotEditEmbedUrl}
                      onChange={e => setScreenshotEditEmbedUrl(e.target.value)}
                      placeholder="Paste TradingView link (e.g. https://www.tradingview.com/x/pCPdcgL4/)"
                      className="w-full px-3 py-2.5 bg-[#06070b] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (screenshotEditEmbedUrl.trim()) {
                          const resolved = resolveTradingViewUrl(screenshotEditEmbedUrl);
                          await handleUpdateScreenshot(screenshotEditTrade, resolved);
                          setScreenshotEditEmbedUrl('');
                          setScreenshotEditTrade(null);
                        }
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      Embed Link
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">Supports direct image links and TradingView chart sharing URLs (which auto-convert to direct image PNGs).</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Learnings Modal */}
      {notesModalTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setNotesModalTrade(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl p-6 text-left border relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.8), 0 4px 16px -4px rgba(0,0,0,0.5)',
            }}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Learnings & Notes
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Trade: <span className="text-gray-300 font-semibold">{notesModalTrade.symbol}</span> · {notesModalTrade.type === 'Long' ? 'BUY' : 'SELL'} · P&L: <span className={notesModalTrade.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(notesModalTrade.profit_loss || 0)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setNotesModalTrade(null)}
                  className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Textarea */}
              <div className="mb-6 flex-grow">
                <textarea
                  value={notesModalText}
                  onChange={e => setNotesModalText(e.target.value)}
                  className="w-full h-64 p-4 bg-black/40 border border-white/[0.08] focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 resize-none font-sans leading-relaxed"
                  placeholder="What did you learn from this trade? Detail your strategy, emotional triggers, entry/exit criteria, and potential mistakes..."
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
                <button
                  onClick={() => setNotesModalTrade(null)}
                  className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const currentTrade = notesModalTrade;
                    const text = notesModalText;
                    
                    // Optimistic update
                    setTrades(prev => prev.map(t => t.id === currentTrade.id ? { ...t, notes: text } : t));
                    setNotesModalTrade(null);
                    
                    try {
                      await updateTrade({ ...currentTrade, notes: text });
                      toast.success('Learnings note updated');
                    } catch (error) {
                      console.error(error);
                      toast.error('Failed to update note');
                    }
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <TradeAIChatBox selectedTrades={selectedTradesForAI.length > 0 ? selectedTradesForAI : filteredTrades} />
    </AuthenticatedLayout>
  )
}

// Vercel deployment trigger: 2026-06-19
