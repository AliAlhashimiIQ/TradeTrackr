'use client'

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { uploadTradeScreenshot } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { isForexPair, calculatePips } from '@/lib/forexUtils';

interface EnhancedTradeFormProps {
  initialTrade?: Partial<Trade>;
  onSubmit: (trade: Partial<Trade>) => void;
  onCancel?: () => void;
  className?: string;
}

const INSTRUMENTS = [
  { name: 'XAUUSD', tag: 'XAU', label: 'Gold' },
  { name: 'EURUSD', tag: 'EUR', label: 'EUR/USD' },
  { name: 'GBPUSD', tag: 'GBP', label: 'GBP/USD' },
  { name: 'USDJPY', tag: 'JPY', label: 'USD/JPY' },
  { name: 'US100', tag: 'NAS', label: 'NAS100' },
  { name: 'US30', tag: 'DOW', label: 'US30' },
  { name: 'BTCUSD', tag: 'BTC', label: 'Bitcoin' },
  { name: 'ETHUSD', tag: 'ETH', label: 'Ethereum' },
];

const EMOTIONS = [
  { value: 'confident', label: 'Confident', color: 'emerald' },
  { value: 'calm', label: 'Calm', color: 'blue' },
  { value: 'neutral', label: 'Neutral', color: 'gray' },
  { value: 'anxious', label: 'Anxious', color: 'amber' },
  { value: 'fomo', label: 'FOMO', color: 'orange' },
  { value: 'revenge', label: 'Revenge', color: 'red' },
];

const PRESET_TAGS = ['Breakout', 'Reversal', 'Trend', 'Scalp', 'Swing', 'News', 'Supply/Demand', 'Prop Firm', 'Sniper Entry'];

const PRESET_MISTAKES = [
  'FOMO Entry',
  'Revenge Trade',
  'Moved Stop Loss',
  'Too Large Size',
  'Early Exit',
  'Late Entry',
  'No Plan',
  'Overtrading',
  'Held Through News'
];

const EnhancedTradeForm: React.FC<EnhancedTradeFormProps> = ({
  initialTrade,
  onSubmit,
  onCancel,
  className = '',
}) => {
  const { user } = useAuth();
  const isEditing = !!initialTrade;
  
  const [formData, setFormData] = useState<Partial<Trade>>({
    symbol: '',
    type: 'Long',
    entry_price: undefined,
    exit_price: undefined,
    quantity: undefined,
    entry_time: new Date().toISOString().split('T')[0],
    exit_time: new Date().toISOString().split('T')[0],
    notes: '',
    tags: [],
    mistakes: [],
    lots: 0.01,
    pips: 0,
    ...initialTrade
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(initialTrade?.screenshot_url || null);
  const [customTag, setCustomTag] = useState('');
  const [customMistake, setCustomMistake] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [isForex, setIsForex] = useState(false);

  useEffect(() => {
    if (formData.symbol) {
      setIsForex(isForexPair(formData.symbol));
    }
  }, [formData.symbol]);

  useEffect(() => {
    if (isForex && formData.entry_price && formData.exit_price && formData.type && formData.symbol) {
      const pips = calculatePips(
        Number(formData.entry_price),
        Number(formData.exit_price),
        formData.type as 'Long' | 'Short',
        formData.symbol
      );
      if (pips !== formData.pips) {
        handleChange('pips', pips);
      }
    }
  }, [isForex, formData.entry_price, formData.exit_price, formData.type, formData.symbol]);

  useEffect(() => {
    if (initialTrade) {
      const formatted = { ...initialTrade };
      if (initialTrade.entry_time) formatted.entry_time = new Date(initialTrade.entry_time).toISOString().split('T')[0];
      if (initialTrade.exit_time) formatted.exit_time = new Date(initialTrade.exit_time).toISOString().split('T')[0];
      setFormData(formatted);
    } else if (user) {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [initialTrade, user]);

  // P&L calculation
  const pnl = (() => {
    const { entry_price, exit_price, quantity, lots, type } = formData;
    if (!entry_price || !exit_price) return null;
    
    if (isForex) {
      if (!lots) return null;
      // Standard Forex PnL calculation: (Exit - Entry) * Lots * 100,000
      // For simplicity in this app, we'll assume the user might want a direct multiplier or we use 100k
      // But let's stick to what the user provides. If they want $ per pip, it's usually Lots * 10.
      return type === 'Long'
        ? (exit_price - entry_price) * (lots * 100000)
        : (entry_price - exit_price) * (lots * 100000);
    }
    
    if (!quantity) return null;
    return type === 'Long'
      ? (exit_price - entry_price) * quantity
      : (entry_price - exit_price) * quantity;
  })();

  const displayPips = formData.pips !== undefined ? formData.pips : 0;

  const formatPreviewNumber = (value: unknown, decimals = 2): string => {
    if (value === undefined || value === null || value === '') return '—';
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return num.toFixed(decimals);
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      handleChange('tags', currentTags.filter(t => t !== tag));
    } else {
      handleChange('tags', [...currentTags, tag]);
    }
  };

  const toggleMistake = (mistake: string) => {
    const currentMistakes = formData.mistakes || [];
    if (currentMistakes.includes(mistake)) {
      handleChange('mistakes', currentMistakes.filter(m => m !== mistake));
    } else {
      handleChange('mistakes', [...currentMistakes, mistake]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.symbol?.trim()) newErrors.symbol = 'Required';
    if (!formData.entry_price || formData.entry_price <= 0) newErrors.entry_price = 'Required';
    if (!formData.exit_price || formData.exit_price <= 0) newErrors.exit_price = 'Required';
    if (isForex) {
      if (!formData.lots || formData.lots <= 0) newErrors.quantity = 'Required';
    } else {
      if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Required';
    }
    if (!formData.entry_time) newErrors.entry_time = 'Required';
    if (!formData.exit_time) newErrors.exit_time = 'Required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    
    setIsSubmitting(true);
    try {
      let screenshotUrl = formData.screenshot_url || '';
      const userId = formData.user_id || user?.id;
      if (screenshotFile && userId && formData.symbol) {
        const tradeId = initialTrade?.id || formData.symbol + '-' + Date.now();
        const url = await uploadTradeScreenshot(screenshotFile, userId, tradeId);
        if (url) screenshotUrl = url;
      }
      const effectiveQuantity = isForex ? (formData.lots || 0) * 100000 : (formData.quantity || 0);
      const calculatedPnl = formData.type === 'Long'
        ? ((formData.exit_price || 0) - (formData.entry_price || 0)) * effectiveQuantity
        : ((formData.entry_price || 0) - (formData.exit_price || 0)) * effectiveQuantity;
      
      await onSubmit({
        user_id: userId,
        symbol: formData.symbol?.toUpperCase(),
        type: formData.type,
        entry_price: Number(formData.entry_price),
        exit_price: Number(formData.exit_price),
        quantity: isForex ? Number(formData.lots || 0) : Number(formData.quantity),
        entry_time: formData.entry_time,
        exit_time: formData.exit_time,
        profit_loss: calculatedPnl,
        notes: formData.notes || '',
        screenshot_url: screenshotUrl,
        emotional_state: formData.emotional_state,
        tags: formData.tags,
        mistakes: formData.mistakes,
        lots: Number(formData.lots),
        pips: Number(formData.pips),
        ...(initialTrade?.id ? { id: initialTrade.id } : {}),
      });
      toast.success(isEditing ? 'Trade updated!' : 'Trade logged!');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to save. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWin = pnl !== null && pnl >= 0;
  const hasSize = isForex ? !!formData.lots : !!formData.quantity;
  const hasRequiredFields = formData.symbol && formData.entry_price && formData.exit_price && hasSize;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {/* Back link */}
      <div className="flex items-center justify-between mb-7">
        <Link href="/trades" className="text-base text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
          Back to trades
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 lg:items-start gap-8">
          
          {/* ═══════ LEFT: Form Inputs (3 cols) ═══════ */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Instrument Selector */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Instrument</h2>
              </div>
              <input
                type="text"
                value={formData.symbol || ''}
                onChange={e => handleChange('symbol', e.target.value.toUpperCase())}
                placeholder="Search or type symbol..."
                className={`w-full px-5 py-4 bg-[#0d0e16] border rounded-xl text-white text-xl font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${errors.symbol ? 'border-red-500/50' : 'border-white/[0.06]'}`}
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {INSTRUMENTS.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handleChange('symbol', s.name)}
                    className={`group relative px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      formData.symbol === s.name
                        ? 'bg-indigo-500/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                        : 'bg-[#0d0e16] text-gray-400 hover:text-white hover:bg-[#151823] border border-white/[0.04] hover:border-white/[0.1]'
                    }`}
                  >
                    <span className="mr-1.5 text-[10px] font-bold text-indigo-400/70">{s.tag}</span>{s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Direction</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('type', 'Long')}
                  className={`relative py-4 rounded-xl font-bold text-sm transition-all duration-200 overflow-hidden ${
                    formData.type === 'Long'
                      ? 'text-emerald-400 border-2 border-emerald-500/40'
                      : 'text-gray-500 border-2 border-transparent bg-[#0d0e16] hover:text-gray-300'
                  }`}
                >
                  {formData.type === 'Long' && <div className="absolute inset-0 bg-emerald-500/10" />}
                      <span className="relative flex items-center justify-center gap-2.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                    BUY / LONG
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('type', 'Short')}
                  className={`relative py-4 rounded-xl font-bold text-sm transition-all duration-200 overflow-hidden ${
                    formData.type === 'Short'
                      ? 'text-red-400 border-2 border-red-500/40'
                      : 'text-gray-500 border-2 border-transparent bg-[#0d0e16] hover:text-gray-300'
                  }`}
                >
                  {formData.type === 'Short' && <div className="absolute inset-0 bg-red-500/10" />}
                      <span className="relative flex items-center justify-center gap-2.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                    SELL / SHORT
                  </span>
                </button>
              </div>
            </div>

            {/* Price Grid */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Trade Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Entry Price</label>
                  <input
                    type="number" step="any"
                    value={formData.entry_price ?? ''}
                    onChange={e => handleChange('entry_price', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className={`w-full bg-transparent text-white text-xl font-bold placeholder-gray-700 focus:outline-none ${errors.entry_price ? 'text-red-400' : ''}`}
                  />
                </div>
                <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Exit Price</label>
                  <input
                    type="number" step="any"
                    value={formData.exit_price ?? ''}
                    onChange={e => handleChange('exit_price', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className={`w-full bg-transparent text-white text-xl font-bold placeholder-gray-700 focus:outline-none ${errors.exit_price ? 'text-red-400' : ''}`}
                  />
                </div>
                <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">{isForex ? 'Lots' : 'Quantity'}</label>
                  <input
                    type="number" step="any"
                    value={isForex ? (formData.lots ?? '') : (formData.quantity ?? '')}
                    onChange={e => handleChange(isForex ? 'lots' : 'quantity', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder={isForex ? "0.01" : "1.0"}
                    className={`w-full bg-transparent text-white text-xl font-bold placeholder-gray-700 focus:outline-none ${errors.quantity ? 'text-red-400' : ''}`}
                  />
                </div>
                {isForex ? (
                  <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Pips</label>
                    <div className="flex items-center">
                      <input
                        type="number" step="any"
                        value={formData.pips ?? ''}
                        onChange={e => handleChange('pips', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        placeholder="0.0"
                        className="w-full bg-transparent text-indigo-400 text-xl font-bold placeholder-gray-700 focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-indigo-500/50 ml-1 uppercase">Pips</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Date</label>
                    <input
                      type="date"
                      value={formData.entry_time || ''}
                      onChange={e => { handleChange('entry_time', e.target.value); handleChange('exit_time', e.target.value); }}
                      className="w-full bg-transparent text-white text-base font-medium focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                )}
              </div>
              {isForex && (
                <div className="mt-3 bg-[#0d0e16] rounded-xl border border-white/[0.06] p-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Date</label>
                  <input
                    type="date"
                    value={formData.entry_time || ''}
                    onChange={e => { handleChange('entry_time', e.target.value); handleChange('exit_time', e.target.value); }}
                    className="w-full bg-transparent text-white text-base font-medium focus:outline-none [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            {/* Optional Sections Toggle */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-base text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span>{showOptional ? 'Hide' : 'Show'} optional fields</span>
              <svg className={`w-4 h-4 transition-transform ${showOptional ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Optional Fields */}
            <AnimatePresence>
              {showOptional && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5 overflow-hidden"
                >
                  {/* Screenshot */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gray-600 rounded-full" />
                      <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider">Screenshot</h2>
                    </div>
                    {screenshotPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-white/[0.08]">
                        <img src={screenshotPreview} alt="Chart" className="w-full max-h-40 object-cover" />
                        <button type="button" onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors text-xs">✕</button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-3 py-6 rounded-xl border border-dashed border-white/[0.08] hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all cursor-pointer">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-base text-gray-500">Drop chart screenshot or <span className="text-indigo-400">browse</span></span>
                        <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Emotions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gray-600 rounded-full" />
                      <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider">Mood</h2>
                    </div>
                    <div className="flex gap-2">
                      {EMOTIONS.map(e => (
                        <button key={e.value} type="button"
                          onClick={() => handleChange('emotional_state', formData.emotional_state === e.value ? undefined : e.value)}
                          className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all ${
                            formData.emotional_state === e.value
                              ? 'bg-indigo-500/15 border border-indigo-500/30 scale-105'
                              : 'bg-[#0d0e16] border border-transparent hover:bg-[#151823]'
                          }`}
                        >
                          <span className="text-sm font-semibold">{e.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gray-600 rounded-full" />
                      <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider">Strategy Tags</h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_TAGS.map(tag => (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                            formData.tags?.includes(tag)
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-[#0d0e16] text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/[0.06]'
                          }`}
                        >
                          {formData.tags?.includes(tag) && '✓ '}{tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (customTag.trim()) { toggleTag(customTag.trim()); setCustomTag(''); } } }}
                        placeholder="Custom tag..." className="flex-1 px-3.5 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-white text-base placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
                      <button type="button" onClick={() => { if (customTag.trim()) { toggleTag(customTag.trim()); setCustomTag(''); } }}
                        className="px-3.5 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-gray-300 hover:text-white text-base transition-colors">Add</button>
                    </div>
                  </div>

                  {/* Mistakes */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-red-600 rounded-full" />
                      <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider">Mistakes Logged</h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_MISTAKES.map(m => (
                        <button key={m} type="button" onClick={() => toggleMistake(m)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                            formData.mistakes?.includes(m)
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-[#0d0e16] text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/[0.06]'
                          }`}
                        >
                          {formData.mistakes?.includes(m) && '✕ '}{m}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={customMistake} onChange={e => setCustomMistake(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (customMistake.trim()) { toggleMistake(customMistake.trim()); setCustomMistake(''); } } }}
                        placeholder="Custom mistake..." className="flex-1 px-3.5 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-white text-base placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500/50" />
                      <button type="button" onClick={() => { if (customMistake.trim()) { toggleMistake(customMistake.trim()); setCustomMistake(''); } }}
                        className="px-3.5 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-gray-300 hover:text-white text-base transition-colors">Add</button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gray-600 rounded-full" />
                      <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider">Notes</h2>
                    </div>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => handleChange('notes', e.target.value)}
                      placeholder="What was the setup? Lessons learned?"
                      rows={3}
                      className="w-full px-4 py-3.5 bg-[#0d0e16] border border-white/[0.06] rounded-xl text-white text-base placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══════ RIGHT: Trade Ticket (2 cols) ═══════ */}
          <div className="lg:col-span-2 lg:self-start">
            <div className="lg:sticky lg:top-6 lg:h-fit">
              {/* Trade Ticket Card */}
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]"
                style={{ background: 'linear-gradient(135deg, rgba(15,16,28,0.95) 0%, rgba(13,14,22,0.98) 100%)' }}>
                
                {/* Top accent line */}
                <div className={`h-1 ${hasRequiredFields ? (isWin ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400') : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`} />
                
                <div className="p-7">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Trade Ticket</div>
                    <div className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                      formData.type === 'Long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {formData.type}
                    </div>
                  </div>

                  {/* Symbol */}
                  <div className="mb-6">
                    <div className="text-3xl font-black text-white tracking-tight">
                      {formData.symbol || <span className="text-gray-700">---</span>}
                    </div>
                    {formData.symbol && (
                      <div className="text-xs text-gray-500 mt-1">
                        {INSTRUMENTS.find(i => i.name === formData.symbol)?.label || formData.symbol}
                      </div>
                    )}
                  </div>

                  {/* Price Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Entry</div>
                      <div className="text-lg font-bold text-white">
                        {formatPreviewNumber(formData.entry_price, isForex ? 5 : 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Exit</div>
                      <div className="text-lg font-bold text-white">
                        {formatPreviewNumber(formData.exit_price, isForex ? 5 : 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">{isForex ? 'Lot Size' : 'Quantity'}</div>
                      <div className="text-lg font-bold text-white">
                        {isForex ? formatPreviewNumber(formData.lots, 2) : formatPreviewNumber(formData.quantity, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">{isForex ? 'Pips' : 'R-Multiple'}</div>
                      <div className={`text-lg font-bold ${isForex ? (displayPips >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                        {isForex ? `${displayPips >= 0 ? '+' : ''}${displayPips.toFixed(1)}` : (initialTrade?.r_multiple?.toFixed(2) || '—')}
                      </div>
                    </div>
                  </div>

                  {/* P&L Display */}
                  <div className={`rounded-xl p-5 text-center mb-6 ${
                    pnl !== null 
                      ? (isWin ? 'bg-emerald-500/[0.08] border border-emerald-500/20' : 'bg-red-500/[0.08] border border-red-500/20')
                      : 'bg-white/[0.02] border border-white/[0.04]'
                  }`}>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Profit / Loss
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={pnl?.toFixed(2) || 'empty'}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`text-5xl font-black tracking-tight ${
                          pnl !== null ? (isWin ? 'text-emerald-400' : 'text-red-400') : 'text-gray-700'
                        }`}
                        style={pnl !== null && isWin ? { textShadow: '0 0 30px rgba(16,185,129,0.3)' } : pnl !== null ? { textShadow: '0 0 30px rgba(239,68,68,0.3)' } : {}}
                      >
                        {pnl !== null ? `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : '$0.00'}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Tags Preview */}
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-6">
                      {formData.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] font-medium rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mistakes Preview */}
                  {formData.mistakes && formData.mistakes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-6">
                      {formData.mistakes.map(mistake => (
                        <span key={mistake} className="px-2 py-0.5 text-[10px] font-medium rounded bg-red-500/10 text-red-300 border border-red-500/20">
                          {mistake}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Emotion Preview */}
                  {formData.emotional_state && (
                    <div className="text-center mb-6 text-base text-gray-400">
                      Feeling {formData.emotional_state}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                    ) : (
                      <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>{isEditing ? 'Save Changes' : 'Log Trade'}</>
                    )}
                  </button>

                  {onCancel && (
                    <button type="button" onClick={onCancel}
                      className="w-full mt-2 py-3 rounded-xl text-base text-gray-500 hover:text-gray-300 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default EnhancedTradeForm;
