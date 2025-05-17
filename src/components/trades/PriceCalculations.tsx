import React from 'react';

interface PriceCalculationsProps {
  symbol: string;
  entryPrice: number | undefined;
  exitPrice: number | undefined;
  type: 'Long' | 'Short';
  quantity: number | undefined;
  onSetExitPrice: (price: number) => void;
  className?: string;
}

/**
 * Advanced price calculations for trading, including profit targets, stop loss, and more
 */
const PriceCalculations: React.FC<PriceCalculationsProps> = ({
  symbol,
  entryPrice,
  exitPrice,
  type,
  quantity,
  onSetExitPrice,
  className = '',
}) => {
  // Disable calculations if entry price is not set
  const isDisabled = entryPrice === undefined;

  // Calculate risk in pips/points
  const calculateRiskInPips = (): number | null => {
    if (entryPrice === undefined || exitPrice === undefined) return null;
    
    // For forex, pips calculation depends on the pair
    let pipMultiplier = 10000; // Default for 4-decimal forex pairs
    
    if (symbol.includes('JPY')) {
      pipMultiplier = 100; // JPY pairs typically have 2 decimals
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      pipMultiplier = 1; // For crypto, 1 point = 1 unit
    }
    
    const pips = Math.abs(entryPrice - exitPrice) * pipMultiplier;
    return parseFloat(pips.toFixed(1));
  };

  // Calculate P&L based on current values
  const calculatePnL = (): number | null => {
    if (entryPrice === undefined || exitPrice === undefined || quantity === undefined) return null;
    
    if (type === 'Long') {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  };

  // Set exit price based on percentage target
  const setPercentageTarget = (percentage: number) => {
    if (entryPrice === undefined) return;
    
    let newExitPrice: number;
    if (type === 'Long') {
      // For long positions, add the percentage to entry price
      newExitPrice = entryPrice * (1 + percentage / 100);
    } else {
      // For short positions, subtract the percentage from entry price
      newExitPrice = entryPrice * (1 - percentage / 100);
    }
    
    // Round to appropriate decimal places
    let decimalPlaces = 4;
    if (symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('ETH') || 
        symbol.includes('XAU') || symbol.includes('XAG')) {
      decimalPlaces = 2;
    }
    
    onSetExitPrice(parseFloat(newExitPrice.toFixed(decimalPlaces)));
  };

  // Set exit price based on risk-to-reward ratio
  const setRiskRewardTarget = (ratio: number) => {
    if (entryPrice === undefined) return;
    
    // Assume 1% risk as default stop loss
    const stopLossDistance = entryPrice * 0.01;
    const targetDistance = stopLossDistance * ratio;
    
    let newExitPrice: number;
    if (type === 'Long') {
      newExitPrice = entryPrice + targetDistance;
    } else {
      newExitPrice = entryPrice - targetDistance;
    }
    
    // Round to appropriate decimal places
    let decimalPlaces = 4;
    if (symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('ETH') || 
        symbol.includes('XAU') || symbol.includes('XAG')) {
      decimalPlaces = 2;
    }
    
    onSetExitPrice(parseFloat(newExitPrice.toFixed(decimalPlaces)));
  };

  // Set custom risk-based exit price
  const setRiskBasedTarget = (accountRiskPercentage: number) => {
    if (entryPrice === undefined || quantity === undefined) return;
    
    // Assuming a $10,000 account for demo purposes
    const accountSize = 10000;
    const riskAmount = accountSize * (accountRiskPercentage / 100);
    
    // Calculate price distance based on risk amount
    const priceDistance = riskAmount / quantity;
    
    let newExitPrice: number;
    if (type === 'Long') {
      // For long positions, set stop loss below entry
      newExitPrice = entryPrice - priceDistance;
    } else {
      // For short positions, set stop loss above entry
      newExitPrice = entryPrice + priceDistance;
    }
    
    // Round to appropriate decimal places
    let decimalPlaces = 4;
    if (symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('ETH') || 
        symbol.includes('XAU') || symbol.includes('XAG')) {
      decimalPlaces = 2;
    }
    
    onSetExitPrice(parseFloat(newExitPrice.toFixed(decimalPlaces)));
  };

  // Calculate fibonacci levels (simplified)
  const calculateFibonacciLevels = () => {
    if (entryPrice === undefined) return null;
    
    // Simulate a recent high/low (20% above/below current price)
    const recentHigh = entryPrice * 1.2;
    const recentLow = entryPrice * 0.8;
    const range = recentHigh - recentLow;
    
    // Calculate common fibonacci retracement levels
    return {
      0: recentLow,
      0.236: recentLow + (range * 0.236),
      0.382: recentLow + (range * 0.382),
      0.5: recentLow + (range * 0.5),
      0.618: recentLow + (range * 0.618),
      0.786: recentLow + (range * 0.786),
      1: recentHigh,
    };
  };

  // Apply a fibonacci level as exit price
  const applyFibonacciLevel = (level: number) => {
    const fibLevels = calculateFibonacciLevels();
    if (!fibLevels) return;
    
    const targetPrice = fibLevels[level as keyof typeof fibLevels];
    
    // Round to appropriate decimal places
    let decimalPlaces = 4;
    if (symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('ETH') || 
        symbol.includes('XAU') || symbol.includes('XAG')) {
      decimalPlaces = 2;
    }
    
    onSetExitPrice(parseFloat(targetPrice.toFixed(decimalPlaces)));
  };

  return (
    <div className={`bg-[#1a1f2c] rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-300 mb-3">Price Calculations</h3>
      
      <div className="space-y-4">
        {/* Percentage Targets */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Profit Targets</div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 5, 10].map(percentage => (
              <button
                key={`target-${percentage}`}
                onClick={() => setPercentageTarget(percentage)}
                disabled={isDisabled}
                className={`px-2 py-1 rounded text-xs ${
                  isDisabled 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                }`}
              >
                +{percentage}%
              </button>
            ))}
          </div>
        </div>
        
        {/* Risk/Reward Ratios */}
        <div>
          <div className="text-xs text-gray-400 mb-2">R:R Ratios</div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(ratio => (
              <button
                key={`rr-${ratio}`}
                onClick={() => setRiskRewardTarget(ratio)}
                disabled={isDisabled}
                className={`px-2 py-1 rounded text-xs ${
                  isDisabled 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                }`}
              >
                1:{ratio}
              </button>
            ))}
          </div>
        </div>
        
        {/* Risk-Based Calculation */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Account Risk (Stop Loss)</div>
          <div className="flex flex-wrap gap-2">
            {[0.5, 1, 2].map(riskPct => (
              <button
                key={`risk-${riskPct}`}
                onClick={() => setRiskBasedTarget(riskPct)}
                disabled={isDisabled}
                className={`px-2 py-1 rounded text-xs ${
                  isDisabled 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                }`}
              >
                {riskPct}% Risk
              </button>
            ))}
          </div>
        </div>
        
        {/* Fibonacci Levels */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Fibonacci Levels</div>
          <div className="flex flex-wrap gap-2">
            {[0.5, 0.618, 0.786].map(level => (
              <button
                key={`fib-${level}`}
                onClick={() => applyFibonacciLevel(level)}
                disabled={isDisabled}
                className={`px-2 py-1 rounded text-xs ${
                  isDisabled 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        
        {/* Statistics Display */}
        {entryPrice !== undefined && exitPrice !== undefined && (
          <div className="mt-4 p-3 bg-[#131825] rounded">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400">Risk (Pips/Points)</div>
                <div className="text-sm font-medium text-white">{calculateRiskInPips() || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Potential P&L</div>
                <div className={`text-sm font-medium ${
                  (calculatePnL() || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${calculatePnL()?.toFixed(2) || '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceCalculations; 