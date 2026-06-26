import { describe, it, expect } from 'vitest';
import {
  isForexPair,
  isJpyPair,
  getPipMultiplier,
  usesLots,
  calculatePips,
  getSymbolMultiplier,
} from '../lib/forexUtils';

describe('Forex Utility Sizing and Multipliers', () => {
  describe('isForexPair', () => {
    it('should correctly identify standard forex pairs', () => {
      expect(isForexPair('EURUSD')).toBe(true);
      expect(isForexPair('EUR/USD')).toBe(true);
      expect(isForexPair('GBPUSD')).toBe(true);
      expect(isForexPair('USDJPY')).toBe(true);
    });

    it('should identify non-forex instruments as false', () => {
      expect(isForexPair('US30')).toBe(false);
      expect(isForexPair('SPX500')).toBe(false);
    });
  });

  describe('isJpyPair', () => {
    it('should correctly identify JPY pairs', () => {
      expect(isJpyPair('USDJPY')).toBe(true);
      expect(isJpyPair('EURJPY')).toBe(true);
    });

    it('should identify non-JPY pairs as false', () => {
      expect(isJpyPair('EURUSD')).toBe(false);
    });
  });

  describe('getPipMultiplier', () => {
    it('should return 10 for Gold', () => {
      expect(getPipMultiplier('XAUUSD')).toBe(10);
      expect(getPipMultiplier('GOLD')).toBe(10);
    });

    it('should return 100 for Silver', () => {
      expect(getPipMultiplier('XAGUSD')).toBe(100);
      expect(getPipMultiplier('SILVER')).toBe(100);
    });

    it('should return 100 for JPY pairs', () => {
      expect(getPipMultiplier('USDJPY')).toBe(100);
    });

    it('should return 10000 for standard forex pairs', () => {
      expect(getPipMultiplier('EURUSD')).toBe(10000);
      expect(getPipMultiplier('GBPUSD')).toBe(10000);
    });

    it('should return 1 for indices and crypto', () => {
      expect(getPipMultiplier('BTCUSD')).toBe(1);
      expect(getPipMultiplier('US30')).toBe(1);
      expect(getPipMultiplier('NAS100')).toBe(1);
    });
  });

  describe('usesLots', () => {
    it('should return true for forex, gold, indices, and crypto', () => {
      expect(usesLots('EURUSD')).toBe(true);
      expect(usesLots('XAUUSD')).toBe(true);
      expect(usesLots('BTCUSD')).toBe(true);
      expect(usesLots('US30')).toBe(true);
    });

    it('should return false for others', () => {
      expect(usesLots('')).toBe(false);
    });
  });

  describe('calculatePips', () => {
    it('should calculate pips correctly for standard forex pairs', () => {
      // EURUSD long entry 1.1000 to exit 1.1050 is 50 pips
      expect(calculatePips(1.1000, 1.1050, 'Long', 'EURUSD')).toBe(50);
      // EURUSD short entry 1.1000 to exit 1.0950 is 50 pips
      expect(calculatePips(1.1000, 1.0950, 'Short', 'EURUSD')).toBe(50);
    });

    it('should calculate pips correctly for JPY pairs', () => {
      // USDJPY long entry 140.00 to exit 140.50 is 50 pips
      expect(calculatePips(140.00, 140.50, 'Long', 'USDJPY')).toBe(50);
    });

    it('should calculate pips correctly for Gold', () => {
      // XAUUSD long entry 1900.00 to exit 1910.00 is 100 pips (10 points)
      expect(calculatePips(1900.00, 1910.00, 'Long', 'XAUUSD')).toBe(100);
    });
  });

  describe('getSymbolMultiplier', () => {
    it('should return 100000 for standard forex pairs', () => {
      expect(getSymbolMultiplier('EURUSD')).toBe(100000);
      expect(getSymbolMultiplier('GBPUSD')).toBe(100000);
    });

    it('should return 100 for Gold', () => {
      expect(getSymbolMultiplier('XAUUSD')).toBe(100);
      expect(getSymbolMultiplier('GOLD')).toBe(100);
    });

    it('should return 5000 for Silver', () => {
      expect(getSymbolMultiplier('XAGUSD')).toBe(5000);
      expect(getSymbolMultiplier('SILVER')).toBe(5000);
    });

    it('should return 1 for crypto and indices', () => {
      expect(getSymbolMultiplier('BTCUSD')).toBe(1);
      expect(getSymbolMultiplier('US30')).toBe(1);
      expect(getSymbolMultiplier('NAS100')).toBe(1);
    });
  });
});
