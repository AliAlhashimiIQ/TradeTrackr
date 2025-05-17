'use client'

// The base URL for Trading Economics API
const BASE_URL = 'https://api.tradingeconomics.com/calendar';

// Mock data for development/testing when API fails
const MOCK_ECONOMIC_EVENTS = [
  {
    Date: new Date().toISOString(),
    Country: "United States",
    Category: "Interest Rate",
    Event: "Fed Interest Rate Decision",
    Reference: "Apr",
    Source: "Federal Reserve",
    Actual: "5.50%",
    Previous: "5.50%",
    Forecast: "5.50%",
    TEForecast: "5.50%",
    Importance: 3
  },
  {
    Date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    Country: "Euro Area",
    Category: "Inflation",
    Event: "Consumer Price Index (YoY)",
    Reference: "Apr",
    Source: "Eurostat",
    Actual: "2.4%",
    Previous: "2.6%",
    Forecast: "2.5%",
    TEForecast: "2.5%",
    Importance: 3
  },
  {
    Date: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
    Country: "United Kingdom",
    Category: "Employment",
    Event: "Unemployment Rate",
    Reference: "Mar",
    Source: "Office for National Statistics",
    Actual: null,
    Previous: "4.2%",
    Forecast: "4.3%",
    TEForecast: "4.3%",
    Importance: 2
  },
  {
    Date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    Country: "Japan",
    Category: "GDP",
    Event: "GDP Growth Rate QoQ",
    Reference: "Q1",
    Source: "Cabinet Office",
    Actual: null,
    Previous: "0.1%",
    Forecast: "0.3%",
    TEForecast: "0.2%",
    Importance: 3
  },
  {
    Date: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
    Country: "China",
    Category: "Trade",
    Event: "Trade Balance",
    Reference: "Apr",
    Source: "General Administration of Customs",
    Actual: null,
    Previous: "58.9B",
    Forecast: "60.2B",
    TEForecast: "59.8B",
    Importance: 2
  }
];

// Function to fetch economic calendar data
export async function getEconomicCalendar(params: {
  country?: string[];
  indicator?: string[];
  startDate?: string;
  endDate?: string;
  importance?: string[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_TRADING_ECONOMICS_API_KEY;
  
  // For development/testing, if no API key, return mock data
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('No Trading Economics API key found. Using mock data.');
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_ECONOMIC_EVENTS;
  }
  
  try {
    // Build base URL
    let url = BASE_URL;
    
    // Build query parameters array
    const queryParts = [];
    
    // Add API key as 'client' parameter (this is the format shown in their docs)
    queryParts.push(`client=${apiKey}`);
    
    // Add parameters to the array
    if (params.country?.length) queryParts.push(`c=${params.country.join(',')}`);
    if (params.indicator?.length) queryParts.push(`i=${params.indicator.join(',')}`);
    if (params.importance?.length) queryParts.push(`importance=${params.importance.join(',')}`);
    if (params.startDate) queryParts.push(`d1=${params.startDate}`);
    if (params.endDate) queryParts.push(`d2=${params.endDate}`);
    
    // Combine all parameters
    url = `${url}?${queryParts.join('&')}`;
    
    console.log('Fetching economic calendar from URL (API key hidden for security)');
    
    // Make the API request with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error ${response.status}: ${errorText}`);
      
      // If we get a 401 or 403, it's likely an API key issue
      if (response.status === 401 || response.status === 403) {
        throw new Error('API key is invalid or unauthorized. Please check your Trading Economics API key.');
      }
      
      throw new Error(`Failed to fetch economic calendar: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('Economic calendar API returned empty data');
      return [];
    }
    
    console.log(`Economic calendar: Retrieved ${Array.isArray(data) ? data.length : 0} events`);
    return data;
  } catch (error) {
    console.error('Economic calendar API error:', error);
    
    // If we're in development mode, return mock data
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock data since API request failed in development mode');
      return MOCK_ECONOMIC_EVENTS;
    }
    
    // In production, propagate the error
    throw new Error(`Failed to fetch economic calendar data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 