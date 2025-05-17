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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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
    
    // Add tags to the form data
    const formWithTags = {
      ...formData,
      tags: selectedTags
    };
    
    onSubmit(formWithTags);
  };
  
  return (
    <div className="bg-gradient-to-b from-[#0c0d14] to-[#0f1117] p-4 md:p-8 min-h-[calc(100vh-64px)]">
      {/* Improved Header with Shadow and Gradient Background */}
      <div className="mb-8 relative">
        <div className="bg-gradient-to-r from-indigo-900/20 via-blue-900/20 to-purple-900/20 rounded-xl overflow-hidden border border-indigo-800/30 shadow-lg">
          <div className="backdrop-blur-sm backdrop-filter p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <svg className="w-7 h-7 mr-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {initialTrade ? 'Edit Trade' : 'Add New Trade'}
                </h1>
                <p className="text-indigo-300 mt-2">Record your trading activity with all the details and insights</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors text-indigo-300 text-sm flex items-center shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save as Draft
                </button>
                
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 transition-colors text-blue-300 text-sm flex items-center shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Economic Events
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <form 
        onSubmit={handleSubmit}
        className="space-y-8 max-w-7xl mx-auto"
      >
        {/* Progress bar */}
        <div className="flex items-center mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-800/50 shadow-md">
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-indigo-500 to-indigo-400"
              style={{ width: '75%' }}
            ></div>
          </div>
          <span className="ml-4 text-sm font-medium text-white">75%</span>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Trade Details */}
          <div className="bg-gradient-to-b from-[#111827] to-[#0f1117] rounded-xl shadow-xl border border-indigo-900/20 overflow-hidden">
            <div className="p-6">
              <h3 className="text-white text-base font-medium flex items-center mb-4">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Trade Details
              </h3>

              <div className="space-y-4">
                {/* Symbol */}
                <div>
                  <label htmlFor="symbol" className="block text-indigo-300 mb-2 text-sm font-medium">
                    Symbol <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="symbol"
                    name="symbol"
                    type="text"
                    value={formData.symbol}
                    onChange={handleChange}
                    placeholder="AAPL, EURUSD, etc."
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
                  />
                  
                  {/* Quick Symbol Selection */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, symbol: 'EURUSD' }))}
                      className="px-3 py-1.5 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-indigo-300 rounded-full text-xs border border-indigo-600/30 hover:shadow-md transition-all"
                    >
                      EURUSD
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, symbol: 'AAPL' }))}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-emerald-300 rounded-full text-xs border border-emerald-600/30 hover:shadow-md transition-all"
                    >
                      AAPL
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, symbol: 'BTCUSD' }))}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-yellow-300 rounded-full text-xs border border-yellow-600/30 hover:shadow-md transition-all"
                    >
                      BTCUSD
                    </motion.button>
                  </div>
                </div>

                {/* Trade Type */}
                <div>
                  <label className="block text-indigo-300 mb-2 text-sm font-medium">
                    Trade Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'Long' }))}
                      className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                        formData.type === 'Long'
                          ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-emerald-300 border border-emerald-600/30'
                          : 'bg-[#1a1f2c] text-gray-400 border border-gray-700/30 hover:bg-[#1e293b]'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Long
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'Short' }))}
                      className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                        formData.type === 'Short'
                          ? 'bg-gradient-to-r from-red-600/20 to-rose-600/20 text-rose-300 border border-rose-600/30'
                          : 'bg-[#1a1f2c] text-gray-400 border border-gray-700/30 hover:bg-[#1e293b]'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                      </svg>
                      Short
                    </motion.button>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="entry_time" className="block text-indigo-300 mb-2 text-sm font-medium">
                      Entry Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      id="entry_time"
                      name="entry_time"
                      value={formData.entry_time}
                      onChange={handleChange}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="exit_time" className="block text-indigo-300 mb-2 text-sm font-medium">
                      Exit Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      id="exit_time"
                      name="exit_time"
                      value={formData.exit_time}
                      onChange={handleChange}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
                    />
                  </div>
                </div>

                {/* Prices and Quantity */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="entry_price" className="block text-indigo-300 mb-2 text-sm font-medium">
                      Entry Price <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="entry_price"
                        name="entry_price"
                        value={formData.entry_price || ''}
                        onChange={handleChange}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full py-2.5 pl-8 pr-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="exit_price" className="block text-indigo-300 mb-2 text-sm font-medium">
                      Exit Price <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="exit_price"
                        name="exit_price"
                        value={formData.exit_price || ''}
                        onChange={handleChange}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full py-2.5 pl-8 pr-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="quantity" className="block text-indigo-300 mb-2 text-sm font-medium">
                      Quantity <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleChange}
                      step="0.01"
                      placeholder="0"
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-indigo-300 mb-2 text-sm font-medium">
                    Trade Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Add your trading notes, strategies used, and lessons learned..."
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Second Column - Additional Details */}
          <div>
            {/* Tags Section */}
            <div className="bg-[#0f1117]/80 p-6 rounded-xl shadow-xl border border-indigo-900/30 backdrop-blur-sm mb-6">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Trade Tags
              </h2>
              
              <div className="mb-4">
                <div className="flex mb-3">
                  <div className="flex-1 mr-2">
                    <div className="relative">
                      <input
                        type="text"
                        id="newTagInput"
                        placeholder="Add a new tag..."
                        className="w-full p-2.5 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white pr-20 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
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
                </div>
                
                <div className="p-4 rounded-lg bg-[#12151f] border border-gray-800 shadow-inner">
                  {/* Selected tags with remove buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-900/40 to-indigo-800/30 text-indigo-300 rounded-lg text-xs flex items-center shadow-sm">
                      breakout
                      <button className="ml-2 text-indigo-400/70 hover:text-red-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-3 py-1.5 bg-gradient-to-r from-blue-900/40 to-blue-800/30 text-blue-300 rounded-lg text-xs flex items-center shadow-sm">
                      support
                      <button className="ml-2 text-blue-400/70 hover:text-red-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-3 py-1.5 bg-gradient-to-r from-green-900/40 to-green-800/30 text-green-300 rounded-lg text-xs flex items-center shadow-sm">
                      trend
                      <button className="ml-2 text-green-400/70 hover:text-red-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Tag suggestions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
                    <p className="w-full text-xs text-gray-400 mb-2">Suggested Tags:</p>
                    <button className="px-3 py-1.5 bg-[#131b2b] text-blue-400 border border-blue-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                      breakout
                    </button>
                    <button className="px-3 py-1.5 bg-[#132b1c] text-green-400 border border-green-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                      support
                    </button>
                    <button className="px-3 py-1.5 bg-[#2b131e] text-red-400 border border-red-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                      resistance
                    </button>
                    <button className="px-3 py-1.5 bg-[#2b2613] text-yellow-400 border border-yellow-900/40 rounded-lg text-xs shadow-sm hover:shadow-md transition-all">
                      trend
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Screenshot Upload */}
            <div className="bg-[#0f1117]/80 p-6 rounded-xl shadow-xl border border-indigo-900/30 backdrop-blur-sm mb-6">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Chart Screenshots
              </h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-300">Add your trade setup charts</div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center bg-indigo-900/20 border border-indigo-800/30 px-3 py-1.5 rounded-lg hover:bg-indigo-900/30 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Image
                  </button>
                  
                  <button
                    type="button"
                    className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg px-3 py-1.5 flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    AI Smart Fill
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  multiple
                />
              </div>
              
              <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700/70 rounded-lg text-gray-500 hover:border-indigo-500/50 hover:text-gray-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Add chart screenshots for analysis</p>
                <p className="text-xs text-gray-600 mt-1">Drag & drop or click to upload</p>
              </div>
            </div>
            
            {/* Trade Notes */}
            <div className="bg-[#0f1117]/80 p-6 rounded-xl shadow-xl border border-indigo-900/30 backdrop-blur-sm mb-6">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Trade Notes
              </h2>
              
              <div className="relative">
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  placeholder="Enter your trade notes here... What was your strategy? Why did you enter this trade? What were the market conditions?"
                  className="w-full p-4 rounded-lg bg-[#1a1f2c] border border-gray-700 text-white min-h-[180px] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                ></textarea>
                
                {/* Character count */}
                <div className="absolute bottom-3 right-3 text-gray-500 text-xs">
                  {(formData.notes || '').length} characters
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
                
                <button 
                  type="button"
                  className="text-xs bg-[#12151f] hover:bg-[#1a1f2c] text-gray-300 p-2 rounded border border-gray-800 transition-colors"
                >
                  + Add Management
                </button>
                
                <button 
                  type="button"
                  className="text-xs bg-[#12151f] hover:bg-[#1a1f2c] text-gray-300 p-2 rounded border border-gray-800 transition-colors"
                >
                  + Add Lessons Learned
                </button>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-900/20 via-blue-900/20 to-purple-900/20 border-t border-indigo-900/20">
            <div className="flex justify-end space-x-3">
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
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f1117]"
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