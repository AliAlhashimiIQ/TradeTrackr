import React from 'react';
import { Trade } from '@/lib/types';

interface RecentTradesListProps {
  trades: Trade[];
  isLoading: boolean;
}

export default function RecentTradesList({ trades, isLoading }: RecentTradesListProps) {
  // Format date to display only time (e.g., "09:30")
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format profit/loss with + sign for positive values
  const formatPnL = (value: number) => {
    return value > 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-[#131825] rounded-lg p-4 animate-pulse">
        <div className="h-6 w-24 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // If no trades
  if (trades.length === 0) {
    return (
      <div className="bg-[#131825] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
        <div className="text-gray-400 text-center py-6">No trades found</div>
      </div>
    );
  }

  return (
    <div className="bg-[#131825] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-[#0f1117]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Exit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P/L</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Journal</th>
            </tr>
          </thead>
          <tbody className="bg-[#131825] divide-y divide-gray-700">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-[#1d2333]">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatTime(trade.entry_time)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{trade.symbol}</td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm ${trade.type === 'Long' ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.type}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{trade.entry_price.toFixed(4)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{trade.exit_price.toFixed(4)}</td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${trade.profit_loss > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPnL(trade.profit_loss)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-400">
                  <button className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 