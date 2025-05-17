'use client'

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import AdvancedPriceEntry from './AdvancedPriceEntry';
import { TradingViewAnalysisResult } from '@/lib/aiService';
import EmotionalStateSelector from './EmotionalStateSelector';
import TradeTagSelector from './TradeTagSelector';
import TradeScreenshotUploader from './TradeScreenshotUploader';

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
  // Main form state
  const [formData, setFormData] = useState<Partial<Trade>>({
    symbol: '',
    type: 'Long',
    entry_price: undefined,
    exit_price: undefined,
    entry_time: new Date().toISOString().split('T')[0],
    exit_time: new Date().toISOString().split('T')[0],
    quantity: undefined,
    profit_loss: undefined,
    notes: '',
    emotional_state: undefined,
    tags: [],
  });
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionStatus, setCompletionStatus] = useState(0);
  const [favoriteTags, setFavoriteTags] = useState<string[]>([
    'trend', 'breakout', 'support', 'resistance', 'scalp', 'swing'
  ]);
  const [favoriteSymbols, setFavoriteSymbols] = useState<string[]>([
    'EURUSD', 'AAPL', 'BTCUSD', 'SPY', 'QQQ', 'TSLA'
  ]);
  const [screenshots, setScreenshots] = useState<File[]>([]);

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
    }
  }, [initialTrade]);
  
  // Load saved data from localStorage
  useEffect(() => {
    try {
      // Load favorite tags
      const savedFavoriteTags = localStorage.getItem('favoriteTags');
      if (savedFavoriteTags) {
        setFavoriteTags(JSON.parse(savedFavoriteTags));
      }
      
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
  
  // Add a tag to favorites
  const addToFavorites = (tag: string) => {
    if (!favoriteTags.includes(tag)) {
      const newFavorites = [...favoriteTags, tag];
      setFavoriteTags(newFavorites);
      localStorage.setItem('favoriteTags', JSON.stringify(newFavorites));
    }
  };
  
  // Remove from favorites
  const removeFromFavorites = (tag: string) => {
    const newFavorites = favoriteTags.filter(t => t !== tag);
    setFavoriteTags(newFavorites);
    localStorage.setItem('favoriteTags', JSON.stringify(newFavorites));
  };
  
  // Add a symbol to favorites
  const addToFavoriteSymbols = (symbol: string) => {
    if (!favoriteSymbols.includes(symbol)) {
      const newFavorites = [...favoriteSymbols, symbol];
      setFavoriteSymbols(newFavorites);
      localStorage.setItem('favoriteSymbols', JSON.stringify(newFavorites));
    }
  };
  
  // Remove from favorite symbols
  const removeFromFavoriteSymbols = (symbol: string) => {
    const newFavorites = favoriteSymbols.filter(s => s !== symbol);
    setFavoriteSymbols(newFavorites);
    localStorage.setItem('favoriteSymbols', JSON.stringify(newFavorites));
  };
  
  // Handle screenshot analysis completion
  const handleAnalysisComplete = (result: TradingViewAnalysisResult) => {
    // Apply analysis results to form
    if (result) {
      const updates: Partial<Trade> = {};
      
      if (result.symbol) updates.symbol = result.symbol;
      if (result.tradeType) updates.type = result.tradeType;
      if (result.entryPrice) updates.entry_price = result.entryPrice;
      if (result.takeProfitPrice) updates.exit_price = result.takeProfitPrice;
      
      // Apply suggested tags if available
      if (result.suggestedTags && result.suggestedTags.length > 0) {
        const newTags = [...(formData.tags || [])];
        result.suggestedTags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
        updates.tags = newTags;
      }
      
      // Add notes from analysis
      if (result.notes) {
        updates.notes = formData.notes 
          ? `${formData.notes}\n\nAI Analysis: ${result.notes}` 
          : `AI Analysis: ${result.notes}`;
      }
      
    setFormData(prev => ({
      ...prev,
        ...updates,
      }));
    }
  };
  
  // Handle screenshots change
  const handleScreenshotsChange = (files: File[]) => {
    setScreenshots(files);
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
    
    // Perform validation
    if (!validate()) {
      setErrors(prev => ({
        ...prev,
        general: 'Please correct the errors highlighted in red'
      }));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Ensure trade has correct format
      const finalTrade: Partial<Trade> = {
        ...formData,
        screenshots,
        entry_price: Number(formData.entry_price),
        exit_price: Number(formData.exit_price),
        quantity: Number(formData.quantity),
      };
      
      await onSubmit(finalTrade);
      
      // Reset form
      if (!initialTrade) {
        setFormData({
          symbol: '',
          type: 'Long',
          entry_price: undefined,
          exit_price: undefined,
          entry_time: new Date().toISOString().split('T')[0],
          exit_time: new Date().toISOString().split('T')[0],
          quantity: undefined,
          profit_loss: undefined,
          notes: '',
          emotional_state: undefined,
          tags: [],
        });
        setScreenshots([]);
      }
      
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
  
  return (
    <div className="bg-[#0f1117] min-h-screen">
      <form onSubmit={handleSubmit} className={`max-w-7xl mx-auto ${className}`}>
        {/* Progress indicator */}
        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-500 ${
              completionStatus >= 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${completionStatus}%` }}
              ></div>
            </div>
        <div className="text-right text-xs text-gray-400 mt-1">{completionStatus}% complete</div>
        
        {/* Error message */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errors.general}</span>
          </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Basic Trade Data */}
          <div className="space-y-6">
            {/* Trade Details Card */}
            <div className="bg-[#151823] rounded-xl overflow-hidden border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-white text-sm font-bold flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Trade Details
                </h3>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Symbol */}
                <div>
                  <label htmlFor="symbol" className="block text-gray-400 mb-1 text-sm">
                    Symbol <span className="text-red-400">*</span>
                  </label>
                <div className="relative">
                  <input
                    type="text"
                    id="symbol"
                    name="symbol"
                    value={formData.symbol || ''}
                    onChange={handleChange}
                      placeholder="AAPL, EURUSD, etc."
                      className={`w-full p-2.5 bg-[#1a1f2c] border ${
                        errors.symbol ? 'border-red-500' : 'border-gray-700'
                      } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {formData.symbol && (
                      <button
                        type="button"
                        onClick={() => addToFavoriteSymbols(formData.symbol!)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-amber-400 transition-colors"
                        title="Add to favorites"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                      </button>
                    )}
                  </div>
                  {errors.symbol && (
                    <p className="mt-1 text-xs text-red-400">{errors.symbol}</p>
                  )}
                  
                  {/* Favorite Symbols */}
                  {favoriteSymbols.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-2">Favorite Symbols:</div>
                      <div className="flex flex-wrap gap-2">
                        {favoriteSymbols.map(symbol => (
                          <div 
                            key={symbol}
                            className="group bg-[#1a1f2c] hover:bg-[#1d2436] px-2.5 py-1.5 rounded text-xs flex items-center cursor-pointer border border-gray-700"
                            onClick={() => setFormData(prev => ({ ...prev, symbol }))}
                          >
                            <span className="text-gray-300">{symbol}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromFavoriteSymbols(symbol);
                              }}
                              className="ml-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
              
              {/* Trade Type */}
                <div>
                  <label className="block text-gray-400 mb-1 text-sm">
                    Trade Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'Long' }))}
                      className={`p-3 rounded-lg flex flex-col items-center justify-center transition-colors ${
                        formData.type === 'Long'
                          ? 'bg-green-900/30 border border-green-500/30 text-green-400'
                          : 'bg-[#1a1f2c] border border-gray-700 text-gray-400 hover:bg-[#1d2436]'
                      }`}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span className="text-sm font-medium">Long</span>
                      <span className="text-xs opacity-80">Buy Position</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'Short' }))}
                      className={`p-3 rounded-lg flex flex-col items-center justify-center transition-colors ${
                        formData.type === 'Short'
                          ? 'bg-red-900/30 border border-red-500/30 text-red-400'
                          : 'bg-[#1a1f2c] border border-gray-700 text-gray-400 hover:bg-[#1d2436]'
                      }`}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className="text-sm font-medium">Short</span>
                      <span className="text-xs opacity-80">Sell Position</span>
                    </button>
                  </div>
              </div>
              
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Entry Date */}
                <div>
                    <label htmlFor="entry_time" className="block text-gray-400 mb-1 text-sm">
                      Entry Date <span className="text-red-400">*</span>
                    </label>
                  <input
                    type="date"
                    id="entry_time"
                    name="entry_time"
                    value={formData.entry_time || ''}
                    onChange={handleChange}
                      className={`w-full p-2.5 bg-[#1a1f2c] border ${
                        errors.entry_time ? 'border-red-500' : 'border-gray-700'
                      } rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                    {errors.entry_time && (
                      <p className="mt-1 text-xs text-red-400">{errors.entry_time}</p>
                    )}
                </div>
                  
                  {/* Exit Date */}
                <div>
                    <label htmlFor="exit_time" className="block text-gray-400 mb-1 text-sm">
                      Exit Date <span className="text-red-400">*</span>
                    </label>
                  <input
                    type="date"
                    id="exit_time"
                    name="exit_time"
                    value={formData.exit_time || ''}
                    onChange={handleChange}
                      className={`w-full p-2.5 bg-[#1a1f2c] border ${
                        errors.exit_time ? 'border-red-500' : 'border-gray-700'
                      } rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                    {errors.exit_time && (
                      <p className="mt-1 text-xs text-red-400">{errors.exit_time}</p>
                    )}
                </div>
              </div>
              
              {/* Quantity */}
                <div>
                  <label htmlFor="quantity" className="block text-gray-400 mb-1 text-sm">
                    Quantity/Size <span className="text-red-400">*</span>
                  </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity === undefined ? '' : formData.quantity}
                  onChange={handleChange}
                    placeholder="0"
                  min="0"
                    step="0.01"
                    className={`w-full p-2.5 bg-[#1a1f2c] border ${
                      errors.quantity ? 'border-red-500' : 'border-gray-700'
                    } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>
                  )}
                </div>
              </div>
              </div>
              
            {/* Advanced Price Entry */}
              <AdvancedPriceEntry
              symbol={formData.symbol || ''}
              type={formData.type || 'Long'}
                entryPrice={formData.entry_price}
                exitPrice={formData.exit_price}
                quantity={formData.quantity}
              onEntryPriceChange={(price) => setFormData(prev => ({ ...prev, entry_price: price }))}
              onExitPriceChange={(price) => setFormData(prev => ({ ...prev, exit_price: price }))}
              className="rounded-xl border border-gray-800 overflow-hidden"
            />
            
            {/* Emotional State */}
            <EmotionalStateSelector
              value={formData.emotional_state}
              onChange={(value) => setFormData(prev => ({ ...prev, emotional_state: value }))}
              className="rounded-xl border border-gray-800 overflow-hidden"
            />
              </div>
              
          {/* Middle Column - Screenshots and Tags */}
          <div className="space-y-6">
            {/* Screenshots Section */}
            <TradeScreenshotUploader
              onScreenshotsChange={handleScreenshotsChange}
              onAnalysisComplete={handleAnalysisComplete}
              initialScreenshots={screenshots}
              className="rounded-xl border border-gray-800 overflow-hidden"
            />
            
            {/* Notes Section */}
            <div className="bg-[#151823] rounded-xl overflow-hidden border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-white text-sm font-bold flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Trade Notes
                </h3>
                </div>
              
              <div className="p-4">
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  placeholder="Add your trading notes here..."
                  rows={5}
                  className="w-full p-3 bg-[#1a1f2c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                ></textarea>
                
                <div className="mt-2 text-xs text-gray-500 flex justify-between">
                  <span>Add your thoughts, strategies, and lessons learned</span>
                  <span>{formData.notes?.length || 0} characters</span>
                </div>
              </div>
            </div>
          </div>
        
          {/* Right Column - Tags and Submit */}
          <div className="space-y-6">
            {/* Tags Section */}
            <TradeTagSelector
              selectedTags={formData.tags || []}
              onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              favoriteTags={favoriteTags}
              onAddToFavorites={addToFavorites}
              onRemoveFromFavorites={removeFromFavorites}
              className="rounded-xl border border-gray-800 overflow-hidden h-auto"
            />
            
            {/* Action Buttons */}
            <div className="bg-[#151823] rounded-xl overflow-hidden border border-gray-800 p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              type="button"
              onClick={onCancel}
                  className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            
              <button
                type="submit"
                disabled={isSubmitting}
                  className={`p-3 rounded-lg transition-colors ${
                    isSubmitting
                      ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-200 border-t-transparent rounded-full animate-spin mr-2"></div>
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
              
              <div className="bg-[#1a1f2c] rounded-lg p-3">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                  Trading Summary
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">P/L:</span>
                    <span className={`font-mono font-medium ${
                      formData.profit_loss 
                        ? formData.profit_loss > 0 
                          ? 'text-green-400' 
                          : formData.profit_loss < 0 
                            ? 'text-red-400' 
                            : 'text-gray-400'
                        : 'text-gray-400'
                    }`}>
                      {formData.profit_loss !== undefined 
                        ? new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(formData.profit_loss)
                        : '--'}
                      </span>
                    </div>
                    
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trade Type:</span>
                    <span className={`font-medium ${
                      formData.type === 'Long' 
                        ? 'text-green-400' 
                        : formData.type === 'Short' 
                          ? 'text-red-400' 
                          : 'text-gray-400'
                    }`}>
                      {formData.type || '--'}
                    </span>
                  </div>
                  
                  {formData.entry_price !== undefined && formData.exit_price !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price Change:</span>
                      <span className={`font-medium ${
                        formData.exit_price > formData.entry_price
                            ? 'text-green-400' 
                          : formData.exit_price < formData.entry_price
                              ? 'text-red-400'
                            : 'text-gray-400'
                      }`}>
                        {((Math.abs(formData.exit_price - formData.entry_price) / formData.entry_price) * 100).toFixed(2)}%
                      </span>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
        </div>
      </form>
    </div>
  );
};

export default EnhancedTradeForm; 