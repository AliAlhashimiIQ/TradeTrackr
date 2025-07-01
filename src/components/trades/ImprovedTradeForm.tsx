import React, { useState, useRef } from 'react';
import { Trade } from '@/lib/types';
import { motion } from 'framer-motion';

interface ImprovedTradeFormProps {
  initialTrade?: Partial<Trade>;
  onSubmit: (trade: Partial<Trade>) => void;
  onCancel: () => void;
}

/**
 * An improved version of the trade form with a modern, clean UI
 */
const ImprovedTradeForm: React.FC<ImprovedTradeFormProps> = ({
  initialTrade,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Trade>>(initialTrade || {
    symbol: '',
    type: 'Long',
    entry_price: undefined,
    exit_price: undefined,
    entry_time: new Date().toISOString().split('T')[0],
    exit_time: new Date().toISOString().split('T')[0],
    quantity: undefined,
    profit_loss: undefined,
    notes: ''
  });
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Clear any existing validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = {...prev};
        delete updated[name];
        return updated;
      });
    }
    
    if (type === 'number') {
      let numValue = value === '' ? undefined : parseFloat(value);
      
      // Validate positive numbers for prices and quantity
      if (numValue !== undefined && numValue < 0 && (name === 'entry_price' || name === 'exit_price' || name === 'quantity')) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: 'Value cannot be negative'
        }));
        return; // Don't update the form data with invalid values
      }
      
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Validate dates if either entry or exit time is changed
      if (name === 'entry_time' || name === 'exit_time') {
        validateDates(name === 'entry_time' ? value : formData.entry_time, 
                     name === 'exit_time' ? value : formData.exit_time);
      }
    }
  };
  
  const validateDates = (entryDate?: string, exitDate?: string) => {
    if (!entryDate || !exitDate) return;
    
    const entry = new Date(entryDate);
    const exit = new Date(exitDate);
    
    if (exit < entry) {
      setValidationErrors(prev => ({
        ...prev,
        exit_time: 'Exit date cannot be before entry date'
      }));
    } else {
      // Clear exit_time error if dates are now valid
      if (validationErrors.exit_time) {
        setValidationErrors(prev => {
          const updated = {...prev};
          delete updated.exit_time;
          return updated;
        });
      }
    }
  };
  
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perform validation checks before submission
    const errors: Record<string, string> = {};
    
    // Required fields validation
    const requiredFields: (keyof Trade)[] = ['symbol', 'entry_price', 'exit_price', 'quantity'];
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = 'This field is required';
      }
    });
    
    // Price validation
    if (formData.entry_price !== undefined && formData.entry_price < 0) {
      errors.entry_price = 'Entry price cannot be negative';
    }
    
    if (formData.exit_price !== undefined && formData.exit_price < 0) {
      errors.exit_price = 'Exit price cannot be negative';
    }
    
    if (formData.quantity !== undefined && formData.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than zero';
    }
    
    // Date validation
    if (formData.entry_time && formData.exit_time) {
      const entry = new Date(formData.entry_time);
      const exit = new Date(formData.exit_time);
      
      if (exit < entry) {
        errors.exit_time = 'Exit date cannot be before entry date';
      }
    }
    
    // Update validation errors
    setValidationErrors(errors);
    
    // If there are errors, don't submit
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // Add tags to the form data
    const formWithTags = {
      ...formData,
      tags: selectedTags
    };
    
    onSubmit(formWithTags);
  };
  
  // Helper function to display error message
  const getErrorMessage = (fieldName: string) => {
    return validationErrors[fieldName] ? (
      <span className="text-red-400 text-xs mt-1">{validationErrors[fieldName]}</span>
    ) : null;
  };
  
  return (
    <div className="bg-gradient-to-b from-[#0c0d14] to-[#0f1117] min-h-[calc(100vh-64px)]">
      {/* Enhanced Header with Gradient and Stats */}
      <div className="relative mb-8 bg-gradient-to-r from-indigo-900/20 via-blue-900/20 to-purple-900/20">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="relative px-6 py-8 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <svg className="w-8 h-8 mr-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                {initialTrade ? 'Edit Trade' : 'New Trade Entry'}
                </h1>
              <p className="text-indigo-300 mt-2 text-lg">Document your trading journey with precision</p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-indigo-900/30 rounded-lg p-3 border border-indigo-800/30">
                  <div className="text-xs text-indigo-300 mb-1">Today's Trades</div>
                  <div className="text-xl font-semibold text-white">12</div>
                </div>
                <div className="bg-green-900/30 rounded-lg p-3 border border-green-800/30">
                  <div className="text-xs text-green-300 mb-1">Win Rate</div>
                  <div className="text-xl font-semibold text-white">68%</div>
                </div>
                <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/30">
                  <div className="text-xs text-blue-300 mb-1">Avg. RR</div>
                  <div className="text-xl font-semibold text-white">1.5</div>
                </div>
                <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-800/30">
                  <div className="text-xs text-purple-300 mb-1">Total P/L</div>
                  <div className="text-xl font-semibold text-white">+$2,450</div>
                </div>
              </div>
              </div>
              
            <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
                <button
                  type="button"
                className="px-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors text-indigo-300 text-sm flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                Save Template
                </button>
                
                <button
                  type="button"
                className="px-4 py-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 transition-colors text-blue-300 text-sm flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                Market Analysis
                </button>
              </div>
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="px-6 md:px-8 pb-6">
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-300">Form Progress</span>
              <span className="ml-auto text-sm text-indigo-400 font-medium">75% Complete</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-indigo-500 via-indigo-400 to-blue-500"
                style={{ width: '75%' }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Basic Info</span>
              <span>Trade Details</span>
              <span>Analysis</span>
              <span>Review</span>
            </div>
          </div>
        </div>
      </div>
      
      <form 
        onSubmit={handleSubmit}
        className="max-w-7xl mx-auto px-6 md:px-8 pb-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Emotional State - Top Left */}
          <div className="order-1 lg:order-1">
            <div className="bg-gradient-to-b from-[#111827] to-[#0f1117] rounded-xl shadow-xl border border-indigo-900/20 p-6 h-full flex flex-col">
              <h3 className="text-white text-lg font-semibold mb-4 border-b border-indigo-900/30 pb-2">Emotional State</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pre-Trade */}
                <div>
                  <label className="block text-indigo-300 mb-2 text-sm font-medium">Pre-Trade</label>
                  <div className="flex gap-2 mb-2">
                    {[1,2,3,4,5].map(rating => (
                      <button key={rating} type="button" onClick={() => setFormData(prev => ({ ...prev, pre_trade_rating: rating }))} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${formData.pre_trade_rating === rating ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{rating}</button>
                    ))}
                  </div>
                  <select value={formData.pre_trade_emotion || ''} onChange={e => setFormData(prev => ({ ...prev, pre_trade_emotion: e.target.value }))} className="w-full bg-[#12151f] border border-gray-800 rounded-lg py-2 px-3 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="">Select emotion...</option>
                    <option value="confident">Confident</option>
                    <option value="calm">Calm</option>
                    <option value="anxious">Anxious</option>
                    <option value="fearful">Fearful</option>
                    <option value="excited">Excited</option>
                  </select>
                </div>
                {/* Post-Trade */}
                <div>
                  <label className="block text-indigo-300 mb-2 text-sm font-medium">Post-Trade</label>
                  <div className="flex gap-2 mb-2">
                    {[1,2,3,4,5].map(rating => (
                      <button key={rating} type="button" onClick={() => setFormData(prev => ({ ...prev, post_trade_rating: rating }))} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${formData.post_trade_rating === rating ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{rating}</button>
                    ))}
                  </div>
                  <select value={formData.post_trade_emotion || ''} onChange={e => setFormData(prev => ({ ...prev, post_trade_emotion: e.target.value }))} className="w-full bg-[#12151f] border border-gray-800 rounded-lg py-2 px-3 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="">Select emotion...</option>
                    <option value="satisfied">Satisfied</option>
                    <option value="disappointed">Disappointed</option>
                    <option value="neutral">Neutral</option>
                    <option value="regretful">Regretful</option>
                    <option value="proud">Proud</option>
                  </select>
                </div>
              </div>
            </div>
        </div>
      
          {/* Trade Details - Center */}
          <div className="order-2 lg:order-2 lg:col-span-1">
            <div className="bg-gradient-to-b from-[#111827] to-[#0f1117] rounded-xl shadow-xl border border-indigo-900/20 p-6">
              <h3 className="text-white text-lg font-semibold mb-6 border-b border-indigo-900/30 pb-2">Trade Information</h3>
              <div className="grid grid-cols-1 gap-6">
                {/* Symbol */}
                <div>
                  <label htmlFor="symbol" className="block text-indigo-300 mb-2 text-sm font-medium">Symbol <span className="text-red-400">*</span></label>
                  <input id="symbol" name="symbol" type="text" value={formData.symbol} onChange={handleChange} placeholder="AAPL, EURUSD, etc." className={`w-full py-3 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border ${validationErrors.symbol ? 'border-red-500' : 'border-indigo-800/30'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner`} />
                  {getErrorMessage('symbol')}
                </div>
                {/* Trade Type */}
                <div>
                  <label className="block text-indigo-300 mb-2 text-sm font-medium">Trade Type <span className="text-red-400">*</span></label>
                  <div className="flex gap-3">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setFormData(prev => ({ ...prev, type: 'Long' }))} className={`flex-1 p-3 rounded-lg flex items-center justify-center transition-all ${formData.type === 'Long' ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-emerald-300 border border-emerald-600/30 shadow-lg' : 'bg-[#1a1f2c] text-gray-400 border border-gray-700/30 hover:bg-[#1e293b]'}`}>Long</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setFormData(prev => ({ ...prev, type: 'Short' }))} className={`flex-1 p-3 rounded-lg flex items-center justify-center transition-all ${formData.type === 'Short' ? 'bg-gradient-to-r from-red-600/20 to-rose-600/20 text-rose-300 border border-rose-600/30 shadow-lg' : 'bg-[#1a1f2c] text-gray-400 border border-gray-700/30 hover:bg-[#1e293b]'}`}>Short</motion.button>
                  </div>
                </div>
                {/* Entry Date */}
                  <div>
                  <label htmlFor="entry_time" className="block text-indigo-300 mb-2 text-sm font-medium">Entry Date <span className="text-red-400">*</span></label>
                  <input type="date" id="entry_time" name="entry_time" value={formData.entry_time} onChange={handleChange} className={`w-full py-3 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border ${validationErrors.entry_time ? 'border-red-500' : 'border-indigo-800/30'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner`} />
                  {getErrorMessage('entry_time')}
                  </div>
                {/* Exit Date */}
                  <div>
                  <label htmlFor="exit_time" className="block text-indigo-300 mb-2 text-sm font-medium">Exit Date <span className="text-red-400">*</span></label>
                  <input type="date" id="exit_time" name="exit_time" value={formData.exit_time} onChange={handleChange} className={`w-full py-3 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border ${validationErrors.exit_time ? 'border-red-500' : 'border-indigo-800/30'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner`} />
                  {getErrorMessage('exit_time')}
                </div>
                {/* Entry Price */}
                  <div>
                  <label htmlFor="entry_price" className="block text-indigo-300 mb-2 text-sm font-medium">Entry Price <span className="text-red-400">*</span></label>
                  <input type="number" id="entry_price" name="entry_price" value={formData.entry_price || ''} onChange={handleChange} step="0.01" placeholder="0.00" className="w-full py-3 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner" />
                  {getErrorMessage('entry_price')}
                      </div>
                {/* Exit Price */}
                  <div>
                  <label htmlFor="exit_price" className="block text-indigo-300 mb-2 text-sm font-medium">Exit Price <span className="text-red-400">*</span></label>
                  <input type="number" id="exit_price" name="exit_price" value={formData.exit_price || ''} onChange={handleChange} step="0.01" placeholder="0.00" className="w-full py-3 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner" />
                  {getErrorMessage('exit_price')}
                </div>
                {/* Quantity */}
                <div>
                  <label htmlFor="quantity" className="block text-indigo-300 mb-2 text-sm font-medium">Quantity <span className="text-red-400">*</span></label>
                  <input type="number" id="quantity" name="quantity" value={formData.quantity || ''} onChange={handleChange} step="0.01" placeholder="0" className="w-full py-3 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner" />
                  {getErrorMessage('quantity')}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Takes 1 column */}
          <div className="space-y-6">
            {/* Tags Section */}
            <div className="bg-[#0f1117]/80 p-6 rounded-xl shadow-xl border border-indigo-900/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Trade Tags
              </h2>
              
              {/* Tag Input */}
              <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Add a new tag..."
                    className="w-full p-3 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white pr-20 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-md px-3 py-1.5 flex items-center transition-colors"
                      >
                        <span className="mr-1">+</span>
                        Add
                      </button>
                  </div>
                </div>
                
              {/* Selected Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-900/40 to-indigo-800/30 text-indigo-300 rounded-lg text-xs flex items-center shadow-sm">
                      breakout
                      <button className="ml-2 text-indigo-400/70 hover:text-red-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
              {/* Tag Suggestions */}
              <div className="p-3 rounded-lg bg-[#12151f] border border-gray-800">
                <p className="text-xs text-gray-400 mb-2">Suggested Tags:</p>
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 bg-[#131b2b] text-blue-400 border border-blue-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                    trend
                    </button>
                    <button className="px-3 py-1.5 bg-[#132b1c] text-green-400 border border-green-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                      support
                    </button>
                    <button className="px-3 py-1.5 bg-[#2b131e] text-red-400 border border-red-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                      resistance
                    </button>
                </div>
              </div>
            </div>
            
            {/* Screenshot Upload */}
            <div className="bg-[#0f1117]/80 p-6 rounded-xl shadow-xl border border-indigo-900/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Chart Screenshots
              </h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-300">Add your trade setup charts</div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center bg-indigo-900/20 border border-indigo-800/30 px-3 py-1.5 rounded-lg hover:bg-indigo-900/30 transition-colors"
                  >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Image
                  </button>
              </div>
              
              <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700/70 rounded-lg text-gray-500 hover:border-indigo-500/50 hover:text-gray-400 transition-colors cursor-pointer">
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Add chart screenshots for analysis</p>
                <p className="text-xs text-gray-600 mt-1">Drag & drop or click to upload</p>
              </div>
            </div>
            
            {/* Trade Notes */}
            <div className="bg-[#0f1117]/80 p-6 rounded-xl shadow-xl border border-indigo-900/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Trade Notes
              </h2>
              
              <div className="relative">
                <textarea
                  placeholder="Enter your trade notes here..."
                  className="w-full p-4 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white min-h-[180px] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                ></textarea>
                
                <div className="absolute bottom-3 right-3 text-gray-500 text-xs">
                  0 characters
                </div>
              </div>
              
              {/* Note suggestions */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  className="text-xs bg-[#12151f] hover:bg-[#1a1f2c] text-gray-300 p-2 rounded border border-gray-800 transition-colors"
                >
                  + Add Strategy
                </button>
                
                <button 
                  type="button"
                  className="text-xs bg-[#12151f] hover:bg-[#1a1f2c] text-gray-300 p-2 rounded border border-gray-800 transition-colors"
                >
                  + Add Market Conditions
                </button>
              </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-900/90 via-blue-900/90 to-purple-900/90 border-t border-indigo-900/20 backdrop-blur-sm z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-indigo-300 text-sm">
                <span className="font-medium">Status:</span> Draft
              </div>
              <div className="text-indigo-300 text-sm">
                <span className="font-medium">Last saved:</span> 2 mins ago
              </div>
            </div>
            
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-[#1e293b] text-indigo-300 rounded-lg hover:bg-[#252f3f] transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2 focus:ring-offset-[#0f1117] border border-indigo-900/20"
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f1117] shadow-lg"
              >
                {initialTrade ? 'Update Trade' : 'Add Trade'}
              </motion.button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ImprovedTradeForm; 