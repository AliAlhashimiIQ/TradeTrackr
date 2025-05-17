'use client';

import { useState, useEffect } from 'react';
import { MarketEvent } from '@/lib/types';
import { getMarketEvents } from '@/lib/tradingApi';

interface MarketEventsCalendarProps {
  startDate: string;
  endDate: string;
  impact?: ('low' | 'medium' | 'high')[];
  eventTypes?: ('earnings' | 'dividend' | 'split' | 'ipo' | 'other')[];
  compact?: boolean;
  onEventClick?: (event: MarketEvent) => void;
}

export default function MarketEventsCalendar({
  startDate,
  endDate,
  impact = ['medium', 'high'],
  eventTypes = ['earnings', 'dividend', 'split', 'ipo', 'other'],
  compact = false,
  onEventClick,
}: MarketEventsCalendarProps) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImpact, setSelectedImpact] = useState(impact);
  const [selectedTypes, setSelectedTypes] = useState(eventTypes);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  
  // Fetch market events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await getMarketEvents(startDate, endDate);
        // Filter by impact and event type
        const filtered = data.filter(
          event => selectedImpact.includes(event.impact) && selectedTypes.includes(event.type)
        );
        setEvents(filtered);
      } catch (error) {
        console.error('Error fetching market events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [startDate, endDate, selectedImpact, selectedTypes]);
  
  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, MarketEvent[]>);
  
  // Get unique dates sorted
  const dates = Object.keys(eventsByDate).sort();
  
  // Set active date to the first date with events if not already set
  useEffect(() => {
    if (dates.length && !activeDate) {
      setActiveDate(dates[0]);
    }
  }, [dates, activeDate]);
  
  // Available event types and impact levels for filtering
  const availableEventTypes: { label: string; value: 'earnings' | 'dividend' | 'split' | 'ipo' | 'other' }[] = [
    { label: 'Earnings', value: 'earnings' },
    { label: 'Dividends', value: 'dividend' },
    { label: 'Stock Splits', value: 'split' },
    { label: 'IPOs', value: 'ipo' },
    { label: 'Other', value: 'other' },
  ];
  
  const impactLevels: { label: string; value: 'low' | 'medium' | 'high'; color: string }[] = [
    { label: 'Low', value: 'low', color: 'bg-blue-500' },
    { label: 'Medium', value: 'medium', color: 'bg-yellow-500' },
    { label: 'High', value: 'high', color: 'bg-red-500' },
  ];
  
  // Get event type label
  const getEventTypeLabel = (type: 'earnings' | 'dividend' | 'split' | 'ipo' | 'other') => {
    return availableEventTypes.find(t => t.value === type)?.label || type;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (compact) {
    // Compact view for dashboard or sidebar
    return (
      <div className="bg-[#151823] rounded-lg overflow-hidden">
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-white text-sm font-medium">Upcoming Market Events</h3>
        </div>
        
        <div className="divide-y divide-gray-800">
          {events.slice(0, 5).map((event) => (
            <div 
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="p-3 hover:bg-[#1a1f2c] cursor-pointer"
            >
              <div className="flex items-start">
                <div className={`mt-1 w-2 h-2 rounded-full ${
                  event.impact === 'high' ? 'bg-red-500' : 
                  event.impact === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                } mr-2`}></div>
                
                <div>
                  <h4 className="text-white text-sm">{event.title}</h4>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-gray-400 text-xs">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {event.time && <span className="text-gray-400 text-xs">{event.time}</span>}
                    <span className="text-xs px-1.5 rounded bg-[#242a3a] text-gray-300">
                      {getEventTypeLabel(event.type)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {events.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No upcoming market events
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Full calendar view
  return (
    <div className="bg-[#151823] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-medium">Market Events</h3>
          
          <div className="flex space-x-2">
            {/* Event type filter dropdown */}
            <div className="relative">
              <button 
                className="px-3 py-1.5 bg-[#1a1f2c] rounded-md text-sm text-gray-300 flex items-center"
                onClick={() => document.getElementById('typeFilter')?.classList.toggle('hidden')}
              >
                <span>Event Types</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div 
                id="typeFilter" 
                className="hidden absolute right-0 mt-1 w-48 bg-[#1a1f2c] rounded-md shadow-lg z-10 p-2"
              >
                {availableEventTypes.map(type => (
                  <label key={type.value} className="flex items-center p-2 hover:bg-[#242a3a] rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.value)}
                      onChange={() => {
                        if (selectedTypes.includes(type.value)) {
                          setSelectedTypes(selectedTypes.filter(t => t !== type.value));
                        } else {
                          setSelectedTypes([...selectedTypes, type.value]);
                        }
                      }}
                      className="h-4 w-4 text-purple-600 border-gray-700 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Impact filter dropdown */}
            <div className="relative">
              <button 
                className="px-3 py-1.5 bg-[#1a1f2c] rounded-md text-sm text-gray-300 flex items-center"
                onClick={() => document.getElementById('impactFilter')?.classList.toggle('hidden')}
              >
                <span>Impact</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div 
                id="impactFilter" 
                className="hidden absolute right-0 mt-1 w-48 bg-[#1a1f2c] rounded-md shadow-lg z-10 p-2"
              >
                {impactLevels.map(level => (
                  <label key={level.value} className="flex items-center p-2 hover:bg-[#242a3a] rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedImpact.includes(level.value)}
                      onChange={() => {
                        if (selectedImpact.includes(level.value)) {
                          setSelectedImpact(selectedImpact.filter(i => i !== level.value));
                        } else {
                          setSelectedImpact([...selectedImpact, level.value]);
                        }
                      }}
                      className="h-4 w-4 text-purple-600 border-gray-700 rounded"
                    />
                    <div className="ml-2 flex items-center">
                      <div className={`w-2 h-2 rounded-full ${level.color} mr-1.5`}></div>
                      <span className="text-sm text-gray-300">{level.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {dates.length > 0 ? (
        <div className="flex">
          {/* Date sidebar */}
          <div className="w-1/4 border-r border-gray-800">
            {dates.map(date => (
              <button
                key={date}
                onClick={() => setActiveDate(date)}
                className={`w-full p-3 text-left ${
                  activeDate === date ? 'bg-[#1a1f2c]' : 'hover:bg-[#1a1f2c]'
                }`}
              >
                <div className="text-sm text-white">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {eventsByDate[date].length} events
                </div>
              </button>
            ))}
          </div>
          
          {/* Event list */}
          <div className="w-3/4 divide-y divide-gray-800">
            {activeDate && eventsByDate[activeDate]
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              .map(event => (
                <div 
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="p-4 hover:bg-[#1a1f2c] cursor-pointer"
                >
                  <div className="flex items-start">
                    <div className={`mt-1 w-3 h-3 rounded-full ${
                      event.impact === 'high' ? 'bg-red-500' : 
                      event.impact === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    } mr-2.5`}></div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          {event.time && <span className="text-gray-400 text-sm">{event.time}</span>}
                          <span className="px-2 py-0.5 bg-[#242a3a] rounded text-gray-300 text-xs">
                            {getEventTypeLabel(event.type)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-400 text-sm mt-1">
                        {event.description}
                      </p>
                      
                      {event.symbols && event.symbols.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">Related Symbols</div>
                          <div className="flex flex-wrap gap-1">
                            {event.symbols.map(symbol => (
                              <div key={symbol} className="px-2 py-1 bg-[#0f1117] rounded text-white text-xs">
                                {symbol}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          No market events found for the selected period and filters.
        </div>
      )}
    </div>
  );
} 