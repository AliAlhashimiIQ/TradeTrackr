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
      displayName: 'Frequent',
      symbols: [
        { name: 'EURUSD', color: 'blue' },
        { name: 'BTCUSD', color: 'amber' },
        { name: 'AAPL', color: 'gray' },
        { name: 'ES', color: 'blue' },
      ]
    },
    {
      name: 'forex',
      displayName: 'Forex',
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
      displayName: 'Crypto',
      symbols: [
        { name: 'BTCUSD', color: 'amber' },
        { name: 'ETHUSD', color: 'teal' },
        { name: 'XRPUSD', color: 'blue' },
        { name: 'SOLUSD', color: 'purple' },
      ]
    },
    {
      name: 'indices',
      displayName: 'Indices',
      symbols: [
        { name: 'ES', color: 'blue' },
        { name: 'NQ', color: 'teal' },
        { name: 'YM', color: 'indigo' },
        { name: 'RTY', color: 'green' },
      ]
    },
    {
      name: 'stocks',
      displayName: 'Stocks',
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
      displayName: 'Custom',
      symbols: []
    }
  ];
  
  // Load custom symbols from localStorage
  useEffect(() => {
    const savedSymbols = localStorage.getItem('customSymbols');
    if (savedSymbols) {
      try {
        setCustomSymbols(JSON.parse(savedSymbols));
      } catch (e) {
        setCustomSymbols([]);
      }
    }
    
    // Load last used symbols
    const recentSymbols = localStorage.getItem('recentSymbols');
    if (recentSymbols) {
      let parsedSymbols: string[] = [];
      try {
        parsedSymbols = JSON.parse(recentSymbols);
      } catch (e) {
        parsedSymbols = [];
      }
        if (Array.isArray(parsedSymbols) && parsedSymbols.length > 0) {
          // Update the frequent category
          symbolCategories[0].symbols = parsedSymbols.slice(0, 5).map(s => ({
            name: s,
            color: getRandomColor()
          })).concat(symbolCategories[0].symbols.slice(0, 3));
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
    let symbols: string[] = [];
    try {
      symbols = recentSymbols ? JSON.parse(recentSymbols) : [];
    } catch (e) {
      symbols = [];
    }
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
    ? { name: 'custom', displayName: 'Custom', symbols: customSymbols }
    : symbolCategories.find(cat => cat.name === selectedCategory) || symbolCategories[0];

  // Get color classes for a symbol
  const getColorClasses = (color: string) => {
    return COLOR_CLASSES[color] || COLOR_CLASSES.blue;
  };

  const renderCategoryIcon = (name: string) => {
    const iconClass = "w-3 h-3 flex-shrink-0";
    switch (name) {
      case 'frequent':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z" />
          </svg>
        );
      case 'forex':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'crypto':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'indices':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'stocks':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'custom':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      default:
        return null;
    }
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
            className={`px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === category.name 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            {renderCategoryIcon(category.name)}
            <span>{category.displayName}</span>
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
