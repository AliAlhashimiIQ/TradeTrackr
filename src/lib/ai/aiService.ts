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
  if (!trades.length) return [];
  const tradesForPrompt = trades.slice(0, 30).map((t, i) =>
    `#${i + 1}: Symbol=${t.symbol}, Type=${t.type}, Entry=${t.entry_price}, Exit=${t.exit_price}, Qty=${t.quantity}, P&L=${t.profit_loss}, Tags=${(t.tags || []).join(',')}, Notes=${t.notes || ''}`
  ).join('\n');
  const prompt = `Analyze these trades and return a JSON array of insights. Each insight should have: id, title, description, insightType (pattern|risk|opportunity), confidence (0-1), impactScore (1-10), relatedTags.` +
    `\nTrades:\n${tradesForPrompt}`;
  return await callOpenAIForAnalytics(prompt);
}

/**
 * Generates personalized trade suggestions based on historical performance
 */
export async function generateTradeSuggestions(trades: Trade[]): Promise<TradeSuggestion[]> {
  if (!trades.length) return [];
  const tradesForPrompt = trades.slice(0, 30).map((t, i) =>
    `#${i + 1}: Symbol=${t.symbol}, Type=${t.type}, Entry=${t.entry_price}, Exit=${t.exit_price}, Qty=${t.quantity}, P&L=${t.profit_loss}, Tags=${(t.tags || []).join(',')}, Notes=${t.notes || ''}`
  ).join('\n');
  const prompt = `Based on these trades, return a JSON array of actionable suggestions. Each suggestion should have: id, title, description, category (timing|selection|risk|strategy), priority (low|medium|high).` +
    `\nTrades:\n${tradesForPrompt}`;
  return await callOpenAIForAnalytics(prompt);
}

/**
 * Analyzes a specific trade and provides feedback
 */
export async function analyzeTrade(trade: Trade): Promise<TradeAnalysis> {
  const prompt = `Analyze this trade and return a JSON object with: strengths (string[]), weaknesses (string[]), improvementAreas (string[]), sentiment (positive|negative|neutral), score (0-100).` +
    `\nTrade: Symbol=${trade.symbol}, Type=${trade.type}, Entry=${trade.entry_price}, Exit=${trade.exit_price}, Qty=${trade.quantity}, P&L=${trade.profit_loss}, Tags=${(trade.tags || []).join(',')}, Notes=${trade.notes || ''}`;
  return await callOpenAIForAnalytics(prompt);
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

// Helper to call OpenAI for analytics
async function callOpenAIForAnalytics(prompt: string, max_tokens = 600): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not set');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a professional trading coach AI. Respond in JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens,
      temperature: 0.7
    })
  });
  if (!response.ok) throw new Error('OpenAI API error');
  const data = await response.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  } catch {
    return data.choices?.[0]?.message?.content || '';
  }
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
  tag?: string;
}

export interface TradeAnalysis {
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // 0-100
}

export function analyzeTradeDeep(trade: Trade): TradeAnalysis {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const improvementAreas: string[] = [];
  const notes = (trade.notes || '').toLowerCase();
  const tags = (trade.tags || []).map(t => t.toLowerCase());

  // Sentiment analysis (simple keyword-based)
  let sentimentScore = 0;
  if (notes.match(/(good|great|happy|calm|confident|plan|win|profit|disciplined)/)) sentimentScore++;
  if (notes.match(/(bad|fear|fomo|angry|frustrated|loss|late|anxious|regret|mistake)/)) sentimentScore--;
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (sentimentScore > 0) sentiment = 'positive';
  if (sentimentScore < 0) sentiment = 'negative';

  // Strengths
  if (trade.profit_loss > 0) strengths.push('Profitable trade');
  if (tags.includes('plan') || notes.includes('plan')) strengths.push('Followed trading plan');
  if (notes.includes('calm') || tags.includes('calm')) strengths.push('Maintained discipline');
  if (trade.tags && trade.tags.length > 0) strengths.push('Used tags for organization');

  // Weaknesses
  if (trade.profit_loss < 0) weaknesses.push('Losing trade');
  if (notes.includes('fomo') || tags.includes('fomo')) weaknesses.push('FOMO affected decision');
  if (notes.includes('late')) weaknesses.push('Late entry/exit');
  if (notes.includes('fear')) weaknesses.push('Fear impacted decision');
  if (trade.quantity && trade.quantity > 2 * ((1) || 1)) weaknesses.push('Oversized position');
  if (!trade.tags || trade.tags.length === 0) weaknesses.push('No tags used');

  // Improvements
  if (notes.includes('late')) improvementAreas.push('Work on entry/exit timing');
  if (notes.includes('fear')) improvementAreas.push('Address fear in trading');
  if (!trade.tags || trade.tags.length === 0) improvementAreas.push('Add tags for better analysis');
  if (notes.match(/(angry|frustrated|anxious)/)) improvementAreas.push('Work on trading psychology');
  if (notes.includes('plan') === false) improvementAreas.push('Write a trading plan for each trade');

  // Score (simple example)
  let score = 50;
  if (trade.profit_loss > 0) score += 20;
  score += strengths.length * 5;
  score -= weaknesses.length * 5;
  if (sentiment === 'positive') score += 5;
  if (sentiment === 'negative') score -= 5;
  score = Math.max(0, Math.min(100, score));

  return { strengths, weaknesses, improvementAreas, sentiment, score };
}

// Aggregate deep analysis for dashboard-level feedback
export function aggregateDeepAnalysis(trades: Trade[]) {
  const allStrengths: string[] = [];
  const allWeaknesses: string[] = [];
  const allImprovements: string[] = [];
  const sentimentScores: number[] = [];
  let totalScore = 0;

  trades.forEach(trade => {
    const analysis = analyzeTradeDeep(trade);
    allStrengths.push(...analysis.strengths);
    allWeaknesses.push(...analysis.weaknesses);
    allImprovements.push(...analysis.improvementAreas);
    sentimentScores.push(analysis.sentiment === 'positive' ? 1 : analysis.sentiment === 'negative' ? -1 : 0);
    totalScore += analysis.score;
  });

  // Top 3 of each
  function topN(arr: string[], n = 3) {
    const freq: Record<string, number> = {};
    arr.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  }

  const topStrengths = topN(allStrengths);
  const topWeaknesses = topN(allWeaknesses);
  const topImprovements = topN(allImprovements);
  const avgSentiment = sentimentScores.length ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0;
  const avgScore = trades.length ? Math.round(totalScore / trades.length) : 0;
  let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (avgSentiment > 0.3) overallSentiment = 'positive';
  if (avgSentiment < -0.3) overallSentiment = 'negative';

  return {
    topStrengths,
    topWeaknesses,
    topImprovements,
    overallSentiment,
    avgScore
  };
}

// 1. Streak & Behavior Detection
export function detectStreaksAndBehaviors(trades: Trade[]) {
  if (!trades.length) return { streaks: [], behaviors: [] };
  const streaks = [];
  let currentStreak = { type: '', count: 0, start: 0, end: 0 };
  let lastResult: 'win' | 'loss' | null = null;
  let behaviors = [];

  // Detect streaks
  trades.forEach((trade, i) => {
    const result = trade.profit_loss > 0 ? 'win' : 'loss';
    if (result === lastResult) {
      currentStreak.count++;
      currentStreak.end = i;
    } else {
      if (currentStreak.count >= 3) streaks.push({ ...currentStreak });
      currentStreak = { type: result, count: 1, start: i, end: i };
    }
    lastResult = result;
  });
  if (currentStreak.count >= 3) streaks.push({ ...currentStreak });

  // Detect behavioral triggers
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    const curr = trades[i];
    // Revenge trading: after a loss, next trade is larger
    if (prev.profit_loss < 0 && curr.quantity > prev.quantity) {
      behaviors.push({
        type: 'revenge',
        index: i,
        message: 'Possible revenge trading: increased position size after a loss.'
      });
    }
    // Overconfidence: after a win, next trade is larger
    if (prev.profit_loss > 0 && curr.quantity > prev.quantity) {
      behaviors.push({
        type: 'overconfidence',
        index: i,
        message: 'Possible overconfidence: increased position size after a win.'
      });
    }
  }

  return { streaks, behaviors };
}

// 2. Tag-Based Performance
export function analyzeTagPerformance(trades: Trade[]) {
  const tagStats: Record<string, { count: number, wins: number, totalPnL: number, totalRisk: number }> = {};
  trades.forEach(trade => {
    (trade.tags || []).forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { count: 0, wins: 0, totalPnL: 0, totalRisk: 0 };
      tagStats[tag].count++;
      if (trade.profit_loss > 0) tagStats[tag].wins++;
      tagStats[tag].totalPnL += trade.profit_loss || 0;
      tagStats[tag].totalRisk += trade.risk || 0;
    });
  });
  // Calculate win rate, avg PnL, avg risk
  const tagPerformance = Object.entries(tagStats).map(([tag, stats]) => ({
    tag,
    winRate: stats.count ? (stats.wins / stats.count) * 100 : 0,
    avgPnL: stats.count ? stats.totalPnL / stats.count : 0,
    avgRisk: stats.count ? stats.totalRisk / stats.count : 0,
    count: stats.count
  }));
  // Best/worst setups
  const best = tagPerformance.filter(t => t.count >= 3).sort((a, b) => b.winRate - a.winRate)[0];
  const worst = tagPerformance.filter(t => t.count >= 3).sort((a, b) => a.winRate - b.winRate)[0];
  return { tagPerformance, best, worst };
}

// 3. Emotional State Analytics
export function analyzeEmotionOutcomes(trades: Trade[]) {
  const emotionStats: Record<string, { count: number, wins: number, totalPnL: number }> = {};
  trades.forEach(trade => {
    // From tags
    (trade.tags || []).forEach(tag => {
      if (!emotionStats[tag]) emotionStats[tag] = { count: 0, wins: 0, totalPnL: 0 };
      emotionStats[tag].count++;
      if (trade.profit_loss > 0) emotionStats[tag].wins++;
      emotionStats[tag].totalPnL += trade.profit_loss || 0;
    });
    // From notes (simple keyword extraction)
    const notes = (trade.notes || '').toLowerCase();
    ['fear', 'fomo', 'calm', 'angry', 'confident', 'anxious', 'plan'].forEach(emotion => {
      if (notes.includes(emotion)) {
        if (!emotionStats[emotion]) emotionStats[emotion] = { count: 0, wins: 0, totalPnL: 0 };
        emotionStats[emotion].count++;
        if (trade.profit_loss > 0) emotionStats[emotion].wins++;
        emotionStats[emotion].totalPnL += trade.profit_loss || 0;
      }
    });
  });
  // Calculate win rate, avg PnL
  const emotionPerformance = Object.entries(emotionStats).map(([emotion, stats]) => ({
    emotion,
    winRate: stats.count ? (stats.wins / stats.count) * 100 : 0,
    avgPnL: stats.count ? stats.totalPnL / stats.count : 0,
    count: stats.count
  }));
  return { emotionPerformance };
}

// 4. Mindset Trends (for charting)
export function getMindsetTrends(trades: Trade[]) {
  // For each trade, extract date and emotion keywords
  const trends: { date: string, emotions: string[] }[] = [];
  trades.forEach(trade => {
    const date = trade.entry_time.split('T')[0];
    const emotions: string[] = [];
    const notes = (trade.notes || '').toLowerCase();
    ['fear', 'fomo', 'calm', 'angry', 'confident', 'anxious', 'plan'].forEach(emotion => {
      if ((trade.tags || []).includes(emotion) || notes.includes(emotion)) {
        emotions.push(emotion);
      }
    });
    trends.push({ date, emotions });
  });
  // Aggregate for charting: { date, emotionCounts: { [emotion]: count } }
  const dateEmotionCounts: Record<string, Record<string, number>> = {};
  trends.forEach(({ date, emotions }) => {
    if (!dateEmotionCounts[date]) dateEmotionCounts[date] = {};
    emotions.forEach(emotion => {
      dateEmotionCounts[date][emotion] = (dateEmotionCounts[date][emotion] || 0) + 1;
    });
  });
  return dateEmotionCounts;
}

// 5. AI-Powered What-If Analysis
export function simulateWhatIf(trades: Trade[], scenario: 'no-fomo' | 'always-plan') {
  let filtered: Trade[] = trades;
  if (scenario === 'no-fomo') {
    filtered = trades.filter(t => !((t.tags || []).includes('fomo') || (t.notes || '').toLowerCase().includes('fomo')));
  }
  if (scenario === 'always-plan') {
    filtered = trades.map(t => {
      if (!((t.tags || []).includes('plan') || (t.notes || '').toLowerCase().includes('plan'))) {
        // Simulate: if trade had a plan, increase PnL by 10%
        return { ...t, profit_loss: t.profit_loss ? t.profit_loss * 1.1 : t.profit_loss };
      }
      return t;
    });
  }
  // Calculate new total PnL
  const totalPnL = filtered.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  return { scenario, totalPnL, tradeCount: filtered.length };
}

// AI chat handler for trades page
export async function answerTradeQuestion(trades: Trade[], question: string): Promise<string> {
  if (!trades.length) return 'No trades selected.';
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades, question })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.answer) return data.answer;
    } else {
      // Try to get error details
      const err = await res.json().catch(() => ({}));
      if (err && err.error) return `AI error: ${err.error}`;
    }
  } catch (e) {
    // Fallback to in-app logic below
  }
  // --- Fallback to previous logic if API fails ---
  const q = question.toLowerCase();
  if (q.includes('fomo')) {
    const fomoTrades = trades.filter(t => (t.tags || []).includes('fomo') || (t.notes || '').toLowerCase().includes('fomo'));
    if (!fomoTrades.length) return 'No FOMO trades found in your selection.';
    const winRate = (fomoTrades.filter(t => t.profit_loss > 0).length / fomoTrades.length) * 100;
    const avgPnL = fomoTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / fomoTrades.length;
    return `You have ${fomoTrades.length} FOMO trades. Win rate: ${winRate.toFixed(1)}%. Avg P&L: ${avgPnL.toFixed(2)}.`;
  }
  if (q.includes('win rate')) {
    const winRate = (trades.filter(t => t.profit_loss > 0).length / trades.length) * 100;
    return `Your win rate for these trades is ${winRate.toFixed(1)}%.`;
  }
  if (q.includes('p&l') || q.includes('profit') || q.includes('loss')) {
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    return `Total P&L for these trades: ${totalPnL.toFixed(2)}.`;
  }
  if (q.includes('tag') || q.includes('setup') || q.includes('strategy')) {
    const tagCounts: Record<string, number> = {};
    trades.forEach(t => (t.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
    const tagList = Object.entries(tagCounts).map(([tag, count]) => `${tag}: ${count}`).join(', ');
    return tagList ? `Tag usage: ${tagList}` : 'No tags found in your selected trades.';
  }
  if (q.includes('emotion') || q.includes('feel') || q.includes('mindset')) {
    const emotionStats: Record<string, number> = {};
    trades.forEach(t => {
      (t.tags || []).forEach(tag => { emotionStats[tag] = (emotionStats[tag] || 0) + 1; });
      const notes = (t.notes || '').toLowerCase();
      ['fear', 'fomo', 'calm', 'angry', 'confident', 'anxious', 'plan'].forEach(emotion => {
        if (notes.includes(emotion)) {
          emotionStats[emotion] = (emotionStats[emotion] || 0) + 1;
        }
      });
    });
    const emotionList = Object.entries(emotionStats).map(([e, c]) => `${e}: ${c}`).join(', ');
    return emotionList ? `Emotion frequency: ${emotionList}` : 'No emotions detected in your selected trades.';
  }
  if (q.includes('summary') || q.includes('summarize')) {
    const winRate = (trades.filter(t => t.profit_loss > 0).length / trades.length) * 100;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const tagCounts: Record<string, number> = {};
    trades.forEach(t => (t.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
    const tagList = Object.entries(tagCounts).map(([tag, count]) => `${tag}: ${count}`).join(', ');
    return `Summary: ${trades.length} trades. Win rate: ${winRate.toFixed(1)}%. Total P&L: ${totalPnL.toFixed(2)}. Tags: ${tagList || 'none'}`;
  }
  const winRate = (trades.filter(t => t.profit_loss > 0).length / trades.length) * 100;
  const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  return `You selected ${trades.length} trades. Win rate: ${winRate.toFixed(1)}%. Total P&L: ${totalPnL.toFixed(2)}.`;
} 

export interface TradingViewAnalysisResult {
  symbol?: string;
  timeframe?: string;
  patterns?: { name: string; confidence: number }[];
  tag?: string;
  suggestedTags?: string[];
  [key: string]: any;
}

export interface TrainingStatistics {
  totalCorrections: number;
  averageImprovement: number;
  fieldsImproved: {
    entryPrice: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    patterns: number;
  };
}

export async function storeUserCorrection(field: string, analysisValue: any, userValue: any): Promise<void> {
  console.log('storeUserCorrection', field, analysisValue, userValue);
}

export async function getTrainingStatistics(): Promise<TrainingStatistics> {
  return {
    totalCorrections: 0,
    averageImprovement: 0.85,
    fieldsImproved: {
      entryPrice: 0,
      takeProfitPrice: 0,
      stopLossPrice: 0,
      patterns: 0
    }
  };
}

export async function analyzeTradingScreenshot(file: File): Promise<TradingViewAnalysisResult> {
  return {
    symbol: "MOCK",
    timeframe: "1H",
    patterns: [{ name: "Bull Flag", confidence: 0.9 }],
    tag: "Breakout",
    suggestedTags: ["Trend Following"],
  };
}
