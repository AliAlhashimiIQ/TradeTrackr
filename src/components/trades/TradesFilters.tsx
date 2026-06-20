import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade, TradingAccount } from '@/lib/types';
import { isForexPair } from '@/lib/forexUtils';

type SavedView = 'all' | 'forex' | 'mistakes' | 'winners' | 'losers' | 'review';
type TableDensity = 'compact' | 'comfortable';
type ReviewReason = 'fomo' | 'oversized' | 'no-plan' | 'large-loss';

const getReviewReasonLabel = (reason: ReviewReason): string => {
  if (reason === 'fomo') return 'FOMO';
  if (reason === 'oversized') return 'Oversized';
  if (reason === 'no-plan') return 'No Plan';
  return 'Large Loss';
};

const fmtCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export interface TradesFiltersProps {
  activeView: SavedView;
  onViewChange: (view: SavedView) => void;
  tableDensity: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (colKey: string) => void;
  wrapTags: boolean;
  onToggleWrapTags: () => void;
  showIntelligence: boolean;
  onToggleIntelligence: () => void;
  topMistakeCost: [string, number][];
  reviewQueue: { trade: Trade; reasons: ReviewReason[]; quality: number }[];
  onReviewClick: (trade: Trade) => void;
  showFilters: boolean;
  symbolFilter: string | null;
  typeFilter: 'All' | 'Long' | 'Short';
  dateFilter: 'All' | '7d' | '30d' | '90d' | '1y';
  accountFilter: string | null;
  uniqueSymbols: string[];
  userAccounts: TradingAccount[];
  onFilterChange: (field: string, value: any) => void;
  onResetFilters: () => void;
  selectedTradeIds: string[];
  onBulkAction: (action: 'delete' | 'export' | 'tag') => void;
  onClearSelection: () => void;
}

export const TradesFilters: React.FC<TradesFiltersProps> = ({
  activeView,
  onViewChange,
  tableDensity,
  onDensityChange,
  visibleColumns,
  onToggleColumn,
  wrapTags,
  onToggleWrapTags,
  showIntelligence,
  onToggleIntelligence,
  topMistakeCost,
  reviewQueue,
  onReviewClick,
  showFilters,
  symbolFilter,
  typeFilter,
  dateFilter,
  accountFilter,
  uniqueSymbols,
  userAccounts,
  onFilterChange,
  onResetFilters,
  selectedTradeIds,
  onBulkAction,
  onClearSelection,
}) => {
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!document.body.contains(target)) return;
      if (target.closest('.popover-container') || target.closest('.popover-trigger')) return;
      setShowColumnMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Saved Views Panel */}
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
              onClick={() => onViewChange(view.id as SavedView)}
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
              onClick={() => onDensityChange('compact')}
              className="px-2.5 py-1 text-xs rounded-md transition-all duration-200"
              style={tableDensity === 'compact' ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 10px rgba(99,102,241,0.12), 0 1px 0 rgba(255,255,255,0.1) inset' } : { color: '#6b7280', border: '1px solid transparent' }}
            >
              Compact
            </button>
            <button
              onClick={() => onDensityChange('comfortable')}
              className="px-2.5 py-1 text-xs rounded-md transition-all duration-200"
              style={tableDensity === 'comfortable' ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 10px rgba(99,102,241,0.12), 0 1px 0 rgba(255,255,255,0.1) inset' } : { color: '#6b7280', border: '1px solid transparent' }}
            >
              Comfortable
            </button>
          </div>

          {/* Column Visibility Menu */}
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
                className="popover-container absolute right-0 top-full mt-2 z-30 rounded-2xl overflow-hidden text-left"
                style={{
                  backgroundColor: '#0d0e16',
                  backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)',
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
                          onClick={() => onToggleColumn(col.key)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-[7px] text-xs rounded-lg transition-all duration-150 hover:bg-white/[0.04] group/col text-left"
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
                {/* Wrap Tags */}
                <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={onToggleWrapTags}
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
      <div className="mb-6 text-left">
        <button
          onClick={onToggleIntelligence}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                <div className="card rounded-xl p-4 border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0e16]">
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

                <div className="card rounded-xl p-4 border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0e16]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="text-indigo-400 text-lg">🔍</span>
                      Smart Review Queue
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Needs Attention
                    </span>
                  </div>
                  {reviewQueue.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">No high-priority reviews right now.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {reviewQueue.map(({ trade, reasons, quality }) => {
                        const isHighRisk = reasons.length >= 3 || quality < 50;
                        const isMedRisk = reasons.length === 2 || (quality >= 50 && quality < 70);
                        
                        // Determine border color based on severity
                        const severityBorder = isHighRisk 
                          ? 'hover:border-red-500/30' 
                          : isMedRisk 
                            ? 'hover:border-amber-500/30' 
                            : 'hover:border-indigo-500/30';
                        
                        return (
                          <button
                            key={trade.id}
                            onClick={() => onReviewClick(trade)}
                            className={`w-full flex flex-col sm:flex-row sm:items-center justify-between text-left p-3.5 rounded-xl bg-white/[0.015] hover:bg-white/[0.04] border border-white/[0.03] ${severityBorder} transition-all duration-300 gap-3 group`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Left status vertical indicator strip */}
                              <div 
                                className={`w-1 self-stretch rounded-full ${
                                  isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-indigo-400'
                                }`} 
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                    {trade.symbol}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-white/[0.04] text-gray-400 uppercase">
                                    {trade.type} {trade.lots ? `${trade.lots} Lot` : ''}
                                  </span>
                                  {trade.profit_loss !== undefined && (
                                    <span className={`text-xs font-mono font-bold ${
                                      trade.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                      {trade.profit_loss >= 0 ? '+' : ''}{fmtCurrency(trade.profit_loss)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {reasons.map(reason => {
                                    if (reason === 'fomo') {
                                      return (
                                        <span key={reason} className="text-[9px] px-2 py-0.5 rounded font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                          FOMO
                                        </span>
                                      );
                                    }
                                    if (reason === 'no-plan') {
                                      return (
                                        <span key={reason} className="text-[9px] px-2 py-0.5 rounded font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                          No Plan
                                        </span>
                                      );
                                    }
                                    if (reason === 'oversized') {
                                      return (
                                        <span key={reason} className="text-[9px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                          Oversized
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={reason} className="text-[9px] px-2 py-0.5 rounded font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                        Large Loss
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {/* Quality Score Indicator */}
                              <div className="text-right">
                                <span className="text-[10px] text-gray-500 block">Quality</span>
                                <span className={`text-xs font-bold font-mono ${
                                  quality >= 70 ? 'text-emerald-400' : quality >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {quality}%
                                </span>
                              </div>
                              
                              {/* Review CTA Div */}
                              <div className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] border border-white/[0.06] text-gray-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-300">
                                Review &rarr;
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden text-left">
            <div className="card rounded-xl p-4 border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0e16]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Symbol</label>
                  <select value={symbolFilter || ''} onChange={e => onFilterChange('symbolFilter', e.target.value || null)}
                    className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                    <option value="">All Symbols</option>
                    {uniqueSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Direction</label>
                  <select value={typeFilter} onChange={e => onFilterChange('typeFilter', e.target.value)}
                    className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                    <option value="All">All</option><option value="Long">Long</option><option value="Short">Short</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Period</label>
                  <select value={dateFilter} onChange={e => onFilterChange('dateFilter', e.target.value)}
                    className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                    <option value="All">All Time</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="1y">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Account</label>
                  <select value={accountFilter || ''} onChange={e => onFilterChange('accountFilter', e.target.value || null)}
                    className="w-full px-3 py-2 bg-[#151823] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]">
                    <option value="">All Accounts</option>
                    {userAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_number})</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={onResetFilters}
                    className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white bg-[#151823] border border-white/[0.06] rounded-lg transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Panel */}
      <AnimatePresence>
        {selectedTradeIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-indigo-300 font-medium">{selectedTradeIds.length} selected</span>
              <div className="flex gap-1.5">
                <button onClick={() => onBulkAction('delete')} className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">Delete</button>
                <button onClick={() => onBulkAction('export')} className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">Export</button>
                <button onClick={() => onBulkAction('tag')} className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors">Tag</button>
              </div>
            </div>
            <button onClick={onClearSelection} className="text-xs text-gray-500 hover:text-white transition-colors">Clear</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TradesFilters;
