'use client'

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import AdvancedPriceEntry from './AdvancedPriceEntry';
import { TradingViewAnalysisResult } from '@/lib/aiService';
import EmotionalStateSelector from './EmotionalStateSelector';
import TradeTagSelector from './TradeTagSelector';
import TradeScreenshotUploader from './TradeScreenshotUploader';
import Image from 'next/image';
import { useCombobox } from 'downshift';
import { uploadTradeScreenshot } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/common/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { CARDS, BUTTONS, FORMS, TEXT, LAYOUT } from '@/lib/designSystem';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Confetti from 'react-confetti';

interface EnhancedTradeFormProps {
  initialTrade?: Partial<Trade>;
  onSubmit: (trade: Partial<Trade>) => void;
  onCancel?: () => void;
  className?: string;
}

const EnhancedTradeForm: React.FC<EnhancedTradeFormProps> = ({
  initialTrade,
  onSubmit,
  onCancel,
  className = '',
}) => {
  const { user } = useAuth();
  // Main form state
  const [formData, setFormData] = useState<Partial<Trade>>({
    symbol: '',
    type: 'Long',
    entry_price: 0,
    exit_price: 0,
    quantity: 0,
    entry_time: new Date().toISOString().split('T')[0],
    exit_time: new Date().toISOString().split('T')[0],
    profit_loss: undefined,
    notes: '',
    tags: [],
    ...initialTrade
  });
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionStatus, setCompletionStatus] = useState(0);
  const [favoriteSymbols, setFavoriteSymbols] = useState<string[]>([
    'EURUSD', 'AAPL', 'BTCUSD', 'SPY', 'QQQ', 'TSLA'
  ]);
  const [screenshots, setScreenshots] = useState<File[]>([]);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(formData.screenshot_url || null);

  // Tags state
  const [inputValue, setInputValue] = useState('');

  // Risk calculations
  const [riskAmount, setRiskAmount] = useState<number>(0);
  const [rMultiple, setRMultiple] = useState<number>(0);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<TradingViewAnalysisResult | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState<string | null>(null);

  // New states for current step and recent symbols
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  // Initialize form with initial trade data if provided
  useEffect(() => {
    if (initialTrade) {
      // Format dates for date inputs
      const formattedTrade = { ...initialTrade };
      
      if (initialTrade.entry_time) {
        formattedTrade.entry_time = new Date(initialTrade.entry_time).toISOString().split('T')[0];
      }
      
      if (initialTrade.exit_time) {
        formattedTrade.exit_time = new Date(initialTrade.exit_time).toISOString().split('T')[0];
      }
      
      setFormData(formattedTrade);
    } else if (user) {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [initialTrade, user]);
  
  // Load saved data from localStorage
  useEffect(() => {
    try {
      // Load favorite symbols
      const savedFavoriteSymbols = localStorage.getItem('favoriteSymbols');
      if (savedFavoriteSymbols) {
        setFavoriteSymbols(JSON.parse(savedFavoriteSymbols));
      }
    } catch (error) {
      console.error('Error loading saved preferences:', error);
    }
  }, []);
  
  // Calculate completion status
  useEffect(() => {
    const requiredFields = ['symbol', 'entry_price', 'exit_price', 'quantity', 'entry_time', 'exit_time'];
    const completedFields = requiredFields.filter(field => formData[field as keyof Trade]);
    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
    setCompletionStatus(percentage);
  }, [formData]);
  
  // Auto-calculate P&L when entry price, exit price, or quantity changes
  useEffect(() => {
    const { entry_price, exit_price, quantity, type } = formData;
    if (entry_price !== undefined && exit_price !== undefined && quantity !== undefined) {
      let pnl: number;
      if (type === 'Long') {
        pnl = (exit_price - entry_price) * quantity;
      } else {
        pnl = (entry_price - exit_price) * quantity;
      }
      setFormData(prev => ({ ...prev, profit_loss: pnl }));
    }
  }, [formData.entry_price, formData.exit_price, formData.quantity, formData.type]);
  
  // Calculate risk and R-multiple when relevant fields change
  useEffect(() => {
    if (formData.entry_price && formData.exit_price && formData.quantity) {
      const risk = Math.abs(formData.entry_price - formData.exit_price) * formData.quantity;
      setRiskAmount(risk);
      
      if (formData.type === 'Long') {
        const potentialProfit = (formData.exit_price - formData.entry_price) * formData.quantity;
        setRMultiple(potentialProfit / risk);
      } else {
        const potentialProfit = (formData.entry_price - formData.exit_price) * formData.quantity;
        setRMultiple(potentialProfit / risk);
      }
    }
  }, [formData.entry_price, formData.exit_price, formData.quantity, formData.type]);
  
  // Load recent symbols from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSymbols');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        setRecentSymbols(parsed);
      } catch {}
    }
  }, []);
  
  // Update recent symbols when symbol changes
  useEffect(() => {
    if (typeof formData.symbol === 'string' && formData.symbol.length > 0) {
      setRecentSymbols(prev => {
        const updated = [formData.symbol.toUpperCase(), ...prev.filter(s => s !== formData.symbol.toUpperCase())].slice(0, 8);
        localStorage.setItem('recentSymbols', JSON.stringify(updated));
        return updated;
      });
    }
  }, [formData.symbol]);
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: any = value;
    
    // Convert numeric inputs to numbers
    if (type === 'number') {
      parsedValue = value === '' ? undefined : parseFloat(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle screenshot analysis completion
  const handleAnalysisComplete = (result: TradingViewAnalysisResult) => {
    if (result) {
      setAiAnalysis(result);
      setShowAiModal(true);
    }
  };
  
  // Helper to apply AI suggestions to form
  const applyAiSuggestions = () => {
    if (!aiAnalysis) return;
      const updates: Partial<Trade> = {};
    if (aiAnalysis.symbol) updates.symbol = aiAnalysis.symbol;
    if (aiAnalysis.tradeType) updates.type = aiAnalysis.tradeType;
    if (aiAnalysis.entryPrice) updates.entry_price = aiAnalysis.entryPrice;
    if (aiAnalysis.takeProfitPrice) updates.exit_price = aiAnalysis.takeProfitPrice;
    if (aiAnalysis.suggestedTags && aiAnalysis.suggestedTags.length > 0) {
        const newTags = [...(formData.tags || [])];
      aiAnalysis.suggestedTags.forEach(tag => {
        if (!newTags.includes(tag)) newTags.push(tag);
        });
        updates.tags = newTags;
      }
    if (aiAnalysis.notes) {
        updates.notes = formData.notes 
        ? `${formData.notes}\n\nAI Analysis: ${aiAnalysis.notes}`
        : `AI Analysis: ${aiAnalysis.notes}`;
    }
    setFormData(prev => ({ ...prev, ...updates }));
    setShowAiModal(false);
  };

  const rejectAiSuggestions = () => {
    setShowAiModal(false);
  };
  
  // Handle screenshots change
  const handleScreenshotsChange = (files: File[]) => {
    setScreenshots(files);
  };
  
  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Validate form fields
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required field validation
    if (!formData.symbol?.trim()) {
      newErrors.symbol = 'Symbol is required';
    }
    
    // Numeric validation with proper type checking
    if (typeof formData.entry_price !== 'number' || isNaN(formData.entry_price)) {
      newErrors.entry_price = 'Valid entry price is required';
    } else if (formData.entry_price <= 0) {
      newErrors.entry_price = 'Entry price must be greater than 0';
    }
    
    if (typeof formData.exit_price !== 'number' || isNaN(formData.exit_price)) {
      newErrors.exit_price = 'Valid exit price is required';
    } else if (formData.exit_price <= 0) {
      newErrors.exit_price = 'Exit price must be greater than 0';
    }
    
    if (typeof formData.quantity !== 'number' || isNaN(formData.quantity)) {
      newErrors.quantity = 'Valid quantity is required';
    } else if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    // Date validation
    if (!formData.entry_time) {
      newErrors.entry_time = 'Entry date is required';
    }
    
    if (!formData.exit_time) {
      newErrors.exit_time = 'Exit date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setErrors(prev => ({
        ...prev,
        general: 'Please correct the errors highlighted in red'
      }));
      return;
    }
    setIsSubmitting(true);
    try {
      let screenshotUrl = formData.screenshot_url || '';
      // Ensure user_id is set
      const userId = formData.user_id || user?.id;
      if (screenshots.length > 0 && userId && formData.symbol) {
        const tradeId = initialTrade?.id || formData.symbol + '-' + Date.now();
        const url = await uploadTradeScreenshot(screenshots[0], userId, tradeId);
        console.log('Screenshot uploaded URL:', url);
        if (url) screenshotUrl = url;
      }
      const finalTrade: Partial<Trade> = {
        ...formData,
        user_id: userId,
        screenshots,
        screenshot_url: screenshotUrl,
        entry_price: Number(formData.entry_price),
        exit_price: Number(formData.exit_price),
        quantity: Number(formData.quantity),
        profit_loss: calculatePnL(),
        r_multiple: rMultiple
      };
      console.log('Saving trade with screenshot_url:', finalTrade.screenshot_url);
      await onSubmit(finalTrade);
      if (!initialTrade) {
        setFormData({
          symbol: '',
          type: 'Long',
          entry_price: 0,
          exit_price: 0,
          quantity: 0,
          entry_time: new Date().toISOString().split('T')[0],
          exit_time: new Date().toISOString().split('T')[0],
          profit_loss: undefined,
          notes: '',
          tags: [],
          user_id: userId,
        });
        setScreenshots([]);
        setSelectedImage(null);
        setImagePreview(null);
      }
      toast.success('Trade added!');
    } catch (error) {
      console.error('Error submitting trade:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to submit trade. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Calculate P&L
  const calculatePnL = () => {
    if (!formData.entry_price || !formData.exit_price || !formData.quantity) return 0;
    return formData.type === 'Long'
      ? (formData.exit_price - formData.entry_price) * formData.quantity
      : (formData.entry_price - formData.exit_price) * formData.quantity;
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#10131c] to-[#181e2e] py-16 px-2">
      <div className="w-full max-w-4xl mx-auto rounded-[2.5rem] shadow-2xl border border-blue-200/30 px-4 md:px-16 py-8 md:py-16 my-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30,58,138,0.18) 0%, rgba(59,130,246,0.10) 100%)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
          border: '1.5px solid rgba(59,130,246,0.18)',
        }}
      >
        {/* Radial Gradient Background Behind Card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[40vh] pointer-events-none z-0" style={{background: 'radial-gradient(ellipse at center, rgba(60,80,255,0.18) 0%, rgba(20,24,40,0.0) 80%)'}} />
        {/* Premium Glassmorphic Banner - Remove top margin, add soft shadow, increase transparency */}
        <div className="relative w-full max-w-3xl mx-auto rounded-[2.5rem] shadow-[0_8px_64px_0_rgba(60,80,255,0.18)] border border-blue-400/20 px-10 py-10 flex flex-col items-center mb-2 bg-white/20 backdrop-blur-2xl" style={{backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)'}}>
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none border-4 border-transparent animate-gradient-border" style={{background: 'linear-gradient(120deg, #60a5fa, #a78bfa, #818cf8, #60a5fa)', backgroundClip: 'padding-box', zIndex: 1, opacity: 0.5}} />
          <h1 className="text-6xl font-extrabold text-white mb-3 text-center drop-shadow-glass animate-glow">Add Trade</h1>
          <div className="text-xl text-blue-100 font-light mb-7 text-center italic animate-fade-in">Log your trade with all the details and insights</div>
          <Link href="/trades" className="px-8 py-3 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-600/90 hover:to-indigo-600/90 text-white rounded-full font-semibold transition shadow-lg text-lg backdrop-blur-md border border-blue-200/30 mb-2">← Back to Trades</Link>
        </div>
        {/* Premium Stepper */}
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center mb-2">
          <div className="w-full flex justify-center mb-2 drop-shadow-xl">
            <div className="flex gap-6 bg-white/10 rounded-full px-6 py-3 backdrop-blur-lg border border-blue-200/20">
              {['Symbol', 'Price', 'Screenshot', 'Tags', 'Notes'].map((step, idx) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full border-2 font-bold text-xl transition-all duration-200 shadow-lg ${currentStep === idx ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400 text-white scale-110 animate-glow' : 'bg-white/10 border-blue-200/30 text-blue-200'}`}>{idx + 1}</div>
                  <span className={`mt-2 text-xs font-medium ${currentStep === idx ? 'text-blue-200' : 'text-blue-100/60'}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-10 px-2 md:px-8 py-6 md:py-10 relative z-10">
          {/* Progress Bar */}
          <div className="mb-16">
            <div className="h-2 bg-blue-100/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400/80 to-indigo-400/80 rounded-full transition-all duration-300 shadow-glass"
                  style={{ width: `${completionStatus}%` }}
                ></div>
            </div>
            <div className="text-xs text-blue-100 mt-2 text-right">{completionStatus}% complete</div>
          </div>
          {/* Symbol Input */}
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="relative w-full mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                name="symbol"
                id="symbol"
                value={formData.symbol || ''}
                onChange={handleChange}
                placeholder="Enter symbol (e.g. AAPL, EURUSD)"
                className="w-full pl-12 pr-4 py-4 rounded-full bg-white/10 border border-blue-200/30 text-white text-xl font-semibold placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 shadow-glass backdrop-blur-md transition-all"
                autoComplete="off"
                style={{backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'}}
              />
            </div>
            {/* Recent Symbols */}
            {recentSymbols && recentSymbols.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {recentSymbols.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, symbol: sym }))}
                    className="px-4 py-1 rounded-full bg-blue-500/20 text-blue-200 font-medium hover:bg-blue-500/40 transition-all"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Step 1: Price Entry */}
          <div className="pt-2 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-blue-400/80 shadow-glass text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">1</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight drop-shadow-glass">
                <svg className="w-7 h-7 text-blue-200 drop-shadow-glass" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Price Entry
              </h2>
            </div>
            <div className="mt-8">
                <AdvancedPriceEntry
                  symbol={formData.symbol || ''}
                  type={formData.type || 'Long'}
                  entryPrice={formData.entry_price}
                  exitPrice={formData.exit_price}
                  quantity={formData.quantity}
                  onEntryPriceChange={(price) => setFormData(prev => ({ ...prev, entry_price: price }))}
                  onExitPriceChange={(price) => setFormData(prev => ({ ...prev, exit_price: price }))}
                />
              </div>
            </div>
          <div className="border-t border-blue-200/20" />
          {/* Step 2: Chart Screenshot */}
          <div className="pt-2 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-blue-400/80 shadow-glass text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">2</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight drop-shadow-glass">
                <svg className="w-7 h-7 text-blue-200 drop-shadow-glass" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Chart Screenshot
              </h2>
            </div>
            <div className="mt-8">
                <TradeScreenshotUploader
                  onScreenshotsChange={handleScreenshotsChange}
                onAnalysisComplete={(result) => {
                  setAiLoading(false);
                  handleAnalysisComplete(result);
                }}
                  initialScreenshots={screenshots}
                />
              </div>
            </div>
          <div className="border-t border-blue-200/20" />
          {/* Step 3: Emotional State */}
          <div className="pt-2 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-blue-400/80 shadow-glass text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">3</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight drop-shadow-glass">
                <svg className="w-7 h-7 text-blue-200 drop-shadow-glass" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Emotional State
              </h2>
            </div>
            <div className="mt-8">
                <EmotionalStateSelector
                  value={formData.emotional_state}
                  onChange={(value) => setFormData(prev => ({ ...prev, emotional_state: value }))}
                />
              </div>
            </div>
          <div className="border-t border-blue-200/20" />
          {/* Step 4: Trade Tags */}
          <div className="pt-2 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-blue-400/80 shadow-glass text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">4</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight drop-shadow-glass">
                <svg className="w-7 h-7 text-blue-200 drop-shadow-glass" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Trade Tags
              </h2>
              </div>
            <div className="mt-8">
                <TradeTagSelector
                  selectedTags={formData.tags || []}
                  onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                />
              </div>
            </div>
          <div className="border-t border-blue-200/20" />
          {/* Step 5: Notes */}
          <div className="pt-2 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-blue-400/80 shadow-glass text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">5</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight drop-shadow-glass">
                <svg className="w-7 h-7 text-blue-200 drop-shadow-glass" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Notes
              </h2>
            </div>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Add your trading notes here..."
              rows={4}
              className="w-full p-3 bg-white/10 border border-blue-200/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40 resize-none backdrop-blur-md"
              style={{backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}
            ></textarea>
            <div className="mt-2 text-xs text-blue-100">Add your thoughts, strategies, and lessons learned</div>
          </div>
            {/* Action Buttons */}
          <div className="flex gap-3 pt-10 border-t border-blue-200/20 mt-10">
              <button
                type="button"
                onClick={onCancel}
              className="flex-1 p-3 bg-white/10 hover:bg-white/20 text-blue-200 rounded-lg transition-colors font-medium text-lg border border-blue-200/20 backdrop-blur-md"
              style={{backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'}}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
              className={`flex-1 p-3 rounded-lg transition-colors font-medium text-lg bg-blue-500/80 hover:bg-blue-600/90 text-white border border-blue-200/20 shadow-lg backdrop-blur-md ${
                  isSubmitting
                  ? 'opacity-60 cursor-wait'
                  : ''
                }`}
              style={{backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'}}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mr-2"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{initialTrade ? 'Save Changes' : 'Add Trade'}</span>
                  </div>
                )}
              </button>
          </div>
        </form>
        {/* AI Suggestions Modal */}
        <AnimatePresence>
          {showAiModal && aiAnalysis && (
            <Modal isOpen={showAiModal} onClose={rejectAiSuggestions} title="AI Analysis Suggestions">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bg-[#181e2e] p-6 rounded-xl max-w-lg mx-auto text-white"
              >
                <div className="mb-3 text-sm text-blue-200">Review and apply the AI's suggestions to your trade form.</div>
                <ul className="mb-4 space-y-1">
                  <li><b>Symbol:</b> {aiAnalysis.symbol}</li>
                  <li><b>Type:</b> {aiAnalysis.tradeType}</li>
                  <li><b>Entry Price:</b> {aiAnalysis.entryPrice}</li>
                  <li><b>Take Profit:</b> {aiAnalysis.takeProfitPrice}</li>
                  <li><b>Tags:</b> {aiAnalysis.suggestedTags?.join(', ')}</li>
                  <li><b>Notes:</b> <span className="text-gray-300">{aiAnalysis.notes}</span></li>
                </ul>
                <div className="flex gap-3 justify-end">
                  <button onClick={rejectAiSuggestions} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700">Reject</button>
                  <button onClick={applyAiSuggestions} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">Apply All</button>
                </div>
              </motion.div>
            </Modal>
          )}
        </AnimatePresence>
        {/* Show loading spinner overlay when AI is analyzing */}
        {aiLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-[#181e2e] p-8 rounded-xl flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <div className="text-blue-200">Analyzing screenshot with AI...</div>
            </div>
          </div>
        )}
        </div>
        {/* Confetti Animation */}
        {initialTrade && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
            gravity={0.05}
            wind={0.01}
            colors={['#ffd700', '#ffb700', '#ff9a00']}
          />
        )}
    </div>
  );
};

export default EnhancedTradeForm; 