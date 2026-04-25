'use client';

import React from 'react';
import { Card } from "@tremor/react";
import { LineChart } from "@tremor/react";

interface SparkLineChartProps {
  data: number[];
  categories: string[];
  colors: string[];
  showAnimation?: boolean;
  showGradient?: boolean;
  className?: string;
}

const SparkLineChart: React.FC<SparkLineChartProps> = ({
  data,
  categories,
  colors,
  showAnimation = true,
  showGradient = false,
  className = '',
}) => {
  // Transform data into the format expected by Tremor
  const chartData = data.map((value, index) => ({
    value: value,
    timestamp: index,
  }));

  return (
    <div className={className}>
      <LineChart
        data={chartData}
        index="timestamp"
        categories={categories}
        colors={colors}
        showAnimation={showAnimation}
        showLegend={false}
        showXAxis={false}
        showYAxis={false}
        showGridLines={false}
        curveType="monotone"
        minValue={Math.min(...data)}
        maxValue={Math.max(...data)}
      />
    </div>
  );
};

export default SparkLineChart; 
