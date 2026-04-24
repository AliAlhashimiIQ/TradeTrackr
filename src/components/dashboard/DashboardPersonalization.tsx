import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrades } from '@/hooks/useTrades';
import { calculateMaxDrawdown, calculatePerformanceMetrics } from '@/lib/tradeMetrics';
import { DateRange } from '@/components/dashboard/DateRangeSelector';

const availableWidgets = [
  { id: 'risk-alerts', name: 'Risk Management Alerts', enabled: true },
  { id: 'trading-health', name: 'Trading Health', enabled: true }
];

const DashboardPersonalization = ({ dateRange = '30d' }: { dateRange?: DateRange }) => {
  const router = useRouter();
  const [activeWidgets, setActiveWidgets] = useState(availableWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const { trades, isLoading } = useTrades(dateRange);
  const metrics = trades.length > 0 ? calculatePerformanceMetrics(trades) : null;
  const drawdown = trades.length > 0 ? calculateMaxDrawdown(trades) : null;

  // Risk alerts (same logic as DashboardAdvancedFeatures)
  const riskAlerts = [];
  if (drawdown && drawdown.percentage > 8) {
    riskAlerts.push({
      id: 'drawdown',
      level: drawdown.percentage > 10 ? 'critical' : 'warning',
      title: 'Drawdown Approaching Limit',
      description: `Current drawdown of ${drawdown.percentage != null ? drawdown.percentage.toFixed(2) : '--'}% is nearing your 10% monthly limit.`,
      time: 'Now'
    });
  }
  // Position size consistency (simple check)
  if (trades.length >= 5) {
    const recent = trades.slice(-5);
    const sizes = recent.map(t => Math.abs(t.quantity));
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const std = Math.sqrt(sizes.map(s => (s - mean) ** 2).reduce((a, b) => a + b, 0) / sizes.length);
    const consistent = std / mean < 0.2;
    riskAlerts.push({
      id: 'position-size',
      level: 'info',
      title: consistent ? 'Position Size Consistency' : 'Position Size Inconsistency',
      description: consistent
        ? 'Your last 5 trades had consistent position sizing - good risk management!'
        : 'Your last 5 trades had inconsistent position sizing. Review your risk management.',
      time: 'Now'
    });
  }
  // Correlated positions (simple check)
  if (trades.length >= 6) {
    const symbolCounts = trades.reduce((acc, t) => {
      acc[t.symbol] = (acc[t.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const correlated = Object.entries(symbolCounts).filter(([_, count]) => count > 1);
    if (correlated.length > 0) {
      riskAlerts.push({
        id: 'correlation',
        level: 'critical',
        title: 'Correlated Positions',
        description: `You have multiple positions in correlated markets (${correlated.map(([s]) => s).join(', ')}).`,
        time: 'Now'
      });
    }
  }
  
  // Get color based on status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'bg-green-500/80';
      case 'warning':
        return 'bg-yellow-500/80';
      case 'danger':
        return 'bg-red-500/80';
      default:
        return 'bg-blue-500/80';
    }
  };
  
  // Get alert level color
  const getAlertLevelColor = (level: string): string => {
    switch (level) {
      case 'critical':
        return 'bg-red-900/30 border-red-500/50 text-red-400';
      case 'warning':
        return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400';
      default:
        return 'bg-blue-900/30 border-blue-500/50 text-blue-400';
    }
  };

  // Health metrics
  const healthMetrics = metrics
    ? [
        { id: '1', area: 'Win Rate', value: (metrics.winRate != null ? metrics.winRate.toFixed(1) : '--'), target: '65', status: (metrics.winRate != null ? metrics.winRate >= 65 : false) ? 'success' : 'warning' },
        { id: '2', area: 'Risk-Reward Ratio', value: (metrics.riskRewardRatio != null ? metrics.riskRewardRatio.toFixed(2) : '--'), target: '2.0', status: (metrics.riskRewardRatio != null ? metrics.riskRewardRatio >= 2 : false) ? 'success' : 'warning' },
        { id: '3', area: 'Position Sizing', value: 'N/A', target: 'N/A', status: 'success' },
        { id: '4', area: 'Trading Discipline', value: 'N/A', target: 'N/A', status: 'success' }
      ]
    : [];
  // Health score
  let healthScore = 0;
  if (metrics) {
    const winRate = metrics.winRate || 0;
    const riskReward = metrics.riskRewardRatio || 0;
    const dd = drawdown?.percentage || 0;
    healthScore = Math.round(
      winRate * 0.4 +
      Math.min(riskReward * 50, 35) +
      Math.max(0, 25 - dd * 2.5)
    );
    healthScore = Math.max(0, Math.min(100, healthScore));
  }
  
  return (
    <div className="bg-[#0f1117] rounded-lg shadow-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-medium text-white">Personalization & Quick Actions</h2>
        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isCustomizing ? 'Done' : 'Customize'}
        </button>
      </div>
      {isCustomizing && (
        <div className="p-4 bg-[#161a25] border-b border-gray-800">
          <h3 className="text-sm font-medium text-white mb-3">Widget Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            {activeWidgets.map(widget => (
              <div key={widget.id} className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widget.enabled}
                    onChange={() => {
                      const updated = activeWidgets.map(w => w.id === widget.id ? { ...w, enabled: !w.enabled } : w);
                      setActiveWidgets(updated);
                    }}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded border ${widget.enabled ? 'bg-blue-500 border-blue-600' : 'bg-gray-700 border-gray-600'}`}></div>
                  <span className="ml-2 text-sm text-gray-300">{widget.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Risk Management Alerts */}
      {activeWidgets.find(w => w.id === 'risk-alerts')?.enabled && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">Risk Management Alerts</h3>
            <span className="text-xs text-gray-400">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="space-y-3">
            {riskAlerts.length === 0 ? (
              <div className="text-xs text-gray-400">No risk alerts for your current trades.</div>
            ) : (
              riskAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertLevelColor(alert.level)} flex items-start`}
              >
                <div className="flex-shrink-0 p-1 rounded-md bg-white/10 mr-3">
                    {/* Icon logic omitted for brevity */}
                </div>
                <div className="flex-grow">
                  <div className="font-medium mb-1">{alert.title}</div>
                  <div className="text-sm opacity-80">{alert.description}</div>
                  <div className="text-xs opacity-60 mt-1">{alert.time}</div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Trading Health */}
      {activeWidgets.find(w => w.id === 'trading-health')?.enabled && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-white mb-3">Trading Health</h3>
          <div className="space-y-4">
            {healthMetrics.length === 0 ? (
              <div className="text-xs text-gray-400">Not enough data for trading health metrics.</div>
            ) : (
              healthMetrics.map(metric => {
                const percentage = parseFloat(metric.value) && metric.target !== 'N/A' ? (parseFloat(metric.value) / parseFloat(metric.target)) * 100 : 100;
              return (
                <div key={metric.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{metric.area}</span>
                    <span className={`${metric.status === 'success' ? 'text-green-400' : metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {metric.value} {metric.target !== 'N/A' ? `/ ${metric.target}` : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getStatusColor(metric.status)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
              })
            )}
          </div>
          <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-sm">
            <div className="font-medium text-indigo-400 mb-1">Trading Health Score: {healthScore}/100</div>
            <div className="text-white/80 text-xs">{healthScore === 0 ? 'Add more trades to see your health score.' : 'Work on improving your risk-reward ratio to boost your overall score.'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPersonalization; 
