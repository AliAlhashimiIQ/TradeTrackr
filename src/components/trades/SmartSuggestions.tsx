import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';

// Emotion state patterns - these would be dynamically generated in a real app
const EMOTION_PATTERNS: EmotionPattern[] = [
  {
    emotion: 'fearful',
    pattern: 'Tendency to exit trades too early when fearful',
    impact: 'negative',
  },
  {
    emotion: 'greedy',
    pattern: 'Often holding winners too long when feeling greedy',
    impact: 'negative',
  },
  {
    emotion: 'confident',
    pattern: 'Best win rate when trading in a confident state',
    impact: 'positive',
  },
  {
    emotion: 'impatient',
    pattern: 'Pattern of overtrading when impatient',
    impact: 'negative',
  },
  {
    emotion: 'calm',
    pattern: 'Most consistent risk management when calm',
    impact: 'positive',
  },
];

interface AiSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  suggestions?: string[];
  value?: string;
}

interface EmotionPattern {
  emotion: string;
  pattern: string;
  impact: 'positive' | 'negative';
}

interface SmartSuggestionsProps {
  tradeData: Partial<Trade>;
  onApplySuggestion: (field: string, value: string | number | string[] | undefined) => void;
  className?: string;
}

/**
 * Provides AI-based tagging and suggestions based on trade details
 */
const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  tradeData,
  onApplySuggestion,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Relevant patterns based on emotion
  const [emotionPatterns, setEmotionPatterns] = useState<EmotionPattern[]>([]);
  
  // Calculate additional trade data for better analysis
  const riskRewardRatio = React.useMemo(() => {
    if (!tradeData.entry_price || !tradeData.exit_price || !tradeData.type) return null;
    
    const isLong = tradeData.type === 'Long';
    const isWinningTrade = isLong ? 
      tradeData.exit_price > tradeData.entry_price : 
      tradeData.exit_price < tradeData.entry_price;
    
    if (!isWinningTrade) return null;
    
    const reward = isLong ? 
      tradeData.exit_price - tradeData.entry_price : 
      tradeData.entry_price - tradeData.exit_price;
      
    // Assume risk is 50% of reward for demo purposes
    // In a real app, this would use actual stop loss data
    const risk = reward * 0.5;
    
    return (reward / risk).toFixed(2);
  }, [tradeData.entry_price, tradeData.exit_price, tradeData.type]);
  
  const holdingDuration = React.useMemo(() => {
    if (!tradeData.entry_time || !tradeData.exit_time) return null;
    
    const entryDate = new Date(tradeData.entry_time);
    const exitDate = new Date(tradeData.exit_time);
    
    // Calculate difference in days
    const diffTime = Math.abs(exitDate.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, [tradeData.entry_time, tradeData.exit_time]);
  
  const timeOfDay = React.useMemo(() => {
    if (!tradeData.entry_time) return null;
    
    const entryDate = new Date(tradeData.entry_time);
    const hour = entryDate.getHours();
    
    if (hour < 10) return 'Morning';
    if (hour < 14) return 'Midday';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }, [tradeData.entry_time]);
  
  const percentageGain = React.useMemo(() => {
    if (!tradeData.entry_price || !tradeData.exit_price) return null;
    
    const isLong = tradeData.type === 'Long';
    let percentChange;
    
    if (isLong) {
      percentChange = ((tradeData.exit_price - tradeData.entry_price) / tradeData.entry_price) * 100;
    } else {
      percentChange = ((tradeData.entry_price - tradeData.exit_price) / tradeData.entry_price) * 100;
    }
    
    return percentChange.toFixed(2);
  }, [tradeData.entry_price, tradeData.exit_price, tradeData.type]);

  const getTrendSuggestion = (): string | null => {
    if (!tradeData.entry_price || !tradeData.exit_price) return null;
    
    const isUptrend = tradeData.entry_price < tradeData.exit_price;
    const isLong = tradeData.type === 'Long';
    
    if (isLong && isUptrend) return 'Uptrend (Successful Long)';
    if (isLong && !isUptrend) return 'Downtrend (Failed Long)';
    if (!isLong && isUptrend) return 'Uptrend (Failed Short)';
    if (!isLong && !isUptrend) return 'Downtrend (Successful Short)';
    
    return null;
  };
  
  const getPerformanceSuggestion = (): string | null => {
    if (tradeData.profit_loss === undefined) return null;
    
    if (tradeData.profit_loss > 0) {
      return 'Winning trade - what worked well?';
    } else if (tradeData.profit_loss < 0) {
      return 'Losing trade - what can be improved?';
    }
    
    return 'Breakeven trade';
  };
  
  const getSuggestedTags = (): string[] => {
    const tags: string[] = [];
    
    // Symbol-based tags
    if (tradeData.symbol?.includes('USD')) tags.push('Forex');
    if (tradeData.symbol?.includes('BTC') || tradeData.symbol?.includes('ETH')) tags.push('Crypto');
    if (tradeData.symbol?.includes('XAU')) tags.push('Gold');
    if (tradeData.symbol?.includes('ES') || tradeData.symbol?.includes('NQ')) tags.push('Futures');
    if (/[A-Z]{1,5}/.test(tradeData.symbol || '')) tags.push('Stock');
    
    // Type-based tags
    if (tradeData.type === 'Long') tags.push('Long');
    if (tradeData.type === 'Short') tags.push('Short');
    
    // Performance-based tags
    if (tradeData.profit_loss && tradeData.profit_loss > 0) tags.push('Winner');
    if (tradeData.profit_loss && tradeData.profit_loss < 0) tags.push('Loser');
    
    // Time-based tags
    if (timeOfDay) tags.push(timeOfDay);
    if (holdingDuration === 0) tags.push('DayTrade');
    if (holdingDuration && holdingDuration > 3) tags.push('Swing');
    
    // Pattern-based tags (these would ideally be determined by analyzing the chart)
    const patterns = ['Breakout', 'Trend Following', 'Reversal', 'Scalp', 'Pullback', 'Support', 'Resistance'];
    tags.push(patterns[Math.floor(Math.random() * patterns.length)]);
    
    return tags;
  };
  
  const getNoteSuggestions = (): string[] => {
    const suggestions: string[] = [];
    const isWinning = tradeData.profit_loss !== undefined && tradeData.profit_loss > 0;
    
    if (isWinning) {
      suggestions.push(`Trade Analysis: Strong ${tradeData.type} setup on ${tradeData.symbol}. Entry was timed well with the trend. Exit was executed according to plan.`);
      suggestions.push(`I saw a clear setup on ${tradeData.symbol} and followed my trading plan. Entry at ${tradeData.entry_price} was at a key level, with exit at ${tradeData.exit_price} hitting my target.`);
    } else {
      suggestions.push(`Trade Analysis: Weak ${tradeData.type} setup on ${tradeData.symbol}. Entry was possibly premature. Exit was forced by market conditions.`);
      suggestions.push(`This trade on ${tradeData.symbol} didn't work out as planned. I may have entered too early at ${tradeData.entry_price} and had to exit at ${tradeData.exit_price} to limit losses.`);
    }
    
    return suggestions;
  };

  const trend = getTrendSuggestion();
  const performance = getPerformanceSuggestion();
  const suggestedTags = getSuggestedTags();
  const noteSuggestions = getNoteSuggestions();
  
  // Determine if we have any valid suggestions
  const hasSuggestions = 
    trend || 
    performance || 
    suggestedTags.length > 0 || 
    riskRewardRatio || 
    percentageGain || 
    noteSuggestions.length > 0;
  
  if (!hasSuggestions) {
    return null; // No suggestions available
  }

  // Get AI suggestions when trade data changes
  useEffect(() => {
    // In a real app, this would call an API endpoint
    // Here we'll mock some realistic suggestions
    if (tradeData.symbol) {
      const mockSuggestions: AiSuggestion[] = [
        {
          id: '1',
          title: 'Suggested Tags',
          description: 'Based on your past trades with this symbol',
          category: 'tags',
          priority: 'medium',
          suggestions: ['breakout', 'support', 'resistance']
        },
        {
          id: '2',
          title: 'Entry Time',
          description: 'This trade was likely entered near market open',
          category: 'timing',
          priority: 'low',
          value: '09:30:00'
        }
      ];
      
      setAiSuggestions(mockSuggestions);
    }
    
    // Check for matching emotion patterns
    if (tradeData.emotional_state) {
      const matchingPatterns = EMOTION_PATTERNS.filter(
        pattern => pattern.emotion === tradeData.emotional_state
      );
      setEmotionPatterns(matchingPatterns);
    } else {
      setEmotionPatterns([]);
    }
  }, [tradeData.symbol, tradeData.emotional_state]);
  
  const handleToggleAi = () => {
    setShowAiPanel(!showAiPanel);
    if (!showAiPanel && aiSuggestions.length === 0) {
      setLoading(true);
      // Simulate API delay
      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  };
  
  const handleApplySuggestion = (field: string, value: string | number | string[] | undefined) => {
    onApplySuggestion(field, value);
  };

  return (
    <div className={`bg-[#1a1f2c] rounded-lg p-4 ${className}`}>
      {/* Header with AI icon */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-gray-300 text-sm font-medium flex items-center">
          <div className="w-5 h-5 mr-2 rounded-full bg-blue-500/30 flex items-center justify-center">
            <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V14M12 12V10M12 8V6M12 3V4M12 20V21M18.5 5.5L17.5 6.5M5.5 18.5L6.5 17.5M16 12H14M10 12H8M4 12H3M21 12H20M18.5 18.5L17.5 17.5M5.5 5.5L6.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          AI Analysis
        </h3>
        <button 
          className="text-xs text-gray-400 hover:text-white"
          onClick={handleToggleAi}
        >
          {showAiPanel ? 'Hide' : 'Show More'}
        </button>
      </div>
      
      {showAiPanel && (
        <div className="p-3 bg-[#0f1117] border border-indigo-900/30 rounded-lg">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-gray-400 mb-3">
                DURATION
                <div className="text-white text-sm mt-1">Same day</div>
              </div>
              
              <div className="text-xs text-gray-400 mb-3">
                SUGGESTED TAGS
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Short', 'Evening', 'DayTrade', 'Pullback'].map(tag => (
                    <span
                      key={tag}
                      className={`px-2 py-1 rounded text-xs cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-indigo-700/50 text-indigo-300'
                          : 'bg-[#1a1f2c] text-gray-300 hover:bg-indigo-900/30'
                      }`}
                      onClick={() => {
                        setSelectedTag(tag);
                        onApplySuggestion('tag', tag.toLowerCase());
                      }}
                    >
                      +{tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Emotional State Analysis - New Section */}
              {tradeData.emotional_state && emotionPatterns.length > 0 && (
                <div className="text-xs text-gray-400 mb-3">
                  <div className="flex items-center">
                    <span className="uppercase">Emotional Analysis</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      tradeData.emotional_state === 'calm' || tradeData.emotional_state === 'confident' 
                        ? 'bg-green-900/30 text-green-400'
                        : tradeData.emotional_state === 'greedy' || tradeData.emotional_state === 'fearful'
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {tradeData.emotional_state}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {emotionPatterns.map((pattern, idx) => (
                      <div key={idx} className={`p-2 rounded text-xs ${
                        pattern.impact === 'positive' 
                          ? 'bg-green-900/20 border border-green-900/30' 
                          : 'bg-red-900/20 border border-red-900/30'
                      }`}>
                        <span className={pattern.impact === 'positive' ? 'text-green-400' : 'text-red-400'}>
                          {pattern.pattern}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show message if no emotional state selected */}
              {!tradeData.emotional_state && (
                <div className="text-xs text-gray-400 mb-3">
                  <div className="uppercase mb-1">Emotional Analysis</div>
                  <div className="p-2 rounded text-xs bg-blue-900/20 border border-blue-900/30">
                    <span className="text-blue-400">
                      Select an emotional state to see how it might impact your trading
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Show More
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions; 