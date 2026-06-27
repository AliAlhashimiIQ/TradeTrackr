import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { analyzeTradePatterns, TradeInsight } from '@/lib/ai/aiService';

interface AIInsightsProps {
  insights?: TradeInsight[];
  isLoading?: boolean;
  trades?: Trade[];
}

export default function AIInsights({ insights: initialInsights, isLoading: initialLoading, trades = [] }: AIInsightsProps) {
  const [insights, setInsights] = useState<TradeInsight[]>([]);
  const [isLoading, setIsLoading] = useState(initialLoading || false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // If insights are provided directly, use them
    if (initialInsights && initialInsights.length > 0) {
      setInsights(initialInsights);
      return;
    }
    
    // Otherwise, if we have trades, analyze them
    if (trades.length > 0 && !initialLoading) {
      const fetchInsights = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await analyzeTradePatterns(trades);
          setInsights(result);
        } catch (error) {
          console.error('Error analyzing trade patterns:', error);
          setError('Unable to generate AI insights right now.');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchInsights();
    }
  }, [initialInsights, initialLoading, trades]);
  
  if (trades.length < 10) {
    return (
      <div className="bg-white dark:bg-[#131825] rounded-lg p-4 border border-black/5 dark:border-transparent">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          AI Insights
        </h3>
        <div className="p-3 bg-gray-50 dark:bg-[#1d2333] rounded-lg text-sm text-gray-500 dark:text-gray-400 text-center border border-black/5 dark:border-transparent">
          <p>Add at least 10 trades to unlock AI-powered insights.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#131825] rounded-lg p-4 animate-pulse border border-black/5 dark:border-transparent">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#131825] rounded-lg p-4 border border-black/5 dark:border-transparent">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-indigo-650 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        AI Insights
      </h3>
      
      <div className="space-y-2">
        {error ? (
          <div className="p-3 bg-gray-50 dark:bg-[#1d2333] rounded-lg text-sm text-rose-600 dark:text-red-400 text-center border border-black/5 dark:border-transparent">
            {error}
          </div>
        ) : insights.length > 0 ? (
          insights.map((insight) => (
            <div 
              key={insight.id} 
              className="p-3 bg-gray-50 dark:bg-[#1d2333] rounded-lg text-sm border border-black/5 dark:border-transparent"
            >
              <div className="flex items-start">
                <div 
                  className={`mt-0.5 h-2 w-2 rounded-full mr-2 flex-shrink-0 ${
                    insight.insightType === 'pattern' ? 'bg-indigo-600 dark:bg-blue-400' 
                    : insight.insightType === 'risk' ? 'bg-red-500' 
                    : 'bg-emerald-500'
                  }`}
                ></div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-3 bg-gray-50 dark:bg-[#1d2333] rounded-lg text-sm text-gray-500 dark:text-gray-400 text-center border border-black/5 dark:border-transparent">
            <p>Not enough trading data to generate insights.</p>
            <p className="text-xs mt-1">Complete more trades to unlock AI insights.</p>
          </div>
        )}
      </div>
    </div>
  );
}
