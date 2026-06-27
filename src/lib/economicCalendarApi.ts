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
  try {
    const queryParts = [];
    if (params.country?.length) queryParts.push(`c=${params.country.join(',')}`);
    if (params.indicator?.length) queryParts.push(`i=${params.indicator.join(',')}`);
    if (params.importance?.length) queryParts.push(`importance=${params.importance.join(',')}`);
    if (params.startDate) queryParts.push(`d1=${params.startDate}`);
    if (params.endDate) queryParts.push(`d2=${params.endDate}`);

    const url = `/api/calendar?${queryParts.join('&')}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Proxy error ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Economic calendar client error:', error);
    // Fallback to mock data on failure/error
    const today = Date.now();
    const mockCopy = [
      {
        Date: new Date(today).toISOString(),
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
        Date: new Date(today + 86400000).toISOString(), // tomorrow
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
        Date: new Date(today + 172800000).toISOString(), // day after tomorrow
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
        Date: new Date(today + 259200000).toISOString(), // 3 days from now
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
        Date: new Date(today + 345600000).toISOString(), // 4 days from now
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
    const returnArray = [...mockCopy];
    Object.defineProperty(returnArray, 'isMock', { value: true, enumerable: false });
    return returnArray;
  }
} 
