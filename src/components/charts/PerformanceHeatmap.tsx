'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  Rectangle,
  Cell,
  LabelList,
} from 'recharts';
import { HeatmapData } from '@/lib/tradeMetrics';

interface PerformanceHeatmapProps {
  data: HeatmapData[];
  loading?: boolean;
}

// Consistent formatting functions that work the same on server and client
const formatCurrency = (value: number) => {
  return `$${Math.abs(value).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
};

const formatPercent = (value: number) => {
  return `${value.toFixed(0)}%`;
};

/**
 * Custom shape for heat map cells
 */
const HeatMapCell = (props: any) => {
  const { x, y, width, height, value, colorScale, metric, displayValues } = props;
  
  // Early returns for invalid cells
  if (!value || value === 0) {
    return (
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#1a1f2c"
        stroke="#0f1117"
      />
    );
  }
  
  // Set cell color based on value
  let fillColor;
  let textColor = "#ffffff";
  let textValue = "";
  
  if (metric === 'pnL') {
    // Green to red gradient for P&L
    if (value > 0) {
      // Green gradient for profits: light to dark based on magnitude
      const intensity = Math.min(1, value / colorScale);
      fillColor = `rgba(16, 185, 129, ${0.2 + 0.7 * intensity})`;
      textValue = displayValues ? formatCurrency(value) : '';
    } else {
      // Red gradient for losses: light to dark based on magnitude
      const intensity = Math.min(1, Math.abs(value) / colorScale);
      fillColor = `rgba(239, 68, 68, ${0.2 + 0.7 * intensity})`;
      textValue = displayValues ? formatCurrency(value) : '';
    }
  } else if (metric === 'winRate') {
    // Blue gradient for win rate
    const intensity = value / 100; // 0-100 to 0-1
    fillColor = `rgba(59, 130, 246, ${0.1 + 0.8 * intensity})`;
    textValue = displayValues ? `${value.toFixed(0)}%` : '';
  } else {
    // Purple gradient for trade count
    const intensity = Math.min(1, value / colorScale);
    fillColor = `rgba(99, 102, 241, ${0.1 + 0.8 * intensity})`;
    textValue = displayValues ? `${value}` : '';
  }

  // Determine text color based on background intensity
  // This makes text more readable on different background colors
  const getLuminance = (color: string) => {
    // Extract RGB values from rgba
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (!match) return 0.5;
    
    const r = parseInt(match[1]) / 255;
    const g = parseInt(match[2]) / 255;
    const b = parseInt(match[3]) / 255;
    const a = parseFloat(match[4]);
    
    // Calculate luminance (perceived brightness)
    // 0 is dark, 1 is light
    return (0.299 * r + 0.587 * g + 0.114 * b) * a;
  };
  
  const luminance = getLuminance(fillColor);
  textColor = luminance > 0.5 ? '#1f2937' : '#e5e7eb';
  
  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke="#0f1117"
        strokeWidth={1}
      />
      {displayValues && textValue && width > 30 && height > 20 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize={9}
          fontWeight={500}
        >
          {textValue}
        </text>
      )}
    </g>
  );
};

/**
 * PerformanceHeatmap displays a heatmap of trading performance by day and time
 */
const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({
  data,
  loading = false,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [metric, setMetric] = useState<'pnL' | 'winRate' | 'trades'>('pnL');
  const [displayValues, setDisplayValues] = useState(false);
  const [highlightedHour, setHighlightedHour] = useState<string | null>(null);
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);
  
  // Only enable interactive features after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (loading) {
    return (
      <div className="w-full h-64 bg-[#131825] rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 bg-[#131825] rounded-lg flex items-center justify-center">
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }
  
  // Transform data for the heatmap (convert to x,y coordinates)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = [
    '12am', '1am', '2am', '3am', '4am', '5am',
    '6am', '7am', '8am', '9am', '10am', '11am',
    '12pm', '1pm', '2pm', '3pm', '4pm', '5pm',
    '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
  ];
  
  // Create data points with x, y coordinates for the scatter chart
  const heatmapPoints = data.map(item => ({
    x: hours.indexOf(item.hour),
    y: days.indexOf(item.day),
    day: item.day,
    hour: item.hour,
    value: item[metric],
    trades: item.trades,
    winRate: item.winRate,
    pnL: item.pnL,
    isHighlighted: 
      (highlightedHour === item.hour) || 
      (highlightedDay === item.day)
  }));
  
  // Find max absolute value for color scaling
  let colorScale: number;
  if (metric === 'pnL') {
    const maxAbsPnL = Math.max(...data.map(item => Math.abs(item.pnL)));
    colorScale = maxAbsPnL;
  } else if (metric === 'trades') {
    const maxTrades = Math.max(...data.map(item => item.trades));
    colorScale = maxTrades;
  } else {
    colorScale = 100; // Win rate is always 0-100
  }
  
  // Calculate aggregate metrics by hour and day
  const hourlyMetrics = useMemo(() => {
    const metrics: Record<string, { pnL: number, trades: number, winRate: number }> = {};
    
    hours.forEach(hour => {
      const hourData = data.filter(item => item.hour === hour);
      if (hourData.length === 0) {
        metrics[hour] = { pnL: 0, trades: 0, winRate: 0 };
      } else {
        const totalPnL = hourData.reduce((sum, item) => sum + item.pnL, 0);
        const totalTrades = hourData.reduce((sum, item) => sum + item.trades, 0);
        // Calculate weighted win rate
        const weightedWinRate = hourData.reduce((sum, item) => 
          sum + (item.winRate * item.trades), 0) / totalTrades;
        
        metrics[hour] = { 
          pnL: totalPnL, 
          trades: totalTrades, 
          winRate: isNaN(weightedWinRate) ? 0 : weightedWinRate 
        };
      }
    });
    
    return metrics;
  }, [data, hours]);
  
  const dailyMetrics = useMemo(() => {
    const metrics: Record<string, { pnL: number, trades: number, winRate: number }> = {};
    
    days.forEach(day => {
      const dayData = data.filter(item => item.day === day);
      if (dayData.length === 0) {
        metrics[day] = { pnL: 0, trades: 0, winRate: 0 };
      } else {
        const totalPnL = dayData.reduce((sum, item) => sum + item.pnL, 0);
        const totalTrades = dayData.reduce((sum, item) => sum + item.trades, 0);
        // Calculate weighted win rate
        const weightedWinRate = dayData.reduce((sum, item) => 
          sum + (item.winRate * item.trades), 0) / totalTrades;
        
        metrics[day] = { 
          pnL: totalPnL, 
          trades: totalTrades, 
          winRate: isNaN(weightedWinRate) ? 0 : weightedWinRate 
        };
      }
    });
    
    return metrics;
  }, [data, days]);
  
  // Get the best and worst times
  const getBestWorstTimes = () => {
    if (metric === 'pnL') {
      const bestHour = Object.entries(hourlyMetrics)
        .sort(([, a], [, b]) => b.pnL - a.pnL)[0];
      const worstHour = Object.entries(hourlyMetrics)
        .sort(([, a], [, b]) => a.pnL - b.pnL)[0];
      
      const bestDay = Object.entries(dailyMetrics)
        .sort(([, a], [, b]) => b.pnL - a.pnL)[0];
      const worstDay = Object.entries(dailyMetrics)
        .sort(([, a], [, b]) => a.pnL - b.pnL)[0];
      
      return {
        bestHour: bestHour ? bestHour[0] : null,
        worstHour: worstHour ? worstHour[0] : null,
        bestDay: bestDay ? bestDay[0] : null,
        worstDay: worstDay ? worstDay[0] : null,
      };
    } else if (metric === 'winRate') {
      const bestHour = Object.entries(hourlyMetrics)
        .filter(([, metrics]) => metrics.trades > 3) // Minimum trade threshold
        .sort(([, a], [, b]) => b.winRate - a.winRate)[0];
      const worstHour = Object.entries(hourlyMetrics)
        .filter(([, metrics]) => metrics.trades > 3)
        .sort(([, a], [, b]) => a.winRate - b.winRate)[0];
      
      const bestDay = Object.entries(dailyMetrics)
        .filter(([, metrics]) => metrics.trades > 3)
        .sort(([, a], [, b]) => b.winRate - a.winRate)[0];
      const worstDay = Object.entries(dailyMetrics)
        .filter(([, metrics]) => metrics.trades > 3)
        .sort(([, a], [, b]) => a.winRate - b.winRate)[0];
      
      return {
        bestHour: bestHour ? bestHour[0] : null,
        worstHour: worstHour ? worstHour[0] : null,
        bestDay: bestDay ? bestDay[0] : null,
        worstDay: worstDay ? worstDay[0] : null,
      };
    } else {
      const bestHour = Object.entries(hourlyMetrics)
        .sort(([, a], [, b]) => b.trades - a.trades)[0];
      const bestDay = Object.entries(dailyMetrics)
        .sort(([, a], [, b]) => b.trades - a.trades)[0];
      
      return {
        bestHour: bestHour ? bestHour[0] : null,
        worstHour: null,
        bestDay: bestDay ? bestDay[0] : null,
        worstDay: null,
      };
    }
  };
  
  const { bestHour, worstHour, bestDay, worstDay } = getBestWorstTimes();
  
  // Custom tooltip for detailed information
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1f2937] p-3 rounded-lg shadow-lg border border-gray-700 text-xs">
          <p className="font-bold text-white mb-1">{data.day} at {data.hour}</p>
          <p className="text-gray-300">
            Trades: <span className="font-mono text-white">{data.trades}</span>
          </p>
          <p className="text-blue-400">
            Win Rate: <span className="font-mono text-white">{formatPercent(data.winRate)}</span>
          </p>
          <p className={`${data.pnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            P&L: <span className="font-mono text-white">{formatCurrency(data.pnL)}</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  const handleAxisLabelClick = useCallback((value: string, axis: 'hour' | 'day') => {
    if (axis === 'hour') {
      setHighlightedHour(highlightedHour === value ? null : value);
      setHighlightedDay(null);
    } else {
      setHighlightedDay(highlightedDay === value ? null : value);
      setHighlightedHour(null);
    }
  }, [highlightedHour, highlightedDay]);
  
  return (
    <div className="w-full bg-[#131825] rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Trading Performance Heatmap
        </div>
        {isClient && (
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1 text-gray-300 text-xs">
              <input
                type="checkbox"
                checked={displayValues}
                onChange={(e) => setDisplayValues(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
              />
              <span>Show Values</span>
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setMetric('pnL')}
                className={`px-2 py-1 text-xs rounded transition-colors duration-150 ${metric === 'pnL' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300 hover:bg-[#252a38]'}`}
              >
                P&L
              </button>
              <button
                onClick={() => setMetric('winRate')}
                className={`px-2 py-1 text-xs rounded transition-colors duration-150 ${metric === 'winRate' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300 hover:bg-[#252a38]'}`}
              >
                Win Rate
              </button>
              <button
                onClick={() => setMetric('trades')}
                className={`px-2 py-1 text-xs rounded transition-colors duration-150 ${metric === 'trades' ? 'bg-blue-600 text-white' : 'bg-[#1a1f2c] text-gray-300 hover:bg-[#252a38]'}`}
              >
                Trades
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Best/Worst Times */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <p className="text-gray-400 text-xs mb-1">Best Performance</p>
          <div className="flex justify-between">
            <span className="text-xs text-green-400">
              Best Day: <span className="font-medium">{bestDay}</span>
            </span>
            <span className="text-xs text-green-400">
              Best Hour: <span className="font-medium">{bestHour}</span>
            </span>
          </div>
        </div>
        
        {(metric === 'pnL' || metric === 'winRate') && (
          <div className="bg-[#1a1f2c] p-2 rounded-md">
            <p className="text-gray-400 text-xs mb-1">Worst Performance</p>
            <div className="flex justify-between">
              <span className="text-xs text-red-400">
                Worst Day: <span className="font-medium">{worstDay}</span>
              </span>
              <span className="text-xs text-red-400">
                Worst Hour: <span className="font-medium">{worstHour}</span>
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
          >
            <XAxis 
              type="number" 
              dataKey="x" 
              name="hour" 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                const hour = hours[value] || '';
                return isClient && highlightedHour === hour ? `★ ${hour}` : hour;
              }}
              domain={[0, 23]}
              onClick={isClient ? (data) => handleAxisLabelClick(hours[data.value], 'hour') : undefined}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="day" 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                const day = days[value] || '';
                return isClient && highlightedDay === day ? `★ ${day}` : day;
              }}
              domain={[0, 6]}
              reversed
              onClick={isClient ? (data) => handleAxisLabelClick(days[data.value], 'day') : undefined}
            />
            <Tooltip
              cursor={{ stroke: 'white', strokeWidth: 2, fill: 'transparent' }}
              content={customTooltip}
            />
            <Scatter
              data={heatmapPoints}
              shape={(props) => (
                <HeatMapCell 
                  {...props} 
                  colorScale={colorScale} 
                  metric={metric} 
                  displayValues={displayValues}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Color legend */}
      <div className="flex justify-center items-center mt-2">
        <div className="text-xs text-gray-400 mr-2">
          {metric === 'pnL' ? 'P&L:' : 
           metric === 'winRate' ? 'Win Rate:' : 
           'Trade Count:'}
        </div>
        <div className="flex h-3">
          {metric === 'pnL' ? (
            <>
              <div className="w-16 bg-gradient-to-r from-red-500/80 to-red-500/20"></div>
              <div className="w-4 bg-[#1a1f2c]"></div>
              <div className="w-16 bg-gradient-to-r from-green-500/20 to-green-500/80"></div>
              <div className="flex justify-between w-full absolute">
                <span className="text-xs text-red-400">Loss</span>
                <span className="text-xs text-green-400 ml-28">Profit</span>
              </div>
            </>
          ) : metric === 'winRate' ? (
            <>
              <div className="w-36 bg-gradient-to-r from-blue-500/10 to-blue-500/80"></div>
              <div className="flex justify-between w-full absolute">
                <span className="text-xs text-blue-400/50">0%</span>
                <span className="text-xs text-blue-400 ml-32">100%</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-36 bg-gradient-to-r from-purple-500/10 to-purple-500/80"></div>
              <div className="flex justify-between w-full absolute">
                <span className="text-xs text-purple-400/50">Few</span>
                <span className="text-xs text-purple-400 ml-32">Many</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceHeatmap; 