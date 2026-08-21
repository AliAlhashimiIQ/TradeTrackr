'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TradeMetrics } from '@/lib/types';

interface MetricCardsProps {
  metrics: TradeMetrics;
  isLoading: boolean;
}

// Card component to show a single metric with spring animation
const MetricCard = ({ 
  title, 
  value, 
  isLoading, 
  textColor = 'text-gray-900 dark:text-white',
  index = 0
}: { 
  title: string; 
  value: string | number; 
  isLoading: boolean; 
  textColor?: string;
  index?: number;
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[var(--surface-2)] rounded-xl p-4 animate-pulse border border-black/5 dark:border-transparent">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25, delay: index * 0.05 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2, transition: { duration: 0.15 } }}
      className="bg-white dark:bg-[var(--surface-2)] rounded-xl p-4 border border-black/5 dark:border-white/[0.06] shadow-sm hover:shadow-md transition-shadow"
    >
      <h4 className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1.5">{title}</h4>
      <div className={`text-xl font-bold font-mono tabular-nums ${textColor}`}>{value}</div>
    </motion.div>
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
        index={0}
        title="Today's P/L" 
        value={formatCurrency(metrics.total_pnl)} 
        isLoading={isLoading}
        textColor={metrics.total_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} 
      />
      
      <MetricCard 
        index={1}
        title="Win Rate Today" 
        value={formatPercentage(metrics.win_rate)} 
        isLoading={isLoading} 
      />
      
      <MetricCard 
        index={2}
        title="Trades Today" 
        value={metrics.total_trades} 
        isLoading={isLoading} 
      />
      
      <MetricCard 
        index={3}
        title="Journal Rate" 
        value="100%" 
        isLoading={isLoading} 
      />
    </div>
  );
}
