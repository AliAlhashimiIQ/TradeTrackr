'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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

interface DataPoint {
  date: string;
  value: number;
}

interface EquityCurveProps {
  data: DataPoint[];
  simulatedData?: DataPoint[];
  initialCapital?: number;
  type?: 'line' | 'bar' | 'pie';
  loading?: boolean;
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actualPoint = payload.find((p: any) => p.dataKey === 'value');
    const simPoint = payload.find((p: any) => p.name === 'Simulated Balance' || p.dataKey === 'simulatedValue');
    
    return (
      <div className="bg-slate-950/95 p-3 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-sm">
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        {actualPoint && (
          <div className="mb-2">
            <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Actual Balance</p>
            <p className="text-sm font-bold text-slate-100">${actualPoint.value.toFixed(2)}</p>
          </div>
        )}
        {simPoint && (
          <div className="border-t border-slate-800/80 pt-1.5 mt-1.5">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Simulated Balance</p>
            <p className="text-sm font-bold text-slate-100">${simPoint.value.toFixed(2)}</p>
            {actualPoint && (
              <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                Difference: +${(simPoint.value - actualPoint.value).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

/**
 * EquityCurve component displays a trader's equity curve over time
 * with drawdown visualization
 */
const EquityCurve: React.FC<EquityCurveProps> = ({
  data,
  simulatedData,
  initialCapital = 10000,
  type = 'line',
  loading = false,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [showDrawdown, setShowDrawdown] = useState(true);
  const [showDailyPnL, setShowDailyPnL] = useState(false);
  
  // Only render interactive elements after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Process the data to include daily change
  const processedData = useMemo(() => {
    return data.map((point, index, arr) => {
      const prevValue = index > 0 ? arr[index - 1].value : initialCapital;
      const change = point.value - prevValue;
      const changePercent = (change / prevValue) * 100;
      
      return {
        ...point,
        change,
        changePercent
      };
    });
  }, [data, initialCapital]);

  // Process the merged data for actual vs simulated
  const mergedData = useMemo(() => {
    if (!simulatedData || simulatedData.length === 0) {
      return processedData;
    }

    const map: Record<string, { date: string; value?: number; simulatedValue?: number; change?: number; changePercent?: number }> = {};
    
    processedData.forEach(p => {
      map[p.date] = { 
        date: p.date, 
        value: p.value, 
        change: p.change, 
        changePercent: p.changePercent 
      };
    });
    
    const processedSim = simulatedData.map((point, index, arr) => {
      const prevValue = index > 0 ? arr[index - 1].value : initialCapital;
      const change = point.value - prevValue;
      const changePercent = (change / prevValue) * 100;
      return {
        ...point,
        change,
        changePercent
      };
    });

    processedSim.forEach(p => {
      if (map[p.date]) {
        map[p.date].simulatedValue = p.value;
      } else {
        map[p.date] = { 
          date: p.date, 
          simulatedValue: p.value 
        };
      }
    });

    const sorted = Object.values(map).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let lastValue = initialCapital;
    let lastSimValue = initialCapital;
    
    return sorted.map(item => {
      if (item.value !== undefined) {
        lastValue = item.value;
      }
      if (item.simulatedValue !== undefined) {
        lastSimValue = item.simulatedValue;
      }
      return {
        ...item,
        value: item.value ?? lastValue,
        simulatedValue: item.simulatedValue ?? lastSimValue
      };
    });
  }, [processedData, simulatedData, initialCapital]);

  // For pie chart, calculate profit/loss categories
  const profitLossData = (() => {
    // Count days with profit, loss, or breakeven
    const profitDays = processedData.filter(d => d.change > 0).length;
    const lossDays = processedData.filter(d => d.change < 0).length;
    const breakEvenDays = processedData.filter(d => d.change === 0).length;
    
    // Get total profit and loss amounts
    const totalProfit = processedData
      .filter(d => d.change > 0)
      .reduce((sum, d) => sum + d.change, 0);
    
    const totalLoss = Math.abs(
      processedData
        .filter(d => d.change < 0)
        .reduce((sum, d) => sum + d.change, 0)
    );
    
    return [
      { name: 'Profit', value: totalProfit, count: profitDays },
      { name: 'Loss', value: totalLoss, count: lossDays },
      { name: 'Breakeven', value: 0, count: breakEvenDays }
    ];
  })();

  // For setting grid based on data
  const minValue = Math.min(
    ...processedData.map(d => d.value), 
    ...(simulatedData ? simulatedData.map(d => d.value) : [])
  );
  const maxValue = Math.max(
    ...processedData.map(d => d.value), 
    ...(simulatedData ? simulatedData.map(d => d.value) : [])
  );
  
  // Calculate appropriate tick values for Y axis
  const valueDomain = [
    Math.floor(minValue * 0.95),
    Math.ceil(maxValue * 1.05)
  ];

  // Calculate if we're in profit or loss overall
  const isOverallProfit = processedData.length > 0 && 
    processedData[processedData.length - 1].value > initialCapital;

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  // Render appropriate chart based on type
  return (
    <div className="h-full w-full">
      {type === 'line' && (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.4} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              domain={valueDomain}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={initialCapital} stroke="#64748b" strokeDasharray="3 4" strokeOpacity={0.65} />
            {simulatedData && simulatedData.length > 0 && (
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fill: '#e2e8f0' }} />
            )}
            <Area 
              type="monotone" 
              dataKey="value" 
              name="Actual Balance"
              fill="url(#colorValue)" 
              stroke="#60a5fa" 
              strokeWidth={2.5}
              animationDuration={800}
            />
            {simulatedData && simulatedData.length > 0 && (
              <Line
                type="monotone"
                dataKey="simulatedValue"
                name="Simulated Balance"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={800}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
      
      {type === 'bar' && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="2 4" stroke="#334155" strokeOpacity={0.4} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={initialCapital} stroke="#64748b" strokeDasharray="3 4" strokeOpacity={0.65} />
            <Bar 
              dataKey="change" 
              animationDuration={800}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.change >= 0 ? '#34d399' : '#f87171'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      
      {type === 'pie' && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={profitLossData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              animationDuration={800}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              <Cell fill="#34d399" /> {/* Profit */}
              <Cell fill="#f87171" /> {/* Loss */}
              <Cell fill="#94a3b8" /> {/* Breakeven */}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EquityCurve; 
