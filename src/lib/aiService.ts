'use client'

import { Trade } from './types';
import { aiServiceConfig, openAiConfig, shouldUseMockData } from './aiConfig';
import { retry } from '../utils/retry';

// Types for AI Analysis
export interface ChartPatternDetection {
  name: string;
  confidence: number;
  boundingBox?: { x: number, y: number, width: number, height: number }; // Optional position in image
}

export interface TradingViewAnalysisResult {
  symbol?: string;
  tradeType?: 'Long' | 'Short';
  entryPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  patterns: ChartPatternDetection[];
  timestamp?: string;
  confidenceScore: number;
  confidenceNotes?: string;
  notes?: string;
  suggestedTags?: string[]; // Added suggestedTags field
  raw?: any; // Raw API response
}

// Add new types for user corrections and verified examples
export interface UserCorrection {
  originalAnalysis: TradingViewAnalysisResult;
  correctedAnalysis: TradingViewAnalysisResult;
  screenshotId: string;
  timestamp: string;
}

export interface VerifiedExample {
  id: string;
  analysis: TradingViewAnalysisResult;
  imageUrl: string;
  platformType: 'tradingview' | 'metatrader' | 'ninjatrader' | 'thinkorswim' | 'other';
  timestamp: string;
}

// Add a training statistics interface
export interface TrainingStatistics {
  totalCorrections: number;
  fieldsImproved: {
    symbol: number;
    tradeType: number;
    entryPrice: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    patterns: number;
    notes: number;
  };
  averageImprovement: number;
  lastUpdated: string;
}

// Add accuracy tracking to localStorage keys
const localStorageKeys = {
  CORRECTIONS: 'tradingapp_analysis_corrections',
  VERIFIED_EXAMPLES: 'tradingapp_verified_examples',
  PLATFORM_SETTINGS: 'tradingapp_platform_settings',
  TRAINING_STATISTICS: 'tradingapp_training_statistics'
};

// Function to detect chart platform type based on image features
function detectChartPlatform(imageData: string): string {
  // In a production app, this would use image recognition to detect platform
  // For demo purposes, implement some basic detection logic
  
  if (imageData.includes('tradingview') || imageData.includes('tv')) {
    return 'tradingview';
  }
  
  if (imageData.includes('mt4') || imageData.includes('mt5') || imageData.includes('metatrader')) {
    return 'metatrader';
  }
  
  if (imageData.includes('ninjatrader')) {
    return 'ninjatrader';
  }
  
  if (imageData.includes('tos') || imageData.includes('thinkorswim')) {
    return 'thinkorswim';
  }
  
  // Default to TradingView (most common)
  return 'tradingview';
}

// Function to enhance image before analysis
async function preprocessImage(file: File): Promise<File> {
  console.log('Preprocessing image for improved analysis accuracy...');
  
  // In a production application, this would use Canvas or other image processing
  // to enhance the image before analysis (contrast, clarity, etc.)
  try {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) {
          console.warn('Canvas 2D context not available, returning original image');
          resolve(file);
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Enhance contrast and brightness for better price text detection
        const contrast = 1.2; // Increase contrast by 20%
        const brightness = 10; // Slight brightness boost
        
        for (let i = 0; i < data.length; i += 4) {
          // Enhance contrast
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
          data[i+1] = Math.min(255, Math.max(0, (data[i+1] - 128) * contrast + 128 + brightness));
          data[i+2] = Math.min(255, Math.max(0, (data[i+2] - 128) * contrast + 128 + brightness));
          
          // Enhance text areas - darken dark pixels more
          if ((data[i] + data[i+1] + data[i+2]) / 3 < 100) {
            data[i] = data[i] * 0.8;
            data[i+1] = data[i+1] * 0.8;
            data[i+2] = data[i+2] * 0.8;
          }
        }
        
        // Put processed image data back on canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            console.warn('Failed to create blob from canvas, returning original image');
            resolve(file);
            return;
          }
          
          // Create new file from blob
          const processedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log('Image preprocessing complete');
          resolve(processedFile);
        }, 'image/jpeg', 0.95);
      };
      
      img.onerror = () => {
        console.warn('Error loading image for preprocessing, returning original');
        resolve(file);
      };
      
      // Load the image from the file
      img.src = URL.createObjectURL(file);
    });
  } catch (error) {
    console.error('Error during image preprocessing:', error);
    return file; // Return original file if preprocessing fails
  }
}

// Function to store user corrections
export function storeUserCorrection(originalAnalysis: TradingViewAnalysisResult, correctedAnalysis: TradingViewAnalysisResult, screenshotId: string): void {
  try {
    const correction: UserCorrection = {
      originalAnalysis,
      correctedAnalysis,
      screenshotId,
      timestamp: new Date().toISOString()
    };
    
    // Get existing corrections from storage
    const existingCorrectionsJson = localStorage.getItem(localStorageKeys.CORRECTIONS);
    const existingCorrections: UserCorrection[] = existingCorrectionsJson ? JSON.parse(existingCorrectionsJson) : [];
    
    // Add new correction
    existingCorrections.push(correction);
    
    // Store updated corrections (limit to 100 most recent)
    localStorage.setItem(localStorageKeys.CORRECTIONS, JSON.stringify(existingCorrections.slice(-100)));
    
    // Update training statistics
    updateTrainingStatistics(originalAnalysis, correctedAnalysis);
    
    console.log('User correction stored successfully', {
      screenshotId,
      original: originalAnalysis.tradeType,
      corrected: correctedAnalysis.tradeType
    });
  } catch (error) {
    console.error('Error storing user correction:', error);
  }
}

// Function to track training statistics over time
function updateTrainingStatistics(originalAnalysis: TradingViewAnalysisResult, correctedAnalysis: TradingViewAnalysisResult): void {
  try {
    // Get existing statistics
    const statsJson = localStorage.getItem(localStorageKeys.TRAINING_STATISTICS);
    const stats: TrainingStatistics = statsJson ? JSON.parse(statsJson) : {
      totalCorrections: 0,
      fieldsImproved: {
        symbol: 0,
        tradeType: 0,
        entryPrice: 0,
        takeProfitPrice: 0,
        stopLossPrice: 0,
        patterns: 0,
        notes: 0
      },
      averageImprovement: 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Increment total corrections
    stats.totalCorrections += 1;
    
    // Count which fields were improved
    let fieldsChanged = 0;
    
    if (originalAnalysis.symbol !== correctedAnalysis.symbol) {
      stats.fieldsImproved.symbol += 1;
      fieldsChanged += 1;
    }
    
    if (originalAnalysis.tradeType !== correctedAnalysis.tradeType) {
      stats.fieldsImproved.tradeType += 1;
      fieldsChanged += 1;
    }
    
    if (originalAnalysis.entryPrice !== correctedAnalysis.entryPrice) {
      stats.fieldsImproved.entryPrice += 1;
      fieldsChanged += 1;
    }
    
    if (originalAnalysis.takeProfitPrice !== correctedAnalysis.takeProfitPrice) {
      stats.fieldsImproved.takeProfitPrice += 1;
      fieldsChanged += 1;
    }
    
    if (originalAnalysis.stopLossPrice !== correctedAnalysis.stopLossPrice) {
      stats.fieldsImproved.stopLossPrice += 1;
      fieldsChanged += 1;
    }
    
    const patternsChanged = !arraysEqual(
      originalAnalysis.patterns?.map(p => p.name) || [],
      correctedAnalysis.patterns?.map(p => p.name) || []
    );
    
    if (patternsChanged) {
      stats.fieldsImproved.patterns += 1;
      fieldsChanged += 1;
    }
    
    if (originalAnalysis.notes !== correctedAnalysis.notes) {
      stats.fieldsImproved.notes += 1;
      fieldsChanged += 1;
    }
    
    // Update average improvement
    const previousTotal = stats.averageImprovement * (stats.totalCorrections - 1);
    const newAverage = (previousTotal + fieldsChanged) / stats.totalCorrections;
    stats.averageImprovement = newAverage;
    
    // Update timestamp
    stats.lastUpdated = new Date().toISOString();
    
    // Save updated statistics
    localStorage.setItem(localStorageKeys.TRAINING_STATISTICS, JSON.stringify(stats));
    
    console.log('Training statistics updated', stats);
  } catch (error) {
    console.error('Error updating training statistics:', error);
  }
}

// Utility function to check if arrays have the same elements
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  
  return true;
}

// Function to get training statistics
export function getTrainingStatistics(): TrainingStatistics | null {
  try {
    const statsJson = localStorage.getItem(localStorageKeys.TRAINING_STATISTICS);
    if (!statsJson) return null;
    
    return JSON.parse(statsJson);
  } catch (error) {
    console.error('Error retrieving training statistics:', error);
    return null;
  }
}

// Export corrections data for model retraining (in a real app, this would send to backend)
export function exportTrainingData(): { corrections: UserCorrection[], examples: VerifiedExample[] } {
  try {
    const correctionsJson = localStorage.getItem(localStorageKeys.CORRECTIONS);
    const examplesJson = localStorage.getItem(localStorageKeys.VERIFIED_EXAMPLES);
    
    const corrections: UserCorrection[] = correctionsJson ? JSON.parse(correctionsJson) : [];
    const examples: VerifiedExample[] = examplesJson ? JSON.parse(examplesJson) : [];
    
    return { corrections, examples };
  } catch (error) {
    console.error('Error exporting training data:', error);
    return { corrections: [], examples: [] };
  }
}

// Function to store verified examples
export function storeVerifiedExample(analysis: TradingViewAnalysisResult, imageUrl: string, platformType: string): string {
  try {
    const exampleId = `example_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    const example: VerifiedExample = {
      id: exampleId,
      analysis,
      imageUrl,
      platformType: platformType as any,
      timestamp: new Date().toISOString()
    };
    
    // Get existing examples from storage
    const existingExamplesJson = localStorage.getItem(localStorageKeys.VERIFIED_EXAMPLES);
    const existingExamples: VerifiedExample[] = existingExamplesJson ? JSON.parse(existingExamplesJson) : [];
    
    // Add new example
    existingExamples.push(example);
    
    // Store updated examples (limit to 50 most recent)
    localStorage.setItem(localStorageKeys.VERIFIED_EXAMPLES, JSON.stringify(existingExamples.slice(-50)));
    
    console.log('Verified example stored successfully', { exampleId });
    return exampleId;
  } catch (error) {
    console.error('Error storing verified example:', error);
    return '';
  }
}

// Function to get platform-specific extraction rules
function getPlatformExtractionRules(platformType: string): object {
  try {
    const platformSettingsJson = localStorage.getItem(localStorageKeys.PLATFORM_SETTINGS);
    const platformSettings = platformSettingsJson ? JSON.parse(platformSettingsJson) : {};
    
    return platformSettings[platformType] || {};
  } catch (error) {
    console.error('Error getting platform extraction rules:', error);
    return {};
  }
}

/**
 * Main function for analyzing trading screenshots using AI
 * Enhanced with preprocessing and platform detection
 * 
 * @param file The screenshot image file
 * @returns Analysis result with detected trade details and patterns
 */
export async function analyzeTradingScreenshot(file: File): Promise<TradingViewAnalysisResult> {
  try {
    // Check if we should use mock data based on config
    if (shouldUseMockData()) {
      console.log('Using mock data for AI analysis...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return generateMockAnalysisResult(file);
    }
    
    console.log('Using real OpenAI API for analysis with key:', 
                aiServiceConfig.apiKey ? `${aiServiceConfig.apiKey.substring(0, 5)}...` : 'No key provided');
    
    try {
      // Detect platform type
      const platformType = detectChartPlatform(file.name);
      console.log('Detected chart platform:', platformType);
      
      // Preprocess image for better analysis
      const enhancedFile = await preprocessImage(file);
      
      // Get platform-specific extraction rules
      const platformRules = getPlatformExtractionRules(platformType);
      
      // Try to use the real API with enhanced image
      const result = await analyzeWithOpenAI(enhancedFile, platformRules);
      
      // Store the result for learning purposes if it has high confidence
      if (result.confidenceScore > 0.85) {
        const imageUrl = URL.createObjectURL(file);
        storeVerifiedExample(result, imageUrl, platformType);
      }
      
      console.log('Analysis result:', JSON.stringify(result, null, 2));
      return result;
    } catch (apiError) {
      console.error('Error with real API, falling back to mock data:', apiError);
      // Fall back to mock data if the real API fails
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for UX
      return generateMockAnalysisResult(file);
    }
  } catch (error) {
    console.error('Error analyzing trading screenshot:', error);
    throw error;
  }
}

/**
 * Analyze chart image using OpenAI's vision model
 * Updated with platform-specific rules
 */
async function analyzeWithOpenAI(file: File, platformRules: object = {}): Promise<TradingViewAnalysisResult> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(file);
    
    // Create the API request payload with platform context if available
    const systemPrompt = platformRules && Object.keys(platformRules).length > 0
      ? `${openAiConfig.systemPrompt}\n\nPLATFORM-SPECIFIC RULES: ${JSON.stringify(platformRules)}`
      : openAiConfig.systemPrompt;
    
    const payload = {
      model: openAiConfig.model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this trading chart image with extremely high precision. Focus specifically on: 1) Exact symbol/ticker, 2) Whether this is a LONG or SHORT trade, 3) Precise entry price, 4) Take profit and stop loss levels, 5) Any technical patterns like Fair Value Gaps (FVG) or Order Blocks (OB). Return ALL numeric values as pure numbers with full decimal precision."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: openAiConfig.maxTokens,
      temperature: openAiConfig.temperature,
      response_format: { type: "json_object" }
    };
    
    console.log('Sending analysis request to OpenAI...');
    
    // Make the API request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), aiServiceConfig.requestTimeout);
    
    const response = await fetch(openAiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiServiceConfig.apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}: ${errorText}`);
      throw new Error(`Failed to analyze image: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("OpenAI API response received:", data);
    
    // Extract the JSON from the response
    const content = data.choices[0].message.content;
    let parsedResult;
    
    try {
      // With response_format: json_object, the content should be a valid JSON string
      parsedResult = JSON.parse(content);
      console.log("Parsed result:", parsedResult);
    } catch (e) {
      console.error('Error parsing JSON from OpenAI response:', e);
      console.log('Raw response:', content);
      throw new Error('Failed to parse AI analysis results');
    }
    
    // Normalize trade type to ensure it's either "Long" or "Short"
    let normalizedTradeType: 'Long' | 'Short' | undefined = undefined;
    if (parsedResult.tradeType) {
      const typeStr = String(parsedResult.tradeType).toLowerCase();
      if (typeStr.includes('long') || typeStr.includes('buy') || typeStr === 'bull' || typeStr === 'bullish') {
        normalizedTradeType = 'Long';
      } else if (typeStr.includes('short') || typeStr.includes('sell') || typeStr === 'bear' || typeStr === 'bearish') {
        normalizedTradeType = 'Short';
      }
      console.log(`Normalized trade type from "${parsedResult.tradeType}" to "${normalizedTradeType}"`);
    }
    
    // More robust price parsing
    const safeParseFloat = (value: any): number | undefined => {
      if (value === undefined || value === null) return undefined;
      
      // If it's already a number, return it
      if (typeof value === 'number') return value;
      
      // If it's a string, try to parse it
      if (typeof value === 'string') {
        // Remove any currency symbols, commas, and whitespace
        const cleaned = value.replace(/[\$,£€\s]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? undefined : parsed;
      }
      
      return undefined;
    };
    
    // Try multiple field name variations
    const getPrice = (obj: any, keys: string[]): number | undefined => {
      for (const key of keys) {
        const value = obj[key];
        if (value !== undefined) {
          const parsed = safeParseFloat(value);
          if (parsed !== undefined) {
            return parsed;
          }
        }
      }
      return undefined;
    };
    
    // Parse prices with multiple possible field names
    const entryPrice = getPrice(parsedResult, ['entryPrice', 'entry', 'entry_price', 'entrypoint', 'enterPrice']);
    const takeProfitPrice = getPrice(parsedResult, ['takeProfitPrice', 'takeProfit', 'take_profit', 'tp', 'target', 'targetPrice']);
    const stopLossPrice = getPrice(parsedResult, ['stopLossPrice', 'stopLoss', 'stop_loss', 'sl', 'stop']);
    
    console.log('Parsed prices:', { entryPrice, takeProfitPrice, stopLossPrice });
    
    // Extract and normalize symbol
    let symbol = parsedResult.symbol || parsedResult.tradingPair || parsedResult.ticker || parsedResult.asset;
    
    // Check if symbol might be in the filename as a fallback
    if (!symbol && file.name) {
      const symbolFromFilename = detectSymbolFromFilename(file.name);
      if (symbolFromFilename) {
        symbol = symbolFromFilename;
      }
    }
    
    // Clean up the symbol if needed
    if (symbol && typeof symbol === 'string') {
      // Remove any "Symbol:" prefix
      symbol = symbol.replace(/^(symbol|ticker|pair):\s*/i, '');
      // Trim whitespace
      symbol = symbol.trim();
    }
    
    // Extract patterns - handle both array of strings and array of objects
    let patterns: ChartPatternDetection[] = [];
    if (parsedResult.patterns) {
      if (Array.isArray(parsedResult.patterns)) {
        patterns = parsedResult.patterns.map((p: any) => {
          if (typeof p === 'string') {
            return { name: p, confidence: 0.9 };
          }
          return {
            name: p.name || p.pattern || p,
            confidence: p.confidence || 0.9
          };
        });
      }
    }
    
    // Extract tags - both from suggestedTags and patterns if needed
    let suggestedTags = parsedResult.suggestedTags || [];
    if (!suggestedTags.length && patterns.length > 0) {
      // Use pattern names as tags if no explicit tags
      suggestedTags = patterns.map(p => p.name.toLowerCase().replace(/\s+/g, '-'));
    }
    
    // Extract confidence score
    const confidenceScore = typeof parsedResult.confidenceScore === 'number' 
      ? parsedResult.confidenceScore 
      : 0.85;
    
    // Extract confidence notes
    const confidenceNotes = parsedResult.confidence_notes || '';
    
    // Map the OpenAI response to our application's format
    return {
      symbol: symbol,
      tradeType: normalizedTradeType,
      entryPrice: entryPrice,
      takeProfitPrice: takeProfitPrice,
      stopLossPrice: stopLossPrice,
      patterns: patterns,
      notes: parsedResult.notes || parsedResult.text || parsedResult.description,
      suggestedTags: suggestedTags,
      confidenceScore: confidenceScore,
      confidenceNotes: confidenceNotes,
      raw: parsedResult
    };
  } catch (error) {
    console.error('Error with OpenAI analysis:', error);
    throw error;
  }
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export const convertFileToBase64 = async (file: File): Promise<string> => {
  try {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new FileValidationError(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new FileValidationError(`File type ${file.type} is not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
    }

    return await retry(
      async () => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = () => {
            const base64 = reader.result as string;
            if (!base64) {
              reject(new Error('Failed to convert file to base64'));
              return;
            }
            resolve(base64);
          };
          
          reader.onerror = () => {
            reject(new Error('Error reading file'));
          };
          
          reader.readAsDataURL(file);
        });
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`Retrying file conversion (attempt ${attempt}):`, error);
        }
      }
    );
  } catch (error) {
    if (error instanceof FileValidationError) {
      throw error;
    }
    throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Transform raw API response to our application format
 * This would be implemented based on your specific AI service
 */
function transformApiResponse(apiResponse: any): TradingViewAnalysisResult {
  // This would extract and format data from your specific AI API
  return {
    symbol: apiResponse.symbol,
    tradeType: apiResponse.direction === 'bullish' ? 'Long' : 'Short',
    entryPrice: apiResponse.price_levels?.entry,
    takeProfitPrice: apiResponse.price_levels?.take_profit,
    stopLossPrice: apiResponse.price_levels?.stop_loss,
    patterns: (apiResponse.patterns || []).map((p: any) => ({
      name: p.name,
      confidence: p.confidence,
      boundingBox: p.bounding_box
    })),
    confidenceScore: apiResponse.confidence || 0.7,
    notes: apiResponse.notes,
    suggestedTags: apiResponse.suggestedTags,
    raw: apiResponse
  };
}

/**
 * Generate mock analysis result for development
 */
function generateMockAnalysisResult(file: File): TradingViewAnalysisResult {
  // Try to detect symbol from filename
  const symbol = detectSymbolFromFilename(file.name) || 'BTCUSD';
  
  // Common chart patterns
  const allPatterns = [
    'support line', 'resistance line', 'trend line', 
    'order block', 'fair value gap', 'supply zone', 'demand zone',
    'fibonacci retracement', 'VWAP', 'breakout', 'head and shoulders',
    'double top', 'double bottom', 'triangle pattern', 'flag pattern',
    'liquidity pool', 'golden pocket'
  ];
  
  // Randomly select 1-3 patterns
  const selectedPatterns = shuffleArray([...allPatterns])
    .slice(0, Math.floor(Math.random() * 3) + 1);
  
  const patterns = selectedPatterns.map(name => ({
    name,
    confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0 range
  }));
  
  // Generate prices in a reasonable range
  const basePrice = Math.random() * 1000 + 100;
  const priceVolatility = basePrice * 0.03; // 3% volatility
  
  const tradeType = Math.random() > 0.5 ? 'Long' : 'Short';
  
  // For long: entry < stopLoss < takeProfitPrice
  // For short: entry > stopLoss > takeProfitPrice
  let entryPrice, takeProfitPrice, stopLossPrice;
  
  if (tradeType === 'Long') {
    entryPrice = basePrice;
    takeProfitPrice = basePrice + priceVolatility * (1 + Math.random());
    stopLossPrice = basePrice - priceVolatility * Math.random();
  } else {
    entryPrice = basePrice;
    takeProfitPrice = basePrice - priceVolatility * (1 + Math.random());
    stopLossPrice = basePrice + priceVolatility * Math.random();
  }
  
  return {
    symbol,
    tradeType,
    entryPrice,
    takeProfitPrice,
    stopLossPrice,
    patterns,
    timestamp: new Date().toISOString(),
    confidenceScore: Math.random() * 0.2 + 0.8, // 0.8-1.0 range
    notes: '',
    suggestedTags: [],
    raw: {
      symbol,
      tradeType,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
      patterns,
      timestamp: new Date().toISOString(),
      confidenceScore: Math.random() * 0.2 + 0.8
    }
  };
}

/**
 * Utility to detect trading symbol from filename
 */
function detectSymbolFromFilename(filename: string): string | null {
  // Common patterns in TradingView filenames
  const symbolPatterns = [
    /([A-Z]{2,10})USD/i,    // Like BTCUSD
    /([A-Z]{1,5})-USD/i,    // Like BTC-USD
    /([A-Z]{1,5})USDT/i,    // Like BTCUSDT
    /([A-Z]{3})\/([A-Z]{3})/i,  // Like EUR/USD
    /([A-Z]{1,5})/i         // Generic ticker
  ];
  
  for (const pattern of symbolPatterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Utility to shuffle array
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Apply AI analysis results to trade form data
 */
export function applyAnalysisToTrade(
  analysis: TradingViewAnalysisResult, 
  currentTrade: Partial<Trade>
): Partial<Trade> {
  // Create a new trade object with AI-detected values
  const updatedTrade = { ...currentTrade };
  
  console.log('Applying analysis to trade:', analysis);
  
  // Only apply values with high confidence
  if (analysis.confidenceScore > aiServiceConfig.options.minConfidenceThreshold) {
    // Apply symbol if detected
    if (analysis.symbol && analysis.symbol.trim() !== '') {
      updatedTrade.symbol = analysis.symbol.trim();
      console.log('Applied symbol:', updatedTrade.symbol);
    }
    
    // Apply trade direction/type with normalization
    if (analysis.tradeType) {
      // Normalize to database format if needed
      let tradeType = analysis.tradeType;
      
      // Convert to lowercase if your database expects lowercase
      if (currentTrade.type && typeof currentTrade.type === 'string' && 
          currentTrade.type.toLowerCase() === currentTrade.type) {
        tradeType = analysis.tradeType.toLowerCase() as any;
      }
      
      updatedTrade.type = tradeType as any;
      console.log('Applied trade type:', updatedTrade.type);
    }
    
    // Apply price values if they exist and are valid numbers
    if (analysis.entryPrice !== undefined && !isNaN(Number(analysis.entryPrice))) {
      updatedTrade.entry_price = Number(analysis.entryPrice);
      console.log('Applied entry price:', updatedTrade.entry_price);
    }
    
    if (analysis.takeProfitPrice !== undefined && !isNaN(Number(analysis.takeProfitPrice))) {
      // If your database has a take_profit_price field
      if ('take_profit_price' in currentTrade) {
        (updatedTrade as any).take_profit_price = Number(analysis.takeProfitPrice);
        console.log('Applied take profit price:', (updatedTrade as any).take_profit_price);
      } else if (updatedTrade.exit_price === undefined || updatedTrade.exit_price === null) {
        // Use as exit price if no explicit exit price field
        updatedTrade.exit_price = Number(analysis.takeProfitPrice);
        console.log('Applied take profit as exit price:', updatedTrade.exit_price);
      }
    }
    
    if (analysis.stopLossPrice !== undefined && !isNaN(Number(analysis.stopLossPrice))) {
      // If your database has a stop_loss_price field
      if ('stop_loss_price' in currentTrade) {
        (updatedTrade as any).stop_loss_price = Number(analysis.stopLossPrice);
        console.log('Applied stop loss price:', (updatedTrade as any).stop_loss_price);
      }
    }
    
    // Apply notes if available and trade doesn't have notes yet
    if (analysis.notes && (!updatedTrade.notes || updatedTrade.notes.trim() === '')) {
      updatedTrade.notes = analysis.notes;
      console.log('Applied notes from AI analysis');
    }
    
    // Apply tags if available (assumes tags field exists in Trade type)
    if (analysis.suggestedTags && analysis.suggestedTags.length > 0 && 'tags' in currentTrade) {
      // If the trade already has tags, merge them
      const existingTags = (currentTrade as any).tags || [];
      const newTags = analysis.suggestedTags.filter(tag => !existingTags.includes(tag));
      
      if (newTags.length > 0) {
        (updatedTrade as any).tags = [...existingTags, ...newTags];
        console.log('Applied tags:', newTags);
      }
    }
  } else {
    console.log('Analysis confidence below threshold, not applying values:', analysis.confidenceScore);
  }
  
  return updatedTrade;
} 