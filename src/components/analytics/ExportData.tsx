'use client';

import React, { useState } from 'react';
import { Trade } from '@/lib/types';
import { 
  PerformanceMetrics, 
  TimeSeriesPerformance, 
  TradeDistribution,
  MonthlyPerformance,
  StrategyPerformance,
  SymbolPerformance,
  TradeTypePerformance,
  HeatmapData
} from '@/lib/tradeMetrics';

interface ExportDataProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  metrics: PerformanceMetrics | null;
  equityCurveData: TimeSeriesPerformance[];
  distributionData: TradeDistribution[];
  monthlyData: MonthlyPerformance[];
  strategyData: StrategyPerformance[];
  symbolData: SymbolPerformance[];
  tradeTypeData: TradeTypePerformance[];
  heatmapData: HeatmapData[];
}

type ExportFormat = 'csv' | 'json' | 'pdf';
type ExportDataType = 'trades' | 'metrics' | 'equityCurve' | 'distribution' | 'monthly' | 'strategy' | 'symbol' | 'tradeType' | 'heatmap';

// Consistent color system
const COLORS = {
  primary: '#3b82f6', // Blue
  success: '#10b981', // Green
  danger: '#ef4444', // Red
  warning: '#f59e0b', // Amber
  info: '#6366f1', // Indigo
  background: {
    dark: '#131825',
    medium: '#151823',
    light: '#1a1f2c',
    lighter: '#252a38'
  },
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    tertiary: '#6b7280',
    disabled: '#4b5563'
  },
  border: '#1c2033'
};

const ExportData: React.FC<ExportDataProps> = ({
  isOpen,
  onClose,
  trades,
  metrics,
  equityCurveData,
  distributionData,
  monthlyData,
  strategyData,
  symbolData,
  tradeTypeData,
  heatmapData
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [selectedDataTypes, setSelectedDataTypes] = useState<ExportDataType[]>(['trades']);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleToggleDataType = (dataType: ExportDataType) => {
    if (selectedDataTypes.includes(dataType)) {
      setSelectedDataTypes(selectedDataTypes.filter(type => type !== dataType));
    } else {
      setSelectedDataTypes([...selectedDataTypes, dataType]);
    }
  };

  const handleSelectAll = () => {
    const allDataTypes: ExportDataType[] = [
      'trades', 'metrics', 'equityCurve', 'distribution', 
      'monthly', 'strategy', 'symbol', 'tradeType', 'heatmap'
    ];
    setSelectedDataTypes(allDataTypes);
  };

  const handleUnselectAll = () => {
    setSelectedDataTypes([]);
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    const headerRow = headers.join(',');
    
    // Create data rows
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        // Handle arrays, objects, and special characters
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    // Combine header and rows
    return [headerRow, ...rows].join('\n');
  };

  const downloadCSV = (data: any[], filename: string) => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Create a timestamp for filenames
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Export each selected data type
      for (const dataType of selectedDataTypes) {
        let data;
        let filename = `trading-journal-${dataType}-${timestamp}`;
        
        switch (dataType) {
          case 'trades':
            data = trades;
            break;
          case 'metrics':
            data = metrics ? [metrics] : [];
            break;
          case 'equityCurve':
            data = equityCurveData;
            break;
          case 'distribution':
            data = distributionData;
            break;
          case 'monthly':
            data = monthlyData;
            break;
          case 'strategy':
            data = strategyData;
            break;
          case 'symbol':
            data = symbolData;
            break;
          case 'tradeType':
            data = tradeTypeData;
            break;
          case 'heatmap':
            data = heatmapData;
            break;
        }
        
        if (data) {
          if (exportFormat === 'csv') {
            downloadCSV(Array.isArray(data) ? data : [data], filename);
          } else if (exportFormat === 'json') {
            downloadJSON(data, filename);
          }
          
          // Add a small delay between downloads to avoid browser issues
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#151823] rounded-xl border border-[#1c2033] p-6 shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Export Data</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Export Format */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Export Format</h3>
          <div className="flex space-x-4">
            <label className="flex items-center hover:bg-[#1a1f2c]/40 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'csv'}
                onChange={() => setExportFormat('csv')}
                className="mr-2 text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">CSV</span>
            </label>
            <label className="flex items-center hover:bg-[#1a1f2c]/40 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'json'}
                onChange={() => setExportFormat('json')}
                className="mr-2 text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">JSON</span>
            </label>
            <label className="flex items-center opacity-50 cursor-not-allowed p-1.5">
              <input
                type="radio"
                name="format"
                disabled
                className="mr-2 text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">PDF (Coming Soon)</span>
            </label>
          </div>
        </div>

        {/* Data Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-300">Select Data to Export</h3>
            <div className="flex space-x-3">
              <button 
                onClick={handleSelectAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150 hover:underline"
              >
                Select All
              </button>
              <button 
                onClick={handleUnselectAll}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors duration-150 hover:underline"
              >
                Unselect All
              </button>
            </div>
          </div>
          
          <div className="bg-[#1a1f2c] rounded-lg p-4 grid grid-cols-2 gap-3">
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('trades')}
                onChange={() => handleToggleDataType('trades')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Trade Records</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('metrics')}
                onChange={() => handleToggleDataType('metrics')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Performance Metrics</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('equityCurve')}
                onChange={() => handleToggleDataType('equityCurve')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Equity Curve</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('distribution')}
                onChange={() => handleToggleDataType('distribution')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">P&L Distribution</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('monthly')}
                onChange={() => handleToggleDataType('monthly')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Monthly Performance</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('strategy')}
                onChange={() => handleToggleDataType('strategy')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Strategy Performance</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('symbol')}
                onChange={() => handleToggleDataType('symbol')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Symbol Performance</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('tradeType')}
                onChange={() => handleToggleDataType('tradeType')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Long/Short Analysis</span>
            </label>
            <label className="flex items-center hover:bg-[#252a38]/50 p-1.5 rounded transition-colors duration-150 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('heatmap')}
                onChange={() => handleToggleDataType('heatmap')}
                className="mr-2 rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-gray-300 text-sm">Performance Heatmap</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white text-sm transition-colors duration-150 hover:bg-[#1a1f2c]/50 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedDataTypes.length === 0 || isExporting}
            className={`px-6 py-2 bg-blue-600 text-white rounded-lg text-sm transition-all duration-150 flex items-center ${
              selectedDataTypes.length === 0 || isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {isExporting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportData; 