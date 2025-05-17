'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TimeSeriesPerformance } from '@/lib/tradeMetrics';

interface EquityCurveProps {
  data: TimeSeriesPerformance[];
  loading?: boolean;
  initialCapital?: number;
}

// Consistent formatting functions that work the same on server and client
const formatCurrency = (value: number) => {
  return `$${Math.abs(value).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  // Use explicit format patterns instead of locale-specific options
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
};

/**
 * EquityCurve component displays a trader's equity curve over time
 * with drawdown visualization
 */
const EquityCurve: React.FC<EquityCurveProps> = ({
  data,
  loading = false,
  initialCapital = 10000,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [showDrawdown, setShowDrawdown] = useState(true);
  const [showDailyPnL, setShowDailyPnL] = useState(false);
  
  // Only render interactive elements after hydration
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

  // Calculate maximum and minimum equity values for chart scaling
  const maxEquity = Math.max(...data.map(d => d.equity));
  const minEquity = Math.min(...data.map(d => d.equity));
  
  // Find the max drawdown periods
  const maxDrawdownPoint = data.reduce((max, point) => 
    point.drawdown > (max?.drawdown || 0) ? point : max, data[0]);

  // Find data point with highest equity (peak)
  const peakPoint = data.reduce((max, point) => 
    point.equity > (max?.equity || 0) ? point : max, data[0]);
  
  // Calculate starting and ending equity
  const startingEquity = data[0]?.equity || initialCapital;
  const endingEquity = data[data.length - 1]?.equity || startingEquity;
  
  // Calculate overall return
  const totalReturn = ((endingEquity - startingEquity) / startingEquity) * 100;
  
  // Create padding for the chart
  const yDomain = [
    Math.max(0, minEquity * 0.95), // Don't go below 0, and add 5% padding
    maxEquity * 1.05, // Add 5% padding on top
  ];
  
  // Custom tooltip formatter
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1f2937] p-3 rounded-lg shadow-lg border border-gray-700 text-xs">
          <p className="font-bold text-white mb-1">{formatDate(label)}</p>
          <p className="text-blue-400">
            Equity: <span className="font-mono text-white">{formatCurrency(data.equity)}</span>
          </p>
          <p className="text-red-400">
            Drawdown: <span className="font-mono text-white">{formatCurrency(data.drawdown)} ({data.drawdownPercent.toFixed(2)}%)</span>
          </p>
          <p className={`${data.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Daily P&L: <span className="font-mono text-white">{formatCurrency(data.dailyPnL)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#131825] rounded-lg p-4">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <p className="text-gray-400 text-xs">Starting Equity</p>
          <p className="text-white text-sm font-mono">{formatCurrency(startingEquity)}</p>
        </div>
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <p className="text-gray-400 text-xs">Current Equity</p>
          <p className="text-white text-sm font-mono">{formatCurrency(endingEquity)}</p>
        </div>
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <p className="text-gray-400 text-xs">Max Drawdown</p>
          <p className="text-red-400 text-sm font-mono">{formatCurrency(maxDrawdownPoint.drawdown)} ({maxDrawdownPoint.drawdownPercent.toFixed(2)}%)</p>
        </div>
        <div className="bg-[#1a1f2c] p-2 rounded-md">
          <p className="text-gray-400 text-xs">Total Return</p>
          <p className={`text-sm font-mono ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </p>
        </div>
      </div>
      
      {/* Display controls - Only show when client-side */}
      {isClient && (
        <div className="flex space-x-3 mb-2 text-xs">
          <label className="flex items-center space-x-1 text-gray-300">
            <input
              type="checkbox"
              checked={showDrawdown}
              onChange={(e) => setShowDrawdown(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
            />
            <span>Show Drawdown</span>
          </label>
          <label className="flex items-center space-x-1 text-gray-300">
            <input
              type="checkbox"
              checked={showDailyPnL}
              onChange={(e) => setShowDailyPnL(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
            />
            <span>Show Daily P&L</span>
          </label>
        </div>
      )}
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#212946" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
              tickFormatter={formatCurrency}
              domain={yDomain}
            />
            <Tooltip content={customTooltip} />
            {isClient && (
              <Legend 
                wrapperStyle={{ color: '#9ca3af', fontSize: 12 }}
                onClick={(e) => {
                  if (e.dataKey === 'drawdown') {
                    setShowDrawdown(!showDrawdown);
                  } else if (e.dataKey === 'dailyPnL') {
                    setShowDailyPnL(!showDailyPnL);
                  }
                }}
              />
            )}
            
            {/* Reference line for initial capital */}
            <ReferenceLine 
              y={initialCapital} 
              stroke="#6b7280" 
              strokeDasharray="3 3" 
              label={{ 
                value: 'Initial Capital', 
                fill: '#9ca3af',
                fontSize: 10,
                position: 'insideBottomRight'
              }} 
            />
            
            {/* Reference area for max drawdown period */}
            {showDrawdown && maxDrawdownPoint && maxDrawdownPoint.drawdown > 0 && (
              <ReferenceArea 
                x1={maxDrawdownPoint.date} 
                x2={maxDrawdownPoint.date} 
                y1={maxDrawdownPoint.equity} 
                y2={maxDrawdownPoint.equity + maxDrawdownPoint.drawdown} 
                stroke="red" 
                strokeOpacity={0.3}
                label={{ 
                  value: 'Max DD', 
                  fill: '#ef4444',
                  fontSize: 8
                }}
              />
            )}
            
            {/* Drawdown Area */}
            {showDrawdown && (
              <Area
                type="monotone"
                dataKey="drawdown"
                name="Drawdown"
                fill="#ef4444"
                fillOpacity={0.1}
                stroke="#ef4444"
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            
            {/* Daily P&L */}
            {showDailyPnL && (
              <Line
                type="monotone"
                dataKey="dailyPnL"
                name="Daily P&L"
                stroke="#10b981"
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', stroke: '#064e3b', strokeWidth: 1 }}
              />
            )}
            
            {/* Equity Line */}
            <Line
              type="monotone"
              dataKey="equity"
              name="Equity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }}
            />
            
            {/* Peak reference line */}
            <ReferenceLine 
              y={peakPoint.equity} 
              stroke="#3b82f6" 
              strokeDasharray="3 3" 
              label={{ 
                value: 'Peak', 
                position: 'insideTopRight',
                fill: '#3b82f6',
                fontSize: 10
              }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Time period selector - Only show when client-side */}
      {isClient && (
        <div className="flex justify-center mt-2 space-x-2">
          <button className="text-xs bg-[#1a1f2c] px-2 py-1 rounded text-gray-300 hover:bg-[#252a38] transition-colors duration-150">1M</button>
          <button className="text-xs bg-[#1a1f2c] px-2 py-1 rounded text-gray-300 hover:bg-[#252a38] transition-colors duration-150">3M</button>
          <button className="text-xs bg-[#1a1f2c] px-2 py-1 rounded text-gray-300 hover:bg-[#252a38] transition-colors duration-150">6M</button>
          <button className="text-xs bg-blue-600 px-2 py-1 rounded text-white transition-colors duration-150">YTD</button>
          <button className="text-xs bg-[#1a1f2c] px-2 py-1 rounded text-gray-300 hover:bg-[#252a38] transition-colors duration-150">1Y</button>
          <button className="text-xs bg-[#1a1f2c] px-2 py-1 rounded text-gray-300 hover:bg-[#252a38] transition-colors duration-150">All</button>
        </div>
      )}
    </div>
  );
};

export default EquityCurve; 