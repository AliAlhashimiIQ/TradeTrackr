'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { getEconomicCalendar } from '@/lib/economicCalendarApi';
import ErrorMessage from '../common/ErrorMessage';
import LoadingState from '../common/LoadingState';

interface Event {
  Date: string;
  Country: string;
  Category: string;
  Event: string;
  Reference: string;
  Source: string;
  Actual: string;
  Previous: string;
  Forecast: string;
  TEForecast: string;
  Importance: number;
}

interface EventsByDay {
  [date: string]: Event[];
}

interface EconomicCalendarProps {
  countries?: string[];
  dateRange: { startDate: string; endDate: string };
  importance?: string[];
  className?: string;
}

const EconomicCalendar: React.FC<EconomicCalendarProps> = ({
  countries = ['united states', 'euro area'],
  dateRange,
  importance = ['3'],
  className = ''
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeCountries, setActiveCountries] = useState<string[]>(countries);
  const [activeImportance, setActiveImportance] = useState<string[]>(importance);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Only run on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Skip API calls during server-side rendering
    if (!isMounted) return;

    const fetchCalendar = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getEconomicCalendar({
          country: activeCountries,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          importance: activeImportance
        });
        
        setEvents(Array.isArray(data) ? data : []);
        
        // Set selected day to today or first day with events
        if (!selectedDay && Array.isArray(data) && data.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const todayEvents = data.filter(event => 
            event.Date && new Date(event.Date).toISOString().split('T')[0] === today
          );
          
          if (todayEvents.length > 0) {
            setSelectedDay(today);
          } else {
            // Find first day with events
            const firstEventDate = data[0].Date;
            if (firstEventDate) {
              setSelectedDay(new Date(firstEventDate).toISOString().split('T')[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch economic calendar:', err);
        setError('Failed to load economic calendar data. Please check your API key configuration.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalendar();
  }, [activeCountries, dateRange, activeImportance, isMounted]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    if (!events.length) return {};
    
    const grouped: EventsByDay = {};
    
    events.forEach(event => {
      if (!event.Date) return;
      
      const dateStr = new Date(event.Date).toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(event);
    });
    
    return grouped;
  }, [events]);
  
  // Get unique days sorted chronologically
  const days = useMemo(() => {
    return Object.keys(eventsByDay).sort();
  }, [eventsByDay]);

  // Filter events based on search and active filters
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Text search filter
    if (filter) {
      filtered = filtered.filter(event => 
        event.Event?.toLowerCase().includes(filter.toLowerCase()) ||
        event.Country?.toLowerCase().includes(filter.toLowerCase()) ||
        event.Category?.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    // Day filter
    if (selectedDay) {
      filtered = filtered.filter(event => {
        if (!event.Date) return false;
        return new Date(event.Date).toISOString().split('T')[0] === selectedDay;
      });
    }
    
    return filtered;
  }, [events, filter, selectedDay]);

  // Format date for display
  const formatDate = (dateStr: string, format: 'full' | 'time' | 'day' = 'full') => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      
      if (format === 'time') {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);
      }
      
      if (format === 'day') {
        return new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }).format(date);
      }
      
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  // Determine importance class
  const getImportanceClass = (importance: number) => {
    switch(importance) {
      case 3: return 'bg-red-900/30 text-red-400';
      case 2: return 'bg-yellow-900/30 text-yellow-400';
      case 1: return 'bg-blue-900/30 text-blue-400';
      default: return 'bg-gray-900/30 text-gray-400';
    }
  };
  
  // Get country class
  const getCountryClass = (country: string) => {
    if (!country) return '';
    const lowerCountry = country.toLowerCase();
    
    if (lowerCountry.includes('united states') || lowerCountry === 'us' || lowerCountry === 'usa') {
      return 'text-blue-400 font-medium';
    } else if (lowerCountry.includes('euro') || lowerCountry === 'eu') {
      return 'text-yellow-400';
    }
    
    return '';
  };

  // If we're on the server or the component hasn't mounted yet, show a loading state
  if (!isMounted) {
    return (
      <div className={`bg-[#0d1017] rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Economic Calendar</h2>
        </div>
        <div className="p-8 flex justify-center">
          <LoadingState variant="spinner" text="Loading calendar..." />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#0d1017] rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-800 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Economic Calendar</h2>
        
        <div className="flex items-center space-x-3">
          {/* View toggle */}
          <div className="bg-[#1a1f2c] rounded-md flex overflow-hidden">
            <button 
              className={`px-3 py-1.5 text-xs ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button 
              className={`px-3 py-1.5 text-xs ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
          </div>
          
          {/* Importance filter */}
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs text-gray-400">Importance:</span>
            {[3, 2, 1].map(imp => (
              <button
                key={imp}
                className={`px-2 py-1 rounded-md text-xs ${
                  activeImportance.includes(imp.toString()) 
                    ? getImportanceClass(imp) 
                    : 'bg-[#1a1f2c] text-gray-400'
                }`}
                onClick={() => {
                  if (activeImportance.includes(imp.toString())) {
                    setActiveImportance(activeImportance.filter(i => i !== imp.toString()));
                  } else {
                    setActiveImportance([...activeImportance, imp.toString()]);
                  }
                }}
              >
                {imp === 3 ? 'High' : imp === 2 ? 'Medium' : 'Low'}
              </button>
            ))}
          </div>
          
          {/* Country quick filters */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              className={`px-2 py-1 rounded-md text-xs ${
                activeCountries.includes('united states') 
                  ? 'bg-blue-900/30 text-blue-400' 
                  : 'bg-[#1a1f2c] text-gray-400'
              }`}
              onClick={() => {
                if (activeCountries.includes('united states')) {
                  setActiveCountries(activeCountries.filter(c => c !== 'united states'));
                } else {
                  setActiveCountries([...activeCountries, 'united states']);
                }
              }}
            >
              US
            </button>
            <button
              className={`px-2 py-1 rounded-md text-xs ${
                activeCountries.includes('euro area') 
                  ? 'bg-yellow-900/30 text-yellow-400' 
                  : 'bg-[#1a1f2c] text-gray-400'
              }`}
              onClick={() => {
                if (activeCountries.includes('euro area')) {
                  setActiveCountries(activeCountries.filter(c => c !== 'euro area'));
                } else {
                  setActiveCountries([...activeCountries, 'euro area']);
                }
              }}
            >
              EU
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter events..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded bg-[#1a1f2c] border border-gray-700 text-white text-xs w-36 sm:w-48"
            />
            <button
              onClick={() => setFilter('')}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 ${!filter && 'hidden'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Day selector - horizontal scrollable */}
      {days.length > 0 && (
        <div className="border-b border-gray-800 overflow-x-auto">
          <div className="flex min-w-max">
            {days.map(day => {
              const dayEvents = eventsByDay[day] || [];
              const highImportanceCount = dayEvents.filter(e => e.Importance === 3).length;
              
              return (
                <button
                  key={day}
                  className={`px-4 py-2 flex flex-col items-center border-r border-gray-800 min-w-[100px] ${
                    selectedDay === day ? 'bg-[#1a1f2c]' : 'hover:bg-[#161b25]'
                  }`}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                >
                  <span className="text-sm font-medium text-white">{formatDate(day + 'T00:00:00', 'day')}</span>
                  <div className="flex items-center mt-1 space-x-1">
                    <span className="text-xs text-gray-400">{dayEvents.length} events</span>
                    {highImportanceCount > 0 && (
                      <span className="flex items-center text-xs text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                        {highImportanceCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {loading ? (
        <LoadingState variant="spinner" text="Loading economic data..." className="p-8" />
      ) : error ? (
        <ErrorMessage 
          message={error} 
          severity="error" 
          className="m-4" 
          details="Check your .env.local file to ensure your Trading Economics API key is properly configured."
        />
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          No economic events found for the selected criteria
        </div>
      ) : view === 'list' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-[#0a0c13]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Country</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Forecast</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Previous</th>
              </tr>
            </thead>
            <tbody className="bg-[#0d1017] divide-y divide-gray-800">
              {filteredEvents.map((event, index) => (
                <tr key={index} className={`hover:bg-[#1a1f2c] ${
                  event.Country?.toLowerCase().includes('united states') ? 'bg-blue-900/5' : ''
                }`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(event.Date, 'time')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm ${getCountryClass(event.Country)}`}>
                        {event.Country}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${getImportanceClass(event.Importance)}`}>
                        {['Low', 'Medium', 'High'][event.Importance - 1] || 'Unknown'}
                      </span>
                      <span className="text-sm text-white">{event.Event}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{event.Category}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {event.Actual && (
                      <span className={event.Actual > event.Previous ? 'text-green-400' : 'text-red-400'}>
                        {event.Actual}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{event.Forecast || event.TEForecast}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{event.Previous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Calendar view
        <div className="p-4">
          {days.map(day => {
            const dayEvents = eventsByDay[day] || [];
            // Skip days with no events
            if (dayEvents.length === 0) return null;
            
            return (
              <div key={day} className={`mb-6 ${selectedDay && selectedDay !== day ? 'hidden' : ''}`}>
                <h3 className="text-white font-medium mb-3 flex items-center">
                  <span className="text-lg">{formatDate(day + 'T00:00:00', 'day')}</span>
                  <span className="ml-2 px-2 py-0.5 bg-[#1a1f2c] rounded-full text-xs text-gray-400">
                    {dayEvents.length} events
                  </span>
                </h3>
                
                <div className="space-y-3">
                  {dayEvents
                    .filter(event => !filter || 
                      event.Event?.toLowerCase().includes(filter.toLowerCase()) || 
                      event.Country?.toLowerCase().includes(filter.toLowerCase()) ||
                      event.Category?.toLowerCase().includes(filter.toLowerCase())
                    )
                    .sort((a, b) => {
                      // Sort by importance first (high to low), then by time
                      if (a.Importance !== b.Importance) {
                        return b.Importance - a.Importance;
                      }
                      return new Date(a.Date).getTime() - new Date(b.Date).getTime();
                    })
                    .map((event, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg ${event.Importance === 3 
                          ? 'bg-red-900/10 border border-red-900/20' 
                          : event.Importance === 2
                            ? 'bg-yellow-900/10 border border-yellow-900/20'
                            : 'bg-blue-900/10 border border-blue-900/20'
                        } ${
                          event.Country?.toLowerCase().includes('united states')
                            ? 'border-l-4 border-l-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${getCountryClass(event.Country)}`}>
                              {event.Country}
                            </span>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-sm text-gray-400">{formatDate(event.Date, 'time')}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getImportanceClass(event.Importance)}`}>
                            {['Low', 'Medium', 'High'][event.Importance - 1] || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="text-white font-medium mb-1">{event.Event}</div>
                        <div className="text-xs text-gray-500 mb-2">{event.Category}</div>
                        
                        <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                          <div>
                            <div className="text-gray-500 mb-1">Previous</div>
                            <div className="text-gray-300">{event.Previous || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Forecast</div>
                            <div className="text-gray-300">{event.Forecast || event.TEForecast || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Actual</div>
                            {event.Actual ? (
                              <div className={event.Actual > event.Previous ? 'text-green-400' : 'text-red-400'}>
                                {event.Actual}
                              </div>
                            ) : (
                              <div className="text-gray-500">Pending</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EconomicCalendar; 