'use client';

import React, { useState, useRef } from 'react';
import { Trade } from '@/lib/types';
import { updateTrade } from '@/lib/tradingApi';
import Image from 'next/image';
import { formatLots, formatPips } from '@/lib/forexUtils';
import { resolveTradingViewUrl } from '@/lib/utils';
import { useSettings } from '@/providers/SettingsProvider';
import toast from 'react-hot-toast';
import TradingViewChart from './TradingViewChart';
import TradeShareModal from './TradeShareModal';
import { 
  Share2, 
  Edit3, 
  Trash2, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  Smile, 
  Layers, 
  Video, 
  FileText, 
  BarChart2, 
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

interface TradeDetailProps {
  trade: Trade;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdateNotes?: (trade: Trade, notes: string) => void;
}

export default function TradeDetail({ trade, onClose, onEdit, onDelete, onUpdateNotes }: TradeDetailProps) {
  const { colorblindMode } = useSettings();
  const [activeTab, setActiveTab] = useState<'details' | 'chart' | 'notes' | 'screenshots' | 'video'>('details');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  
  const [localNotes, setLocalNotes] = useState(trade.notes || '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Format currency
  const formatCurrency = (value?: number | null): string => {
    if (value === undefined || value === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format time
  const formatTime = (dateString?: string): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate trade duration
  const calculateDuration = (entry?: string, exit?: string): string => {
    if (!entry || !exit) return '—';
    const entryDate = new Date(entry);
    const exitDate = new Date(exit);
    const diffInMinutes = Math.floor((exitDate.getTime() - entryDate.getTime()) / 1000 / 60);
    
    if (diffInMinutes < 0) return '—';
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      const mins = diffInMinutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      const hours = Math.floor((diffInMinutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  };

  // Calculate percentage change
  const calculatePercentageChange = (entry?: number, exit?: number): string => {
    if (!entry || !exit) return '0.00%';
    const change = ((exit - entry) / entry) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const isProfit = (trade.profit_loss ?? 0) >= 0;
  const isLong = trade.type === 'Long';

  const openScreenshot = (screenshotUrl: string) => {
    setSelectedScreenshot(resolveTradingViewUrl(screenshotUrl));
    setZoomLevel(1);
    setDragPosition({ x: 0, y: 0 });
  };

  const closeScreenshot = () => {
    setSelectedScreenshot(null);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.min(Math.max(newZoom, 0.5), 5);
    });
  };

  const handleMouseDown = () => {
    if (zoomLevel > 1) setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setDragPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setDragPosition({ x: 0, y: 0 });
  };

  const handleSaveNotes = async () => {
    if (!notesChanged || notesSaving) return;
    try {
      setNotesSaving(true);
      await updateTrade({ ...trade, notes: localNotes });
      onUpdateNotes?.(trade, localNotes);
      setNotesChanged(false);
      toast.success('Learnings saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white dark:bg-[#0c0f1d] border border-slate-200/90 dark:border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap justify-between items-center gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base ${
              isLong 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {trade.symbol}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono tracking-wider uppercase border ${
                  isLong
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                }`}>
                  {trade.type} {trade.lots ? `${formatLots(trade.lots)} Lot` : ''}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-mono mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatTime(trade.entry_time)}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Share Social P&L Card"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Card</span>
            </button>

            {onEdit && (
              <button 
                type="button"
                onClick={onEdit}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all shadow-sm active:scale-95"
                title="Edit Trade"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            
            {onDelete && (
              <button 
                type="button"
                onClick={onDelete}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all shadow-sm active:scale-95"
                title="Delete Trade"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            <div className="w-px h-5 bg-slate-200 dark:bg-white/[0.08] mx-0.5" />

            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all shadow-sm active:scale-95"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.015]">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { key: 'details', label: 'Details', icon: <FileText className="w-3.5 h-3.5" /> },
              { key: 'chart', label: 'Execution Chart', icon: <BarChart2 className="w-3.5 h-3.5" /> },
              { key: 'screenshots', label: 'Screenshots', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              ...(trade.video_url ? [{ key: 'video', label: 'Video Review', icon: <Video className="w-3.5 h-3.5" /> }] : []),
              { key: 'notes', label: 'Learnings & Notes', icon: <Edit3 className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-[#151928] text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-white/[0.1] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Execution Metrics Hero (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* P&L Hero Card */}
                <div className={`p-5 rounded-2xl border ${
                  isProfit 
                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/20' 
                    : 'bg-rose-500/[0.04] dark:bg-rose-500/[0.06] border-rose-500/20'
                } shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Realized Net Return
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isProfit 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      {calculatePercentageChange(trade.entry_price, trade.exit_price)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                      isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isProfit ? '+' : ''}{formatCurrency(trade.profit_loss)}
                    </span>
                    {trade.pips !== undefined && trade.pips !== null && (
                      <span className={`text-sm font-mono font-bold ${
                        (trade.pips ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        ({formatPips(trade.pips)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Entry / Exit Matrix */}
                <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Price &amp; Timing Execution
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#121524] border border-slate-200/70 dark:border-white/[0.04]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Entry Price
                      </span>
                      <span className="font-mono text-lg font-bold text-slate-900 dark:text-white block">
                        {formatCurrency(trade.entry_price)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 block">
                        {formatTime(trade.entry_time)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#121524] border border-slate-200/70 dark:border-white/[0.04]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Exit Price
                      </span>
                      <span className="font-mono text-lg font-bold text-slate-900 dark:text-white block">
                        {formatCurrency(trade.exit_price)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 block">
                        {formatTime(trade.exit_time)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-[#121524] border border-slate-200/70 dark:border-white/[0.04]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Volume / Lots
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {trade.lots !== undefined && trade.lots !== null ? formatLots(trade.lots) : (trade.quantity ?? '—')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#121524] border border-slate-200/70 dark:border-white/[0.04]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Duration
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {calculateDuration(trade.entry_time, trade.exit_time)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#121524] border border-slate-200/70 dark:border-white/[0.04]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        R-Multiple
                      </span>
                      <span className={`font-mono text-sm font-bold ${
                        (trade.r_multiple ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {trade.r_multiple !== undefined && trade.r_multiple !== null ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Strategy, Mindset, Mistakes & Tags (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Strategy & Emotion Card */}
                <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    Strategy &amp; Psychology
                  </h3>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                      Primary Strategy
                    </span>
                    {trade.strategy ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" />
                        {trade.strategy}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">No primary strategy assigned</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                      Psychological State
                    </span>
                    {trade.emotional_state ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold capitalize">
                        <Smile className="w-3.5 h-3.5 text-amber-500" />
                        {trade.emotional_state}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">No mindset logged</span>
                    )}
                  </div>
                </div>

                {/* Tags & Mistakes Card */}
                <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" />
                      Strategy Tags
                    </h3>
                    {trade.tags && trade.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {trade.tags.map((tag, i) => (
                          <span key={i} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 rounded-lg text-xs font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">No strategy tags attached</p>
                    )}
                  </div>

                  {trade.mistakes && trade.mistakes.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2.5 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Mistakes Logged
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {trade.mistakes.map((mistake, i) => (
                          <span key={i} className="px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 rounded-lg text-xs font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {mistake}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="p-2">
              <TradingViewChart
                symbol={trade.symbol}
                entryTime={trade.entry_time}
                exitTime={trade.exit_time}
                entryPrice={trade.entry_price}
                exitPrice={trade.exit_price}
                type={trade.type}
                stopLoss={trade.stop_loss}
                takeProfit={trade.take_profit}
              />
            </div>
          )}

          {activeTab === 'screenshots' && (
            <div>
              {trade.screenshot_url ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.isArray(trade.screenshot_url) ? (
                    trade.screenshot_url.map((url: string, index: number) => (
                      <div
                        key={index}
                        onClick={() => openScreenshot(url ?? '')}
                        className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all group border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.02]"
                      >
                        <Image
                          src={resolveTradingViewUrl(url ?? '')}
                          alt={`Trade Screenshot ${index + 1}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg">
                            <Maximize2 className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      onClick={() => openScreenshot(trade.screenshot_url ?? '')}
                      className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all group border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.02]"
                    >
                      <Image
                        src={resolveTradingViewUrl(trade.screenshot_url ?? '')}
                        alt="Trade Screenshot"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Screenshot Attached</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    You can paste chart links or upload screenshots via the trades table.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Learnings &amp; Execution Notes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Reflect on your edge, entries, and psychology
                  </p>
                </div>
                {notesChanged && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={notesSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-60"
                  >
                    {notesSaving ? 'Saving…' : 'Save Learnings'}
                  </button>
                )}
              </div>
              <textarea
                value={localNotes}
                onChange={e => { setLocalNotes(e.target.value); setNotesChanged(true); }}
                onBlur={handleSaveNotes}
                rows={10}
                placeholder="What did you learn from this trade? Describe your strategy setup, emotions, management, and key takeaways..."
                className="w-full p-4 rounded-2xl text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-sans bg-slate-50 dark:bg-[#121524] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <p className="text-[11px] text-slate-400 font-mono">Auto-saves on blur</p>
            </div>
          )}

          {activeTab === 'video' && trade.video_url && (
            <div className="p-2 flex flex-col items-center justify-center">
              <div className="w-full max-w-4xl relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.08] bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  src={resolveTradingViewUrl(trade.video_url)}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full max-w-4xl mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.04] pt-4">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Playback Speed</span>
                <div className="flex bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-1 gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setPlaybackSpeed(spd);
                        if (videoRef.current) {
                          videoRef.current.playbackRate = spd;
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        playbackSpeed === spd
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {spd.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Screenshot Modal */}
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={closeScreenshot}
        >
          <div className="absolute top-5 right-5 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleZoom('in'); }}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoom('out'); }}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={closeScreenshot}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div 
            className="relative overflow-hidden cursor-grab active:cursor-grabbing max-w-full max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img
              src={selectedScreenshot}
              alt="Trade Screenshot"
              className="max-h-[85vh] object-contain rounded-xl transition-transform"
              style={{
                transform: `scale(${zoomLevel}) translate(${dragPosition.x}px, ${dragPosition.y}px)`,
                transformOrigin: 'center'
              }}
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* Social Card Modal */}
      <TradeShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trade={trade}
      />
    </div>
  );
} 
