'use client';

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { generateTradeSuggestions, TradeSuggestion } from '@/lib/ai/aiService';

interface TradeSuggestionsProps {
  trades: Trade[];
  loading?: boolean;
  className?: string;
}

/**
 * AI-powered trade suggestions component
 * Provides personalized trading recommendations
 */
export default function TradeSuggestions({ trades, loading = false, className = '' }: TradeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TradeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!trades.length || loading) return;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        // In a production app, this would call an actual AI service
        const tradeSuggestions = await generateTradeSuggestions(trades);
        setSuggestions(tradeSuggestions);
      } catch (error) {
        console.error('Error fetching trade suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [trades, loading]);

  if (loading || isLoading) {
    return (
      <div className={`bg-[#131825] rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className={`bg-[#131825] rounded-lg p-6 text-center ${className}`}>
        <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-300">No Suggestions Available</h3>
        <p className="text-gray-500 mt-2">
          Add more trades to generate AI-powered suggestions for improving your trading.
        </p>
      </div>
    );
  }

  // Group suggestions by priority
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  const mediumPrioritySuggestions = suggestions.filter(s => s.priority === 'medium');
  const lowPrioritySuggestions = suggestions.filter(s => s.priority === 'low');

  return (
    <div className={`bg-[#131825] rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          Trading Recommendations
        </h3>
        <span className="text-xs px-2 py-1 bg-purple-900/40 text-purple-400 rounded-full">
          AI-Powered
        </span>
      </div>

      <div className="p-4">
        {/* High Priority Suggestions */}
        {highPrioritySuggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-2"></span>
              High Priority
            </h4>
            <div className="space-y-3">
              {highPrioritySuggestions.map(suggestion => (
                <div key={suggestion.id} className="bg-[#1a1f2c] rounded-lg p-3 border-l-2 border-red-500">
                  <h5 className="text-sm font-medium text-white">{suggestion.title}</h5>
                  <p className="text-xs text-gray-400 mt-1">{suggestion.description}</p>
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 bg-[#131825] text-gray-400 rounded">
                      {suggestion.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority Suggestions */}
        {mediumPrioritySuggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              Medium Priority
            </h4>
            <div className="space-y-3">
              {mediumPrioritySuggestions.map(suggestion => (
                <div key={suggestion.id} className="bg-[#1a1f2c] rounded-lg p-3 border-l-2 border-yellow-500">
                  <h5 className="text-sm font-medium text-white">{suggestion.title}</h5>
                  <p className="text-xs text-gray-400 mt-1">{suggestion.description}</p>
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 bg-[#131825] text-gray-400 rounded">
                      {suggestion.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Priority Suggestions */}
        {lowPrioritySuggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Low Priority
            </h4>
            <div className="space-y-3">
              {lowPrioritySuggestions.map(suggestion => (
                <div key={suggestion.id} className="bg-[#1a1f2c] rounded-lg p-3 border-l-2 border-blue-500">
                  <h5 className="text-sm font-medium text-white">{suggestion.title}</h5>
                  <p className="text-xs text-gray-400 mt-1">{suggestion.description}</p>
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 bg-[#131825] text-gray-400 rounded">
                      {suggestion.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 