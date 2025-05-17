import axios from 'axios';
import { RAPIDAPI_KEY } from './config';

interface MarketData {
  price: number;
  change: number;
  percentChange: number;
  currency: string;
  timestamp: number;
}

// Cache to store recent results and reduce API calls
const priceCache: Record<string, {data: MarketData, timestamp: number}> = {};
const CACHE_DURATION = 300000; // 5 minutes cache (increased from 1 minute)
const PENDING_REQUESTS: Record<string, Promise<MarketData> | null> = {}; // Track in-flight requests

/**
 * Fetch real-time stock market data from Finnhub API
 * With enhanced caching and request deduplication
 */
export const fetchMarketData = async (symbol: string): Promise<MarketData> => {
  // Normalize symbol to uppercase
  const normalizedSymbol = symbol.toUpperCase().trim();
  
  // Check cache first
  const cachedData = priceCache[normalizedSymbol];
  const now = Date.now();
  
  if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) {
    return cachedData.data; // Return cached data immediately without logging
  }
  
  // Check if there's already a pending request for this symbol
  const pendingRequest = PENDING_REQUESTS[normalizedSymbol];
  if (pendingRequest) {
    return pendingRequest; // Return the existing promise to avoid duplicate requests
  }
  
  // Create a new request promise
  const requestPromise = (async () => {
    try {
      if (!RAPIDAPI_KEY) {
        throw new Error('API key is missing in config.ts');
      }

      const options = {
        method: 'GET',
        url: 'https://finnhub.io/api/v1/quote',
        params: {
          symbol: normalizedSymbol,
          token: RAPIDAPI_KEY
        },
        timeout: 5000 // Add timeout to prevent long-hanging requests
      };
      
      const response = await axios(options);
      const quoteData = response.data;
      
      if (!quoteData || quoteData.c === undefined) {
        throw new Error(`No data available for symbol: ${normalizedSymbol}`);
      }
      
      // Map the response data to our interface (minimal processing)
      const marketData = {
        price: quoteData.c,
        change: quoteData.d,
        percentChange: quoteData.dp,
        currency: 'USD',
        timestamp: quoteData.t
      };
      
      // Store in cache
      priceCache[normalizedSymbol] = {
        data: marketData,
        timestamp: now
      };
      
      return marketData;
    } catch (error: any) {
      // Simplified error handling without excessive logging
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        if (error.response?.status === 404 || error.response?.status === 400) {
          throw new Error(`Symbol not found: ${normalizedSymbol}`);
        }
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed.');
        }

        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out. Please try again.');
        }
      }
      
      throw new Error(`Failed to fetch data: ${error.message}`);
    } finally {
      // Remove from pending requests when done (whether successful or failed)
      delete PENDING_REQUESTS[normalizedSymbol];
    }
  })();
  
  // Store the promise in pending requests
  PENDING_REQUESTS[normalizedSymbol] = requestPromise;
  
  return requestPromise;
};

/**
 * Format currency for display (memoized to avoid repeated formatting)
 */
const formattedValues: Record<string, string> = {};
export const formatCurrency = (value: number | null, currency: string = 'USD'): string => {
  if (value === null) return '-';
  
  // Use memoization for formatting to avoid repeated expensive operations
  const key = `${value}-${currency}`;
  if (formattedValues[key]) {
    return formattedValues[key];
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  
  formattedValues[key] = formatted;
  return formatted;
}; 