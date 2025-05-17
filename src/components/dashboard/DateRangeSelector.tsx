'use client'

import React from 'react';

export type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export default function DateRangeSelector({ 
  selectedRange, 
  onChange,
  className = ''
}: DateRangeSelectorProps) {
  const ranges: {label: string; value: DateRange}[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
    { label: '1Y', value: '1y' },
    { label: 'All', value: 'all' }
  ];

  return (
    <div className={`bg-[#1a1f2c] rounded-lg flex ${className}`}>
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            selectedRange === range.value 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
} 