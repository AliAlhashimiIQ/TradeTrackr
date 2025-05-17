import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TradeTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  favoriteTags?: string[];
  onAddToFavorites?: (tag: string) => void;
  onRemoveFromFavorites?: (tag: string) => void;
  className?: string;
}

const TradeTagSelector: React.FC<TradeTagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  favoriteTags = [],
  onAddToFavorites,
  onRemoveFromFavorites,
  className = '',
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddAnimation, setShowAddAnimation] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagFilterInput, setTagFilterInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState<Record<string, boolean>>({
    favorites: false,
    strategy: false,
    technical: false,
    fundamental: false,
    psychology: false,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initial suggested tags
  useEffect(() => {
    // Common trading tags that aren't in favorites
    const commonTags = [
      'momentum', 'reversal', 'swing', 'scalp', 'breakout', 'breakdown',
      'support', 'resistance', 'trend', 'counter-trend', 'gap', 'earnings',
      'news', 'technical', 'fundamental', 'fibonacci', 'volume', 'volatility',
      'patience', 'impulsive', 'overtraded', 'revenge-trade', 'planned', 'unplanned',
      'discipline', 'emotional', 'fomo', 'stop-loss', 'take-profit'
    ].filter(tag => !favoriteTags.includes(tag));
    
    setSuggestedTags(commonTags);
  }, [favoriteTags]);
  
  // Handle toggling a tag selection
  const handleTagToggle = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    onTagsChange(newSelectedTags);
  };
  
  // Handle adding a new tag
  const handleAddNewTag = () => {
    if (!newTagInput.trim()) return;
    
    // Format tag: lowercase, replace spaces with dashes
    const tagName = newTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Only add if it's not already selected
    if (!selectedTags.includes(tagName)) {
      const newSelectedTags = [...selectedTags, tagName];
      onTagsChange(newSelectedTags);
      
      // Show animation
      setShowAddAnimation(true);
      setTimeout(() => setShowAddAnimation(false), 1000);
      
      // Add to favorites if handler is provided
      if (onAddToFavorites && !favoriteTags.includes(tagName)) {
        onAddToFavorites(tagName);
      }
    }
    
    setNewTagInput('');
    
    // Focus back on input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Filter suggested tags based on input
  const getFilteredSuggestions = () => {
    if (!tagFilterInput) return suggestedTags;
    
    return suggestedTags.filter(tag => 
      tag.toLowerCase().includes(tagFilterInput.toLowerCase())
    );
  };
  
  // Get popular tags
  const getPopularTags = () => {
    // Keep some space for categories
    if (favoriteTags.length <= 6) return favoriteTags;
    return favoriteTags.slice(0, 6);
  };
  
  // Handle key press in input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewTag();
    }
  };
  
  // Handle remove from favorites
  const handleRemoveFromFavorites = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    if (onRemoveFromFavorites) {
      onRemoveFromFavorites(tag);
    }
  };
  
  // Toggle category collapse state
  const toggleCollapse = (category: string) => {
    setIsCollapsed(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Categorize tags
  const getTagCategories = () => {
    return {
      strategy: [
        'momentum', 'reversal', 'swing', 'scalp', 'trend', 'counter-trend', 
        'breakout', 'breakdown', 'mean-reversion'
      ],
      technical: [
        'support', 'resistance', 'fibonacci', 'trendline', 'volume', 'macd',
        'rsi', 'moving-average', 'divergence', 'oversold', 'overbought'
      ],
      fundamental: [
        'earnings', 'news', 'economic-data', 'fda', 'merger', 'acquisition',
        'dividend', 'industry', 'sector'
      ],
      psychology: [
        'discipline', 'patience', 'fomo', 'emotional', 'revenge-trade',
        'overtraded', 'planned', 'unplanned', 'confident', 'uncertain'
      ]
    };
  };
  
  // Get all tags
  const getAllTags = () => {
    const categories = getTagCategories();
    return Object.values(categories).flat();
  };
  
  // Get tags by active category
  const getTagsByCategory = () => {
    if (activeCategoryTab === 'all') {
      return getAllTags();
    }
    
    const categories = getTagCategories();
    return categories[activeCategoryTab as keyof typeof categories] || [];
  };
  
  const tagCategories = getTagCategories();
  const filteredSuggestions = getFilteredSuggestions();
  const popularTags = getPopularTags();
  const activeTabTags = getTagsByCategory();
  
  return (
    <div className={`bg-gradient-to-b from-[#111827] to-[#0f1117] rounded-xl shadow-xl overflow-hidden border border-indigo-900/20 ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-indigo-900/20 bg-gradient-to-r from-indigo-900/20 to-blue-900/10">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-base font-medium flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Trade Tags
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-400 hover:text-white transition-colors"
            onClick={() => toggleCollapse('all')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>
        </div>
        <p className="text-indigo-300/80 text-sm mt-1 font-light">
          Categorize trades and analyze patterns
        </p>
      </div>

      {/* Selected Tags Display */}
      <div className="px-5 py-4">
        <h4 className="text-indigo-300 text-xs font-medium mb-2 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Selected Tags
        </h4>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          <AnimatePresence>
            {selectedTags.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-500 text-sm py-1.5 italic"
              >
                No tags selected
              </motion.div>
            ) : (
              selectedTags.map(tag => (
                <motion.div 
                  key={tag}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-indigo-300 px-3 py-1.5 rounded-full text-sm flex items-center border border-indigo-600/30 shadow-sm hover:shadow-md transition-all"
                >
                  <span className="mr-1.5">#{tag}</span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className="text-indigo-400/70 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          
          {/* Animation when tag is added */}
          <AnimatePresence>
            {showAddAnimation && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-500/20 to-emerald-700/20 text-emerald-400 px-3 py-2 rounded-lg text-sm flex items-center border border-emerald-500/30 shadow-lg z-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Tag added
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Add Tag Input */}
      <div className="px-5 py-3">
        <div className={`relative transition-all ${isFocused ? 'ring-2 ring-indigo-500/50' : ''}`}>
          <motion.input
            whileFocus={{ scale: 1.01 }}
            ref={inputRef}
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Add a new tag..."
            className="w-full py-2.5 px-4 pr-10 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none shadow-inner"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={handleAddNewTag}
            disabled={!newTagInput.trim()}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
              newTagInput.trim() 
                ? 'text-indigo-400 hover:text-indigo-300 transition-colors' 
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </motion.button>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="px-5 py-3 border-t border-indigo-900/20">
        <div className="flex items-center mb-4 overflow-x-auto custom-scrollbar">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategoryTab('all')}
            className={`px-3 py-1.5 text-sm rounded-lg mr-2 whitespace-nowrap transition-all ${
              activeCategoryTab === 'all' 
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-700/50' 
                : 'text-gray-400 hover:bg-gray-800/50'
            }`}
          >
            All
          </motion.button>
          {Object.keys(tagCategories).map(category => (
            <motion.button
              key={category}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategoryTab(category)}
              className={`px-3 py-1.5 text-sm rounded-lg mr-2 whitespace-nowrap capitalize transition-all ${
                activeCategoryTab === category 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-700/50' 
                  : 'text-gray-400 hover:bg-gray-800/50'
              }`}
            >
              {category}
            </motion.button>
          ))}
        </div>
        
        {/* Tag Search */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={tagFilterInput}
              onChange={e => setTagFilterInput(e.target.value)}
              placeholder="Search for tags..."
              className="w-full py-2.5 pl-10 pr-4 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Favorite Tags Section */}
        {popularTags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="flex items-center text-sm font-medium text-amber-400">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Favorites
              </h4>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleCollapse('favorites')}
                className="text-gray-500 hover:text-gray-300"
              >
                <svg className={`w-4 h-4 transition-transform ${isCollapsed.favorites ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
            </div>
            
            <AnimatePresence>
              {!isCollapsed.favorites && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 mt-2">
                    {popularTags.map(tag => (
                      <motion.div
                        key={tag}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTagToggle(tag)}
                        className={`group px-3 py-1.5 rounded-full text-sm flex items-center cursor-pointer border transition-all shadow-sm ${
                          selectedTags.includes(tag)
                            ? 'bg-gradient-to-r from-amber-600/30 to-amber-700/20 text-amber-300 border-amber-600/40'
                            : 'bg-gradient-to-r from-gray-800/50 to-gray-900 text-gray-300 border-gray-700/50 hover:border-amber-600/30 hover:text-amber-300/90'
                        }`}
                      >
                        <span className="mr-1">#{tag}</span>
                        {selectedTags.includes(tag) ? (
                          <svg className="w-3.5 h-3.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                        {onRemoveFromFavorites && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={(e) => handleRemoveFromFavorites(e, tag)}
                            className="ml-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {/* Tag Categories or Search Results */}
        {tagFilterInput ? (
          // Filtered tag suggestions
          <div className="mb-4">
            <h4 className="text-gray-300 text-sm font-medium mb-2 flex items-center">
              <svg className="w-4 h-4 mr-1.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Results
            </h4>
            <div className="flex flex-wrap gap-2 mt-3">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map(tag => (
                  <motion.div
                    key={tag}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTagToggle(tag)}
                    className={`group px-3 py-1.5 rounded-full text-sm flex items-center cursor-pointer border transition-all shadow-sm ${
                      selectedTags.includes(tag)
                        ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-700/20 text-indigo-300 border-indigo-600/40'
                        : 'bg-gradient-to-r from-gray-800/50 to-gray-900 text-gray-300 border-gray-700/50 hover:border-indigo-600/30 hover:text-indigo-300/90'
                    }`}
                  >
                    <span>#{tag}</span>
                    {selectedTags.includes(tag) && (
                      <svg className="w-3.5 h-3.5 ml-1 text-indigo-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </motion.div>
                ))
              ) : (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gray-500 text-sm py-2 w-full"
                >
                  No matching tags found
                </motion.p>
              )}
            </div>
          </div>
        ) : (
          // Show tags from active category
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mt-1">
              {activeTabTags.map(tag => (
                <motion.div
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTagToggle(tag)}
                  className={`group px-3 py-1.5 rounded-full text-sm flex items-center cursor-pointer border transition-all shadow-sm ${
                    selectedTags.includes(tag)
                      ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-700/20 text-indigo-300 border-indigo-600/40'
                      : 'bg-gradient-to-r from-gray-800/50 to-gray-900 text-gray-300 border-gray-700/50 hover:border-indigo-600/30 hover:text-indigo-300/90'
                  }`}
                >
                  <span>#{tag}</span>
                  {selectedTags.includes(tag) && (
                    <svg className="w-3.5 h-3.5 ml-1 text-indigo-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Tag Usage Tip */}
      <div className="px-5 py-4 border-t border-indigo-900/20">
        <div className="p-3 bg-gradient-to-r from-indigo-900/20 to-blue-900/10 border border-indigo-800/30 rounded-lg shadow-inner">
          <p className="text-xs text-gray-300 flex items-start">
            <svg className="w-4 h-4 mr-2 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <span className="text-indigo-400 font-medium">Pro Tip:</span> Use tags consistently to track patterns in your trading. Filter trades by tag to analyze your performance across different strategies.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradeTagSelector; 