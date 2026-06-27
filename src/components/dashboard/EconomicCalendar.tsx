'use client';

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
  Actual: string | null;
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
      case 3: return 'bg-red-500/10 text-red-500 border border-red-500/25';
      case 2: return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25';
      case 1: return 'bg-blue-500/10 text-blue-500 border border-blue-500/25';
      default: return 'bg-gray-500/10 text-gray-500 border border-gray-500/25';
    }
  };
  
  // Get country class
  const getCountryClass = (country: string) => {
    if (!country) return '';
    const lowerCountry = country.toLowerCase();
    
    if (lowerCountry.includes('united states') || lowerCountry === 'us' || lowerCountry === 'usa') {
      return 'text-blue-600 dark:text-blue-400 font-medium';
    } else if (lowerCountry.includes('euro') || lowerCountry === 'eu') {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-gray-700 dark:text-gray-300';
  };

  // If we're on the server or the component hasn't mounted yet, show a loading state
  if (!isMounted) {
    return (
      <div className={`bg-white/80 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl ${className}`}>
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Economic Calendar</h2>
        </div>
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/80 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl ${className}`}>
      
      {/* Warning Fallback Banner */}
      {(events as any).isMock && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold leading-normal">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Offline mode. Configure your Trading Economics API key in `.env.local` for live data news feed.</span>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Economic Calendar</h2>
        
        <div className="flex items-center space-x-3">
          {/* View toggle */}
          <div className="bg-gray-100 dark:bg-[#1a1f2c] rounded-lg border border-black/5 dark:border-white/5 flex overflow-hidden p-0.5">
            <button 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'}`}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
          </div>
          
          {/* Importance filter */}
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Importance:</span>
            {[3, 2, 1].map(imp => (
              <button
                key={imp}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  activeImportance.includes(imp.toString()) 
                    ? getImportanceClass(imp) 
                    : 'bg-gray-100 dark:bg-[#1a1f2c] text-gray-500 dark:text-gray-400 hover:border-black/10 border border-transparent'
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                activeCountries.includes('united states') 
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                  : 'bg-gray-100 dark:bg-[#1a1f2c] text-gray-500 dark:text-gray-400 border-transparent hover:border-black/10'
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                activeCountries.includes('euro area') 
                  ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' 
                  : 'bg-gray-100 dark:bg-[#1a1f2c] text-gray-500 dark:text-gray-400 border-transparent hover:border-black/10'
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
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white text-xs w-36 sm:w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
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
        <div className="border-b border-black/5 dark:border-gray-800 overflow-x-auto">
          <div className="flex min-w-max">
            {days.map(day => {
              const dayEvents = eventsByDay[day] || [];
              const highImportanceCount = dayEvents.filter(e => e.Importance === 3).length;
              
              return (
                <button
                  key={day}
                  className={`px-4 py-2 flex flex-col items-center border-r border-black/5 dark:border-gray-800 min-w-[100px] transition-colors ${
                    selectedDay === day ? 'bg-gray-100/60 dark:bg-[#1a1f2c]' : 'hover:bg-gray-50/50 dark:hover:bg-[#161b25]'
                  }`}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-white">{formatDate(day + 'T00:00:00', 'day')}</span>
                  <div className="flex items-center mt-1 space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{dayEvents.length} events</span>
                    {highImportanceCount > 0 && (
                      <span className="flex items-center text-xs text-red-500 dark:text-red-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse"></span>
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
        <div className="p-8 text-center text-gray-500">
          No economic events found for the selected criteria
        </div>
      ) : view === 'list' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-gray-100 dark:bg-[#0a0c13]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Forecast</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Previous</th>
              </tr>
            </thead>
            <tbody className="bg-white/40 dark:bg-[#0d1017] divide-y divide-black/5 dark:divide-white/5">
              {filteredEvents.map((event, index) => (
                <tr key={index} className={`hover:bg-gray-100/50 dark:hover:bg-[#1a1f2c] transition-colors ${
                  event.Country?.toLowerCase().includes('united states') ? 'bg-blue-500/[0.02] dark:bg-blue-900/5' : ''
                }`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-mono">
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mr-2 ${getImportanceClass(event.Importance)}`}>
                        {['Low', 'Medium', 'High'][event.Importance - 1] || 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">{event.Event}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{event.Category}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                    {event.Actual && (
                      <span className={event.Actual > event.Previous ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-red-400'}>
                        {event.Actual}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{event.Forecast || event.TEForecast || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{event.Previous || '—'}</td>
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
                <h3 className="text-gray-900 dark:text-white font-semibold mb-3 flex items-center">
                  <span className="text-base">{formatDate(day + 'T00:00:00', 'day')}</span>
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-[#1a1f2c] border border-black/5 dark:border-white/5 rounded-full text-xs text-gray-500 dark:text-gray-400">
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
                        className={`p-4 rounded-xl border bg-white/40 dark:bg-slate-900/30 ${event.Importance === 3 
                          ? 'border-red-500/20 shadow-sm shadow-red-500/5' 
                          : event.Importance === 2
                            ? 'border-yellow-500/20 shadow-sm shadow-yellow-500/5'
                            : 'border-blue-500/20 shadow-sm shadow-blue-500/5'
                        } ${
                          event.Country?.toLowerCase().includes('united states')
                            ? 'border-l-4 border-l-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <span className={`text-sm font-semibold ${getCountryClass(event.Country)}`}>
                              {event.Country}
                            </span>
                            <span className="mx-2 text-gray-400 dark:text-gray-600">•</span>
                            <span className="text-xs text-gray-500 font-mono">{formatDate(event.Date, 'time')}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getImportanceClass(event.Importance)}`}>
                            {['Low', 'Medium', 'High'][event.Importance - 1] || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="text-gray-900 dark:text-white font-semibold text-sm mb-1">{event.Event}</div>
                        <div className="text-xs text-gray-400 mb-3">{event.Category}</div>
                        
                        <div className="grid grid-cols-3 gap-3 mt-2 text-xs border-t border-black/[0.03] dark:border-white/[0.03] pt-3">
                          <div>
                            <div className="text-gray-400 dark:text-gray-500 mb-0.5">Previous</div>
                            <div className="text-gray-800 dark:text-gray-300 font-mono">{event.Previous || '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 dark:text-gray-500 mb-0.5">Forecast</div>
                            <div className="text-gray-800 dark:text-gray-300 font-mono">{event.Forecast || event.TEForecast || '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 dark:text-gray-500 mb-0.5">Actual</div>
                            {event.Actual ? (
                              <div className={`font-semibold font-mono ${event.Actual > event.Previous ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-red-400'}`}>
                                {event.Actual}
                              </div>
                            ) : (
                              <div className="text-gray-400 dark:text-gray-500 italic">Pending</div>
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
