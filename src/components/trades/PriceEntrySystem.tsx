import React, { useState, useEffect, useRef } from 'react';

interface PriceEntrySystemProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  symbol: string;
  type: 'Long' | 'Short';
  fieldName: 'entry_price' | 'exit_price';
  className?: string;
  showKeypad?: boolean;
}

/**
 * Advanced price entry system with numeric keypad and various input helpers
 */
const PriceEntrySystem: React.FC<PriceEntrySystemProps> = ({
  value,
  onChange,
  symbol,
  type,
  fieldName,
  className = '',
  showKeypad = false,
}) => {
  const [isKeypadOpen, setIsKeypadOpen] = useState(showKeypad);
  const [localValue, setLocalValue] = useState<string>(value?.toString() || '');
  const [decimalPlaces, setDecimalPlaces] = useState(4); // Default
  const [recentPrices, setRecentPrices] = useState<number[]>([]);
  const [isLoadingMarketPrice, setIsLoadingMarketPrice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set appropriate decimal places based on symbol
  useEffect(() => {
    if (symbol.includes('JPY')) {
      setDecimalPlaces(2);
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      setDecimalPlaces(2);
    } else if (symbol.includes('XAU') || symbol.includes('XAG')) {
      setDecimalPlaces(2);
    } else {
      setDecimalPlaces(4); // Default for forex
    }
  }, [symbol]);

  // Format value with appropriate decimal places
  const formatPrice = (price: number): string => {
    return price.toFixed(decimalPlaces);
  };

  // Parse string to number with proper precision
  const parsePrice = (str: string): number | undefined => {
    const num = parseFloat(str);
    return isNaN(num) ? undefined : parseFloat(num.toFixed(decimalPlaces));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    const parsed = parsePrice(e.target.value);
    onChange(parsed);
  };

  // Handle keypad button click
  const handleKeypadClick = (digit: string) => {
    let newValue: string;
    
    if (digit === 'C') {
      // Clear
      newValue = '';
    } else if (digit === '⌫') {
      // Backspace
      newValue = localValue.slice(0, -1);
    } else if (digit === '.') {
      // Only add decimal if it doesn't exist
      newValue = localValue.includes('.') ? localValue : localValue + '.';
    } else {
      // Add digit
      newValue = localValue + digit;
    }
    
    setLocalValue(newValue);
    const parsed = parsePrice(newValue);
    onChange(parsed);
  };

  // Handle increment/decrement
  const handleIncrement = (amount: number) => {
    const currentValue = parseFloat(localValue || '0');
    if (!isNaN(currentValue)) {
      const newValue = (currentValue + amount).toFixed(decimalPlaces);
      setLocalValue(newValue);
      onChange(parseFloat(newValue));
    }
  };

  // Calculate the step size based on decimal places
  const getStepSize = (): number => {
    return 1 / Math.pow(10, decimalPlaces);
  };

  // Mock function to fetch market price
  const fetchMarketPrice = async () => {
    setIsLoadingMarketPrice(true);
    
    try {
      // In a real implementation, this would call an actual API
      // For demo purposes, generate a random price
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      let basePrice: number;
      if (symbol.includes('USD')) {
        basePrice = 1.1000 + (Math.random() * 0.1);
      } else if (symbol.includes('BTC')) {
        basePrice = 35000 + (Math.random() * 1000);
      } else if (symbol.includes('ETH')) {
        basePrice = 2000 + (Math.random() * 100);
      } else if (symbol.includes('XAU')) {
        basePrice = 1800 + (Math.random() * 50);
      } else {
        basePrice = 100 + (Math.random() * 10);
      }
      
      const formattedPrice = parseFloat(basePrice.toFixed(decimalPlaces));
      setLocalValue(formattedPrice.toString());
      onChange(formattedPrice);
      
      // Store in recent prices
      setRecentPrices(prev => {
        const updated = [formattedPrice, ...prev.slice(0, 4)];
        return Array.from(new Set(updated));
      });
    } catch (error) {
      console.error('Error fetching market price:', error);
    } finally {
      setIsLoadingMarketPrice(false);
    }
  };

  // Handle click outside to close keypad
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsKeypadOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard arrow keys for increment/decrement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== inputRef.current) return;
      
      const step = getStepSize();
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleIncrement(step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleIncrement(-step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localValue]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex">
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleInputChange}
            onFocus={() => setIsKeypadOpen(true)}
            className="w-full p-2 rounded-l bg-[#1a1f2c] border border-gray-700 text-white"
            placeholder={`0.${'0'.repeat(decimalPlaces)}`}
          />
          
          {/* Recent prices dropdown */}
          {recentPrices.length > 0 && isKeypadOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f2c] border border-gray-700 rounded-md shadow-lg z-20">
              <div className="p-1 text-xs text-gray-400">Recent Prices</div>
              {recentPrices.map((price, index) => (
                <button
                  key={index}
                  className="w-full text-left p-2 hover:bg-[#2a303c] text-white text-sm border-t border-gray-700"
                  onClick={() => {
                    setLocalValue(price.toString());
                    onChange(price);
                  }}
                >
                  {formatPrice(price)}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Increment/Decrement buttons */}
        <div className="flex flex-col border-t border-r border-b border-gray-700 rounded-r overflow-hidden">
          <button
            className="px-2 py-1 bg-[#2a303c] hover:bg-[#374151] text-white text-xs"
            onClick={() => handleIncrement(getStepSize())}
          >
            ▲
          </button>
          <button
            className="px-2 py-1 bg-[#2a303c] hover:bg-[#374151] text-white text-xs border-t border-gray-700"
            onClick={() => handleIncrement(-getStepSize())}
          >
            ▼
          </button>
        </div>
      </div>
      
      {/* Action buttons row */}
      <div className="flex mt-1 space-x-1">
        <button
          className="flex-grow text-xs py-1 px-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
          onClick={fetchMarketPrice}
        >
          {isLoadingMarketPrice ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading
            </span>
          ) : (
            "Market Price"
          )}
        </button>
      </div>
      
      {/* Numeric keypad */}
      {isKeypadOpen && (
        <div className="absolute z-10 mt-1 p-2 bg-[#1a1f2c] border border-gray-700 rounded shadow-lg grid grid-cols-3 gap-1">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'].map((digit) => (
            <button
              key={digit}
              className="w-10 h-10 bg-[#2a303c] hover:bg-[#374151] text-white rounded text-lg"
              onClick={() => handleKeypadClick(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            className="w-full h-10 col-span-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-lg mt-1"
            onClick={() => {
              setIsKeypadOpen(false);
              inputRef.current?.blur();
            }}
          >
            Done
          </button>
        </div>
      )}
      
      {/* Visual price ruler/slider */}
      {!isKeypadOpen && value !== undefined && (
        <div className="mt-2 px-1">
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 ${
                fieldName === 'exit_price' 
                  ? (type === 'Long' 
                      ? value > (value * 0.99) ? 'bg-green-500' : 'bg-red-500'
                      : value < (value * 1.01) ? 'bg-green-500' : 'bg-red-500')
                  : 'bg-blue-500'
              }`}
              style={{ width: '50%' }}
            ></div>
            <div 
              className="absolute inset-y-0 w-2 rounded-full bg-white border-2 border-blue-500"
              style={{ left: `calc(50% - 4px)` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceEntrySystem; 