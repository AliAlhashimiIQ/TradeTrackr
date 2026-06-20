/**
 * Utility functions for Forex trading metrics
 */

/**
 * Checks if a symbol is likely a Forex pair
 */
export const isForexPair = (symbol: string): boolean => {
  const forexRegex = /^[A-Z]{3}\/[A-Z]{3}$|^[A-Z]{6}$/;
  return forexRegex.test(symbol.toUpperCase());
};

/**
 * Checks if a symbol is a JPY pair
 */
export const isJpyPair = (symbol: string): boolean => {
  return symbol.toUpperCase().includes('JPY');
};

/**
 * Calculates pips for a trade
 */
export const calculatePips = (
  entryPrice: number,
  exitPrice: number,
  type: 'Long' | 'Short',
  symbol: string
): number => {
  if (!entryPrice || !exitPrice) return 0;
  
  const diff = type === 'Long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  
  if (isJpyPair(symbol)) {
    // JPY pairs: 1 pip = 0.01
    return Number((diff * 100).toFixed(1));
  } else {
    // Standard pairs: 1 pip = 0.0001
    return Number((diff * 10000).toFixed(1));
  }
};

/**
 * Formats a lot size for display
 */
export const formatLots = (lots?: number): string => {
  if (lots === undefined || lots === null) return '0.00';
  return lots.toFixed(2);
};

/**
 * Formats pips for display
 */
export const formatPips = (pips?: number): string => {
  if (pips === undefined || pips === null) return '0.0';
  return `${pips > 0 ? '+' : ''}${pips.toFixed(1)}`;
};

/**
 * Gets the volume/lot multiplier for a given symbol
 */
export const getSymbolMultiplier = (symbol: string): number => {
  if (!symbol) return 100000;
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Gold
  if (cleanSymbol === 'XAUUSD' || cleanSymbol === 'GOLD') {
    return 100;
  }
  // Silver
  if (cleanSymbol === 'XAGUSD' || cleanSymbol === 'SILVER') {
    return 5000;
  }
  // Cryptos
  const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'DOGE', 'XRP', 'LTC', 'LINK', 'BNB', 'SHIB', 'AVAX', 'MATIC'];
  if (cryptos.some(crypto => cleanSymbol.startsWith(crypto))) {
    return 1;
  }
  // Indices / Futures
  const indices = ['US30', 'NAS100', 'NDX', 'SPX500', 'SPX', 'GER30', 'DE30', 'UK100', 'JPN225', 'HK50'];
  if (indices.some(index => cleanSymbol.includes(index))) {
    return 1;
  }
  
  // Standard Forex
  if (isForexPair(symbol)) {
    return 100000;
  }
  
  // Default for stocks / everything else
  return 1;
};

