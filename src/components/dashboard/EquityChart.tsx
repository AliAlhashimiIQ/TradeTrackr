'use client'

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { ChartData } from '@/lib/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EquityChartProps {
  data: ChartData;
  isLoading: boolean;
}

export default function EquityChart({ data, isLoading }: EquityChartProps) {
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 17, 23, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      }
    },
  };

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Equity',
        data: data.values,
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#131825] rounded-lg animate-pulse">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="h-64 py-2">
      <Line options={chartOptions} data={chartData} />
    </div>
  );
} 