'use client';

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { analyzeTradePatterns, TradeInsight } from '@/lib/ai/aiService';

interface TradeInsightsProps {
  trades: Trade[];
  loading?: boolean;
  className?: string;
}

/**
 * AI-powered trade insights component
 * Displays patterns and insights from trading data
 */
export default function TradeInsights({ trades, loading = false, className = '' }: TradeInsightsProps) {
  const [insights, setInsights] = useState<TradeInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<TradeInsight | null>(null);

  useEffect(() => {
    if (!trades.length || loading) return;

    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        // In a production app, this would call an actual AI service
        const tradeInsights = await analyzeTradePatterns(trades);
        setInsights(tradeInsights);
        
        // Auto-select the first insight if available
        if (tradeInsights.length > 0 && !selectedInsight) {
          setSelectedInsight(tradeInsights[0]);
        }
      } catch (error) {
        console.error('Error fetching trade insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [trades, loading]);

  const handleSelectInsight = (insight: TradeInsight) => {
    setSelectedInsight(insight);
  };

  if (loading || isLoading) {
    return (
      <div className={`bg-[#131825] rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!insights.length) {
    return (
      <div className={`bg-[#131825] rounded-lg p-6 text-center ${className}`}>
        <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-300">No Insights Available</h3>
        <p className="text-gray-500 mt-2">
          Add more trades to generate AI-powered insights about your trading patterns.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#131825] rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          AI Trading Insights
        </h3>
        <span className="text-xs px-2 py-1 bg-blue-900/40 text-blue-400 rounded-full">
          AI-Powered
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-800">
        {/* Insight List */}
        <div className="md:col-span-1 overflow-auto max-h-96 md:max-h-none">
          <ul className="divide-y divide-gray-800">
            {insights.map((insight) => (
              <li 
                key={insight.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedInsight?.id === insight.id 
                    ? 'bg-[#1a1f2c]' 
                    : 'hover:bg-[#1a1f2c]/50'
                }`}
                onClick={() => handleSelectInsight(insight)}
              >
                <div className="flex items-start">
                  <div 
                    className={`mt-0.5 h-2 w-2 rounded-full mr-2 flex-shrink-0 ${
                      insight.insightType === 'pattern' ? 'bg-blue-400' 
                      : insight.insightType === 'risk' ? 'bg-red-400' 
                      : 'bg-green-400'
                    }`}
                  ></div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{insight.title}</h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Insight Detail */}
        <div className="md:col-span-2 p-4">
          {selectedInsight && (
            <div>
              <h3 className="text-xl font-medium text-white mb-2">
                {selectedInsight.title}
              </h3>
              
              <div className="flex items-center space-x-3 mb-4">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedInsight.insightType === 'pattern' ? 'bg-blue-900/40 text-blue-400' 
                  : selectedInsight.insightType === 'risk' ? 'bg-red-900/40 text-red-400' 
                  : 'bg-green-900/40 text-green-400'
                }`}>
                  {selectedInsight.insightType.charAt(0).toUpperCase() + selectedInsight.insightType.slice(1)}
                </span>
                
                <span className="text-xs text-gray-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {(selectedInsight.confidence * 100).toFixed(0)}% Confidence
                </span>
                
                <span className="text-xs text-gray-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Impact: {selectedInsight.impactScore}/10
                </span>
              </div>
              
              <p className="text-gray-300 mb-4">
                {selectedInsight.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedInsight.relatedTags.map((tag) => (
                  <span 
                    key={tag} 
                    className="px-2 py-1 bg-[#1a1f2c] text-gray-400 text-xs rounded-lg"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              
              <div className="mt-6 p-3 bg-[#1a1f2c] rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">
                  How to use this insight
                </h4>
                <p className="text-xs text-gray-400">
                  {selectedInsight.insightType === 'pattern' 
                    ? 'This pattern has been identified in your trading history. Consider incorporating this awareness into your strategy to capitalize on what works well for you.'
                    : selectedInsight.insightType === 'risk'
                    ? 'This risk factor has been identified in your trading history. Consider adjusting your approach to mitigate this risk in future trades.'
                    : 'This opportunity has been identified based on your trading history. Consider exploring this potential edge in your future trading decisions.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 