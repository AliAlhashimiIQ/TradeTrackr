'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { TradeTypePerformance as TradeTypePerformanceType } from '@/lib/tradeMetrics';

interface TradeTypePerformanceProps {
  data: TradeTypePerformanceType[];
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

// Consistent color system
const COLORS = {
  Long: '#3b82f6', // Blue
  Short: '#ef4444', // Red
  Profit: '#10b981', // Green
  Loss: '#f97316'  // Orange
};

const RADIAN = Math.PI / 180;

const renderActiveShape = (props: any) => {
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value, winRate
  } = props;
  
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#e5e7eb" fontSize={12}>
        {payload.type}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={14} textAnchor={textAnchor} fill="#e5e7eb" fontSize={10}>
        {`${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={28} textAnchor={textAnchor} fill="#e5e7eb" fontSize={10}>
        {`Win Rate: ${formatPercent(winRate)}`}
      </text>
    </g>
  );
};

/**
 * TradeTypePerformance component displays a comparison of long vs short trade performance
 */
const TradeTypePerformance: React.FC<TradeTypePerformanceProps> = ({
  data,
  loading = false,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'pie' | 'bar' | 'radar'>('pie');

  // Only enable interactive features after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const onPieEnter = (_: any, index: number) => {
    if (isClient) {
    setActiveIndex(index);
    }
  };

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

  // Calculate total trades and P&L
  const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);
  const totalPnL = data.reduce((sum, item) => sum + item.pnL, 0);
  
  // Prepare data for the pie chart
  const pieChartData = data
    .filter(item => item.trades > 0)
    .map(item => ({
      type: item.type,
      value: Math.abs(item.pnL), // Use absolute P&L for size, but color will indicate profit/loss
      winRate: item.winRate,
      isProfit: item.pnL >= 0,
      pnL: item.pnL,
      trades: item.trades,
      averageReturn: item.averageReturn,
      profitFactor: item.profitFactor
    }));
  
  // Prepare data for the bar chart comparison
  const barChartData = [
    { 
      name: 'Win Rate',
      Long: data.find(d => d.type === 'Long')?.winRate || 0,
      Short: data.find(d => d.type === 'Short')?.winRate || 0,
      unit: '%'
    },
    { 
      name: 'Avg Return',
      Long: data.find(d => d.type === 'Long')?.averageReturn || 0,
      Short: data.find(d => d.type === 'Short')?.averageReturn || 0,
      unit: '$'
    },
    { 
      name: 'Profit Factor',
      Long: data.find(d => d.type === 'Long')?.profitFactor || 0,
      Short: data.find(d => d.type === 'Short')?.profitFactor || 0,
      unit: ''
    }
  ];
  
  // Prepare data for the radar chart
  const radarChartData = [
    {
      subject: 'Win Rate',
      Long: data.find(d => d.type === 'Long')?.winRate || 0,
      Short: data.find(d => d.type === 'Short')?.winRate || 0,
      fullMark: 100,
    },
    {
      subject: 'Profit Factor',
      Long: Math.min(5, data.find(d => d.type === 'Long')?.profitFactor || 0),
      Short: Math.min(5, data.find(d => d.type === 'Short')?.profitFactor || 0),
      fullMark: 5,
    },
    {
      subject: 'Volume',
      Long: data.find(d => d.type === 'Long')?.trades || 0,
      Short: data.find(d => d.type === 'Short')?.trades || 0,
      fullMark: totalTrades,
    },
    {
      subject: 'Avg Return',
      Long: Math.max(0, data.find(d => d.type === 'Long')?.averageReturn || 0) * 100,
      Short: Math.max(0, data.find(d => d.type === 'Short')?.averageReturn || 0) * 100,
      fullMark: 500,
    },
    {
      subject: 'Consistency',
      Long: data.find(d => d.type === 'Long')?.profitFactor ? 
        Math.min(100, data.find(d => d.type === 'Long')!.profitFactor * 20) : 0,
      Short: data.find(d => d.type === 'Short')?.profitFactor ? 
        Math.min(100, data.find(d => d.type === 'Short')!.profitFactor * 20) : 0,
      fullMark: 100,
    },
  ];

  // Stats summaries
  const longData = data.find(item => item.type === 'Long') || { trades: 0, winRate: 0, pnL: 0, profitFactor: 0, averageReturn: 0 };
  const shortData = data.find(item => item.type === 'Short') || { trades: 0, winRate: 0, pnL: 0, profitFactor: 0, averageReturn: 0 };
  
  // Calculate which type performs better
  const betterWinRate = longData.winRate > shortData.winRate ? 'Long' : 'Short';
  const betterProfitFactor = longData.profitFactor > shortData.profitFactor ? 'Long' : 'Short';
  const betterAvgReturn = longData.averageReturn > shortData.averageReturn ? 'Long' : 'Short';
  const betterPnL = longData.pnL > shortData.pnL ? 'Long' : 'Short';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#1d1f2b] p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">{label || data.name || data.subject || 'Details'}</p>
          {payload.map((p: any, idx: number) => {
            const val = p.value;
            const isCurrency = data.unit === '$' || p.payload.subject === 'Avg Return' || p.name.includes('P&L');
            const isPercent = data.unit === '%' || p.payload.subject === 'Win Rate' || p.payload.subject === 'Consistency';
            
            const displayVal = isCurrency 
              ? formatCurrency(val) 
              : isPercent 
                ? `${val}%` 
                : val;

            return (
              <p key={idx} className="text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.stroke }} />
                <span>{p.name}:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{displayVal}</span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Render the view based on selected mode
  const renderView = () => {
    switch (viewMode) {
      case 'bar':
  return (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#212946" />
                <XAxis 
                  type="number" 
                  tickFormatter={(value: number) => {
                    return value.toString();
                  }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  tick={{ fill: '#9ca3af' }}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(128, 128, 128, 0.05)' }}
                />
                <Legend />
                <Bar dataKey="Long" fill={COLORS.Long} name="Long Trades">
                  <LabelList 
                    dataKey="Long" 
                    position="right" 
                    fill="#ffffff" 
                    fontSize={10}
                    formatter={(value: number, entry: any) => {
                      const metric = entry?.payload;
                      if (metric?.unit === '%') return `${value}%`;
                      if (metric?.unit === '$') return formatCurrency(value as number);
                      return value;
                    }}
                  />
                </Bar>
                <Bar dataKey="Short" fill={COLORS.Short} name="Short Trades">
                  <LabelList 
                    dataKey="Short" 
                    position="right" 
                    fill="#ffffff" 
                    fontSize={10}
                    formatter={(value: number, entry: any) => {
                      const metric = entry?.payload;
                      if (metric?.unit === '%') return `${value}%`;
                      if (metric?.unit === '$') return formatCurrency(value as number);
                      return value;
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'radar':
        return (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar
                  name="Long Trades"
                  dataKey="Long"
                  stroke={COLORS.Long}
                  fill={COLORS.Long}
                  fillOpacity={0.3}
                />
                <Radar
                  name="Short Trades"
                  dataKey="Short"
                  stroke={COLORS.Short}
                  fill={COLORS.Short}
                  fillOpacity={0.3}
                />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'pie':
      default:
        return (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
                  activeIndex={isClient ? activeIndex : undefined}
                  activeShape={(props: any) => renderActiveShape({ ...props, winRate: pieChartData[activeIndex]?.winRate || 0 })}
                  data={pieChartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
                  {pieChartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                      fill={entry.type === 'Long' ? COLORS.Long : COLORS.Short}
                      stroke={entry.isProfit ? COLORS.Profit : COLORS.Loss}
                strokeWidth={entry.isProfit ? 3 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
          </div>
        );
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/[0.05] rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Trade Type Performance
        </div>
        {isClient && (
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setViewMode('pie')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === 'pie' ? 'bg-indigo-600 text-white shadow' : 'text-slate-655 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Pie
            </button>
            <button
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === 'bar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-655 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === 'radar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-655 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Radar
            </button>
          </div>
        )}
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 dark:bg-[#1a1f2c] border border-slate-200 dark:border-white/[0.03] p-3.5 rounded-xl">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 mr-1.5"></span>
            Long Trades {betterPnL === 'Long' && <span className="ml-1 text-green-500 text-xs">★</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Count</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{longData.trades}</div>
              <div className="text-xs text-gray-500">
                {((longData.trades / totalTrades) * 100).toFixed(0)}% of total
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Win Rate</div>
              <div className="text-base font-semibold text-white flex items-center">
                {formatPercent(longData.winRate)}
                {betterWinRate === 'Long' && <span className="ml-1 text-green-400 text-xs">★</span>}
              </div>
              <div className="text-xs text-gray-500">
                {longData.profitFactor.toFixed(2)} profit factor
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">P&L</div>
              <div className={`text-base font-bold ${longData.pnL >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'}`}>
                {formatCurrency(longData.pnL)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                {formatCurrency(longData.averageReturn)} avg
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-[#1a1f2c] border border-slate-200 dark:border-white/[0.03] p-3.5 rounded-xl">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 mr-1.5"></span>
            Short Trades {betterPnL === 'Short' && <span className="ml-1 text-green-500 text-xs">★</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Count</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{shortData.trades}</div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                {((shortData.trades / totalTrades) * 100).toFixed(0)}% of total
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Win Rate</div>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                {formatPercent(shortData.winRate)}
                {betterWinRate === 'Short' && <span className="ml-1 text-green-500 text-xs">★</span>}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                {shortData.profitFactor.toFixed(2)} PF
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">P&L</div>
              <div className={`text-base font-bold ${shortData.pnL >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'}`}>
                {formatCurrency(shortData.pnL)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                {formatCurrency(shortData.averageReturn)} avg
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Summary banner */}
      <div className="bg-slate-50 dark:bg-[#1a1f2c]/50 border border-slate-200 dark:border-white/5 p-3.5 rounded-xl mb-4">
        <div className="text-xs text-slate-655 dark:text-gray-300 flex flex-col sm:flex-row justify-between gap-2">
          <span>Total P&L: 
            <span className={`font-bold ml-1 ${totalPnL >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'}`}>
              {formatCurrency(totalPnL)}
            </span>
          </span>
          <span>Better Direction: 
            <span className={`font-bold ml-1 ${betterPnL === 'Long' ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {betterPnL} Trades
            </span>
          </span>
          <span>Edge: 
            <span className={`font-bold ml-1 ${Math.abs(longData.winRate - shortData.winRate) > 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              {Math.abs(longData.winRate - shortData.winRate).toFixed(1)}% win rate difference
            </span>
          </span>
        </div>
      </div>
      
      {/* Visualization */}
      {renderView()}
      
      {/* Insight text */}
      <div className="text-xs text-slate-650 dark:text-slate-350 mt-4 bg-slate-50 dark:bg-[#1a1f2c]/50 border border-slate-200 dark:border-white/5 p-3 rounded-xl">
        {longData.pnL > shortData.pnL ? (
          <p>
            Your <span className="font-bold text-indigo-600 dark:text-indigo-400">long trades</span> are more profitable overall 
            {longData.winRate > shortData.winRate ? 
              " and have a higher win rate." : 
              ", despite having a lower win rate."}
          </p>
        ) : (
          <p>
            Your <span className="font-bold text-rose-600 dark:text-rose-400">short trades</span> are more profitable overall
            {shortData.winRate > longData.winRate ? 
              " and have a higher win rate." : 
              ", despite having a lower win rate."}
          </p>
        )}
      </div>
    </div>
  );
};

export default TradeTypePerformance; 
