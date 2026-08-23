import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade, TradingAccount } from '@/lib/types';
import { BrainCircuit, TrendingDown, ShieldCheck, ShieldAlert, ArrowRight, Sparkles, ChevronDown, Flame, Scale, AlertTriangle, Layers } from 'lucide-react';

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
  startDate: string;
  endDate: string;
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
  startDate,
  endDate,
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
      {/* Sticky Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedTradeIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 sticky top-4 z-40 bg-white dark:bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs font-sans"
          >
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold border border-indigo-500/20">
                {selectedTradeIds.length} Selected
              </span>
              <span className="text-slate-600 dark:text-slate-400 text-xs hidden sm:inline">
                Perform batch operations on selected trades:
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onBulkAction('tag')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Bulk Tag
              </button>

              <button
                type="button"
                onClick={() => onBulkAction('export')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>

              <button
                type="button"
                onClick={() => onBulkAction('delete')}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

              <button
                type="button"
                onClick={onClearSelection}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Views Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2 items-center">
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border border-transparent ${
                activeView === view.id
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Density</span>
            <div className="flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.06] shadow-sm">
              <button
                onClick={() => onDensityChange('compact')}
                className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 ${
                  tableDensity === 'compact'
                    ? 'bg-white dark:bg-[#121420] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/[0.08] shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium border border-transparent'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => onDensityChange('comfortable')}
                className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 ${
                  tableDensity === 'comfortable'
                    ? 'bg-white dark:bg-[#121420] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/[0.08] shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium border border-transparent'
                }`}
              >
                Comfortable
              </button>
            </div>
          </div>

          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`popover-trigger px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 shadow-sm ${
                showColumnMenu ? 'text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-500/40' : ''
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
              Columns
            </button>
            {showColumnMenu && (
              <div
                className="popover-container absolute right-0 top-full mt-2 z-30 rounded-2xl border bg-white dark:bg-[var(--surface-raised)] border-slate-200 dark:border-white/[0.08] shadow-2xl p-0.5 w-[220px] text-left"
              >
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.12em]">Toggle Columns</div>
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
                      { key: 'strategy', label: 'Primary Strategy' },
                      { key: 'mindset', label: 'Mindset' },
                      { key: 'tags', label: 'Strategy Tags' },
                      { key: 'mistakes', label: 'Mistake Tags' },
                      { key: 'notes', label: 'Learnings' },
                      { key: 'account', label: 'Account' },
                    ]},
                  ].map(group => (
                    <div key={group.section}>
                      <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]">{group.section}</div>
                      {group.items.map(col => (
                        <button
                          key={col.key}
                          onClick={() => onToggleColumn(col.key)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-[7px] text-xs rounded-lg transition-all duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] group/col text-left text-slate-700 dark:text-slate-200"
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200 ${
                              visibleColumns[col.key]
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-500/20'
                                : 'bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1]'
                            }`}
                          >
                            {visibleColumns[col.key] && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`${visibleColumns[col.key] ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-400 dark:text-slate-500'} group-hover/col:text-slate-900 dark:group-hover/col:text-white transition-colors`}>
                            {col.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                {/* Wrap Tags */}
                <div className="px-3 py-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    onClick={onToggleWrapTags}
                    className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <span>Wrap Tags & Cells</span>
                    <div
                      className={`w-8 h-4 rounded-full relative transition-colors duration-200 shrink-0 border ${
                        wrapTags 
                          ? 'bg-indigo-600 border-indigo-500' 
                          : 'bg-black/10 dark:bg-white/10 border-black/10 dark:border-white/10'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full bg-white absolute top-[1px] transition-transform duration-200"
                        style={{
                          left: '1.5px',
                          transform: wrapTags ? 'translateX(14px)' : 'translateX(0px)',
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
          className="mb-4 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-[#0e111d] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all inline-flex items-center gap-2.5 shadow-sm active:scale-95 group"
        >
          <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BrainCircuit className="w-3.5 h-3.5" />
          </div>
          <span>{showIntelligence ? 'Hide AI Intelligence' : 'Show AI Intelligence'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${showIntelligence ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showIntelligence && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Left Panel: Top Mistake Cost */}
                <div className="card rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0e111d] shadow-sm dark:shadow-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Mistake Cost</h3>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Realized Loss Impact
                      </span>
                    </div>

                    {topMistakeCost.length === 0 ? (
                      <div className="py-8 px-4 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/50 dark:bg-white/[0.015] border border-dashed border-slate-200 dark:border-white/[0.06]">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Mistake Leaks Detected</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                          Your closed trades currently have no realized losses attributed to mistake tags. Continue maintaining disciplined trade executions.
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span>$0.00 Lost to Discipline Mistakes</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.04]">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Leakage Drag</span>
                          <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                            -${topMistakeCost.reduce((sum, [, cost]) => sum + cost, 0).toFixed(2)}
                          </span>
                        </div>
                        {topMistakeCost.map(([mistake, cost]) => {
                          const total = topMistakeCost.reduce((sum, [, c]) => sum + c, 0);
                          const pct = total > 0 ? (cost / total) * 100 : 0;
                          return (
                            <div key={mistake} className="p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.015] border border-slate-200/80 dark:border-white/[0.04] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                  {mistake}
                                </span>
                                <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                                  -${cost.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full" style={{ width: `${Math.min(100, Math.max(5, pct))}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Smart Review Queue */}
                <div className="card rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0e111d] shadow-sm dark:shadow-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Smart Review Queue</h3>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Needs Attention ({reviewQueue.length})
                      </span>
                    </div>

                    {reviewQueue.length === 0 ? (
                      <div className="py-8 px-4 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/50 dark:bg-white/[0.015] border border-dashed border-slate-200 dark:border-white/[0.06]">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Review Queue Clear</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                          All logged trades have complete strategy tags and healthy execution discipline.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                        {reviewQueue.map(({ trade, reasons, quality }) => {
                          const isHighRisk = reasons.length >= 3 || quality < 50;
                          const isMedRisk = reasons.length === 2 || (quality >= 50 && quality < 70);
                          
                          const borderClass = isHighRisk 
                            ? 'border-rose-500/30 hover:border-rose-500/60 dark:hover:border-rose-500/60' 
                            : isMedRisk 
                              ? 'border-amber-500/30 hover:border-amber-500/60 dark:hover:border-amber-500/60' 
                              : 'border-indigo-500/30 hover:border-indigo-500/60 dark:hover:border-indigo-500/60';
                          
                          const hasStrategyTags = trade.tags && trade.tags.length > 0;
                          
                          return (
                            <button
                              key={trade.id}
                              onClick={() => onReviewClick(trade)}
                              className={`w-full flex flex-col sm:flex-row sm:items-center justify-between text-left p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border ${borderClass} transition-all duration-200 gap-3 group shadow-sm hover:shadow-md hover:-translate-y-0.5`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                {/* Status Indicator Strip */}
                                <div 
                                  className={`w-1.5 self-stretch rounded-full shrink-0 ${
                                    isHighRisk ? 'bg-rose-500' : isMedRisk ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`} 
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {trade.symbol}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 uppercase">
                                      {trade.type} {trade.lots ? `${trade.lots} Lot` : ''}
                                    </span>
                                    {trade.profit_loss !== undefined && (
                                      <span className={`text-xs font-mono font-bold ${
                                        trade.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                      }`}>
                                        {trade.profit_loss >= 0 ? '+' : ''}{fmtCurrency(trade.profit_loss)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {hasStrategyTags ? (
                                      trade.tags?.map(tag => (
                                        <span key={tag} className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                          {tag}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] flex items-center gap-1">
                                        <Layers className="w-2.5 h-2.5" />
                                        No Strategy Tags
                                      </span>
                                    )}

                                    {reasons.filter(r => r !== 'no-plan').map(reason => {
                                      if (reason === 'fomo') {
                                        return (
                                          <span key={reason} className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20 flex items-center gap-1">
                                            <Flame className="w-2.5 h-2.5 text-orange-500" />
                                            FOMO
                                          </span>
                                        );
                                      }
                                      if (reason === 'oversized') {
                                        return (
                                          <span key={reason} className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                                            <Scale className="w-2.5 h-2.5 text-amber-500" />
                                            Oversized
                                          </span>
                                        );
                                      }
                                      return (
                                        <span key={reason} className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
                                          <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                                          Large Loss
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                {/* Execution Score Badge */}
                                <div className="text-right">
                                  <span className="text-[9px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 block">Score</span>
                                  <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-md ${
                                    quality >= 70 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : quality >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {quality}%
                                  </span>
                                </div>
                                
                                {/* Review CTA Button */}
                                <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-200 flex items-center gap-1 shadow-sm">
                                  <span>Review</span>
                                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
            <div className="card rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0e16]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Symbol</label>
                  <select value={symbolFilter || ''} onChange={e => onFilterChange('symbolFilter', e.target.value || null)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                    <option value="">All Symbols</option>
                    {uniqueSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Direction</label>
                  <select value={typeFilter} onChange={e => onFilterChange('typeFilter', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                    <option value="All">All</option><option value="Long">Long</option><option value="Short">Short</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                    Period
                    {(startDate || endDate) && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30 uppercase tracking-wide font-bold">Custom</span>
                    )}
                  </label>
                  <select value={dateFilter} onChange={e => onFilterChange('dateFilter', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                    <option value="All">All Time</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="1y">1 Year</option>
                  </select>
                </div>
                {/* Custom Date Range */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => onFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => onFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Account</label>
                  <select value={accountFilter || ''} onChange={e => onFilterChange('accountFilter', e.target.value || null)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                    <option value="">All Accounts</option>
                    {userAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_number})</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={onResetFilters}
                    className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-slate-50 dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-lg transition-colors hover:bg-slate-100 font-semibold">
                    Reset All
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
              <span className="text-sm text-indigo-600 dark:text-indigo-300 font-semibold">{selectedTradeIds.length} selected</span>
              <div className="flex gap-1.5">
                <button onClick={() => onBulkAction('delete')} className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">Delete</button>
                <button onClick={() => onBulkAction('export')} className="px-3 py-1.5 text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">Export</button>
                <button onClick={() => onBulkAction('tag')} className="px-3 py-1.5 text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors">Tag</button>
              </div>
            </div>
            <button onClick={onClearSelection} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors font-medium">Clear</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TradesFilters;
