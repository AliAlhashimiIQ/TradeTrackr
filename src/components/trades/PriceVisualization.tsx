import React, { useEffect, useRef } from 'react';

interface PriceVisualizationProps {
  symbol: string;
  entryPrice: number | undefined;
  exitPrice: number | undefined;
  type: 'Long' | 'Short';
  onPriceSelect: (type: 'entry' | 'exit', price: number) => void;
  className?: string;
}

/**
 * Visual price ladder and context for trading
 */
const PriceVisualization: React.FC<PriceVisualizationProps> = ({
  symbol,
  entryPrice,
  exitPrice,
  type,
  onPriceSelect,
  className = '',
}) => {
  const sparklineRef = useRef<HTMLCanvasElement>(null);
  
  // Generate price ladder levels
  const generatePriceLevels = () => {
    if (entryPrice === undefined) return [];
    
    // Base ladder on entry price, with 10 levels above and below
    const levelsCount = 21; // 10 above, 10 below, and entry price
    const centerIndex = Math.floor(levelsCount / 2);
    
    // Calculate step size based on instrument
    let stepSize: number;
    if (symbol.includes('JPY')) {
      stepSize = 0.01; // 1 pip for JPY pairs
    } else if (symbol.includes('BTC')) {
      stepSize = 100; // $100 steps for Bitcoin
    } else if (symbol.includes('ETH')) {
      stepSize = 10; // $10 steps for Ethereum
    } else if (symbol.includes('XAU')) {
      stepSize = 1; // $1 steps for Gold
    } else {
      stepSize = 0.0010; // 10 pips for forex
    }
    
    // For symbols with higher values, adjust step size
    if (entryPrice > 1000) {
      stepSize = entryPrice * 0.001; // 0.1% of price
    } else if (entryPrice > 100) {
      stepSize = entryPrice * 0.0025; // 0.25% of price
    }
    
    // Generate price levels
    return Array.from({ length: levelsCount }, (_, index) => {
      const offset = index - centerIndex;
      const price = entryPrice + (offset * stepSize);
      return parseFloat(price.toFixed(symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('XAU') ? 2 : 4));
    }).sort((a, b) => b - a); // Sort descending for ladder display
  };
  
  // Determine price level styling
  const getPriceLevelStyle = (price: number) => {
    if (entryPrice === undefined) {
      return 'text-gray-400';
    }
    
    if (price === entryPrice) {
      return 'bg-blue-900/30 text-blue-400 font-medium px-2 rounded';
    }
    
    if (exitPrice !== undefined && price === exitPrice) {
      const isProfitable = type === 'Long' ? exitPrice > entryPrice : exitPrice < entryPrice;
      return isProfitable 
        ? 'bg-green-900/30 text-green-400 font-medium px-2 rounded' 
        : 'bg-red-900/30 text-red-400 font-medium px-2 rounded';
    }
    
    if (exitPrice !== undefined) {
      // Highlight price levels between entry and exit
      const isInRange = 
        (entryPrice <= price && price <= exitPrice) || 
        (exitPrice <= price && price <= entryPrice);
      
      if (isInRange) {
        const isProfitZone = type === 'Long' 
          ? price > entryPrice 
          : price < entryPrice;
        
        return isProfitZone
          ? 'text-green-400'
          : 'text-red-400';
      }
    }
    
    return 'text-gray-400';
  };
  
  // Generate random price data for sparkline
  const generateMockPriceData = () => {
    if (entryPrice === undefined) return [];
    
    // Generate 50 data points
    const dataPoints = 50;
    const volatility = entryPrice * 0.005; // 0.5% volatility
    
    return Array.from({ length: dataPoints }, (_, index) => {
      const randomWalk = (Math.random() - 0.5) * volatility;
      // Trend slightly up or down based on position type
      const trend = type === 'Long' ? 0.0001 : -0.0001;
      return entryPrice + randomWalk + (index * trend * entryPrice);
    });
  };
  
  // Draw sparkline chart
  useEffect(() => {
    if (!sparklineRef.current || entryPrice === undefined) return;
    
    const canvas = sparklineRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth * 2; // For sharper display on high DPI screens
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
    
    // Generate price data
    const priceData = generateMockPriceData();
    if (priceData.length === 0) return;
    
    // Find min and max for scaling
    const minPrice = Math.min(...priceData);
    const maxPrice = Math.max(...priceData);
    const priceRange = maxPrice - minPrice;
    
    // Draw sparkline
    const width = canvas.width / 2;
    const height = canvas.height / 2;
    
    // Start path
    ctx.beginPath();
    ctx.moveTo(0, height - ((priceData[0] - minPrice) / priceRange) * height);
    
    // Draw line
    priceData.forEach((price, index) => {
      const x = (index / (priceData.length - 1)) * width;
      const y = height - ((price - minPrice) / priceRange) * height;
      ctx.lineTo(x, y);
    });
    
    // Style line
    ctx.strokeStyle = type === 'Long' ? '#34d399' : '#f87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Add entry price marker
    const entryPriceY = height - ((entryPrice - minPrice) / priceRange) * height;
    ctx.beginPath();
    ctx.arc(width / 2, entryPriceY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    
    // Add exit price marker if available
    if (exitPrice !== undefined) {
      const exitPriceY = height - ((exitPrice - minPrice) / priceRange) * height;
      ctx.beginPath();
      ctx.arc(width * 0.8, exitPriceY, 3, 0, Math.PI * 2);
      ctx.fillStyle = (type === 'Long' ? exitPrice > entryPrice : exitPrice < entryPrice) 
        ? '#34d399' // green for profit
        : '#f87171'; // red for loss
      ctx.fill();
    }
  }, [entryPrice, exitPrice, type, symbol]);

  if (entryPrice === undefined) {
    return (
      <div className={`bg-[#1a1f2c] rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-400 text-sm">Enter a price to see visualization</p>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1f2c] rounded-lg p-4 ${className}`}>
      <div className="flex space-x-4">
        {/* Price ladder */}
        <div className="w-32">
          <h4 className="text-xs text-gray-400 mb-2">Price Ladder</h4>
          <div className="space-y-1 max-h-48 overflow-auto pr-1 custom-scrollbar">
            {generatePriceLevels().map((price, index) => (
              <div 
                key={`level-${index}`}
                className={`text-right text-sm py-0.5 cursor-pointer hover:bg-gray-700/30 ${getPriceLevelStyle(price)}`}
                onClick={() => onPriceSelect('exit', price)}
              >
                {price.toFixed(symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('XAU') ? 2 : 4)}
              </div>
            ))}
          </div>
        </div>
        
        {/* Sparkline chart */}
        <div className="flex-1">
          <h4 className="text-xs text-gray-400 mb-2">Price Movement</h4>
          <div className="h-48 bg-[#131825] rounded relative">
            <canvas 
              ref={sparklineRef} 
              className="w-full h-full"
            ></canvas>
            
            {/* P&L Preview */}
            {exitPrice !== undefined && (
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium bg-gray-800/80">
                <span className={
                  (type === 'Long' ? exitPrice > entryPrice : exitPrice < entryPrice)
                    ? 'text-green-400'
                    : 'text-red-400'
                }>
                  {(type === 'Long' ? exitPrice > entryPrice : exitPrice < entryPrice) ? '▲' : '▼'} 
                  {Math.abs(((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          
          {/* Risk/Reward Visualization */}
          {exitPrice !== undefined && (
            <div className="mt-2">
              <div className="h-6 bg-[#131825] rounded-full overflow-hidden flex">
                {type === 'Long' ? (
                  <>
                    <div 
                      className="bg-red-500/40 h-full" 
                      style={{ 
                        width: '33%'
                      }}
                    ></div>
                    <div className="bg-gray-700 h-full flex-grow"></div>
                    <div 
                      className="bg-green-500/40 h-full" 
                      style={{ 
                        width: '33%'
                      }}
                    ></div>
                  </>
                ) : (
                  <>
                    <div 
                      className="bg-green-500/40 h-full" 
                      style={{ 
                        width: '33%'
                      }}
                    ></div>
                    <div className="bg-gray-700 h-full flex-grow"></div>
                    <div 
                      className="bg-red-500/40 h-full" 
                      style={{ 
                        width: '33%'
                      }}
                    ></div>
                  </>
                )}
                
                {/* Entry marker */}
                <div 
                  className="absolute h-6 w-2 bg-blue-500"
                  style={{ left: '33%' }}
                ></div>
                
                {/* Exit marker */}
                <div 
                  className={`absolute h-6 w-2 ${
                    (type === 'Long' ? exitPrice > entryPrice : exitPrice < entryPrice)
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                  style={{ 
                    left: `${
                      // Calculate position based on % change from entry to exit
                      // capped between 10% and 90% of the width
                      Math.min(90, Math.max(10, 33 + ((exitPrice - entryPrice) / entryPrice) * 500))
                    }%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceVisualization; 