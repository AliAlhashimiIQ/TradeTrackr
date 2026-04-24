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
import AccountDetails from './AccountDetails';

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
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8 bg-gradient-to-br from-[#10131c] via-[#181e2e] to-[#232a3d] min-h-screen rounded-3xl shadow-2xl border border-blue-900/30 backdrop-blur-xl relative overflow-hidden">
      {/* Decorative glassmorphic background shapes */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/30 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="relative z-10">
        {/* Header with welcome message and date */}
        <DashboardHeader />

        {/* Account Details */}
        <div className="mb-8">
          {/* Pass trades to AccountDetails for balance/growth tracking */}
          <AccountDetails initialBalance={25000} trades={trades} />
        </div>

        {/* Action buttons */}
        <DashboardActions />

        {/* Metrics cards */}
        <div className="mb-8">
          <MetricCards metrics={metrics} isLoading={isLoading} />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Recent trades */}
            <div className="bg-gradient-to-br from-[#181e2e]/80 to-[#232a3d]/80 rounded-2xl shadow-xl border border-blue-900/20 hover:shadow-2xl transition-all">
              <RecentTradesList trades={trades} isLoading={isLoading} />
            </div>

            {/* Open positions */}
            <div className="bg-gradient-to-br from-[#181e2e]/80 to-[#232a3d]/80 rounded-2xl shadow-xl border border-blue-900/20 hover:shadow-2xl transition-all">
              <OpenPositions positions={positions} isLoading={isLoading} />
            </div>
          </div>

          <div className="space-y-8">
            {/* P/L Chart */}
            <div className="bg-gradient-to-br from-[#181e2e]/80 to-[#232a3d]/80 rounded-2xl shadow-xl border border-blue-900/20 hover:shadow-2xl transition-all">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 17l6-6 4 4 8-8" /></svg>
                P/L Chart
              </h3>
              <EquityChart data={equityData} isLoading={isLoading} />
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-[#181e2e]/80 to-[#232a3d]/80 rounded-2xl shadow-xl border border-blue-900/20 hover:shadow-2xl transition-all">
              <AIInsights insights={[]} isLoading={isLoading} trades={trades} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
