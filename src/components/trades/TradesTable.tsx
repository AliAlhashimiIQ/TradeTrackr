import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade, TradingAccount } from '@/lib/types';
import { isForexPair, formatLots, formatPips } from '@/lib/forexUtils';
import { resolveTradingViewUrl, getTagStyle, getPLColorClasses, toLocalYMD, toLocalISOString, toLocalDatetimeLocal, fromLocalDatetimeLocal } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import InlineTagPopover from './InlineTagPopover';
import { toast } from 'react-hot-toast';
import { useSettings } from '@/providers/SettingsProvider';

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
  strategy: 130,
  mindset: 120,
  tags: 180,
  mistakes: 180,
  notes: 240,
  actions: 140,
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
  strategy: 90,
  mindset: 95,
  tags: 120,
  mistakes: 120,
  notes: 150,
  actions: 140,
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

export const DEFAULT_COLUMN_ORDER = [
  'side', 'entry', 'exit', 'lots', 'pips', 'pnl',
  'percentGain', 'commission', 'netProfit', 'date',
  'openTime', 'closeTime', 'holdTime', 'stopLoss',
  'takeProfit', 'account', 'strategy', 'mindset',
  'tags', 'mistakes', 'notes'
];

export interface TradesTableProps {
  showConfirm?: (config: {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  filteredTrades: Trade[];
  tableDensity: 'compact' | 'comfortable';
  visibleColumns: Record<string, boolean>;
  wrapTags: boolean;
  columnWidths: Record<string, number>;
  onColumnWidthChange: (colKey: string, width: number) => void;
  onResetColumnWidth: (colKey: string) => void;
  columnOrder: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
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
  startingBalance?: number;
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
  onManualLogClick?: () => void;
  onLoadDemoClick?: () => Promise<void> | void;
  isDemoLoading?: boolean;
  userStrategies?: { id: string; name: string; rules?: string | null }[];
  onUpdateStrategy?: (trade: Trade, strategyName: string | null) => Promise<void>;
}

const getAccountSizeForTrade = (
  accountId: string | undefined | null,
  userAccounts: TradingAccount[],
  startingBalance: number
): number => {
  if (accountId) {
    const account = userAccounts.find(a => a.id === accountId);
    if (account && account.balance > 0) {
      return account.balance;
    }
  }
  // Fallback to sum of all accounts
  if (userAccounts && userAccounts.length > 0) {
    const totalBalance = userAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    if (totalBalance > 0) {
      return totalBalance;
    }
  }
  return startingBalance || 10000;
};

const getPercentGain = (
  pnl: number,
  accountId: string | undefined | null,
  userAccounts: TradingAccount[],
  startingBalance: number
): number => {
  const accountSize = getAccountSizeForTrade(accountId, userAccounts, startingBalance);
  return (pnl / accountSize) * 100;
};

export const TradesTable: React.FC<TradesTableProps> = ({
  showConfirm,
  filteredTrades,
  tableDensity,
  visibleColumns,
  wrapTags,
  columnWidths,
  onColumnWidthChange,
  onResetColumnWidth,
  columnOrder,
  onColumnOrderChange,
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
  startingBalance = 10000,
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
  onManualLogClick,
  onLoadDemoClick,
  isDemoLoading = false,
  userStrategies,
  onUpdateStrategy
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { colorblindMode } = useSettings();
  const [activePopover, setActivePopover] = useState<{ tradeId: string; type: 'tags' | 'mistakes' | 'note-preview' | 'mindset' | 'strategy' } | null>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [showInlineScreenshotModal, setShowInlineScreenshotModal] = useState(false);

  // Column drag-reorder state
  const dragColRef = useRef<string | null>(null);
  const dragOverColRef = useRef<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragSide, setDragSide] = useState<'left' | 'right'>('right');
  // rAF ref for smooth resize
  const resizeRafRef = useRef<number>(0);
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

  // Build grid template from columnOrder
  const getGridTemplateColumns = useCallback((overrideKey?: string, overrideWidth?: number) => {
    const getWidth = (key: string, def: string) => {
      const w = key === overrideKey ? overrideWidth : columnWidths[key];
      return w ? `${w}px` : def;
    };
    const cols: string[] = [
      getWidth('checkbox', '52px'),
      getWidth('screenshot', '55px'),
      getWidth('symbol', '110px'),
    ];
    for (const key of columnOrder) {
      if (!visibleColumns[key]) continue;
      const defaults: Record<string, string> = {
        side: '80px', entry: '100px', exit: '100px', lots: '90px', pips: '80px',
        pnl: '110px', percentGain: '90px', commission: '95px', netProfit: '110px',
        date: '95px', openTime: '140px', closeTime: '140px', holdTime: '90px',
        stopLoss: '100px', takeProfit: '100px', account: '110px', strategy: '130px',
        mindset: '120px', tags: '180px', mistakes: '180px', notes: '240px',
      };
      cols.push(getWidth(key, defaults[key] || '100px'));
    }
    cols.push(getWidth('actions', '140px'));
    return cols.join(' ');
  }, [columnWidths, columnOrder, visibleColumns]);

  // RAF-throttled resize — zero React re-renders during drag
  const handleMouseDown = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey];
    let latestWidth = startWidth;
    let pending = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const minW = MIN_COLUMN_WIDTHS[colKey] || 50;
      latestWidth = Math.max(minW, startWidth + deltaX);
      if (pending) return;
      pending = true;
      resizeRafRef.current = requestAnimationFrame(() => {
        if (containerRef.current) {
          const newTemplate = getGridTemplateColumns(colKey, latestWidth);
          containerRef.current.style.setProperty('--grid-template-columns', newTemplate);
        }
        pending = false;
      });
    };

    const handleMouseUp = () => {
      cancelAnimationFrame(resizeRafRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onColumnWidthChange(colKey, latestWidth);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, getGridTemplateColumns, onColumnWidthChange]);

  // Column drag-to-reorder
  const FIXED_COLS = new Set(['checkbox', 'screenshot', 'symbol', 'actions']);

  const handleDragStart = useCallback((e: React.DragEvent, colKey: string) => {
    if (FIXED_COLS.has(colKey)) { e.preventDefault(); return; }
    dragColRef.current = colKey;
    setDragCol(colKey);
    e.dataTransfer.effectAllowed = 'move';
    // Ghost label
    const ghost = document.createElement('div');
    ghost.textContent = colKey.toUpperCase();
    ghost.style.cssText = 'position:fixed;top:-100px;padding:4px 10px;background:#6366f1;color:#fff;border-radius:6px;font-size:11px;font-weight:700;pointer-events:none;letter-spacing:0.05em';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 14);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    if (FIXED_COLS.has(colKey) || !dragColRef.current || dragColRef.current === colKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    dragOverColRef.current = colKey;
    setDragOverCol(colKey);
    setDragSide(side);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragColRef.current = null;
    dragOverColRef.current = null;
    setDragCol(null);
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const srcKey = dragColRef.current;
    if (!srcKey || srcKey === targetKey || FIXED_COLS.has(targetKey)) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const insertAfter = e.clientX >= rect.left + rect.width / 2;
    const newOrder = columnOrder.filter(k => k !== srcKey);
    const targetIdx = newOrder.indexOf(targetKey);
    const insertAt = insertAfter ? targetIdx + 1 : targetIdx;
    newOrder.splice(insertAt, 0, srcKey);
    onColumnOrderChange(newOrder);
    dragColRef.current = null;
    dragOverColRef.current = null;
    setDragCol(null);
    setDragOverCol(null);
  }, [columnOrder, onColumnOrderChange]);

  const renderResizeHandle = (colKey: string) => (
    <div
      onMouseDown={(e) => handleMouseDown(e, colKey)}
      onDoubleClick={(e) => { e.stopPropagation(); onResetColumnWidth(colKey); }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize z-20 flex items-center justify-center group/resize"
      title="Drag to resize · Double-click to reset"
    >
      <div className="w-[2px] h-4 rounded-full bg-transparent group-hover/resize:bg-indigo-500 transition-colors duration-150" />
    </div>
  );

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
      
      if (t.pips !== undefined && t.pips !== null) {
        totalPips += Number(t.pips);
        forexCount++;
      }
      
      const pct = getPercentGain(t.profit_loss ?? 0, t.account_id, userAccounts, startingBalance);
      totalPctGain += pct;
      
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
        className="grid gap-4 px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-slate-50/95 dark:bg-[#0d0e16]/95 border-t border-b border-black/10 dark:border-white/[0.06] sticky bottom-0 z-10 items-center min-w-full w-max text-left"
        style={{ gridTemplateColumns: 'var(--grid-template-columns)' }}
      >
        <div />
        <div />
        <div className="font-bold text-white text-[10px]">TOTALS ({filteredTrades.length})</div>
        {visibleColumns.side && <div />}
        {visibleColumns.entry && <div />}
        {visibleColumns.exit && <div />}
        {visibleColumns.lots && (
          <div className="text-right text-gray-300 tabular-nums">
            {formatLots(totals.totalLots)}
          </div>
        )}
        {visibleColumns.pips && (
          <div className="text-right text-gray-300 tabular-nums">
            {totals.avgPips !== 0 ? `${totals.avgPips.toFixed(1)} avg` : '--'}
          </div>
        )}
        {visibleColumns.pnl && (
          <div
            className="text-right font-bold tabular-nums"
            style={{
              color: getPLColorClasses(totals.totalPnL, colorblindMode).hexColor,
              textShadow: totals.totalPnL !== 0 ? `0 0 10px ${getPLColorClasses(totals.totalPnL, colorblindMode).hexShadow}` : 'none'
            }}
          >
            {totals.totalPnL > 0 ? '+' : ''}{formatCurrency(totals.totalPnL)}
          </div>
        )}
        {visibleColumns.percentGain && (
          <div
            className="text-right tabular-nums"
            style={{ color: getPLColorClasses(totals.avgPctGain, colorblindMode).hexColor }}
          >
            {totals.avgPctGain !== 0 ? `${totals.avgPctGain.toFixed(2)}% avg` : '--'}
          </div>
        )}
        {visibleColumns.commission && (
          <div className="text-right text-gray-400 tabular-nums">
            {formatCurrency(totals.totalCommission)}
          </div>
        )}
        {visibleColumns.netProfit && (
          <div
            className="text-right font-bold tabular-nums"
            style={{
              color: getPLColorClasses(totals.totalNetProfit, colorblindMode).hexColor,
              textShadow: totals.totalNetProfit !== 0 ? `0 0 10px ${getPLColorClasses(totals.totalNetProfit, colorblindMode).hexShadow}` : 'none'
            }}
          >
            {totals.totalNetProfit > 0 ? '+' : ''}{formatCurrency(totals.totalNetProfit)}
          </div>
        )}
        {visibleColumns.date && <div />}
        {visibleColumns.openTime && <div />}
        {visibleColumns.closeTime && <div />}
        {visibleColumns.holdTime && (
          <div className="text-right text-gray-300 tabular-nums">
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
          className="h-full pr-5 -mr-5"
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
        onClose={() => { setActivePopover(null); setPopoverAnchorEl(null); }}
        onToggleTag={(t, tag, isM) => onToggleTag(t, tag, isM)}
        presetsList={isMistake ? allExistingMistakes : allExistingTags}
        onDeleteTagGlobally={onDeleteTagGlobally}
        renderUp={renderUp}
        userTagsConfig={userTagsConfig}
        fetchUserTags={fetchUserTags}
        user={user}
        onRenameTagGlobally={onRenameTagGlobally}
        onUpdateTagColor={onUpdateTagColor}
        userStrategies={userStrategies}
        anchorEl={popoverAnchorEl}
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
        className="grid gap-4 px-5 py-3.5 items-center relative animate-fadeInOpacity min-w-full w-max text-left"
        style={{
          gridTemplateColumns: 'var(--grid-template-columns)',
          backgroundColor: 'var(--card-bg)',
          backgroundImage: 'linear-gradient(90deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.03) 50%, rgba(99, 102, 241, 0.06) 100%)',
          borderTop: '1px solid rgba(99, 102, 241, 0.3)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 4px 16px -4px rgba(99, 102, 241, 0.12)',
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
              className="w-full border border-indigo-500/30 focus:border-indigo-500/70 rounded-xl px-3 py-1.5 text-xs placeholder-gray-400 focus:outline-none font-bold uppercase transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
            placeholder="EURUSD"
            autoFocus
          />
        </div>

        {/* Side */}
        {visibleColumns.side && (() => {
          const sideColor = getPLColorClasses(inlineRowData.type === 'Long' ? 1 : -1, colorblindMode);
          return (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onInlineChange('type', inlineRowData.type === 'Long' ? 'Short' : 'Long')}
                className={`w-full py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 border hover:scale-[1.02] active:scale-[0.98] ${
                  inlineRowData.type === 'Long'
                    ? `${sideColor.bg15} ${sideColor.text} ${sideColor.border30} hover:${sideColor.border50} ${sideColor.shadow}`
                    : `${sideColor.bg15} ${sideColor.text} ${sideColor.border30} hover:${sideColor.border50} ${sideColor.shadow}`
                }`}
              >
                {inlineRowData.type === 'Long' ? 'BUY' : 'SELL'}
              </button>
            </div>
          );
        })()}

        {/* Entry Price */}
        {visibleColumns.entry && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.entry_price ?? ''}
              onChange={e => onInlineChange('entry_price', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
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
              value={inlineRowData.exit_price ?? ''}
              onChange={e => onInlineChange('exit_price', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
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
              value={inlineRowData.lots ?? ''}
              onChange={e => {
                const val = e.target.value;
                onInlineChange('lots', val);
                onInlineChange('quantity', val);
              }}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
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
              onChange={e => onInlineChange('pips', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
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
              value={inlineRowData.profit_loss ?? ''}
              onChange={e => onInlineChange('profit_loss', e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono font-bold transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20 ${
                (inlineRowData.profit_loss || 0) !== 0 ? getPLColorClasses(inlineRowData.profit_loss || 0, colorblindMode).text : ''
              }`}
              style={{ background: 'var(--input-bg)', color: (inlineRowData.profit_loss || 0) === 0 ? 'var(--foreground)' : undefined }}
              placeholder="0.00"
            />
          </div>
        )}

        {/* Percent Gain */}
        {visibleColumns.percentGain && (
          <div className="text-right text-xs font-mono text-gray-400 font-sans">
            {inlineRowData.profit_loss !== undefined && inlineRowData.profit_loss !== null ? (
              (() => {
                const pct = getPercentGain(Number(inlineRowData.profit_loss), inlineRowData.account_id, userAccounts, startingBalance);
                return `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
              })()
            ) : '--'}
          </div>
        )}

        {/* Commission */}
        {visibleColumns.commission && (
          <div>
            <input
              type="number"
              step="any"
              value={inlineRowData.commission ?? ''}
              onChange={e => onInlineChange('commission', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
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
              value={inlineRowData.entry_time ? toLocalYMD(inlineRowData.entry_time) : ''}
              onChange={e => {
                const dateVal = e.target.value ? toLocalISOString(e.target.value) : new Date().toISOString();
                onInlineChange('entry_time', dateVal);
                onInlineChange('exit_time', dateVal);
              }}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)', colorScheme: 'auto' }}
            />
          </div>
        )}

        {/* Extra columns */}
        {visibleColumns.openTime && (
          <div>
            <input
              type="datetime-local"
              value={inlineRowData.entry_time ? toLocalDatetimeLocal(inlineRowData.entry_time) : ''}
              onChange={e => onInlineChange('entry_time', e.target.value ? fromLocalDatetimeLocal(e.target.value) : new Date().toISOString())}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)', colorScheme: 'auto' }}
            />
          </div>
        )}
        {visibleColumns.closeTime && (
          <div>
            <input
              type="datetime-local"
              value={inlineRowData.exit_time ? toLocalDatetimeLocal(inlineRowData.exit_time) : ''}
              onChange={e => onInlineChange('exit_time', e.target.value ? fromLocalDatetimeLocal(e.target.value) : new Date().toISOString())}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)', colorScheme: 'auto' }}
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
              onChange={e => onInlineChange('stop_loss', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
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
              onChange={e => onInlineChange('take_profit', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-right placeholder-gray-400 focus:outline-none font-mono transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
              placeholder="0.00"
            />
          </div>
        )}
        {visibleColumns.account && (
          <div>
            <select
              value={inlineRowData.account_id || ''}
              onChange={e => onInlineChange('account_id', e.target.value || null)}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)', colorScheme: 'auto' }}
            >
              <option value="">No Account</option>
              {userAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Strategy Dropdown */}
        {visibleColumns.strategy && (
          <div>
            <select
              value={inlineRowData.strategy || ''}
              onChange={e => {
                const stratName = e.target.value || null;
                const prevStrategy = userStrategies?.find(s => s.name === inlineRowData.strategy);
                let updatedTags = [...(inlineRowData.tags || [])];
                
                if (prevStrategy?.rules) {
                  try {
                    const prevRules = JSON.parse(prevStrategy.rules);
                    if (Array.isArray(prevRules)) {
                      updatedTags = updatedTags.filter(t => !prevRules.includes(t));
                    }
                  } catch (err) {}
                }
                
                onInlineChange('strategy', stratName);
                onInlineChange('tags', updatedTags);
              }}
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)', colorScheme: 'auto' }}
            >
              <option value="">No Strategy</option>
              {userStrategies?.map(strat => (
                <option key={strat.id} value={strat.name}>{strat.name}</option>
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
                  className="popover-container absolute left-0 top-full mt-1.5 z-30 border border-indigo-500/20 rounded-xl shadow-2xl p-2 w-[160px] space-y-1 text-left"
                  style={{ background: 'var(--card-bg)' }}
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
              onClick={(e) => { setPopoverAnchorEl(e.currentTarget); setActivePopover(activePopover?.tradeId === 'new-row' && activePopover?.type === 'tags' ? null : { tradeId: 'new-row', type: 'tags' }) }}
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
              onClick={(e) => { setPopoverAnchorEl(e.currentTarget); setActivePopover(activePopover?.tradeId === 'new-row' && activePopover?.type === 'mistakes' ? null : { tradeId: 'new-row', type: 'mistakes' }) }}
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
              className="w-full border border-indigo-500/20 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs placeholder-gray-400 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-indigo-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--foreground)' }}
              placeholder="Notes..."
            />
          </div>
        )}

        {/* Actions (Save / Cancel) */}
        <div className="flex items-center justify-end gap-2 pr-2 h-full">
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
      <div className="hidden md:block card rounded-2xl min-h-[450px] overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent flex-grow">
          <div 
            ref={containerRef}
            style={{ 
              minWidth: '1100px',
              '--grid-template-columns': getGridTemplateColumns()
            } as React.CSSProperties} 
            className="min-w-full w-max text-left"
          >
          {/* Table Header — columns driven by columnOrder for drag-to-reorder */}
          <div
            className="grid gap-4 px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] sticky top-0 z-10 min-w-full w-max text-left"
            style={{
              gridTemplateColumns: 'var(--grid-template-columns)',
              borderBottom: '1px solid var(--table-header-border)',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 100%), var(--table-header-bg)',
            }}
          >
            {/* Fixed: checkbox */}
            <div className="relative group/header flex items-center justify-center h-full">
              <input
                type="checkbox"
                checked={filteredTrades.length > 0 && selectedTradeIds.length === filteredTrades.length}
                onChange={e => onToggleSelectAll(e.target.checked)}
                className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/30 w-4 h-4 cursor-pointer"
              />
              {renderResizeHandle('checkbox')}
            </div>
            {/* Fixed: trade/screenshot */}
            <div className="relative group/header text-center flex items-center justify-center h-full">
              <span className="truncate">Trade</span>
              {renderResizeHandle('screenshot')}
            </div>
            {/* Fixed: symbol */}
            <div
              className="relative group/header cursor-pointer hover:text-indigo-400 transition-colors duration-200 select-none flex items-center gap-1 text-left h-full"
              onClick={() => onSort('symbol')}
            >
              <span className="truncate">Symbol {sortField === 'symbol' && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}</span>
              {renderResizeHandle('symbol')}
            </div>

            {/* Reorderable columns */}
            {columnOrder.filter(k => visibleColumns[k]).map(colKey => {
              const isDragging = dragCol === colKey;
              const isTarget = dragOverCol === colKey;
              const SORT_MAP: Record<string, keyof Trade> = {
                side: 'type', entry: 'entry_price', exit: 'exit_price',
                pnl: 'profit_loss', date: 'entry_time', strategy: 'strategy'
              };
              const LABEL_MAP: Record<string, string> = {
                side: 'Side', entry: 'Entry', exit: 'Exit', lots: 'Lots / Qty',
                pips: 'Pips', pnl: 'P&L', percentGain: '% Gain', commission: 'Commission',
                netProfit: 'Net Profit', date: 'Date', openTime: 'Open Time',
                closeTime: 'Close Time', holdTime: 'Hold Time', stopLoss: 'Stop Loss',
                takeProfit: 'Take Profit', account: 'Account', strategy: 'Strategy',
                mindset: 'Mindset', tags: 'Strategy Tags', mistakes: 'Mistake Tags',
                notes: 'Learnings'
              };
              const ALIGN_RIGHT = new Set(['entry','exit','lots','pips','pnl','percentGain','commission','netProfit','holdTime','stopLoss','takeProfit']);
              const sortField_ = SORT_MAP[colKey];
              return (
                <div
                  key={colKey}
                  draggable
                  onDragStart={e => handleDragStart(e, colKey)}
                  onDragOver={e => handleDragOver(e, colKey)}
                  onDrop={e => handleDrop(e, colKey)}
                  onDragEnd={handleDragEnd}
                  onClick={() => sortField_ && onSort(sortField_)}
                  className={`relative group/header flex items-center h-full select-none transition-all duration-150
                    ${ALIGN_RIGHT.has(colKey) ? 'justify-end text-right' : 'justify-start text-left'}
                    ${sortField_ ? 'cursor-pointer hover:text-indigo-400' : 'cursor-grab active:cursor-grabbing'}
                    ${isDragging ? 'opacity-40' : 'opacity-100'}
                    ${isTarget ? (dragSide === 'left' ? 'border-l-2 border-indigo-500' : 'border-r-2 border-indigo-500') : ''}
                  `}
                  title={`Drag to reorder · ${sortField_ ? 'Click to sort' : ''}`}
                >
                  {/* Drag handle icon (shows on hover for non-sortable) */}
                  {!sortField_ && (
                    <span className="mr-1 text-gray-600 group-hover/header:text-gray-400 transition-colors cursor-grab" style={{ fontSize: 9 }}>⣿</span>
                  )}
                  <span className="truncate gap-1 flex items-center">
                    {LABEL_MAP[colKey] || colKey}
                    {sortField_ && sortField === sortField_ && <span className="text-indigo-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                  {renderResizeHandle(colKey)}
                </div>
              );
            })}

            {/* Fixed: Actions */}
            <div className="flex items-center justify-end h-full pr-2">
              <span>Actions</span>
            </div>
          </div>

          {/* Rows */}
          {filteredTrades.length === 0 && inlineNewRowIndex === null ? (
            <EmptyState
              variant="trades"
              onManualLogClick={onManualLogClick}
              onLoadDemoClick={onLoadDemoClick}
              isDemoLoading={isDemoLoading}
            />
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
                    className={`grid gap-4 px-5 ${tableDensity === 'compact' ? 'py-3' : 'py-4'} items-center hover:bg-indigo-500/[0.03] transition-all duration-200 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'} ${idx !== filteredTrades.length - 1 ? 'border-b border-white/[0.04]' : ''} group/row min-w-full w-max text-left`}
                    style={{ gridTemplateColumns: 'var(--grid-template-columns)' }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (showConfirm) {
                                showConfirm({
                                  title: "Remove Screenshot",
                                  description: "Are you sure you want to remove the screenshot from this trade?",
                                  confirmLabel: "Remove",
                                  variant: "danger",
                                  onConfirm: async () => {
                                    await onUpdateScreenshot(trade, "");
                                  }
                                });
                              } else if (window.confirm("Remove screenshot?")) {
                                onUpdateScreenshot(trade, "");
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
                      {(() => {
                        const pnlColors = getPLColorClasses(trade.profit_loss ?? 0, colorblindMode);
                        return (
                          <div className={`${tableDensity === 'compact' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-xs'} rounded-lg flex items-center justify-center font-bold flex-shrink-0 transition-transform duration-200 group-hover/row:scale-105 ${pnlColors.bg10} ${pnlColors.text} ring-1 ${pnlColors.ring20}`}>
                            {(trade.profit_loss ?? 0) >= 0 ? '↑' : '↓'}
                          </div>
                        );
                      })()}
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`${tableDensity === 'compact' ? 'text-xs' : 'text-sm'} font-bold text-white group-hover/row:text-indigo-300 transition-colors duration-200 truncate`}>{trade.symbol}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reorderable cells — follow columnOrder exactly */}
                    {columnOrder.filter(k => visibleColumns[k]).map(colKey => {
                      const ds = tableDensity === 'compact' ? 'text-xs' : 'text-sm';
                      switch (colKey) {
                        case 'side': return (
                          <div key={colKey} className="flex items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-flex items-center"
                              style={trade.type === 'Long'
                                ? { background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.04))', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)', boxShadow:'0 0 8px rgba(16,185,129,0.08)' }
                                : { background:'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.04))', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)', boxShadow:'0 0 8px rgba(239,68,68,0.08)' }
                              }>{trade.type === 'Long' ? 'BUY' : 'SELL'}</span>
                          </div>
                        );
                        case 'entry': return <div key={colKey} className={`${ds} text-gray-300 text-right tabular-nums`}>{(trade.entry_price ?? 0).toFixed(isForexPair(trade.symbol) ? 5 : 2)}</div>;
                        case 'exit': return <div key={colKey} className={`${ds} text-gray-300 text-right tabular-nums`}>{(trade.exit_price ?? 0).toFixed(isForexPair(trade.symbol) ? 5 : 2)}</div>;
                        case 'lots': return <div key={colKey} className={`${ds} text-gray-400 text-right tabular-nums`}>{trade.lots !== undefined && trade.lots !== null ? formatLots(trade.lots) : trade.quantity}</div>;
                        case 'pips': {
                          const hasPips = trade.pips !== undefined && trade.pips !== null;
                          const pipColors = getPLColorClasses(trade.pips ?? 0, colorblindMode);
                          return <div key={colKey} className={`${ds} text-right tabular-nums ${!hasPips ? 'text-gray-400' : pipColors.text70}`}>{hasPips ? formatPips(trade.pips) : '--'}</div>;
                        }
                        case 'pnl': {
                          const pnlColors = getPLColorClasses(trade.profit_loss ?? 0, colorblindMode);
                          return (
                            <div key={colKey} className={`${ds} font-bold tabular-nums text-right`}>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ color:pnlColors.hexColor, background:pnlColors.hexBg, textShadow:(trade.profit_loss ?? 0) !== 0 ? `0 0 12px ${pnlColors.hexShadow}` : 'none' }}>
                                {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{formatCurrency(trade.profit_loss ?? 0)}
                              </span>
                            </div>
                          );
                        }
                        case 'percentGain': {
                          const gainColors = getPLColorClasses(trade.profit_loss ?? 0, colorblindMode);
                          const pct = trade.profit_loss != null ? getPercentGain(trade.profit_loss, trade.account_id, userAccounts, startingBalance) : null;
                          return <div key={colKey} className={`${ds} text-right tabular-nums ${gainColors.text70}`}>{pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : '--'}</div>;
                        }
                        case 'commission': return <div key={colKey} className={`${ds} text-gray-400 text-right tabular-nums`}>{(trade as any).commission != null ? formatCurrency((trade as any).commission) : '$0.00'}</div>;
                        case 'netProfit': {
                          const net = (trade.profit_loss ?? 0) - ((trade as any).commission ?? 0);
                          const netColors = getPLColorClasses(net, colorblindMode);
                          return <div key={colKey} className={`${ds} text-right tabular-nums ${netColors.text}`}>{net > 0 ? '+' : ''}{formatCurrency(net)}</div>;
                        }
                        case 'date': return <div key={colKey} className={`${ds} text-gray-400 text-left`}>{new Date(trade.entry_time).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>;
                        case 'openTime': return <div key={colKey} className={`${ds} text-gray-400 text-left tabular-nums`}>{new Date(trade.entry_time).toLocaleString('en-US', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>;
                        case 'closeTime': return <div key={colKey} className={`${ds} text-gray-400 text-left tabular-nums`}>{new Date(trade.exit_time).toLocaleString('en-US', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>;
                        case 'holdTime': {
                          const m = Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000);
                          return <div key={colKey} className={`${ds} text-gray-400 text-right tabular-nums`}>{m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`}</div>;
                        }
                        case 'stopLoss': return <div key={colKey} className={`${ds} text-gray-400 text-right tabular-nums`}>{(trade as any).stop_loss ? (trade as any).stop_loss.toFixed(isForexPair(trade.symbol) ? 5 : 2) : '--'}</div>;
                        case 'takeProfit': return <div key={colKey} className={`${ds} text-gray-400 text-right tabular-nums`}>{(trade as any).take_profit ? (trade as any).take_profit.toFixed(isForexPair(trade.symbol) ? 5 : 2) : '--'}</div>;
                        case 'account': return <div key={colKey} className={`${ds} text-gray-400 text-left truncate`}>{trade.account_id && accountsMap.has(trade.account_id) ? accountsMap.get(trade.account_id) : '--'}</div>;
                        case 'strategy': return (
                          <div key={colKey} className="relative flex items-center gap-1.5 pr-4 min-w-0 h-full">
                            {trade.strategy ? (
                              <button onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'strategy' ? null : { tradeId: trade.id, type: 'strategy' })}
                                className="popover-trigger px-2.5 py-1 rounded-lg text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 text-xs font-semibold tracking-wide capitalize hover:bg-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all truncate">
                                {trade.strategy}
                              </button>
                            ) : (
                              <button onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'strategy' ? null : { tradeId: trade.id, type: 'strategy' })}
                                className="popover-trigger w-6 h-6 rounded-full bg-white/[0.03] hover:bg-indigo-500/20 border border-white/[0.06] hover:border-indigo-500/40 text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95">+</button>
                            )}
                            <AnimatePresence>
                              {activePopover?.tradeId === trade.id && activePopover?.type === 'strategy' && (
                                <motion.div initial={{ opacity:0, y:6, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:6, scale:0.95 }} transition={{ duration:0.15, ease:[0.16,1,0.3,1] }}
                                  className="popover-container absolute left-0 top-full mt-1.5 z-30 bg-[#151823] border border-white/[0.08] rounded-xl shadow-2xl p-2 w-[180px] space-y-1 text-left">
                                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">Set Strategy</div>
                                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                                    <button type="button" onClick={() => { setActivePopover(null); onUpdateStrategy?.(trade, null); }}
                                      className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${!trade.strategy ? 'bg-indigo-500/10 text-indigo-300' : 'text-gray-300 hover:bg-white/[0.04]'}`}>
                                      <span>No Strategy</span>{!trade.strategy && <span className="text-indigo-400 font-bold">✓</span>}
                                    </button>
                                    {userStrategies?.map(strat => {
                                      const isSelected = trade.strategy === strat.name;
                                      return (
                                        <button key={strat.id} type="button" onClick={() => { setActivePopover(null); onUpdateStrategy?.(trade, strat.name); }}
                                          className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'text-gray-300 hover:bg-white/[0.04]'}`}>
                                          <span>{strat.name}</span>{isSelected && <span className="text-indigo-400 font-bold">✓</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                        case 'mindset': return (
                          <div key={colKey} className="relative flex items-center gap-1 pr-4 min-w-0">
                            {trade.emotional_state ? (
                              <button onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'mindset' ? null : { tradeId: trade.id, type: 'mindset' })}
                                className={`popover-trigger text-[10px] px-2.5 py-1 rounded-lg border font-semibold capitalize tracking-wide transition-all ${EMOTIONS.find(e => e.value === trade.emotional_state)?.bg || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                {trade.emotional_state}
                              </button>
                            ) : (
                              <button onClick={() => setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'mindset' ? null : { tradeId: trade.id, type: 'mindset' })}
                                className="popover-trigger w-5 h-5 rounded-full bg-white/[0.04] hover:bg-indigo-500/25 border border-white/[0.04] text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95" title="Set mindset">+</button>
                            )}
                            <AnimatePresence>
                              {activePopover?.tradeId === trade.id && activePopover?.type === 'mindset' && (
                                <motion.div initial={{ opacity:0, y:6, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:6, scale:0.95 }} transition={{ duration:0.15, ease:[0.16,1,0.3,1] }}
                                  className="popover-container absolute left-0 top-full mt-1 z-30 bg-[#151823] border border-white/[0.08] rounded-xl shadow-2xl p-2 w-[160px] space-y-1 text-left">
                                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">Set Mindset</div>
                                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                                    {EMOTIONS.map(emotion => {
                                      const isSelected = trade.emotional_state === emotion.value;
                                      return (
                                        <button key={emotion.value} onClick={async () => { setActivePopover(null); onInlineChange('emotional_state', emotion.value); const updatedTrade = { ...trade, emotional_state: emotion.value }; onToggleTag(updatedTrade, 'EMOTION_UPDATE_DUMMY_TAG', false); }}
                                          className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'text-gray-300 hover:bg-white/[0.04]'}`}>
                                          <span className="capitalize">{emotion.label}</span>{isSelected && <span className="text-indigo-400 font-bold">✓</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {trade.emotional_state && (
                                    <button onClick={async () => { setActivePopover(null); const updatedTrade = { ...trade, emotional_state: null as any }; onToggleTag(updatedTrade, 'EMOTION_UPDATE_DUMMY_TAG', false); }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors">Clear Mindset</button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                        case 'tags': return (
                          <div key={colKey} className="relative flex items-center gap-1.5 pr-4 min-w-0 w-full">
                            <div className={`flex items-center ${wrapTags ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-none'} gap-1.5 min-w-0 max-w-[calc(100%-24px)] overflow-hidden`}>
                              {trade.tags && trade.tags.map(tag => {
                                const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
                                const style = getTagStyle(tc?.color, false);
                                return (
                                  <span key={tag} style={style} className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors duration-150 font-medium group/pill shrink-0">
                                    {tag}<button onClick={() => onToggleTag(trade, tag, false)} className="hover:opacity-80 text-[10px] font-bold transition-opacity font-sans">✕</button>
                                  </span>
                                );
                              })}
                            </div>
                            <button onClick={e => { setPopoverAnchorEl(e.currentTarget); setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'tags' ? null : { tradeId: trade.id, type: 'tags' }) }}
                              className="popover-trigger w-5 h-5 rounded-full bg-white/[0.04] hover:bg-indigo-500/25 border border-white/[0.04] text-gray-400 hover:text-indigo-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shrink-0">+</button>
                            <AnimatePresence>
                              {activePopover?.tradeId === trade.id && activePopover?.type === 'tags' && renderTagsPopover(trade, false, idx >= filteredTrades.length - 2)}
                            </AnimatePresence>
                          </div>
                        );
                        case 'mistakes': return (
                          <div key={colKey} className="relative flex items-center gap-1.5 pr-4 min-w-0 w-full">
                            <div className={`flex items-center ${wrapTags ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-none'} gap-1.5 min-w-0 max-w-[calc(100%-24px)] overflow-hidden`}>
                              {trade.mistakes && trade.mistakes.map(mistake => {
                                const tc = userTagsConfig.find(c => c.name.toLowerCase() === mistake.toLowerCase());
                                const style = getTagStyle(tc?.color, true);
                                return (
                                  <span key={mistake} style={style} className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors duration-150 font-medium group/pill shrink-0">
                                    {mistake}<button onClick={() => onToggleTag(trade, mistake, true)} className="hover:opacity-80 text-[10px] font-bold transition-opacity font-sans">✕</button>
                                  </span>
                                );
                              })}
                            </div>
                            <button onClick={e => { setPopoverAnchorEl(e.currentTarget); setActivePopover(activePopover?.tradeId === trade.id && activePopover?.type === 'mistakes' ? null : { tradeId: trade.id, type: 'mistakes' }) }}
                              className="popover-trigger w-5 h-5 rounded-full bg-white/[0.04] hover:bg-red-500/25 border border-white/[0.04] text-gray-400 hover:text-red-300 flex items-center justify-center transition-all text-xs font-bold hover:scale-105 active:scale-95 shrink-0">+</button>
                            <AnimatePresence>
                              {activePopover?.tradeId === trade.id && activePopover?.type === 'mistakes' && renderTagsPopover(trade, true, idx >= filteredTrades.length - 2)}
                            </AnimatePresence>
                          </div>
                        );
                        case 'notes': return (
                          <div key={colKey} className="relative pr-4 min-w-0 overflow-hidden text-left">
                            <div onClick={() => onNotesEditClick(trade)}
                              className="text-xs text-gray-400 hover:text-white cursor-pointer select-none truncate hover:bg-white/[0.02] p-1.5 rounded-lg border border-transparent hover:border-white/[0.04] transition-all min-h-[24px]"
                              title="Click to view/edit learnings">
                              {trade.notes || <span className="text-gray-600 italic text-[10px]">Click to add note...</span>}
                            </div>
                          </div>
                        );
                        default: return <div key={colKey} />;
                      }
                    })}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-0.5 pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150">
                      {trade.screenshot_url && (
                        <button
                          onClick={() => onScreenshotClick(trade.screenshot_url ?? '')}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--muted-foreground, #6b7280)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground, #6b7280)')}
                          title="View screenshot"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                      <button
                        onClick={() => onDetailTradeClick(trade)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--muted-foreground, #6b7280)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground, #6b7280)')}
                        title="View details"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button
                        onClick={() => onEditTradeClick(trade)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--muted-foreground, #6b7280)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground, #6b7280)')}
                        title="Edit trade"
                        data-testid="edit-trade-btn"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        onClick={() => onDeleteTrade(trade.id)}
                        disabled={isDeleting === trade.id}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: 'var(--muted-foreground, #6b7280)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground, #6b7280)')}
                        title="Delete trade"
                        data-testid="delete-trade-btn"
                      >
                        {isDeleting === trade.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-current rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
      </div>

      {/* Desktop Pagination */}
        {filteredTrades.length > 0 && (
          <div className="px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between"
            style={{ backgroundColor: 'var(--table-header-bg)' }}
          >
            <span className="text-xs text-gray-500">
              Showing <span className="text-gray-300 font-medium">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTrades.length)}</span> of <span className="text-gray-300 font-medium">{filteredTrades.length}</span> trades
            </span>
            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={e => onPageSizeChange(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-black/[0.04] dark:bg-[#151823] border border-black/[0.08] dark:border-white/[0.06] rounded-lg text-gray-500 dark:text-gray-400 text-xs focus:outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
              <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-[#151823] rounded-lg border border-black/[0.08] dark:border-white/[0.06] p-0.5">
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
          <EmptyState
            variant="trades"
            onManualLogClick={onManualLogClick}
            onLoadDemoClick={onLoadDemoClick}
            isDemoLoading={isDemoLoading}
          />
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
                  {pnlValue !== 0 && (() => {
                    const glowColors = getPLColorClasses(pnlValue, colorblindMode);
                    return (
                      <div
                        className="absolute bottom-[-20px] right-[-20px] w-24 h-24 rounded-full pointer-events-none blur-[40px]"
                        style={{
                          background: glowColors.hexBg,
                        }}
                      />
                    );
                  })()}

                  {/* Card Header: Symbol, Type, P&L */}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">{trade.symbol}</span>
                      {(() => {
                        const sideColors = getPLColorClasses(isLong ? 1 : -1, colorblindMode);
                        return (
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider"
                            style={{
                              background: sideColors.hexBg,
                              color: sideColors.hexColor,
                              border: `1px solid ${sideColors.hexBg.replace('0.06', '0.2')}`
                            }}
                          >
                            {isLong ? 'BUY' : 'SELL'}
                          </span>
                        );
                      })()}
                      {trade.account_id && accountsMap.has(trade.account_id) && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase tracking-wider">
                          {accountsMap.get(trade.account_id)}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const pnlColors = getPLColorClasses(pnlValue, colorblindMode);
                      return (
                        <span
                          className="text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-lg"
                          style={{
                            color: pnlColors.hexColor,
                            background: pnlColors.hexBg,
                          }}
                        >
                          {pnlValue > 0 ? '+' : ''}{formatCurrency(pnlValue)}
                        </span>
                      );
                    })()}
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
                      <span className="text-gray-300 font-medium">
                        {trade.lots !== undefined && trade.lots !== null ? formatLots(trade.lots) : trade.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Execution</span>
                      <span className="text-gray-300">
                        {trade.entry_price?.toFixed(isForexPair(trade.symbol) ? 5 : 2)} → {trade.exit_price?.toFixed(isForexPair(trade.symbol) ? 5 : 2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pips / Duration</span>
                      <span className="text-gray-300">
                        {trade.pips !== undefined && trade.pips !== null ? `${formatPips(trade.pips)} pips (${durationStr})` : durationStr}
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
            className="bg-white dark:bg-[#0d0e16] rounded-2xl border border-black/10 dark:border-white/[0.08] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-black/10 dark:border-white/[0.06] flex justify-between items-center bg-white dark:bg-[#0d0e16]">
              <h2 className="text-base font-bold text-white">Add Screenshot to Draft Trade</h2>
              <button onClick={() => setShowInlineScreenshotModal(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex border-b border-black/10 dark:border-white/[0.06]">
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
                  <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-black/20 dark:border-white/[0.08] hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all cursor-pointer">
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
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#06070b] border border-black/10 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
