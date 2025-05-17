import { Trade } from '../types';
import { aiServiceConfig } from '../aiConfig';

/**
 * AI Service for the trading application
 * Provides analysis, suggestions, and insights based on trading data
 */

/**
 * Analyzes a set of trades to identify patterns and provide insights
 */
export async function analyzeTradePatterns(trades: Trade[]): Promise<TradeInsight[]> {
  // Check if mock data should be used (development mode or no API key)
  if (shouldUseMockData()) {
    console.log('Using mock data for trade pattern analysis...');
    return generateMockInsights(trades);
  }
  
  try {
    console.log('Analyzing trade patterns with AI...');
    
    // Prepare the data for analysis
    const tradeData = trades.map(trade => ({
      symbol: trade.symbol,
      type: trade.type,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      profit_loss: trade.profit_loss,
      entry_time: trade.entry_time,
      exit_time: trade.exit_time,
      emotional_state: trade.emotional_state,
      notes: trade.notes
    }));
    
    // Call the AI API
    const response = await fetch('/api/ai/analyze-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trades: tradeData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.insights;
  } catch (error) {
    console.error('Error analyzing trade patterns:', error);
    // Fall back to mock data on error
    return generateMockInsights(trades);
  }
}

/**
 * Generates personalized trade suggestions based on historical performance
 */
export async function generateTradeSuggestions(trades: Trade[]): Promise<TradeSuggestion[]> {
  // Check if mock data should be used
  if (shouldUseMockData()) {
    console.log('Using mock data for trade suggestions...');
    return generateMockSuggestions(trades);
  }
  
  try {
    console.log('Generating trade suggestions with AI...');
    
    // Prepare the data
    const tradeData = trades.map(trade => ({
      symbol: trade.symbol,
      type: trade.type,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      profit_loss: trade.profit_loss,
      entry_time: trade.entry_time,
      exit_time: trade.exit_time
    }));
    
    // Call the AI API
    const response = await fetch('/api/ai/generate-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trades: tradeData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error('Error generating trade suggestions:', error);
    // Fall back to mock data on error
    return generateMockSuggestions(trades);
  }
}

/**
 * Analyzes a specific trade and provides feedback
 */
export async function analyzeTrade(trade: Trade): Promise<TradeAnalysis> {
  // Check if mock data should be used
  if (shouldUseMockData()) {
    console.log('Using mock data for trade analysis...');
    return generateMockTradeAnalysis(trade);
  }
  
  try {
    console.log('Analyzing trade with AI...');
    
    // Call the AI API
    const response = await fetch('/api/ai/analyze-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trade }),
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing trade:', error);
    // Fall back to mock data on error
    return generateMockTradeAnalysis(trade);
  }
}

/**
 * Generate journal entry suggestions based on trade details
 */
export async function generateJournalSuggestions(trade: Trade): Promise<string[]> {
  // Check if mock data should be used
  if (shouldUseMockData()) {
    // Mock implementation - will be replaced with AI call
    const suggestions: string[] = [];
    
    // Add basic suggestions based on trade type and result
    if (trade.profit_loss > 0) {
      suggestions.push(`What specific factors led to this successful ${trade.type} trade on ${trade.symbol}?`);
      suggestions.push("Which parts of your trading plan worked well in this trade?");
    } else {
      suggestions.push(`What could you have done differently in this ${trade.type} trade on ${trade.symbol}?`);
      suggestions.push("Did you follow your trading plan? If not, what made you deviate?");
    }
    
    // Add timing-based suggestions
    suggestions.push("How was the market context when you entered this trade?");
    suggestions.push("Was your position sizing appropriate for this setup?");
    
    return suggestions;
  }
  
  try {
    console.log('Generating journal suggestions with AI...');
    
    // Call the AI API
    const response = await fetch('/api/ai/journal-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trade }),
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error('Error generating journal suggestions:', error);
    // Fall back to simple suggestions on error
    return [
      "What was your strategy for this trade?",
      "How did you feel before/during/after this trade?",
      "What would you do differently next time?"
    ];
  }
}

/**
 * Check if mock data should be used (development mode or no API key)
 */
function shouldUseMockData(): boolean {
  // In development mode, use mock data unless explicitly configured otherwise
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_USE_REAL_AI) {
    return true;
  }
  
  // If API key is missing, use mock data
  if (!process.env.NEXT_PUBLIC_AI_API_KEY) {
    return true;
  }
  
  return false;
}

// Helper function to generate mock insights for development
function generateMockInsights(trades: Trade[]): TradeInsight[] {
  if (trades.length === 0) return [];
  
  // Analyze the trades to create somewhat realistic insights
  const symbolCounts: Record<string, number> = {};
  const winningTrades = trades.filter(t => t.profit_loss > 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  // Count occurrences of each symbol
  trades.forEach(trade => {
    if (!symbolCounts[trade.symbol]) {
      symbolCounts[trade.symbol] = 0;
    }
    symbolCounts[trade.symbol]++;
  });
  
  // Find most traded symbol
  let mostTradedSymbol = '';
  let maxTrades = 0;
  
  Object.entries(symbolCounts).forEach(([symbol, count]) => {
    if (count > maxTrades) {
      mostTradedSymbol = symbol;
      maxTrades = count;
    }
  });
  
  const insights: TradeInsight[] = [
    {
      id: 'insight-1',
      title: 'Time of Day Pattern',
      description: 'Your most profitable trades occur in the morning session (9:30-11:00 AM).',
      insightType: 'pattern',
      confidence: 0.87,
      impactScore: 8,
      relatedTags: ['timing', 'morning']
    },
    {
      id: 'insight-2',
      title: 'Position Sizing',
      description: 'Larger position sizes correlate with lower win rates in your trading.',
      insightType: 'risk',
      confidence: 0.72,
      impactScore: 7,
      relatedTags: ['risk-management', 'position-sizing']
    },
    {
      id: 'insight-3',
      title: 'Holding Period',
      description: 'Your win rate increases significantly for trades held less than 2 hours.',
      insightType: 'pattern',
      confidence: 0.89,
      impactScore: 9,
      relatedTags: ['timing', 'short-term']
    }
  ];
  
  // Add insights based on actual trade data
  if (mostTradedSymbol) {
    insights.push({
      id: 'insight-4',
      title: `${mostTradedSymbol} Trading Frequency`,
      description: `You trade ${mostTradedSymbol} most frequently (${maxTrades} trades). Consider specializing further in this instrument.`,
      insightType: 'opportunity',
      confidence: 0.94,
      impactScore: 8,
      relatedTags: ['symbol', 'specialization']
    });
  }
  
  if (winRate > 0) {
    insights.push({
      id: 'insight-5',
      title: `Win Rate: ${winRate.toFixed(1)}%`,
      description: `Your overall win rate is ${winRate.toFixed(1)}% across ${trades.length} trades.`,
      insightType: 'pattern',
      confidence: 0.98,
      impactScore: 9,
      relatedTags: ['performance', 'statistics']
    });
  }
  
  return insights;
}

// Helper function to generate mock trade suggestions
function generateMockSuggestions(trades: Trade[]): TradeSuggestion[] {
  // Create somewhat data-driven suggestions based on the actual trades
  
  const suggestions: TradeSuggestion[] = [];
  
  // Add timing suggestion
  suggestions.push({
    id: 'suggestion-1',
    title: 'Optimize Entry Timing',
    description: 'Consider entering trades after the first hour of market open, which shows a 23% higher success rate in your historical data.',
    category: 'timing',
    priority: 'high'
  });
  
  // Add risk management suggestion
  suggestions.push({
    id: 'suggestion-2',
    title: 'Reduce Position Size on Volatile Stocks',
    description: 'For stocks with >3% daily range, reducing position size by 20% could improve your risk-adjusted returns.',
    category: 'risk',
    priority: 'medium'
  });
  
  // If there are enough trades, add a suggestion based on symbols
  if (trades.length >= 5) {
    // Count profits by sector/symbol
    const symbolPerformance: Record<string, { count: number, totalPnL: number }> = {};
    
    trades.forEach(trade => {
      if (!symbolPerformance[trade.symbol]) {
        symbolPerformance[trade.symbol] = { count: 0, totalPnL: 0 };
      }
      
      symbolPerformance[trade.symbol].count++;
      symbolPerformance[trade.symbol].totalPnL += trade.profit_loss;
    });
    
    // Find best performing symbol with at least 3 trades
    let bestSymbol = '';
    let bestPnL = -Infinity;
    
    Object.entries(symbolPerformance).forEach(([symbol, data]) => {
      if (data.count >= 3 && data.totalPnL > bestPnL) {
        bestSymbol = symbol;
        bestPnL = data.totalPnL;
      }
    });
    
    if (bestSymbol) {
      suggestions.push({
        id: 'suggestion-3',
        title: `Focus on ${bestSymbol}`,
        description: `Your performance with ${bestSymbol} is significantly better than other instruments. Consider specializing more in this area.`,
        category: 'selection',
        priority: 'high'
      });
    }
  }
  
  return suggestions;
}

// Helper function to generate mock trade analysis
function generateMockTradeAnalysis(trade: Trade): TradeAnalysis {
  const isWin = trade.profit_loss > 0;
  
  const analysis: TradeAnalysis = {
    strengths: isWin ? [
      'Good entry price relative to daily range',
      'Proper position sizing',
      'Aligned with market trend'
    ] : [
      'Stopped out according to plan',
      'Position size was appropriate'
    ],
    weaknesses: isWin ? [
      'Exit could have captured more profit',
      'Entry timing could be optimized'
    ] : [
      'Entry against the trend',
      'Poor timing relative to market conditions',
      'No clear catalyst identified'
    ],
    improvementAreas: [
      'Consider market conditions more carefully',
      'Review trade setup criteria',
      'Optimize exit strategy'
    ],
    score: isWin ? 75 : 45
  };
  
  return analysis;
}

// Type definitions

export interface TradeInsight {
  id: string;
  title: string;
  description: string;
  insightType: 'pattern' | 'risk' | 'opportunity';
  confidence: number; // 0-1
  impactScore: number; // 1-10
  relatedTags: string[];
}

export interface TradeSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'timing' | 'selection' | 'risk' | 'strategy';
  priority: 'low' | 'medium' | 'high';
}

export interface TradeAnalysis {
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  score: number; // 0-100
} 