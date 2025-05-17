'use client';

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';

interface AdvancedFiltersProps {
  onApplyFilters: (filters: FilterOptions) => void;
  trades: Trade[];
  isOpen: boolean;
  onClose: () => void;
}

export interface FilterOptions {
  symbols: string[];
  strategies: string[];
  tradeTypes: ('Long' | 'Short')[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  profitRange: {
    min: number | null;
    max: number | null;
  };
  tags: string[];
}

// Consistent color system
const COLORS = {
  primary: '#3b82f6', // Blue
  success: '#10b981', // Green
  danger: '#ef4444', // Red
  warning: '#f59e0b', // Amber
  info: '#6366f1', // Indigo
  background: {
    dark: '#131825',
    medium: '#151823',
    light: '#1a1f2c',
    lighter: '#252a38'
  },
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    tertiary: '#6b7280',
    disabled: '#4b5563'
  },
  border: '#1c2033'
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onApplyFilters,
  trades,
  isOpen,
  onClose
}) => {
  // Extract unique values from trades for filter options
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Filter state
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [selectedTradeTypes, setSelectedTradeTypes] = useState<('Long' | 'Short')[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minProfit, setMinProfit] = useState<string>('');
  const [maxProfit, setMaxProfit] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Extract unique values from trades
  useEffect(() => {
    if (trades.length > 0) {
      const symbols = [...new Set(trades.map(trade => trade.symbol))];
      setAvailableSymbols(symbols);

      const strategies = [...new Set(trades.map(trade => trade.strategy).filter(Boolean) as string[])];
      setAvailableStrategies(strategies);

      const tags = [...new Set(trades.flatMap(trade => trade.tags || []))];
      setAvailableTags(tags);
    }
  }, [trades]);

  const handleApplyFilters = () => {
    const filters: FilterOptions = {
      symbols: selectedSymbols,
      strategies: selectedStrategies,
      tradeTypes: selectedTradeTypes,
      dateRange: {
        start: startDate || null,
        end: endDate || null,
      },
      profitRange: {
        min: minProfit ? parseFloat(minProfit) : null,
        max: maxProfit ? parseFloat(maxProfit) : null,
      },
      tags: selectedTags,
    };

    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setSelectedSymbols([]);
    setSelectedStrategies([]);
    setSelectedTradeTypes([]);
    setStartDate('');
    setEndDate('');
    setMinProfit('');
    setMaxProfit('');
    setSelectedTags([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#151823] rounded-xl border border-[#1c2033] p-6 shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Advanced Filters</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Symbols */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbols</label>
            <div className="bg-[#1a1f2c] rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {availableSymbols.length > 0 ? (
                availableSymbols.map((symbol) => (
                  <label key={symbol} className="flex items-center mb-2 hover:bg-[#252a38]/50 p-1 rounded transition-colors duration-150">
                    <input
                      type="checkbox"
                      checked={selectedSymbols.includes(symbol)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSymbols([...selectedSymbols, symbol]);
                        } else {
                          setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                        }
                      }}
                      className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-gray-300 text-sm">{symbol}</span>
                  </label>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No symbols available</p>
              )}
            </div>
          </div>

          {/* Strategies */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strategies</label>
            <div className="bg-[#1a1f2c] rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {availableStrategies.length > 0 ? (
                availableStrategies.map((strategy) => (
                  <label key={strategy} className="flex items-center mb-2 hover:bg-[#252a38]/50 p-1 rounded transition-colors duration-150">
                    <input
                      type="checkbox"
                      checked={selectedStrategies.includes(strategy)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStrategies([...selectedStrategies, strategy]);
                        } else {
                          setSelectedStrategies(selectedStrategies.filter(s => s !== strategy));
                        }
                      }}
                      className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-gray-300 text-sm">{strategy}</span>
                  </label>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No strategies available</p>
              )}
            </div>
          </div>

          {/* Trade Types */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Trade Types</label>
            <div className="bg-[#1a1f2c] rounded-lg p-3">
              <label className="flex items-center mb-2 hover:bg-[#252a38]/50 p-1 rounded transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={selectedTradeTypes.includes('Long')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTradeTypes([...selectedTradeTypes, 'Long']);
                    } else {
                      setSelectedTradeTypes(selectedTradeTypes.filter(t => t !== 'Long'));
                    }
                  }}
                  className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-gray-300 text-sm">Long</span>
              </label>
              <label className="flex items-center hover:bg-[#252a38]/50 p-1 rounded transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={selectedTradeTypes.includes('Short')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTradeTypes([...selectedTradeTypes, 'Short']);
                    } else {
                      setSelectedTradeTypes(selectedTradeTypes.filter(t => t !== 'Short'));
                    }
                  }}
                  className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-gray-300 text-sm">Short</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#1a1f2c] text-white border border-[#2d3348] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#1a1f2c] text-white border border-[#2d3348] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                />
              </div>
            </div>
          </div>

          {/* Profit Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Profit Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Profit</label>
                <input
                  type="number"
                  value={minProfit}
                  onChange={(e) => setMinProfit(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#1a1f2c] text-white border border-[#2d3348] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Profit</label>
                <input
                  type="number"
                  value={maxProfit}
                  onChange={(e) => setMaxProfit(e.target.value)}
                  placeholder="No limit"
                  className="w-full bg-[#1a1f2c] text-white border border-[#2d3348] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
            <div className="bg-[#1a1f2c] rounded-lg p-3 max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <label
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs cursor-pointer transition-colors duration-150 ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#252a38] text-gray-300 hover:bg-[#313a4f]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTags([...selectedTags, tag]);
                          } else {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          }
                        }}
                        className="sr-only"
                      />
                      {tag}
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No tags available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8 space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-300 hover:text-white text-sm transition-colors duration-150"
          >
            Reset
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-150"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters; 