'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const shouldReduceMotion = useReducedMotion();
  
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
      <div className="bg-white dark:bg-[var(--surface-1)] rounded-2xl p-5 border border-black/5 dark:border-white/[0.06] shadow-sm">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          AI Insights
        </h3>
        <div className="p-3.5 bg-gray-50 dark:bg-[var(--surface-3)] rounded-xl text-xs text-gray-500 dark:text-gray-400 text-center border border-black/5 dark:border-white/[0.04]">
          <p>Add at least 10 trades to unlock AI-powered insights.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[var(--surface-1)] rounded-2xl p-5 animate-pulse border border-black/5 dark:border-white/[0.06]">
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[var(--surface-1)] rounded-2xl p-5 border border-black/5 dark:border-white/[0.06] shadow-sm">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        AI Insights
      </h3>
      
      <div className="space-y-2.5">
        {error ? (
          <div className="p-3 bg-gray-50 dark:bg-[var(--surface-3)] rounded-xl text-xs text-rose-600 dark:text-red-400 text-center border border-black/5 dark:border-transparent">
            {error}
          </div>
        ) : insights.length > 0 ? (
          insights.map((insight, idx) => (
            <motion.div 
              key={insight.id} 
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25, delay: idx * 0.06 }}
              className="p-3.5 bg-gray-50 dark:bg-[var(--surface-3)] rounded-xl text-sm border border-black/5 dark:border-white/[0.04]"
            >
              <div className="flex items-start">
                <div 
                  className={`mt-1 h-2 w-2 rounded-full mr-2.5 flex-shrink-0 ${
                    insight.insightType === 'pattern' ? 'bg-indigo-600 dark:bg-indigo-400' 
                    : insight.insightType === 'risk' ? 'bg-rose-500' 
                    : 'bg-emerald-500'
                  }`}
                ></div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">{insight.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-3.5 bg-gray-50 dark:bg-[var(--surface-3)] rounded-xl text-xs text-gray-500 dark:text-gray-400 text-center border border-black/5 dark:border-transparent">
            <p>Not enough trading data to generate insights.</p>
            <p className="text-[11px] mt-1 text-gray-400">Complete more trades to unlock AI insights.</p>
          </div>
        )}
      </div>
    </div>
  );
}
