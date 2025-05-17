'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, getValueColorClass } from '@/lib/utils';
import { Trade } from '@/lib/types';

interface DashboardRecentActivityProps {
  trades: Trade[];
}

// Mock data for initial development
const mockRecentTrades = [
  {
    id: '1',
    symbol: 'EURUSD',
    type: 'Long',
    entry_price: 1.0742,
    exit_price: 1.0795,
    entry_time: '2023-06-01T09:30:00Z',
    exit_time: '2023-06-01T14:45:00Z',
    quantity: 10000,
    profit_loss: 53,
    strategy: 'Breakout',
    user_id: '123',
    created_at: '2023-06-01T09:30:00Z',
    updated_at: '2023-06-01T14:45:00Z'
  },
  {
    id: '2',
    symbol: 'BTCUSD',
    type: 'Short',
    entry_price: 36750,
    exit_price: 36250,
    entry_time: '2023-05-30T10:15:00Z',
    exit_time: '2023-05-30T16:20:00Z',
    quantity: 0.5,
    profit_loss: 250,
    strategy: 'Trend Reversal',
    user_id: '123',
    created_at: '2023-05-30T10:15:00Z',
    updated_at: '2023-05-30T16:20:00Z'
  },
  {
    id: '3',
    symbol: 'AAPL',
    type: 'Long',
    entry_price: 182.30,
    exit_price: 180.45,
    entry_time: '2023-05-29T13:45:00Z',
    exit_time: '2023-05-29T19:30:00Z',
    quantity: 10,
    profit_loss: -18.5,
    strategy: 'Support Bounce',
    user_id: '123',
    created_at: '2023-05-29T13:45:00Z',
    updated_at: '2023-05-29T19:30:00Z'
  },
  {
    id: '4',
    symbol: 'XAUUSD',
    type: 'Long',
    entry_price: 1952.40,
    exit_price: 1967.20,
    entry_time: '2023-05-28T08:30:00Z',
    exit_time: '2023-05-28T15:15:00Z',
    quantity: 1,
    profit_loss: 14.8,
    strategy: 'Breakout',
    user_id: '123',
    created_at: '2023-05-28T08:30:00Z',
    updated_at: '2023-05-28T15:15:00Z'
  },
  {
    id: '5',
    symbol: 'GBPUSD',
    type: 'Short',
    entry_price: 1.2650,
    exit_price: 1.2690,
    entry_time: '2023-05-27T11:00:00Z',
    exit_time: '2023-05-27T16:45:00Z',
    quantity: 10000,
    profit_loss: -40,
    strategy: 'Range Trading',
    user_id: '123',
    created_at: '2023-05-27T11:00:00Z',
    updated_at: '2023-05-27T16:45:00Z'
  }
];

const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({ trades }) => {
  const router = useRouter();
  
  // Use real trades data if available, otherwise use mock data
  const displayTrades = trades && trades.length > 0 ? trades : mockRecentTrades;
  
    return (
    <div className="bg-[#0d1017] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                <div className="text-xs text-gray-400">
          Latest {displayTrades.length} trades
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-[#131825] rounded-lg overflow-hidden">
          {displayTrades.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {displayTrades.map((trade) => (
                <div 
                  key={trade.id} 
                  className="p-3 hover:bg-[#1a1f2c] transition-colors duration-150 cursor-pointer"
                  onClick={() => router.push(`/trades/${trade.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          trade.type === 'Long' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div className="font-medium text-white">
                          {trade.symbol} {trade.type}
            </div>
          </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(trade.exit_time)} • {trade.strategy || 'No strategy'}
        </div>
      </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${getValueColorClass(trade.profit_loss)}`}>
                        {formatCurrency(trade.profit_loss)}
              </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {(trade.profit_loss / (trade.entry_price * trade.quantity) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Entry: {formatCurrency(trade.entry_price)} • Exit: {formatCurrency(trade.exit_price)} • Qty: {trade.quantity}
              </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              No recent trades found
            </div>
          )}
        </div>
      </div>
      
      <div className="px-4 pb-4 text-center">
        <button
          className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
          onClick={() => router.push('/trades')}
        >
          View All Trades
        </button>
      </div>
    </div>
  );
};

export default DashboardRecentActivity; 