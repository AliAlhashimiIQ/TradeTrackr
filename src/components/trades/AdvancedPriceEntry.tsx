import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchMarketData, formatCurrency as formatCurrencyUtil } from '@/lib/marketDataService';

interface AdvancedPriceEntryProps {
  symbol: string;
  type: 'Long' | 'Short';
  entryPrice: number | undefined;
  exitPrice: number | undefined;
  quantity: number | undefined;
  onEntryPriceChange: (price: number | undefined) => void;
  onExitPriceChange: (price: number | undefined) => void;
  className?: string;
}

/**
 * Advanced price entry container with improved UI and functionality
 */
const AdvancedPriceEntry: React.FC<AdvancedPriceEntryProps> = ({
  symbol,
  type,
  entryPrice,
  exitPrice,
  quantity,
  onEntryPriceChange,
  onExitPriceChange,
  className = '',
}) => {
  const [visualRange, setVisualRange] = useState<{min: number, max: number}>({ min: 0, max: 0 });
  const [sliderValue, setSliderValue] = useState<number>(50);
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [riskReward, setRiskReward] = useState<number | null>(null);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [marketChange, setMarketChange] = useState<number | null>(null);
  const [marketPercentChange, setMarketPercentChange] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate visual range based on prices
  useEffect(() => {
    if (entryPrice && exitPrice) {
      const min = Math.min(entryPrice, exitPrice) * 0.95;
      const max = Math.max(entryPrice, exitPrice) * 1.05;
      setVisualRange({ min, max });
      
      // Calculate R:R ratio
      if (type === 'Long') {
        const risk = entryPrice - (entryPrice * 0.98); // Default 2% stop loss
        const reward = exitPrice - entryPrice;
        setRiskReward(reward / risk);
      } else {
        const risk = (entryPrice * 1.02) - entryPrice; // Default 2% stop loss
        const reward = entryPrice - exitPrice;
        setRiskReward(reward / risk);
      }
    } else if (entryPrice) {
      setVisualRange({ 
        min: entryPrice * 0.9, 
        max: entryPrice * 1.1 
      });
    }
  }, [entryPrice, exitPrice, type]);
  
  // Fetch real market price from Yahoo Finance API
  useEffect(() => {
    if (!symbol) return;
    
    const fetchRealMarketPrice = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchMarketData(symbol);
        setMarketPrice(data.price);
        setMarketChange(data.change);
        setMarketPercentChange(data.percentChange);
        setCurrency(data.currency);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch market data';
        setError(errorMessage);
        console.error('Market data fetch error:', err);
        
        // Fallback to mock data if API fails
        if (entryPrice) {
          setMarketPrice(entryPrice * (0.995 + Math.random() * 0.01));
        } else {
          setMarketPrice(100);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRealMarketPrice();
    
    // Refresh data every 60 seconds to avoid API rate limits
    const interval = setInterval(fetchRealMarketPrice, 60000);
    
    return () => clearInterval(interval);
  }, [symbol, entryPrice]);

  // Calculate profit/loss
  const calculatePL = () => {
    if (!entryPrice || !exitPrice || !quantity) return null;
    
    const pl = type === 'Long' 
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
      
    return pl;
  };
  
  // Format currency
  const formatCurrency = (value: number | null): string => {
    return formatCurrencyUtil(value, currency);
  };
  
  // Handle using market price
  const useMarketPrice = (field: 'entry' | 'exit') => {
    if (!marketPrice) return;
    
    if (field === 'entry') {
      onEntryPriceChange(marketPrice);
    } else {
      onExitPriceChange(marketPrice);
    }
  };
  
  // Apply price from slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setSliderValue(value);
    
    if (!entryPrice) return;
    
    const range = visualRange.max - visualRange.min;
    const newPrice = visualRange.min + (range * (value / 100));
    
    // Only update exit price through slider
    onExitPriceChange(Number(newPrice.toFixed(2)));
  };
  
  const profitLoss = calculatePL();
  const isProfitable = profitLoss !== null && profitLoss > 0;

  return (
    <div className={`bg-gradient-to-b from-[#111827] to-[#0f1117] rounded-xl shadow-xl border border-indigo-900/20 overflow-hidden ${className}`}>
      <div className="p-6">
        <h3 className="text-white text-base font-medium flex items-center mb-4">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Advanced Price Entry
        </h3>

        {/* Market Data */}
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-indigo-900/10 to-blue-900/10 rounded-lg border border-indigo-900/20 p-4">
              <div className="text-xs text-indigo-300/70 mb-1">Market Price</div>
              <div className="text-lg font-medium text-white">
                {isLoading ? (
                  <div className="animate-pulse bg-indigo-900/30 h-6 w-24 rounded"></div>
                ) : marketPrice ? (
                  formatCurrency(marketPrice)
                ) : (
                  '--'
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-900/10 to-blue-900/10 rounded-lg border border-indigo-900/20 p-4">
              <div className="text-xs text-indigo-300/70 mb-1">Change</div>
              <div className={`text-lg font-medium ${
                marketChange
                  ? marketChange > 0
                    ? 'text-green-400'
                    : marketChange < 0
                      ? 'text-red-400'
                      : 'text-white'
                  : 'text-white'
              }`}>
                {isLoading ? (
                  <div className="animate-pulse bg-indigo-900/30 h-6 w-24 rounded"></div>
                ) : marketChange ? (
                  `${marketChange > 0 ? '+' : ''}${formatCurrency(marketChange)}`
                ) : (
                  '--'
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-900/10 to-blue-900/10 rounded-lg border border-indigo-900/20 p-4">
              <div className="text-xs text-indigo-300/70 mb-1">% Change</div>
              <div className={`text-lg font-medium ${
                marketPercentChange
                  ? marketPercentChange > 0
                    ? 'text-green-400'
                    : marketPercentChange < 0
                      ? 'text-red-400'
                      : 'text-white'
                  : 'text-white'
              }`}>
                {isLoading ? (
                  <div className="animate-pulse bg-indigo-900/30 h-6 w-24 rounded"></div>
                ) : marketPercentChange ? (
                  `${marketPercentChange > 0 ? '+' : ''}${marketPercentChange.toFixed(2)}%`
                ) : (
                  '--'
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Price Controls */}
        <div className="space-y-6">
          {/* Entry Price */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-300">Entry Price</label>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => useMarketPrice('entry')}
                disabled={!marketPrice}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  marketPrice
                    ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-indigo-300 border border-indigo-600/30 hover:shadow-md'
                    : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                Use Market
              </motion.button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={entryPrice || ''}
                onChange={(e) => onEntryPriceChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                step="0.01"
                placeholder="0.00"
                className="w-full py-2.5 pl-8 pr-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
              />
            </div>
          </div>

          {/* Exit Price */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-300">Exit Price</label>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => useMarketPrice('exit')}
                disabled={!marketPrice}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  marketPrice
                    ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-indigo-300 border border-indigo-600/30 hover:shadow-md'
                    : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                Use Market
              </motion.button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={exitPrice || ''}
                onChange={(e) => onExitPriceChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                step="0.01"
                placeholder="0.00"
                className="w-full py-2.5 pl-8 pr-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner"
              />
            </div>
          </div>

          {/* Visual Price Slider */}
          <div>
            <label className="block text-sm font-medium text-indigo-300 mb-2">Visual Price Range</label>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => handleSliderChange(e)}
              className="w-full h-2 bg-gradient-to-r from-indigo-900/30 to-blue-900/30 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-1 text-xs text-indigo-300/70">
              <span>{formatCurrency(visualRange.min)}</span>
              <span>{formatCurrency(visualRange.max)}</span>
            </div>
          </div>

          {/* Profit/Loss Display */}
          {entryPrice && exitPrice && quantity && (
            <div className={`p-4 rounded-lg border ${
              calculatePL() === null
                ? 'bg-gray-900/20 border-gray-900/30'
                : calculatePL()! > 0
                  ? 'bg-green-900/20 border-green-900/30'
                  : 'bg-red-900/20 border-red-900/30'
            }`}>
              <div className="text-xs font-medium mb-1">
                {calculatePL() === null
                  ? 'Calculating...'
                  : calculatePL()! > 0
                    ? 'Estimated Profit'
                    : 'Estimated Loss'
                }
              </div>
              <div className={`text-lg font-medium ${
                calculatePL() === null
                  ? 'text-gray-400'
                  : calculatePL()! > 0
                    ? 'text-green-400'
                    : 'text-red-400'
              }`}>
                {calculatePL() === null ? '--' : formatCurrency(calculatePL()!)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedPriceEntry; 