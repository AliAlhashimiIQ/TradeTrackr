'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';

interface TradingViewChartProps {
  symbol: string;
  entryTime: string;
  exitTime: string | null;
  entryPrice: number;
  exitPrice: number | null;
  type: 'Long' | 'Short';
}

export default function TradingViewChart({
  symbol,
  entryTime,
  exitTime,
  entryPrice,
  exitPrice,
  type,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<string>('15m');

  // Initialize optimal default interval when trade changes
  useEffect(() => {
    const entryDate = new Date(entryTime);
    const exitDate = exitTime ? new Date(exitTime) : new Date();
    const entryTimeUnix = Math.floor(entryDate.getTime() / 1000);
    const exitTimeUnix = Math.floor(exitDate.getTime() / 1000);
    const durationSeconds = exitTimeUnix - entryTimeUnix;

    let defaultInterval = '15m';
    if (durationSeconds < 4 * 3600) {
      defaultInterval = '5m';
    } else if (durationSeconds < 24 * 3600) {
      defaultInterval = '15m';
    } else if (durationSeconds < 7 * 24 * 3600) {
      defaultInterval = '1h';
    } else if (durationSeconds < 30 * 24 * 3600) {
      defaultInterval = '4h';
    } else {
      defaultInterval = '1d';
    }
    setInterval(defaultInterval);
  }, [symbol, entryTime, exitTime]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;
    let chart: IChartApi | null = null;
    let resizeHandler: (() => void) | null = null;

    const loadDataAndRender = async () => {
      try {
        setLoading(true);
        setError(null);

        const entryDate = new Date(entryTime);
        const exitDate = exitTime ? new Date(exitTime) : new Date();
        const entryTimeUnix = Math.floor(entryDate.getTime() / 1000);
        const exitTimeUnix = Math.floor(exitDate.getTime() / 1000);

        // Determine range padding based on selected timeframe
        let paddingSeconds = 12 * 3600; // 12 hours fallback
        if (interval === '1m') {
          paddingSeconds = 24 * 3600; // 1 day padding for 1m
        } else if (interval === '5m') {
          paddingSeconds = 3 * 24 * 3600; // 3 days padding for 5m
        } else if (interval === '15m') {
          paddingSeconds = 7 * 24 * 3600; // 7 days padding for 15m
        } else if (interval === '1h') {
          paddingSeconds = 20 * 24 * 3600; // 20 days padding for 1h
        } else if (interval === '4h') {
          paddingSeconds = 40 * 24 * 3600; // 40 days padding for 4h
        } else if (interval === '1d') {
          paddingSeconds = 180 * 24 * 3600; // 180 days padding for 1d
        }

        const start = entryTimeUnix - paddingSeconds;
        const end = exitTimeUnix + paddingSeconds;

        const response = await fetch(
          `/api/charts/history?symbol=${encodeURIComponent(
            symbol
          )}&interval=${interval}&start=${start}&end=${end}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load historical data for ${symbol}`);
        }

        const json = await response.json();
        const candles = json.data || [];

        if (!isMounted) return;

        if (candles.length === 0) {
          if (interval === '1m') {
            throw new Error(`1-minute historical data is only available for trades taken within the last 7 days.`);
          }
          throw new Error(`No historical price data available for ${symbol} around this time.`);
        }

        setLoading(false);

        // Detect current theme mode from document class
        const isDark = document.documentElement.classList.contains('dark');

        // Create Chart
        chart = createChart(chartContainerRef.current!, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#0d0e16' : '#ffffff' },
            textColor: isDark ? '#9ca3af' : '#475569',
          },
          grid: {
            vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
            horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
          },
          crosshair: {
            mode: 1, // Normal crosshair
          },
          timeScale: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            timeVisible: true,
            secondsVisible: false,
          },
        });

        // Add Candlestick Series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });

        candlestickSeries.setData(candles);

        // Find closest candle times to snap markers to available timestamps
        const findClosestCandle = (targetTime: number) => {
          let closest = candles[0].time;
          let minDiff = Math.abs(candles[0].time - targetTime);
          for (let i = 1; i < candles.length; i++) {
            const diff = Math.abs(candles[i].time - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              closest = candles[i].time;
            }
          }
          return closest;
        };

        const entryCandleTime = findClosestCandle(entryTimeUnix);
        const exitCandleTime = exitPrice && exitTime ? findClosestCandle(exitTimeUnix) : null;

        // Draw entry & exit markers
        const markers = [
          {
            time: entryCandleTime,
            position: type === 'Long' ? 'belowBar' : 'aboveBar',
            color: '#22c55e',
            shape: type === 'Long' ? 'arrowUp' : 'arrowDown',
            text: type === 'Long' ? 'BUY ENTRY' : 'SELL ENTRY',
            size: 1.5,
          },
        ];

        if (exitPrice && exitCandleTime) {
          markers.push({
            time: exitCandleTime,
            position: type === 'Long' ? 'aboveBar' : 'belowBar',
            color: '#ef4444',
            shape: type === 'Long' ? 'arrowDown' : 'arrowUp',
            text: 'EXIT',
            size: 1.5,
          } as any);
        }

        createSeriesMarkers(candlestickSeries, markers as any);

        // Connect entry/exit points with a visual path line
        if (exitPrice && exitCandleTime) {
          const pathSeries = chart.addSeries(LineSeries, {
            color: 'rgba(59, 130, 246, 0.75)',
            lineWidth: 2,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
          });

          pathSeries.setData([
            { time: entryCandleTime, value: entryPrice },
            { time: exitCandleTime, value: exitPrice },
          ]);
        }

        // Fit content on chart
        chart.timeScale().fitContent();

        // Handle window resizing
        const handleResize = () => {
          if (chart && chartContainerRef.current) {
            chart.resize(
              chartContainerRef.current.clientWidth,
              chartContainerRef.current.clientHeight
            );
          }
        };

        window.addEventListener('resize', handleResize);
        resizeHandler = handleResize;
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred loading the chart.');
          setLoading(false);
        }
      }
    };

    loadDataAndRender();

    return () => {
      isMounted = false;
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chart) {
        chart.remove();
      }
    };
  }, [symbol, entryTime, exitTime, entryPrice, exitPrice, type, interval]);

  return (
    <div 
      className="w-full flex flex-col h-[500px] rounded-2xl border relative overflow-hidden shadow-2xl"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      {/* Chart Header Info */}
      <div 
        className="flex justify-between items-center px-6 py-4 border-b"
        style={{ borderBottomColor: 'var(--border)', backgroundColor: 'var(--table-header-bg)' }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold tracking-wide text-sm" style={{ color: 'var(--foreground)' }}>{symbol}</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
              Execution Map
            </span>
          </div>

          {/* Timeframe selector */}
          <div 
            className="flex p-0.5 rounded-lg border"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)' }}
          >
            {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setInterval(tf)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  interval === tf
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--secondary)' }}>
          Powered by TradingView
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 relative w-full h-full" style={{ backgroundColor: 'var(--card-bg)' }}>
        {loading && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10"
            style={{ backgroundColor: 'rgba(var(--background), 0.8)' }}
          >
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--secondary)' }}>Fetching historical tick data...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10" style={{ backgroundColor: 'var(--card-bg)' }}>
            <svg
              className="w-12 h-12 mb-3"
              style={{ color: 'var(--secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Chart Unavailable</p>
            <p className="text-xs max-w-sm" style={{ color: 'var(--secondary)' }}>{error}</p>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
