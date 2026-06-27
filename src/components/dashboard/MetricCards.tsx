import React from 'react';
import { TradeMetrics } from '@/lib/types';

interface MetricCardsProps {
  metrics: TradeMetrics;
  isLoading: boolean;
}

// Card component to show a single metric
const MetricCard = ({ 
  title, 
  value, 
  isLoading, 
  textColor = 'text-gray-900 dark:text-white' 
}: { 
  title: string; 
  value: string | number; 
  isLoading: boolean; 
  textColor?: string;
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#131825] rounded-lg p-4 animate-pulse border border-black/5 dark:border-transparent">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#131825] rounded-lg p-4 border border-black/5 dark:border-transparent">
      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</h4>
      <div className={`text-xl font-bold ${textColor}`}>{value}</div>
    </div>
  );
};

export default function MetricCards({ metrics, isLoading }: MetricCardsProps) {
  // Format metrics for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return value != null ? `${value.toFixed(0)}%` : '--';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Today's P/L" 
        value={formatCurrency(metrics.total_pnl)} 
        isLoading={isLoading}
        textColor={metrics.total_pnl >= 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'} 
      />
      
      <MetricCard 
        title="Win Rate Today" 
        value={formatPercentage(metrics.win_rate)} 
        isLoading={isLoading} 
      />
      
      <MetricCard 
        title="Trades Today" 
        value={metrics.total_trades} 
        isLoading={isLoading} 
      />
      
      <MetricCard 
        title="Journal Rate" 
        value="100%" 
        isLoading={isLoading} 
      />
    </div>
  );
}
