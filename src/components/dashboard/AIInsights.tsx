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
        try {
          const result = await analyzeTradePatterns(trades);
          setInsights(result);
        } catch (error) {
          console.error('Error analyzing trade patterns:', error);
          // On error, use simplified insights based on actual trade data
          setInsights(generateSimplifiedInsights(trades));
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchInsights();
    }
  }, [initialInsights, initialLoading, trades]);
  
  // Generate simple insights from trade data if AI analysis fails
  const generateSimplifiedInsights = (trades: Trade[]): TradeInsight[] => {
    const insights: TradeInsight[] = [];
    
    // Calculate win rate
    const winningTrades = trades.filter(t => t.profit_loss > 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    insights.push({
      id: 'win-rate',
      title: `Win Rate: ${winRate.toFixed(1)}%`,
      description: `Your current win rate is ${winRate.toFixed(1)}% based on ${trades.length} trades.`,
      insightType: 'pattern',
      confidence: 0.95,
      impactScore: 8,
      relatedTags: ['performance', 'statistics']
    });
    
    // Find best symbol
    const symbolPerformance: Record<string, { count: number, totalPnL: number }> = {};
    trades.forEach(trade => {
      if (!symbolPerformance[trade.symbol]) {
        symbolPerformance[trade.symbol] = { count: 0, totalPnL: 0 };
      }
      symbolPerformance[trade.symbol].count++;
      symbolPerformance[trade.symbol].totalPnL += trade.profit_loss;
    });
    
    let bestSymbol = '';
    let bestPnL = -Infinity;
    
    Object.entries(symbolPerformance).forEach(([symbol, data]) => {
      if (data.count >= 3 && data.totalPnL > bestPnL) {
        bestSymbol = symbol;
        bestPnL = data.totalPnL;
      }
    });
    
    if (bestSymbol) {
      insights.push({
        id: 'best-symbol',
        title: `Best Performance: ${bestSymbol}`,
        description: `${bestSymbol} has been your most profitable symbol with a total P&L of $${bestPnL.toFixed(2)}.`,
        insightType: 'opportunity',
        confidence: 0.9,
        impactScore: 7,
        relatedTags: ['symbol', 'performance']
      });
    }
    
    return insights;
  };

  if (isLoading) {
    return (
      <div className="bg-[#131825] rounded-lg p-4 animate-pulse">
        <div className="h-6 w-24 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#131825] rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        AI Insights
      </h3>
      
      <div className="space-y-2">
        {insights.length > 0 ? (
          insights.map((insight) => (
          <div 
            key={insight.id} 
              className="p-3 bg-[#1d2333] rounded-lg text-sm"
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
                  <p className="text-xs text-gray-400 mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-3 bg-[#1d2333] rounded-lg text-sm text-gray-400 text-center">
            <p>Not enough trading data to generate insights.</p>
            <p className="text-xs mt-1">Complete more trades to unlock AI insights.</p>
          </div>
        )}
      </div>
    </div>
  );
} 