import { Trade } from './types';
import { useMemo } from 'react';

/**
 * Interface for comprehensive trade performance metrics
 */
export interface PerformanceMetrics {
  // Basic metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  profitFactor: number;

  // P&L metrics
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  riskRewardRatio: number;

  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // in days
  currentDrawdown: number;
  
  // Risk-adjusted metrics
  sharpeRatio: number;
  sortinoRatio: number;
  expectedValue: number;
}

/**
 * Interface for time-based performance data
 */
export interface TimeSeriesPerformance {
  date: string;
  cumulativePnL: number;
  dailyPnL: number;
  drawdown: number;
  drawdownPercent: number;
  equity: number;
}

/**
 * Interface for monthly performance data
 */
export interface MonthlyPerformance {
  month: string;
  year: number;
  trades: number;
  winRate: number;
  pnL: number;
  avgDailyPnL: number;
}

/**
 * Interface for trade distribution data
 */
export interface TradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

/**
 * Interface for strategy performance data
 */
export interface StrategyPerformance {
  strategy: string;
  trades: number;
  winRate: number;
  pnL: number;
  averageReturn: number;
  sharpeRatio: number;
}

/**
 * Interface for symbol performance data
 */
export interface SymbolPerformance {
  symbol: string;
  trades: number;
  winRate: number;
  pnL: number;
  averageReturn: number;
  profitFactor: number;
}

/**
 * Interface for trade type performance data (Long/Short)
 */
export interface TradeTypePerformance {
  type: 'Long' | 'Short';
  trades: number;
  winRate: number;
  pnL: number;
  averageReturn: number;
  profitFactor: number;
}

/**
 * Interface for time of day performance data
 */
export interface TimeOfDayPerformance {
  timeSlot: string;
  trades: number;
  winRate: number;
  pnL: number;
  averageReturn: number;
  profitFactor: number;
}

/**
 * Interface for performance heatmap data
 */
export interface HeatmapData {
  day: string;
  hour: string;
  trades: number;
  winRate: number;
  pnL: number;
}

/**
 * Calculate win rate as the percentage of winning trades
 * 
 * @param trades Array of trade objects
 * @returns Win rate as a percentage (0-100)
 */
export function calculateWinRate(trades: Trade[]): number {
  if (!trades.length) return 0;
  
  const winningTrades = trades.filter(trade => trade.profit_loss > 0).length;
  return (winningTrades / trades.length) * 100;
}

/**
 * Calculate profit factor: gross profit divided by gross loss
 * A profit factor > 1 indicates a profitable system
 * 
 * @param trades Array of trade objects
 * @returns Profit factor (gross profit / gross loss)
 */
export function calculateProfitFactor(trades: Trade[]): number {
  if (!trades.length) return 0;
  
  const profits = trades.filter(trade => trade.profit_loss > 0)
    .reduce((sum, trade) => sum + trade.profit_loss, 0);
  
  const losses = trades.filter(trade => trade.profit_loss < 0)
    .reduce((sum, trade) => sum + Math.abs(trade.profit_loss), 0);
  
  // Avoid division by zero
  return losses === 0 ? (profits > 0 ? Infinity : 0) : profits / losses;
}

/**
 * Calculate average win amount from winning trades
 * 
 * @param trades Array of trade objects
 * @returns Average win amount
 */
export function calculateAverageWin(trades: Trade[]): number {
  const winningTrades = trades.filter(trade => trade.profit_loss > 0);
  if (!winningTrades.length) return 0;
  
  const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  return totalProfit / winningTrades.length;
}

/**
 * Calculate average loss amount from losing trades
 * 
 * @param trades Array of trade objects
 * @returns Average loss amount (as a positive number)
 */
export function calculateAverageLoss(trades: Trade[]): number {
  const losingTrades = trades.filter(trade => trade.profit_loss < 0);
  if (!losingTrades.length) return 0;
  
  const totalLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.profit_loss), 0);
  return totalLoss / losingTrades.length;
}

/**
 * Calculate risk-reward ratio: average win divided by average loss
 * Higher values indicate better trade efficiency
 * 
 * @param trades Array of trade objects
 * @returns Risk-reward ratio
 */
export function calculateRiskRewardRatio(trades: Trade[]): number {
  const avgWin = calculateAverageWin(trades);
  const avgLoss = calculateAverageLoss(trades);
  
  // Avoid division by zero
  return avgLoss === 0 ? (avgWin > 0 ? Infinity : 0) : avgWin / avgLoss;
}

/**
 * Calculate the maximum drawdown amount and percentage
 * Drawdown measures the peak-to-trough decline in account value
 * 
 * @param trades Array of trade objects sorted by date
 * @returns Object containing drawdown amount and percentage
 */
export function calculateMaxDrawdown(trades: Trade[]): { amount: number; percentage: number } {
  if (!trades.length) return { amount: 0, percentage: 0 };
  
  // Sort trades by date if not already sorted
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
  );
  
  let cumulativePnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let initialCapital = 10000; // Assuming $10,000 starting capital
  
  sortedTrades.forEach(trade => {
    cumulativePnL += trade.profit_loss;
    const equity = initialCapital + cumulativePnL;
    
    if (cumulativePnL > peak) {
      peak = cumulativePnL;
    }
    
    const drawdown = peak - cumulativePnL;
    const peakEquity = initialCapital + peak;
    const drawdownPercent = drawdown / peakEquity * 100;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  });
  
  return { amount: maxDrawdown, percentage: maxDrawdownPercent };
}

/**
 * Calculate Sharpe Ratio - a measure of risk-adjusted returns
 * Higher values indicate better risk-adjusted performance
 * 
 * @param trades Array of trade objects sorted by date
 * @param riskFreeRate Annual risk-free rate (e.g., 0.02 for 2%)
 * @returns Sharpe ratio
 */
export function calculateSharpeRatio(trades: Trade[], riskFreeRate: number = 0.02): number {
  if (trades.length < 2) return 0;
  
  // Group trades by day to get daily returns
  const dailyReturns = groupTradesByDay(trades);
  
  // Calculate average daily return
  const avgDailyReturn = dailyReturns.reduce((sum, day) => sum + day.pnL, 0) / dailyReturns.length;
  
  // Daily risk-free rate (approximate)
  const dailyRiskFreeRate = riskFreeRate / 252; // Approx 252 trading days in a year
  
  // Calculate standard deviation of daily returns
  const variance = dailyReturns.reduce((sum, day) => {
    const diff = day.pnL - avgDailyReturn;
    return sum + (diff * diff);
  }, 0) / (dailyReturns.length - 1);
  
  const stdDev = Math.sqrt(variance);
  
  // Avoid division by zero
  if (stdDev === 0) return 0;
  
  // Daily Sharpe ratio
  const dailySharpe = (avgDailyReturn - dailyRiskFreeRate) / stdDev;
  
  // Annualized Sharpe ratio (multiply by sqrt of trading days)
  return dailySharpe * Math.sqrt(252);
}

/**
 * Calculate Sortino Ratio - similar to Sharpe but only considers downside risk
 * 
 * @param trades Array of trade objects sorted by date
 * @param riskFreeRate Annual risk-free rate (e.g., 0.02 for 2%)
 * @returns Sortino ratio
 */
export function calculateSortinoRatio(trades: Trade[], riskFreeRate: number = 0.02): number {
  if (trades.length < 2) return 0;
  
  // Group trades by day to get daily returns
  const dailyReturns = groupTradesByDay(trades);
  
  // Calculate average daily return
  const avgDailyReturn = dailyReturns.reduce((sum, day) => sum + day.pnL, 0) / dailyReturns.length;
  
  // Daily risk-free rate (approximate)
  const dailyRiskFreeRate = riskFreeRate / 252; // Approx 252 trading days in a year
  
  // Calculate downside deviation (only negative returns)
  const negativeReturns = dailyReturns.filter(day => day.pnL < 0);
  
  if (negativeReturns.length === 0) return Infinity; // No negative returns
  
  const downsideVariance = negativeReturns.reduce((sum, day) => {
    const diff = day.pnL - 0; // Target return is 0 for downside risk
    return sum + (diff * diff);
  }, 0) / negativeReturns.length;
  
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  // Avoid division by zero
  if (downsideDeviation === 0) return 0;
  
  // Daily Sortino ratio
  const dailySortino = (avgDailyReturn - dailyRiskFreeRate) / downsideDeviation;
  
  // Annualized Sortino ratio
  return dailySortino * Math.sqrt(252);
}

/**
 * Helper function to group trades by day
 * 
 * @param trades Array of trade objects sorted by date
 * @returns Array of daily P&L objects
 */
function groupTradesByDay(trades: Trade[]): { date: string; pnL: number }[] {
  const dailyPnL: Record<string, number> = {};
  
  trades.forEach(trade => {
    const date = new Date(trade.entry_time).toISOString().split('T')[0];
    dailyPnL[date] = (dailyPnL[date] || 0) + trade.profit_loss;
  });
  
  return Object.entries(dailyPnL).map(([date, pnL]) => ({
    date,
    pnL
  }));
}

/**
 * Calculate expected value of a trading system
 * EV = (Win Rate × Average Win) - ((1 - Win Rate) × Average Loss)
 * 
 * @param trades Array of trade objects
 * @returns Expected value per trade
 */
export function calculateExpectedValue(trades: Trade[]): number {
  if (!trades.length) return 0;
  
  const winRateDecimal = calculateWinRate(trades) / 100;
  const avgWin = calculateAverageWin(trades);
  const avgLoss = calculateAverageLoss(trades);
  
  return (winRateDecimal * avgWin) - ((1 - winRateDecimal) * avgLoss);
}

/**
 * Generate equity curve data points for charting
 * 
 * @param trades Array of trade objects sorted by date
 * @param initialCapital Starting capital amount
 * @returns Array of equity curve data points
 */
export function generateEquityCurveData(
  trades: Trade[],
  initialCapital: number = 10000
): TimeSeriesPerformance[] {
  if (!trades.length) return [];
  
  // Sort trades by date if not already sorted
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
  );
  
  let cumulativePnL = 0;
  let peak = 0;
  let equity = initialCapital;
  
  const equityCurve: TimeSeriesPerformance[] = [];
  const tradeDateMap: Record<string, number> = {};
  
  // Group trades by date
  sortedTrades.forEach(trade => {
    const date = new Date(trade.entry_time).toISOString().split('T')[0];
    tradeDateMap[date] = (tradeDateMap[date] || 0) + trade.profit_loss;
  });
  
  // Fill in all dates in the range
  const startDate = new Date(sortedTrades[0].entry_time);
  const endDate = new Date(sortedTrades[sortedTrades.length - 1].entry_time);
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    const dailyPnL = tradeDateMap[dateString] || 0;
    
    cumulativePnL += dailyPnL;
    equity = initialCapital + cumulativePnL;
    
    if (cumulativePnL > peak) {
      peak = cumulativePnL;
    }
    
    const drawdown = peak - cumulativePnL;
    const peakEquity = initialCapital + peak;
    const drawdownPercent = (peakEquity > 0) ? (drawdown / peakEquity * 100) : 0;
    
    equityCurve.push({
      date: dateString,
      cumulativePnL,
      dailyPnL,
      drawdown,
      drawdownPercent,
      equity
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return equityCurve;
}

/**
 * Generate monthly performance data
 * 
 * @param trades Array of trade objects
 * @returns Array of monthly performance data
 */
export function generateMonthlyPerformanceData(trades: Trade[]): MonthlyPerformance[] {
  if (!trades.length) return [];
  
  const monthlyData: Record<string, {
    trades: Trade[];
    daysTraded: Set<string>;
  }> = {};
  
  // Group trades by month
  trades.forEach(trade => {
    const date = new Date(trade.entry_time);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const day = date.toISOString().split('T')[0];
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        trades: [],
        daysTraded: new Set()
      };
    }
    
    monthlyData[monthYear].trades.push(trade);
    monthlyData[monthYear].daysTraded.add(day);
  });
  
  // Convert to array with calculated metrics
  return Object.entries(monthlyData).map(([monthYear, data]) => {
    const [year, monthNum] = monthYear.split('-').map(Number);
    const date = new Date(year, monthNum - 1, 1);
    const month = date.toLocaleString('default', { month: 'short' });
    
    const pnL = data.trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const winRate = calculateWinRate(data.trades);
    const tradingDays = data.daysTraded.size;
    const avgDailyPnL = tradingDays > 0 ? pnL / tradingDays : 0;
    
    return {
      month: `${month} ${year}`,
      year,
      trades: data.trades.length,
      winRate,
      pnL,
      avgDailyPnL
    };
  }).sort((a, b) => {
    // Sort by year and month
    if (a.year !== b.year) return a.year - b.year;
    return new Date(a.month).getMonth() - new Date(b.month).getMonth();
  });
}

/**
 * Generate P&L distribution data for histogram visualization
 * 
 * @param trades Array of trade objects
 * @param bins Number of bins to use for the histogram
 * @returns Array of P&L distribution data
 */
export function generatePnLDistributionData(trades: Trade[], bins: number = 10): TradeDistribution[] {
  if (!trades.length) return [];
  
  // Find min and max P&L
  const pnLValues = trades.map(trade => trade.profit_loss);
  const minPnL = Math.min(...pnLValues);
  const maxPnL = Math.max(...pnLValues);
  
  // Ensure min and max are different to avoid division by zero
  if (minPnL === maxPnL) {
    return [{
      range: `${minPnL}`,
      count: trades.length,
      percentage: 100
    }];
  }
  
  // Calculate bin size
  const binSize = (maxPnL - minPnL) / bins;
  
  // Initialize bins
  const distribution: { [key: string]: number } = {};
  
  for (let i = 0; i < bins; i++) {
    const binStart = minPnL + (i * binSize);
    const binEnd = binStart + binSize;
    distribution[`${binStart.toFixed(2)} to ${binEnd.toFixed(2)}`] = 0;
  }
  
  // Count trades in each bin
  trades.forEach(trade => {
    const { profit_loss } = trade;
    
    // Edge case: if profit_loss is exactly maxPnL, put it in the last bin
    if (profit_loss === maxPnL) {
      const lastBinKey = Object.keys(distribution)[bins - 1];
      distribution[lastBinKey]++;
      return;
    }
    
    // Find appropriate bin
    const binIndex = Math.floor((profit_loss - minPnL) / binSize);
    const binStart = minPnL + (binIndex * binSize);
    const binEnd = binStart + binSize;
    distribution[`${binStart.toFixed(2)} to ${binEnd.toFixed(2)}`]++;
  });
  
  // Convert to array with percentages
  return Object.entries(distribution).map(([range, count]) => ({
    range,
    count,
    percentage: (count / trades.length) * 100
  }));
}

/**
 * Calculate comprehensive performance metrics
 * 
 * @param trades Array of trade objects
 * @param initialCapital Starting capital amount
 * @returns Comprehensive performance metrics
 */
export function calculatePerformanceMetrics(
  trades: Trade[],
  initialCapital: number = 10000
): PerformanceMetrics {
  if (!trades.length) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalPnL: 0,
      grossProfit: 0,
      grossLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      riskRewardRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      maxDrawdownDuration: 0,
      currentDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      expectedValue: 0
    };
  }
  
  // Basic metrics
  const winningTrades = trades.filter(trade => trade.profit_loss > 0);
  const losingTrades = trades.filter(trade => trade.profit_loss < 0);
  const breakEvenTrades = trades.filter(trade => trade.profit_loss === 0);
  
  const winRate = calculateWinRate(trades);
  const profitFactor = calculateProfitFactor(trades);
  
  // P&L metrics
  const totalPnL = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const grossLoss = losingTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  
  const averageWin = calculateAverageWin(trades);
  const averageLoss = calculateAverageLoss(trades);
  
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(trade => trade.profit_loss))
    : 0;
    
  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(trade => trade.profit_loss))
    : 0;
    
  const riskRewardRatio = calculateRiskRewardRatio(trades);
  
  // Drawdown metrics
  const drawdown = calculateMaxDrawdown(trades);
  
  // Calculate drawdown duration (simplified)
  const maxDrawdownDuration = 0; // Requires more complex calculation
  const currentDrawdown = 0; // Requires current market data
  
  // Risk-adjusted metrics
  const sharpeRatio = calculateSharpeRatio(trades);
  const sortinoRatio = calculateSortinoRatio(trades);
  const expectedValue = calculateExpectedValue(trades);
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate,
    profitFactor,
    totalPnL,
    grossProfit,
    grossLoss,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    riskRewardRatio,
    maxDrawdown: drawdown.amount,
    maxDrawdownPercent: drawdown.percentage,
    maxDrawdownDuration,
    currentDrawdown,
    sharpeRatio,
    sortinoRatio,
    expectedValue
  };
}

/**
 * Generate strategy performance comparison data
 * 
 * @param trades Array of trade objects
 * @returns Array of strategy performance data
 */
export function generateStrategyPerformanceData(trades: Trade[]): StrategyPerformance[] {
  if (!trades.length) return [];
  
  const strategyMap: Record<string, Trade[]> = {};
  
  // Group trades by strategy
  trades.forEach(trade => {
    const strategy = trade.strategy || 'Unknown';
    
    if (!strategyMap[strategy]) {
      strategyMap[strategy] = [];
    }
    
    strategyMap[strategy].push(trade);
  });
  
  // Calculate metrics for each strategy
  return Object.entries(strategyMap).map(([strategy, strategyTrades]) => {
    const winRate = calculateWinRate(strategyTrades);
    const pnL = strategyTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const averageReturn = pnL / strategyTrades.length;
    const sharpeRatio = calculateSharpeRatio(strategyTrades);
    
    return {
      strategy,
      trades: strategyTrades.length,
      winRate,
      pnL,
      averageReturn,
      sharpeRatio
    };
  }).sort((a, b) => b.pnL - a.pnL); // Sort by P&L (highest first)
}

/**
 * Generate performance breakdown by symbol
 * 
 * @param trades Array of trade objects
 * @returns Array of symbol performance data
 */
export function generateSymbolPerformanceData(trades: Trade[]): SymbolPerformance[] {
  if (!trades.length) return [];
  
  const symbolMap: Record<string, Trade[]> = {};
  
  // Group trades by symbol
  trades.forEach(trade => {
    const symbol = trade.symbol;
    
    if (!symbolMap[symbol]) {
      symbolMap[symbol] = [];
    }
    
    symbolMap[symbol].push(trade);
  });
  
  // Calculate metrics for each symbol
  return Object.entries(symbolMap).map(([symbol, symbolTrades]) => {
    const winRate = calculateWinRate(symbolTrades);
    const pnL = symbolTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const averageReturn = pnL / symbolTrades.length;
    const profitFactor = calculateProfitFactor(symbolTrades);
    
    return {
      symbol,
      trades: symbolTrades.length,
      winRate,
      pnL,
      averageReturn,
      profitFactor
    };
  }).sort((a, b) => b.pnL - a.pnL); // Sort by P&L (highest first)
}

/**
 * Generate performance breakdown by trade type (Long/Short)
 * 
 * @param trades Array of trade objects
 * @returns Array of trade type performance data
 */
export function generateTradeTypePerformanceData(trades: Trade[]): TradeTypePerformance[] {
  if (!trades.length) return [];
  
  const typeMap: Record<string, Trade[]> = {
    'Long': [],
    'Short': []
  };
  
  // Group trades by type
  trades.forEach(trade => {
    typeMap[trade.type].push(trade);
  });
  
  // Calculate metrics for each type
  return Object.entries(typeMap).map(([type, typeTrades]) => {
    if (!typeTrades.length) {
      return {
        type: type as 'Long' | 'Short',
        trades: 0,
        winRate: 0,
        pnL: 0,
        averageReturn: 0,
        profitFactor: 0
      };
    }
    
    const winRate = calculateWinRate(typeTrades);
    const pnL = typeTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const averageReturn = pnL / typeTrades.length;
    const profitFactor = calculateProfitFactor(typeTrades);
    
    return {
      type: type as 'Long' | 'Short',
      trades: typeTrades.length,
      winRate,
      pnL,
      averageReturn,
      profitFactor
    };
  }).sort((a, b) => b.pnL - a.pnL); // Sort by P&L (highest first)
}

/**
 * Generate performance breakdown by time of day
 * 
 * @param trades Array of trade objects
 * @returns Array of time of day performance data
 */
export function generateTimeOfDayPerformanceData(trades: Trade[]): TimeOfDayPerformance[] {
  if (!trades.length) return [];
  
  // Define time slots (4-hour blocks)
  const timeSlots = [
    { name: 'Pre-Market (4am-9:30am)', start: 4, end: 9.5 },
    { name: 'Morning (9:30am-12pm)', start: 9.5, end: 12 },
    { name: 'Afternoon (12pm-4pm)', start: 12, end: 16 },
    { name: 'Evening (4pm-8pm)', start: 16, end: 20 },
    { name: 'Night (8pm-4am)', start: 20, end: 28 } // 28 means 4am next day
  ];
  
  const timeSlotMap: Record<string, Trade[]> = {};
  timeSlots.forEach(slot => {
    timeSlotMap[slot.name] = [];
  });
  
  // Group trades by time slot
  trades.forEach(trade => {
    const entryDate = new Date(trade.entry_time);
    const hour = entryDate.getHours() + (entryDate.getMinutes() / 60); // Convert to decimal hours
    
    // Find the appropriate time slot
    const slot = timeSlots.find(slot => {
      if (slot.start < slot.end) {
        return hour >= slot.start && hour < slot.end;
      } else {
        // Handle overnight slot (e.g., 8pm-4am)
        return hour >= slot.start || hour < (slot.end % 24);
      }
    });
    
    if (slot) {
      timeSlotMap[slot.name].push(trade);
    }
  });
  
  // Calculate metrics for each time slot
  return Object.entries(timeSlotMap).map(([timeSlot, timeSlotTrades]) => {
    if (!timeSlotTrades.length) {
      return {
        timeSlot,
        trades: 0,
        winRate: 0,
        pnL: 0,
        averageReturn: 0,
        profitFactor: 0
      };
    }
    
    const winRate = calculateWinRate(timeSlotTrades);
    const pnL = timeSlotTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const averageReturn = pnL / timeSlotTrades.length;
    const profitFactor = calculateProfitFactor(timeSlotTrades);
    
    return {
      timeSlot,
      trades: timeSlotTrades.length,
      winRate,
      pnL,
      averageReturn,
      profitFactor
    };
  }).filter(item => item.trades > 0)
    .sort((a, b) => b.pnL - a.pnL); // Sort by P&L (highest first)
}

/**
 * Generate trading performance heatmap data (day of week vs hour of day)
 * 
 * @param trades Array of trade objects
 * @returns Array of heatmap data
 */
export function generatePerformanceHeatmapData(trades: Trade[]): HeatmapData[] {
  if (!trades.length) return [];
  
  // Define days and hours
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 24 }, (_, i) => 
    `${i % 12 === 0 ? 12 : i % 12}${i < 12 ? 'am' : 'pm'}`
  );
  
  // Initialize the grid with empty data
  const grid: Record<string, Record<string, Trade[]>> = {};
  
  days.forEach(day => {
    grid[day] = {};
    hours.forEach(hour => {
      grid[day][hour] = [];
    });
  });
  
  // Group trades by day and hour
  trades.forEach(trade => {
    const entryDate = new Date(trade.entry_time);
    const day = days[entryDate.getDay() === 0 ? 6 : entryDate.getDay() - 1]; // Adjust to start with Monday
    const hour = hours[entryDate.getHours()];
    
    if (grid[day] && grid[day][hour]) {
      grid[day][hour].push(trade);
    }
  });
  
  // Calculate metrics for each cell
  const heatmapData: HeatmapData[] = [];
  
  days.forEach(day => {
    hours.forEach(hour => {
      const cellTrades = grid[day][hour];
      
      if (cellTrades.length > 0) {
        const winRate = calculateWinRate(cellTrades);
        const pnL = cellTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
        
        heatmapData.push({
          day,
          hour,
          trades: cellTrades.length,
          winRate,
          pnL
        });
      } else {
        // Include empty cells with zero values
        heatmapData.push({
          day,
          hour,
          trades: 0,
          winRate: 0,
          pnL: 0
        });
      }
    });
  });
  
  return heatmapData;
}

export const calculateTradeMetrics = (trades: Trade[]): PerformanceMetrics => {
  if (!trades?.length) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      totalProfit: 0,
      maxDrawdown: 0
    };
  }

  try {
    const profits = trades.map(trade => {
      const profit = (trade.exit_price - trade.entry_price) * trade.quantity;
      return trade.direction === 'long' ? profit : -profit;
    });

    const winningTrades = profits.filter(p => p > 0);
    const losingTrades = profits.filter(p => p < 0);

    const totalProfit = profits.reduce((sum, p) => sum + p, 0);
    const totalWins = winningTrades.reduce((sum, p) => sum + p, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, p) => sum + p, 0));

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let currentValue = 0;

    profits.forEach(profit => {
      currentValue += profit;
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = peak - currentValue;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winningTrades.length / trades.length,
      averageWin: winningTrades.length ? totalWins / winningTrades.length : 0,
      averageLoss: losingTrades.length ? totalLosses / losingTrades.length : 0,
      profitFactor: totalLosses ? totalWins / totalLosses : 0,
      totalProfit,
      maxDrawdown
    };
  } catch (error) {
    console.error('Error calculating trade metrics:', error);
    throw new Error('Failed to calculate trade metrics');
  }
};

export const useTradeMetrics = (trades: Trade[]): PerformanceMetrics => {
  return useMemo(() => calculateTradeMetrics(trades), [trades]);
}; 