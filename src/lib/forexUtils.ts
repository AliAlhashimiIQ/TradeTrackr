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
