import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade, TradingAccount } from '@/lib/types';
import { isForexPair, formatLots, formatPips } from '@/lib/forexUtils';
import { resolveTradingViewUrl, getTagStyle } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import InlineTagPopover from './InlineTagPopover';
import { toast } from 'react-hot-toast';

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
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
};

export const MIN_COLUMN_WIDTHS: Record<string, number> = {
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
};

export const EMOTIONS = [
  { value: 'confident', label: 'Confident', bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  { value: 'calm', label: 'Calm', bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  { value: 'neutral', label: 'Neutral', bg: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' },
  { value: 'anxious', label: 'Anxious', bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  { value: 'fomo', label: 'FOMO', bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  { value: 'revenge', label: 'Revenge', bg: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  { value: 'fear', label: 'Fear', bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  { value: 'greed', label: 'Greed', bg: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
];

export interface TradesTableProps {
  filteredTrades: Trade[];
  tableDensity: 'compact' | 'comfortable';
  visibleColumns: Record<string, boolean>;
  wrapTags: boolean;
  columnWidths: Record<string, number>;
  onColumnWidthChange: (colKey: string, width: number) => void;
  onResetColumnWidth: (colKey: string) => void;
  selectedTradeIds: string[];
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectTrade: (id: string, checked: boolean) => void;
  onStartInlineAdd: (index: number) => void;
  inlineNewRowIndex: number | null;
  inlineRowData: Partial<Trade> | null;
  inlineScreenshotFile?: File | null;
  onInlineScreenshotFileChange?: (file: File | null) => void;
  onInlineChange: (field: keyof Trade, value: any) => void;
  onInlineSave: () => Promise<void>;
  onInlineCancel: () => void;
  onToggleTag: (trade: Trade, tag: string, isMistake: boolean) => Promise<void>;
  allExistingTags: string[];
  allExistingMistakes: string[];
  userTagsConfig: any[];
  fetchUserTags: () => Promise<void>;
  user: any;
  onRenameTagGlobally: (oldName: string, newName: string, isMistake: boolean) => Promise<void>;
  onUpdateTagColor: (tag: string, colorHex: string, isMistake: boolean) => Promise<void>;
  onDeleteTagGlobally: (tag: string, isMistake: boolean) => Promise<void>;
  onUploadScreenshot: (trade: Trade, file: File) => Promise<void>;
  onUpdateScreenshot: (trade: Trade, url: string) => Promise<void>;
  onDeleteTrade: (id: string) => Promise<void>;
  onEditTradeClick: (trade: Trade) => void;
  onDetailTradeClick: (trade: Trade) => void;
  onScreenshotClick: (url: string) => void;
  onScreenshotEditClick: (trade: Trade) => void;
  onNotesEditClick: (trade: Trade) => void;
  isDeleting: string | null;
  uploadingTradeId: string | null;
  userAccounts: TradingAccount[];
  accountsMap: Map<string, string>;
  sortField: keyof Trade;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof Trade) => void;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  formatCurrency: (value: number) => string;
}

export const TradesTable: React.FC<TradesTableProps> = ({
  filteredTrades,
  tableDensity,
  visibleColumns,
  wrapTags,
  columnWidths,
  onColumnWidthChange,
  onResetColumnWidth,
  selectedTradeIds,
  onToggleSelectAll,
  onToggleSelectTrade,
  onStartInlineAdd,
  inlineNewRowIndex,
  inlineRowData,
  inlineScreenshotFile = null,
  onInlineScreenshotFileChange,
  onInlineChange,
  onInlineSave,
  onInlineCancel,
  onToggleTag,
  allExistingTags,
  allExistingMistakes,
  userTagsConfig,
  fetchUserTags,
  user,
  onRenameTagGlobally,
  onUpdateTagColor,
  onDeleteTagGlobally,
  onUploadScreenshot,
  onUpdateScreenshot,
  onDeleteTrade,
  onEditTradeClick,
  onDetailTradeClick,
  onScreenshotClick,
  onScreenshotEditClick,
  onNotesEditClick,
  isDeleting,
  uploadingTradeId,
  userAccounts,
  accountsMap,
  sortField,
  sortDirection,
  onSort,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  formatCurrency,
}) => {
  const [activePopover, setActivePopover] = useState<{ tradeId: string; type: 'tags' | 'mistakes' | 'note-preview' | 'mindset' } | null>(null);
  const [showInlineScreenshotModal, setShowInlineScreenshotModal] = useState(false);
  const [inlineScreenshotTab, setInlineScreenshotTab] = useState<'upload' | 'embed'>('upload');
  const [inlineScreenshotEmbedUrlInput, setInlineScreenshotEmbedUrlInput] = useState('');

  const inlineScreenshotPreviewUrl = useMemo(() => {
    return inlineScreenshotFile ? URL.createObjectURL(inlineScreenshotFile) : null;
  }, [inlineScreenshotFile]);

  // Close active popovers when clicking outside popover-container and popover-trigger
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!document.body.contains(target)) return;
      if (target.closest('.popover-container') || target.closest('.popover-trigger')) return;
      setActivePopover(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const minW = MIN_COLUMN_WIDTHS[colKey] || 50;
      const newWidth = Math.max(minW, startWidth + deltaX);
      onColumnWidthChange(colKey, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderResizeHandle = (colKey: string) => {
    return (
      <div
        onMouseDown={(e) => handleMouseDown(e, colKey)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onResetColumnWidth(colKey);
        }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/80 active:bg-indigo-500 z-20 group-hover/header:bg-white/[0.08] transition-colors"
        title="Drag to resize, double-click to reset"
      />
    );
  };

  const getGridTemplateColumns = () => {
    const getWidth = (key: string, def: string) => {
      const w = columnWidths[key];
      return w ? `${w}px` : def;
    };
    const cols = [
      getWidth('checkbox', '52px'),
      getWidth('screenshot', '55px'),
      getWidth('symbol', '110px'),
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
      getWidth('actions', '100px'),
    ];
    return cols.filter(Boolean).join(' ');
  };

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
        className="grid gap-2 px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-[#0d0e16]/95 border-t border-b border-white/[0.06] sticky bottom-0 z-10 items-center min-w-full text-left"
        style={{ gridTemplateColumns: getGridTemplateColumns() }}
      >
        <div />
        <div />
        <div className="font-bold text-white text-[10px]">TOTALS ({filteredTrades.length})</div>
        {visibleColumns.side && <div />}
        {visibleColumns.entry && <div />}
        {visibleColumns.exit && <div />}
        {visibleColumns.lots && (
          <div className="text-right font-mono text-gray-300 tabular-nums">
            {formatLots(totals.totalLots)}
          </div>
        )}
        {visibleColumns.pips && (
          <div className="text-right font-mono text-gray-300 tabular-nums">
            {totals.avgPips !== 0 ? `${totals.avgPips.toFixed(1)} avg` : '--'}
          </div>
        )}
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
        {visibleColumns.percentGain && (
          <div
            className="text-right font-mono tabular-nums"
            style={{ color: totals.avgPctGain > 0 ? '#34d399' : totals.avgPctGain < 0 ? '#f87171' : '#9ca3af' }}
          >
            {totals.avgPctGain !== 0 ? `${totals.avgPctGain.toFixed(2)}% avg` : '--'}
          </div>
        )}
        {visibleColumns.commission && (
          <div className="text-right font-mono text-gray-400 tabular-nums">
            {formatCurrency(totals.totalCommission)}
          </div>
        )}
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
        {visibleColumns.date && <div />}
        {visibleColumns.openTime && <div />}
        {visibleColumns.closeTime && <div />}
        {visibleColumns.holdTime && (
          <div className="text-right font-mono text-gray-300 tabular-nums">
            {totals.avgHoldTimeStr}
          </div>
        )}
        {visibleColumns.stopLoss && <div />}
        {visibleColumns.takeProfit && <div />}
        {visibleColumns.account && <div />}
        {visibleColumns.mindset && <div />}
        {visibleColumns.tags && <div />}
        {visibleColumns.mistakes && <div />}
        {visibleColumns.notes && <div />}
        <div 
          className="sticky right-0 z-20 h-full pr-5 -mr-5 bg-[#0d0e16]/95"
          style={{
            boxShadow: '-8px 0 12px -4px rgba(0,0,0,0.5)',
          }}
        />
      </div>
    );
  };

  const renderTagsPopover = (trade: Trade, isMistake: boolean, renderUp = false) => {
    if (!trade) return null;
    return (
      <InlineTagPopover
        trade={trade}
        isMistake={isMistake}
        onClose={() => setActivePopover(null)}
        onToggleTag={(t, tag, isM) => onToggleTag(t, tag, isM)}
        presetsList={isMistake ? allExistingMistakes : allExistingTags}
        onDeleteTagGlobally={onDeleteTagGlobally}
        renderUp={renderUp}
        userTagsConfig={userTagsConfig}
        fetchUserTags={fetchUserTags}
        user={user}
        onRenameTagGlobally={onRenameTagGlobally}
        onUpdateTagColor={onUpdateTagColor}
      />
    );
  };

  const renderInlineEditorRow = () => {
    if (!inlineRowData) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onInlineSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onInlineCancel();
      }
    };

    return (
      <div
        className="grid gap-2 px-5 py-3.5 items-center relative animate-fadeInOpacity min-w-full text-left"
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
          backgroundColor: '#0d0e16',
          backgroundImage: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 50%, rgba(99, 102, 241, 0.08) 100%)',
          borderTop: '1px solid rgba(99, 102, 241, 0.25)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.8), 0 0 16px rgba(99, 102, 241, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
          zIndex: activePopover?.tradeId === 'new-row' ? 30 : 10,
        }}
      >
        {/* Actions Col 1 (draft status) */}
        <div className="flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_12px_#818cf8]" title="Draft Trade" />
        </div>

        {/* Screenshot preview */}
        <div className="flex items-center justify-center">
          {inlineScreenshotPreviewUrl || inlineRowData.screenshot_url ? (
            <div className="relative w-11 h-8 rounded border border-white/[0.15] overflow-hidden group">
              <img
                src={inlineScreenshotPreviewUrl || resolveTradingViewUrl(inlineRowData.screenshot_url)}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  onInlineScreenshotFileChange?.(null);
                  onInlineChange?.('screenshot_url', undefined);
                }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Remove photo"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setInlineScreenshotTab('upload');
                setInlineScreenshotEmbedUrlInput('');
                setShowInlineScreenshotModal(true);
              }}
              className="w-11 h-8 rounded border border-dashed border-white/[0.15] bg-white/[0.02] hover:border-indigo-500/50 hover:bg-indigo-500/[0.04] flex items-center justify-center text-gray-500 hover:text-indigo-400 transition-all duration-200"
              title="Add photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Symbol */}
        <div>
          <input
            type="text"
            value={inlineRowData.symbol || ''}
            onChange={e => onInlineChange('symbol', e.target.value.toUpperCase())}
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
              onClick={() => onInlineChange('type', inlineRowData.type === 'Long' ? 'Short' : 'Long')}
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
              onChange={e => onInlineChange('entry_price', parseFloat(e.target.value) || 0)}
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
              onChange={e => onInlineChange('exit_price', parseFloat(e.target.value) || 0)}
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
                onInlineChange('lots', val);
                onInlineChange('quantity', val);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.10"
            />
          </div>
        )}

        {/* Pips */}
        {visibleColumns.pips && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.pips !== undefined && inlineRowData.pips !== null ? inlineRowData.pips : ''}
              onChange={e => onInlineChange('pips', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white text-right placeholder-gray-600 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="0.0"
            />
          </div>
        )}

        {/* P&L */}
        {visibleColumns.pnl && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.profit_loss || ''}
              onChange={e => onInlineChange('profit_loss', parseFloat(e.target.value) || 0)}
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
          <div className="text-right text-xs font-mono text-gray-500 font-sans">
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
              onChange={e => onInlineChange('commission', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                onInlineChange('entry_time', dateVal);
                onInlineChange('exit_time', dateVal);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark] transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
            />
          </div>
        )}

        {/* Extra columns */}
        {visibleColumns.openTime && (
          <div>
            <input
              type="datetime-local"
              value={inlineRowData.entry_time ? new Date(inlineRowData.entry_time).toISOString().slice(0, 16) : ''}
              onChange={e => onInlineChange('entry_time', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
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
              onChange={e => onInlineChange('exit_time', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
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
              onChange={e => onInlineChange('stop_loss', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
              onChange={e => onInlineChange('take_profit', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
              onChange={e => onInlineChange('account_id', e.target.value || null)}
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
                  className="popover-container absolute left-0 top-full mt-1.5 z-30 bg-[#151823] border border-white/[0.08] rounded-xl shadow-2xl p-2 w-[160px] space-y-1 text-left"
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
                            onInlineChange('emotional_state', emotion.value);
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
                    onClick={() => onToggleTag(inlineRowData as Trade, tag, false)}
                    className="hover:text-red-400 text-gray-500 text-[10px] font-bold transition-colors font-sans"
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
              {activePopover?.tradeId === 'new-row' && activePopover?.type === 'tags' && renderTagsPopover(inlineRowData as Trade, false, inlineNewRowIndex !== null && inlineNewRowIndex >= Math.max(1, filteredTrades.length - 1))}
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
                    onClick={() => onToggleTag(inlineRowData as Trade, mistake, true)}
                    className="hover:text-red-400 text-gray-500 text-[10px] font-bold transition-colors font-sans"
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
              {activePopover?.tradeId === 'new-row' && activePopover?.type === 'mistakes' && renderTagsPopover(inlineRowData as Trade, true, inlineNewRowIndex !== null && inlineNewRowIndex >= Math.max(1, filteredTrades.length - 1))}
            </AnimatePresence>
          </div>
        )}

        {/* Learnings */}
        {visibleColumns.notes && (
          <div>
            <input
              type="text"
              value={inlineRowData.notes || ''}
              onChange={e => onInlineChange('notes', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#151823] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)_inset]"
              placeholder="Notes..."
            />
          </div>
        )}

        {/* Actions (Save / Cancel) */}
        <div 
          className="sticky right-0 z-20 flex items-center justify-end gap-2 pr-5 -mr-5 h-full"
          style={{
            backgroundColor: '#0d0e16',
            boxShadow: '-8px 0 12px -4px rgba(0,0,0,0.5)',
          }}
        >
          <button
            type="button"
            onClick={onInlineSave}
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
            title="Save Trade"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          </button>
          <button
            type="button"
            onClick={onInlineCancel}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.1)]"
            title="Cancel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block card rounded-2xl overflow-x-auto scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent min-h-[450px]">
        <div style={{ minWidth: '1100px' }} className="min-w-full w-max text-left">
          {/* Table Header */}
          <div
            className="grid gap-2 px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] sticky top-0 z-10 min-w-full text-left"
            style={{
              gridTemplateColumns: getGridTemplateColumns(),
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(10,11,18,0.9)',
            }}
          >
            <div className="relative group/header flex items-center justify-center h-full">
              <input
                type="checkbox"
                checked={filteredTrades.length > 0 && selectedTradeIds.length === filteredTrades.length}
                onChange={e => onToggleSelectAll(e.target.checked)}
                className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-4 h-4 cursor-pointer"
              />
              {renderResizeHandle('checkbox')}
            </div>
            <div className="relative group/header text-center flex items-center justify-center h-full">
              <span className="truncate">Trade</span>
              {renderResizeHandle('screenshot')}
            </div>
            <div
              className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full"
              onClick={() => onSort('symbol')}
            >
              <span className="truncate">Symbol {sortField === 'symbol' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
              {renderResizeHandle('symbol')}
            </div>
            {visibleColumns.side && (
              <div
                className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full"
                onClick={() => onSort('type')}
              >
                <span className="truncate">Side</span>
                {renderResizeHandle('side')}
              </div>
            )}
            {visibleColumns.entry && (
              <div
                className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center justify-end gap-1 text-right h-full w-full"
                onClick={() => onSort('entry_price')}
              >
                <span className="truncate">Entry {sortField === 'entry_price' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
                {renderResizeHandle('entry')}
              </div>
            )}
            {visibleColumns.exit && (
              <div
                className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center justify-end gap-1 text-right h-full w-full"
                onClick={() => onSort('exit_price')}
              >
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
              <div
                className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center justify-end gap-1 text-right h-full w-full"
                onClick={() => onSort('profit_loss')}
              >
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
              <div
                className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full"
                onClick={() => onSort('entry_time')}
              >
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
            <div 
              className="sticky right-0 z-20 text-right flex items-center justify-end h-full pr-5 -mr-5"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(10,11,18,0.95)',
                backdropFilter: 'blur(8px)',
                boxShadow: '-8px 0 12px -4px rgba(0,0,0,0.5)',
              }}
            >
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
                <div key={trade.id} className="relative min-w-full text-left" style={{ zIndex: (activePopover?.tradeId === trade.id || idx === inlineNewRowIndex) ? 30 : 1 }}>
                  {idx === inlineNewRowIndex && renderInlineEditorRow()}
                  
                  {/* Notion-style hover insert line between rows */}
                  {idx > 0 && (
                    <div
                      className="group/insert absolute -top-[1px] left-0 right-0 h-[2px] z-[5] cursor-pointer"
                      onClick={() => onStartInlineAdd(idx)}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover/insert:opacity-100 transition-opacity duration-200">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />
                      </div>
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/insert:opacity-100 transition-all duration-200 flex items-center gap-1.5">
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
                    className={`grid gap-2 px-5 ${tableDensity === 'compact' ? 'py-3' : 'py-4'} items-center hover:bg-indigo-500/[0.03] transition-all duration-200 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'} ${idx !== filteredTrades.length - 1 ? 'border-b border-white/[0.04]' : ''} group/row min-w-full text-left`}
                    style={{ gridTemplateColumns: getGridTemplateColumns() }}
                  >
                    {/* Checkbox + inline add button */}
                    <div className="hidden md:flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onStartInlineAdd(idx + 1)}
                        className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-indigo-500/25 border border-white/[0.04] text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all opacity-20 group-hover/row:opacity-100 hover:scale-105 active:scale-95"
                        title="Add trade"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" /></svg>
                      </button>
                      <input
                        type="checkbox"
                        checked={selectedTradeIds.includes(trade.id)}
                        onChange={e => onToggleSelectTrade(trade.id, e.target.checked)}
                        className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Trade / Screenshot Upload */}
                    <div className="relative group flex items-center justify-center">
                      {uploadingTradeId === trade.id ? (
                        <div className="w-11 h-8 rounded bg-white/[0.02] flex items-center justify-center border border-white/[0.06]">
                          <div className="w-3.5 h-3.5 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : trade.screenshot_url ? (
                        <div 
                          onClick={() => onScreenshotClick(trade.screenshot_url || null as any)}
                          className="relative w-11 h-8 rounded border border-white/[0.15] overflow-hidden cursor-pointer hover:scale-105 transition-all group"
                        >
                          <img
                            src={resolveTradingViewUrl(trade.screenshot_url)}
                            alt="trade chart"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm("Remove screenshot?")) {
                                await onUpdateScreenshot(trade, "");
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
                            onScreenshotEditClick(trade);
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
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-400 text-right tabular-nums`}>
                        {(trade as any).commission != null ? formatCurrency((trade as any).commission) : '$0.00'}
                      </div>
                    )}

                    {/* Net Profit */}
                    {visibleColumns.netProfit && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-right tabular-nums ${(trade.profit_loss ?? 0) > 0 ? 'text-emerald-400' : (trade.profit_loss ?? 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{formatCurrency((trade.profit_loss ?? 0) - ((trade as any).commission ?? 0))}
                      </div>
                    )}

                    {/* Date */}
                    {visibleColumns.date && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-400 text-left`}>
                        {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}

                    {/* Open Time */}
                    {visibleColumns.openTime && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-400 text-left tabular-nums`}>
                        {new Date(trade.entry_time).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Close Time */}
                    {visibleColumns.closeTime && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-400 text-left tabular-nums`}>
                        {new Date(trade.exit_time).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Hold Time */}
                    {visibleColumns.holdTime && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-400 text-right tabular-nums`}>
                        {(() => { const m = Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()}
                      </div>
                    )}

                    {/* Stop Loss */}
                    {visibleColumns.stopLoss && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-400 text-right tabular-nums`}>
                        {(trade as any).stop_loss ? (trade as any).stop_loss.toFixed(isForexPair(trade.symbol) ? 5 : 2) : '--'}
                      </div>
                    )}

                    {/* Take Profit */}
                    {visibleColumns.takeProfit && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-mono text-gray-400 text-right tabular-nums`}>
                        {(trade as any).take_profit ? (trade as any).take_profit.toFixed(isForexPair(trade.symbol) ? 5 : 2) : '--'}
                      </div>
                    )}

                    {/* Account */}
                    {visibleColumns.account && (
                      <div className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} text-gray-400 text-left truncate`}>
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
                              className="popover-container absolute left-0 top-full mt-1 z-30 bg-[#151823] border border-white/[0.08] rounded-xl shadow-2xl p-2 w-[160px] space-y-1 text-left"
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
                                        // Trigger a callback that modifies the trade state and updates database
                                        onInlineChange('emotional_state', emotion.value);
                                        const updatedTrade = { ...trade, emotional_state: emotion.value };
                                        onToggleTag(updatedTrade, 'EMOTION_UPDATE_DUMMY_TAG', false);
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
                                    const updatedTrade = { ...trade, emotional_state: null as any };
                                    onToggleTag(updatedTrade, 'EMOTION_UPDATE_DUMMY_TAG', false);
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
                                  onClick={() => onToggleTag(trade, tag, false)}
                                  className="hover:opacity-80 text-[10px] font-bold transition-opacity font-sans"
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
                                  onClick={() => onToggleTag(trade, mistake, true)}
                                  className="hover:opacity-80 text-[10px] font-bold transition-opacity font-sans"
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
                      <div className="relative pr-4 min-w-0 overflow-hidden text-left">
                        <div
                          onClick={() => {
                            onNotesEditClick(trade);
                          }}
                          className="text-xs text-gray-400 hover:text-white cursor-pointer select-none truncate hover:bg-white/[0.02] p-1.5 rounded-lg border border-transparent hover:border-white/[0.04] transition-all min-h-[24px]"
                          title="Click to view/edit learnings"
                        >
                          {trade.notes || <span className="text-gray-600 italic text-[10px]">Click to add note...</span>}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div 
                      className="sticky right-0 z-10 flex items-center justify-end gap-1 pr-5 -mr-5 h-full"
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#0d0e16' : '#11121b',
                        boxShadow: '-8px 0 12px -4px rgba(0,0,0,0.5)',
                      }}
                    >
                      {trade.screenshot_url && (
                        <button
                          onClick={() => onScreenshotClick(trade.screenshot_url ?? '')}
                          className="p-1.5 text-gray-600 hover:text-indigo-400 transition-colors rounded-lg hover:bg-white/[0.04]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                      <button
                        onClick={() => onDetailTradeClick(trade)}
                        className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button
                        onClick={() => onEditTradeClick(trade)}
                        className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
                        title="Edit trade"
                        data-testid="edit-trade-btn"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        onClick={() => onDeleteTrade(trade.id)}
                        disabled={isDeleting === trade.id}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04] disabled:opacity-50"
                        title="Delete trade"
                        data-testid="delete-trade-btn"
                      >
                        {isDeleting === trade.id ? (
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {inlineNewRowIndex === filteredTrades.length && filteredTrades.length > 0 && renderInlineEditorRow()}
              {renderTotalsRow()}

              {/* Notion-style add row button at bottom */}
              <button
                onClick={() => onStartInlineAdd(filteredTrades.length)}
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

        {/* Desktop Pagination */}
        {filteredTrades.length > 0 && (
          <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between bg-[#0a0b12]/50">
            <span className="text-xs text-gray-500">
              Showing <span className="text-gray-300 font-medium">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTrades.length)}</span> of <span className="text-gray-300 font-medium">{filteredTrades.length}</span> trades
            </span>
            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={e => onPageSizeChange(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-[#151823] border border-white/[0.06] rounded-lg text-gray-400 text-xs focus:outline-none hover:border-white/[0.12] transition-colors [color-scheme:dark]"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
              <div className="flex items-center gap-1 bg-[#151823] rounded-lg border border-white/[0.06] p-0.5">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xs text-gray-300 px-3 py-1 font-medium tabular-nums">
                  {currentPage} <span className="text-gray-600">of</span> {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile view */}
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
                  className="card p-4 rounded-2xl relative overflow-hidden text-left"
                  style={{
                    backgroundColor: '#0d0e16',
                    backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)',
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
                      <span className="text-gray-400">Date</span>
                      <span className="text-gray-300 font-medium">
                        {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lots / Qty</span>
                      <span className="text-gray-300 font-mono font-medium">
                        {trade.lots !== undefined && trade.lots !== null ? formatLots(trade.lots) : trade.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Execution</span>
                      <span className="text-gray-300 font-mono">
                        {trade.entry_price?.toFixed(isForexPair(trade.symbol) ? 5 : 2)} → {trade.exit_price?.toFixed(isForexPair(trade.symbol) ? 5 : 2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pips / Duration</span>
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
                          onNotesEditClick(trade);
                        }}
                        className="text-[10px] text-gray-400 hover:text-white cursor-pointer select-none truncate font-medium italic text-left"
                        title="Click to view or edit learnings notes"
                      >
                        {trade.notes ? `Learnings: "${trade.notes}"` : '+ Add learning note...'}
                      </p>
                    </div>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-1">
                      {trade.screenshot_url && (
                        <button
                          onClick={() => onScreenshotClick(trade.screenshot_url ?? '')}
                          className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                          title="View screenshot"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onDetailTradeClick(trade)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        title="View details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEditTradeClick(trade)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        title="Edit trade"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteTrade(trade.id)}
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
            <div className="card p-4 flex flex-col items-center gap-3 bg-[#0a0b12]/50 rounded-2xl border border-white/[0.06] mt-4 text-left">
              <span className="text-xs text-gray-500">
                Showing <span className="text-gray-300 font-medium">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTrades.length)}</span> of <span className="text-gray-300 font-medium">{filteredTrades.length}</span> trades
              </span>
              <div className="flex items-center gap-3 w-full justify-between">
                <select
                  value={pageSize}
                  onChange={e => onPageSizeChange(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-[#151823] border border-white/[0.06] rounded-lg text-gray-400 text-xs focus:outline-none hover:border-white/[0.12] transition-colors [color-scheme:dark]"
                >
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                </select>
                
                <div className="flex items-center gap-1 bg-[#151823] rounded-lg border border-white/[0.06] p-0.5">
                  <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-xs text-gray-300 px-3 py-1 font-medium tabular-nums">
                    {currentPage} <span className="text-gray-600">of</span> {totalPages}
                  </span>
                  <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showInlineScreenshotModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInlineScreenshotModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0d0e16] rounded-2xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-[#0d0e16]">
              <h2 className="text-base font-bold text-white">Add Screenshot to Draft Trade</h2>
              <button onClick={() => setShowInlineScreenshotModal(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setInlineScreenshotTab('upload')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    inlineScreenshotTab === 'upload'
                      ? 'text-indigo-400 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setInlineScreenshotTab('embed')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    inlineScreenshotTab === 'embed'
                      ? 'text-indigo-400 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Embed Link
                </button>
              </div>
              
              <div>
                {inlineScreenshotTab === 'upload' ? (
                  <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all cursor-pointer">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-400">Choose an image file or <span className="text-indigo-400 font-semibold">browse</span></span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image must be under 5MB');
                            return;
                          }
                          onInlineScreenshotFileChange?.(file);
                          onInlineChange?.('screenshot_url', undefined);
                          setShowInlineScreenshotModal(false);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={inlineScreenshotEmbedUrlInput}
                      onChange={e => setInlineScreenshotEmbedUrlInput(e.target.value)}
                      placeholder="Paste TradingView link (e.g. https://www.tradingview.com/x/pCPdcgL4/)"
                      className="w-full px-3 py-2.5 bg-[#06070b] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (inlineScreenshotEmbedUrlInput.trim()) {
                          const resolved = resolveTradingViewUrl(inlineScreenshotEmbedUrlInput);
                          onInlineChange?.('screenshot_url', resolved);
                          onInlineScreenshotFileChange?.(null);
                          setInlineScreenshotEmbedUrlInput('');
                          setShowInlineScreenshotModal(false);
                        }
                      }}
                      className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
                    >
                      Save Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default TradesTable;
