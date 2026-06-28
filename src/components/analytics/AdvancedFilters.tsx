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
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0d1018] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Advanced Filters</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Filter analytics by symbols, strategies, tags, and date range.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Symbols */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Symbols</label>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 max-h-40 overflow-y-auto">
              {availableSymbols.length > 0 ? (
                availableSymbols.map((symbol) => (
                  <label key={symbol} className="flex items-center mb-2 hover:bg-slate-100 dark:hover:bg-[#252a38]/50 p-1.5 rounded-xl cursor-pointer transition-colors text-slate-800 dark:text-gray-300">
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
                      className="mr-3 rounded text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 border-slate-300 dark:border-white/10 dark:bg-slate-900"
                    />
                    <span className="text-sm font-semibold">{symbol}</span>
                  </label>
                ))
              ) : (
                <p className="text-slate-400 text-xs py-4 text-center">No symbols available</p>
              )}
            </div>
          </div>

          {/* Strategies */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Strategies</label>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 max-h-40 overflow-y-auto">
              {availableStrategies.length > 0 ? (
                availableStrategies.map((strategy) => (
                  <label key={strategy} className="flex items-center mb-2 hover:bg-slate-100 dark:hover:bg-[#252a38]/50 p-1.5 rounded-xl cursor-pointer transition-colors text-slate-800 dark:text-gray-300">
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
                      className="mr-3 rounded text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 border-slate-300 dark:border-white/10 dark:bg-slate-900"
                    />
                    <span className="text-sm font-semibold">{strategy}</span>
                  </label>
                ))
              ) : (
                <p className="text-slate-400 text-xs py-4 text-center">No strategies available</p>
              )}
            </div>
          </div>

          {/* Trade Types */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Trade Types</label>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-2">
              <label className="flex items-center hover:bg-slate-100 dark:hover:bg-[#252a38]/50 p-1.5 rounded-xl cursor-pointer transition-colors text-slate-800 dark:text-gray-300">
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
                  className="mr-3 rounded text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 border-slate-300 dark:border-white/10 dark:bg-slate-900"
                />
                <span className="text-sm font-semibold">Long</span>
              </label>
              <label className="flex items-center hover:bg-slate-100 dark:hover:bg-[#252a38]/50 p-1.5 rounded-xl cursor-pointer transition-colors text-slate-800 dark:text-gray-300">
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
                  className="mr-3 rounded text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 border-slate-300 dark:border-white/10 dark:bg-slate-900"
                />
                <span className="text-sm font-semibold">Short</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Profit Range */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Profit Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-gray-400 mb-1">Min Profit ($)</label>
                <input
                  type="number"
                  value={minProfit}
                  onChange={(e) => setMinProfit(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-gray-400 mb-1">Max Profit ($)</label>
                <input
                  type="number"
                  value={maxProfit}
                  onChange={(e) => setMaxProfit(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Tags</label>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#252a38] text-slate-600 dark:text-gray-300 dark:hover:bg-[#313a4f]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-slate-400 text-xs py-2 w-full text-center">No tags available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8 gap-3 border-t border-slate-100 dark:border-white/5 pt-5">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/15"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;
