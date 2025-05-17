'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  getRecentTrades, 
  getTradeMetrics, 
  getOpenPositions,
  getEquityCurveData 
} from '@/lib/tradingApi';
import { Trade, TradeMetrics, OpenPosition, ChartData } from '@/lib/types';

// Components
import DashboardHeader from './DashboardHeader';
import DashboardActions from './DashboardActions';
import MetricCards from './MetricCards';
import RecentTradesList from './RecentTradesList';
import EquityChart from './EquityChart';
import AIInsights from './AIInsights';

interface OpenPositionProps {
  positions: OpenPosition[];
  isLoading: boolean;
}

// Simple OpenPositions component
const OpenPositions: React.FC<OpenPositionProps> = ({ positions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#131825] rounded-lg p-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#131825] rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Open Positions</h3>
      
      {positions.length > 0 ? (
        <div className="space-y-3">
          {positions.map((position, index) => {
            // Default to 0 if undefined
            const pnl = position.unrealized_pnl || 0;
            const isProfitable = pnl > 0;
            
            return (
              <div key={index} className="bg-[#1d2333] rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${
                      isProfitable ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-white font-medium">{position.symbol}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    isProfitable ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isProfitable ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>Entry: ${(position.entry_price || 0).toFixed(2)}</span>
                  <span>Quantity: {position.quantity || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-4">
          No open positions
        </div>
      )}
    </div>
  );
};

interface Insight {
  id: string;
  text: string;
}

export default function DashboardSummary() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // State for data with proper typing
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<TradeMetrics>({
    total_pnl: 0,
    win_rate: 0,
    avg_win: 0,
    avg_loss: 0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0
  });
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [equityData, setEquityData] = useState<ChartData>({ labels: [], values: [] });
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch data in parallel
        const [tradesData, metricsData, positionsData, equityData] = await Promise.all([
          getRecentTrades(user.id),
          getTradeMetrics(user.id),
          getOpenPositions(user.id),
          getEquityCurveData(user.id)
        ]);

        setTrades(tradesData);
        setMetrics(metricsData);
        setPositions(positionsData);
        setEquityData(equityData);
        
        // No fetching insights in this example, using defaults
        setInsights([]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with welcome message and date */}
      <DashboardHeader />
      
      {/* Action buttons */}
      <DashboardActions />
      
      {/* Metrics cards */}
      <div className="mb-6">
        <MetricCards metrics={metrics} isLoading={isLoading} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          {/* Recent trades */}
          <div className="mb-6">
            <RecentTradesList trades={trades} isLoading={isLoading} />
          </div>
          
          {/* Open positions */}
          <div>
            <OpenPositions positions={positions} isLoading={isLoading} />
          </div>
        </div>
        
        <div className="space-y-6">
          {/* P/L Chart */}
          <div className="bg-[#131825] rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">P/L Chart</h3>
            <EquityChart data={equityData} isLoading={isLoading} />
          </div>
          
          {/* AI Insights */}
          <AIInsights insights={[]} isLoading={isLoading} trades={trades} />
        </div>
      </div>
    </div>
  );
} 