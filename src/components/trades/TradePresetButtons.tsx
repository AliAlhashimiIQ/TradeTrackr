import React, { useState, useEffect } from 'react';

interface TradePresetButtonsProps {
  onSelectPreset: (symbol: string) => void;
  className?: string;
}

type SymbolCategory = {
  name: string;
  displayName: string;
  symbols: { name: string; color: string }[];
};

// Color mapping to tailwind classes
const COLOR_CLASSES: Record<string, { bg: string, text: string, hover: string }> = {
  blue: { bg: 'bg-blue-600/20', text: 'text-blue-400', hover: 'hover:bg-blue-600/30' },
  indigo: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', hover: 'hover:bg-indigo-600/30' },
  purple: { bg: 'bg-purple-600/20', text: 'text-purple-400', hover: 'hover:bg-purple-600/30' },
  amber: { bg: 'bg-amber-600/20', text: 'text-amber-400', hover: 'hover:bg-amber-600/30' },
  teal: { bg: 'bg-teal-600/20', text: 'text-teal-400', hover: 'hover:bg-teal-600/30' },
  green: { bg: 'bg-green-600/20', text: 'text-green-400', hover: 'hover:bg-green-600/30' },
  red: { bg: 'bg-red-600/20', text: 'text-red-400', hover: 'hover:bg-red-600/30' },
  pink: { bg: 'bg-pink-600/20', text: 'text-pink-400', hover: 'hover:bg-pink-600/30' },
  gray: { bg: 'bg-gray-600/20', text: 'text-gray-400', hover: 'hover:bg-gray-600/30' }
};

/**
 * Enhanced quick preset buttons for commonly traded symbols
 */
const TradePresetButtons: React.FC<TradePresetButtonsProps> = ({ 
  onSelectPreset,
  className = ''
}) => {
  const [customSymbols, setCustomSymbols] = useState<{ name: string; color: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('frequent');
  
  // Symbol categories
  const symbolCategories: SymbolCategory[] = [
    {
      name: 'frequent',
      displayName: '⭐ Frequent',
      symbols: [
        { name: 'EURUSD', color: 'blue' },
        { name: 'BTCUSD', color: 'amber' },
        { name: 'AAPL', color: 'gray' },
        { name: 'ES', color: 'blue' },
      ]
    },
    {
      name: 'forex',
      displayName: '💱 Forex',
      symbols: [
        { name: 'EURUSD', color: 'blue' },
        { name: 'GBPUSD', color: 'indigo' },
        { name: 'USDJPY', color: 'purple' },
        { name: 'AUDUSD', color: 'green' },
        { name: 'USDCAD', color: 'red' },
        { name: 'USDCHF', color: 'amber' }
      ]
    },
    {
      name: 'crypto',
      displayName: '🪙 Crypto',
      symbols: [
        { name: 'BTCUSD', color: 'amber' },
        { name: 'ETHUSD', color: 'teal' },
        { name: 'XRPUSD', color: 'blue' },
        { name: 'SOLUSD', color: 'purple' },
      ]
    },
    {
      name: 'indices',
      displayName: '📊 Indices',
      symbols: [
        { name: 'ES', color: 'blue' },
        { name: 'NQ', color: 'teal' },
        { name: 'YM', color: 'indigo' },
        { name: 'RTY', color: 'green' },
      ]
    },
    {
      name: 'stocks',
      displayName: '📈 Stocks',
      symbols: [
        { name: 'AAPL', color: 'gray' },
        { name: 'MSFT', color: 'blue' },
        { name: 'AMZN', color: 'amber' },
        { name: 'TSLA', color: 'red' },
        { name: 'GOOGL', color: 'green' },
        { name: 'META', color: 'blue' },
      ]
    },
    {
      name: 'custom',
      displayName: '⚙️ Custom',
      symbols: []
    }
  ];
  
  // Load custom symbols from localStorage
  useEffect(() => {
    const savedSymbols = localStorage.getItem('customSymbols');
    if (savedSymbols) {
      try {
        setCustomSymbols(JSON.parse(savedSymbols));
      } catch (error) {
        console.error('Error loading custom symbols:', error);
      }
    }
    
    // Load last used symbols
    const recentSymbols = localStorage.getItem('recentSymbols');
    if (recentSymbols) {
      try {
        const parsedSymbols = JSON.parse(recentSymbols);
        if (Array.isArray(parsedSymbols) && parsedSymbols.length > 0) {
          // Update the frequent category
          symbolCategories[0].symbols = parsedSymbols.slice(0, 5).map(s => ({
            name: s,
            color: getRandomColor()
          })).concat(symbolCategories[0].symbols.slice(0, 3));
        }
      } catch (error) {
        console.error('Error loading recent symbols:', error);
      }
    }
  }, []);
  
  // Get a random color
  const getRandomColor = () => {
    const colorOptions = Object.keys(COLOR_CLASSES);
    return colorOptions[Math.floor(Math.random() * colorOptions.length)];
  };
  
  // Save custom symbols to localStorage
  const saveCustomSymbols = (symbols: { name: string; color: string }[]) => {
    localStorage.setItem('customSymbols', JSON.stringify(symbols));
    setCustomSymbols(symbols);
  };
  
  // Add a new custom symbol
  const handleAddSymbol = () => {
    if (!newSymbol.trim()) return;
    
    const formattedSymbol = newSymbol.trim().toUpperCase();
    const randomColor = getRandomColor();
    
    // Check if symbol already exists
    if (customSymbols.some(s => s.name === formattedSymbol)) {
      alert(`Symbol ${formattedSymbol} already exists in your custom list`);
      return;
    }
    
    const newSymbols = [...customSymbols, { name: formattedSymbol, color: randomColor }];
    saveCustomSymbols(newSymbols);
    
    // Also save to recent symbols
    updateRecentSymbols(formattedSymbol);
    
    setNewSymbol('');
    setShowForm(false);
    onSelectPreset(formattedSymbol);
  };
  
  // Update the recent symbols list
  const updateRecentSymbols = (symbol: string) => {
    const recentSymbols = localStorage.getItem('recentSymbols');
    let symbols = recentSymbols ? JSON.parse(recentSymbols) : [];
    symbols = [symbol, ...symbols.filter((s: string) => s !== symbol)].slice(0, 10);
    localStorage.setItem('recentSymbols', JSON.stringify(symbols));
  };
  
  // Handle clicking on a symbol
  const handleSelectSymbol = (symbol: string) => {
    onSelectPreset(symbol);
    updateRecentSymbols(symbol);
  };
  
  // Handle key press for form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSymbol();
    }
  };
  
  // Delete a custom symbol
  const handleDeleteSymbol = (symbolName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSymbols = customSymbols.filter(s => s.name !== symbolName);
    saveCustomSymbols(newSymbols);
  };
  
  // Get current category's symbols
  const currentCategory = selectedCategory === 'custom' 
    ? { name: 'custom', displayName: '⚙️ Custom', symbols: customSymbols }
    : symbolCategories.find(cat => cat.name === selectedCategory) || symbolCategories[0];

  // Get color classes for a symbol
  const getColorClasses = (color: string) => {
    return COLOR_CLASSES[color] || COLOR_CLASSES.blue;
  };

  return (
    <div className={className}>
      {/* Category selector */}
      <div className="flex mb-2 space-x-1 text-xs overflow-x-auto py-1 scrollbar-hide">
        {symbolCategories.map(category => (
          <button
            key={category.name}
            type="button"
            onClick={() => setSelectedCategory(category.name)}
            className={`px-2 py-1 rounded-md whitespace-nowrap ${
              selectedCategory === category.name 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            {category.displayName}
          </button>
        ))}
      </div>
      
      {/* Symbol buttons for selected category */}
      <div className="flex flex-wrap gap-2">
        {currentCategory.symbols.map((symbol) => {
          const colorClasses = getColorClasses(symbol.color);
          return (
            <div key={symbol.name} className="flex items-center">
              <button
                type="button"
                onClick={() => handleSelectSymbol(symbol.name)}
                className={`px-3 py-1 rounded-md ${colorClasses.bg} ${colorClasses.text} text-xs ${colorClasses.hover} transition-colors`}
              >
                {symbol.name}
              </button>
              {selectedCategory === 'custom' && (
                <button 
                  type="button"
                  className="ml-1 text-xs text-gray-400 hover:text-red-400"
                  onClick={(e) => handleDeleteSymbol(symbol.name, e)}
                  aria-label={`Delete ${symbol.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        
        {/* Add new symbol form */}
        {showForm ? (
          <div className="flex">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter symbol"
              className="px-2 py-1 rounded-l-md bg-gray-800 text-white text-xs border border-gray-700 focus:border-blue-500 outline-none w-24"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddSymbol}
              className="px-2 py-1 rounded-r-md bg-blue-600 text-white text-xs"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-3 py-1 rounded-md bg-gray-600/20 text-gray-400 text-xs hover:bg-gray-600/30 transition-colors"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
};

export default TradePresetButtons; 