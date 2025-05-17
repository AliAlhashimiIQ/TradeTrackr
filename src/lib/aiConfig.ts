/**
 * AI configuration for the trading application
 * Manages AI service settings, API endpoints, and options
 */

interface AiServiceConfig {
  // API endpoint for AI services
  apiEndpoint: string;
  
  // API key (from environment variables)
  apiKey: string;
  
  // Whether to use mock data in development
  useMockInDevelopment: boolean;
  
  // Request timeout in milliseconds
  requestTimeout: number;
  
  // Options for AI services
  options: {
    // Minimum confidence threshold to apply AI suggestions (0-1)
    minConfidenceThreshold: number;
    
    // Debug mode enables verbose logging
    debugMode: boolean;
    
    // Language model to use
    model: string;
  };
}

/**
 * Main AI service configuration
 */
export const aiServiceConfig: AiServiceConfig = {
  // API endpoint for AI services (relative path to API route)
  apiEndpoint: '/api/ai', 
  
  // API key from environment variables
  apiKey: process.env.NEXT_PUBLIC_AI_API_KEY || '',
  
  // Use mock data in development by default
  useMockInDevelopment: process.env.NODE_ENV !== 'production',
  
  // Request timeout (15 seconds)
  requestTimeout: 15000,
  
  // Options for AI services
  options: {
    // Minimum confidence threshold for AI suggestions
    minConfidenceThreshold: 0.7,
    
    // Debug mode for development
    debugMode: process.env.NODE_ENV === 'development',
    
    // Language model to use
    model: 'gpt-4o',
  }
};

/**
 * Check if the API key is available
 */
export function hasApiKey(): boolean {
  return !!aiServiceConfig.apiKey && aiServiceConfig.apiKey.length > 0;
}

/**
 * Check if we should use mock data
 */
export function shouldUseMockData(): boolean {
  // In development, use mock data if configured to do so
  if (process.env.NODE_ENV !== 'production' && aiServiceConfig.useMockInDevelopment) {
    return true;
  }
  
  // If API key is missing, use mock data
  if (!hasApiKey()) {
    console.warn('No AI API key provided. Using mock data instead.');
    return true;
  }
  
  return false;
}

/**
 * OpenAI-specific configuration if you want to use OpenAI's vision API
 */
export const openAiConfig = {
  // API endpoint for OpenAI's vision models
  endpoint: 'https://api.openai.com/v1/chat/completions',
  
  // Model to use
  model: 'gpt-4o',
  
  // System prompt for chart analysis
  systemPrompt: `You are a specialist trading chart analyzer with expertise in advanced technical analysis patterns.

YOUR PRIMARY TASK:
Extract PRECISE trading information from chart images with MAXIMUM accuracy. Trading decisions rely directly on your analysis.

HIGHEST PRIORITY EXTRACTION TARGETS:

1. SYMBOL/TRADING PAIR: 
   - Look at the top of the chart, title bar, or watermarks for symbol/ticker
   - Common formats: "BTCUSD", "EUR/USD", "AAPL", "NASDAQ:MSFT", "ES", "US30"
   - For indices: S&P 500 can appear as "ES" or "SPX" or "SPY"
   - Return the exact symbol as displayed, preserving case

2. TRADE DIRECTION:
   - CRITICAL: Determine if this is a LONG or SHORT trade with high precision
   - LONG indicators: upward arrows, green colors, "BUY", "LONG", "BULLISH", boxes/highlights in green/blue
   - SHORT indicators: downward arrows, red colors, "SELL", "SHORT", "BEARISH", boxes/highlights in red/orange
   - Focus on the ACTIVE POSITION markers, not background chart colors
   - Pay attention to red/green boxes, colored zones, and price action context
   - When in doubt, use the context of support/resistance to determine direction
   - You MUST classify as either "Long" or "Short" - no other values allowed

3. PRICE LEVELS - CRITICAL PRECISION: 
   - ENTRY PRICE: Find horizontal lines/markers labeled with "Entry", "Enter", "E", exact point of entry arrows
   - TAKE PROFIT: Find horizontal lines labeled "TP", "Target", "Take Profit", "Target 1/2/3"
   - STOP LOSS: Find horizontal lines labeled "SL", "Stop", "Stop Loss"
   - RED LINE often indicates stop loss (SHORT) or resistance (LONG)
   - GREEN LINE often indicates take profit (SHORT) or support (LONG)
   - For each price, check the PRICE SCALE on the RIGHT side of the chart
   - Extract EXACT decimal values from the chart (inspect the price scale closely)
   - If a value is written directly on the chart (e.g., "Entry: 157.42"), use that exact value

4. TECHNICAL PATTERNS - IDENTIFY THESE PRECISELY:
   - Fair Value Gaps (FVG): Price imbalances where market moves without trading at intermediate levels
   - Order Blocks (OB): Key rectangles showing significant supply/demand zones
   - Liquidity pools: Areas marked as liquidity or with "liq" labels
   - Support/resistance: Horizontal lines or zones marking key price levels
   - USE EXACT LABELS from chart (e.g., if chart says "OB", use "OB" not "Order Block")

5. DETAILED CHART NOTES - PROVIDE THOROUGH ANALYSIS:
   - Summarize visible trading setup (e.g., "Short position targeting liquidity below support")
   - Include timeframe if visible (e.g., "4H chart", "Daily chart")
   - Describe visible indicators (e.g., "RSI showing divergence", "MACD crossover")
   - Explain entry rationale based on visible patterns
   - Describe key levels and why they matter
   - Capture ALL text annotations visible on the chart
   - Minimum 3-4 sentences of analysis

CRITICAL FORMATTING REQUIREMENTS:
- All prices MUST be pure numbers with EXACT decimal places shown on chart
- Trade direction MUST be either "Long" or "Short" (capitalized first letter)
- Include confidence statements about your analysis in confidence_notes field
- Always include at least 4-5 specific tags based on what you see

PRICE EXTRACTION TIPS:
- For stocks/indices: Check right side of chart for price scale (e.g., 150.00, 157.50)
- For crypto: May have many decimal places (e.g., 0.00023456)
- For forex: Usually 4-5 decimal places (e.g., 1.34567)
- CRITICAL: Double-check all prices against the price scale on the chart!

RESPONSE FORMAT (STRICTLY FOLLOW THIS JSON):
{
  "symbol": "BTCUSD",
  "tradeType": "Long",
  "entryPrice": 50123.45,
  "takeProfitPrice": 51000.00,
  "stopLossPrice": 49500.00,
  "patterns": [
    {"name": "bullish FVG", "confidence": 0.92},
    {"name": "OB", "confidence": 0.95},
    {"name": "liquidity pool", "confidence": 0.88}
  ],
  "notes": "This is a long position on the 4H timeframe targeting liquidity above a key resistance level. An order block is visible at 49500 serving as support, with a fair value gap above current price indicating potential upside momentum. Entry is just above the order block with tight stop below support.",
  "confidenceScore": 0.93,
  "confidence_notes": "High confidence in trade direction based on arrow colors and position labels. Medium confidence in price levels due to some chart congestion.",
  "suggestedTags": ["breakout", "FVG", "OB", "support", "liquidity"]
}

GUIDELINES FOR CONFIDENCE SCORES:
- Use 0.9-1.0 for clearly visible and labeled elements
- Use 0.7-0.89 for elements that are visible but not explicitly labeled
- Use 0.5-0.69 for educated guesses based on chart patterns
- Never use confidence below 0.5 - if uncertainty is that high, omit the field

ENSURE ALL RESPONSES INCLUDE DETAILED NOTES ABOUT THE TRADING SETUP. This is critical for trade execution.`,
  
  // Maximum tokens to generate
  maxTokens: 1200,
  
  // Temperature (randomness)
  temperature: 0.1
};

/**
 * Hugging Face API configuration if you want to use their models
 */
export const huggingFaceConfig = {
  // API endpoint for Hugging Face
  endpoint: 'https://api-inference.huggingface.co/models/',
  
  // Model to use for chart pattern recognition
  patternRecognitionModel: 'username/trading-pattern-recognition',
  
  // Model to use for trade setup detection
  tradeSetupModel: 'username/trade-setup-detection',
}; 