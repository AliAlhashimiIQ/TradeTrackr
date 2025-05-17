import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Mock data for personalization
const mockTradingHealth = [
  { id: '1', area: 'Win Rate', value: 62, target: 65, status: 'warning' },
  { id: '2', area: 'Risk-Reward Ratio', value: 1.8, target: 2.0, status: 'warning' },
  { id: '3', area: 'Position Sizing', value: 85, target: 80, status: 'success' },
  { id: '4', area: 'Trading Discipline', value: 90, target: 85, status: 'success' }
];

const mockRiskAlerts = [
  { id: '1', level: 'warning', title: 'Drawdown Approaching Limit', description: 'Current drawdown of 8.4% is nearing your 10% monthly limit.', time: '2 hours ago' },
  { id: '2', level: 'info', title: 'Position Size Consistency', description: 'Your last 5 trades had consistent position sizing - good risk management!', time: '1 day ago' },
  { id: '3', level: 'critical', title: 'Correlated Positions', description: 'You have multiple positions in correlated markets (EURUSD, GBPUSD).', time: '15 minutes ago' }
];

const availableWidgets = [
  { id: 'risk-alerts', name: 'Risk Management Alerts', enabled: true },
  { id: 'trading-health', name: 'Trading Health', enabled: true }
];

const DashboardPersonalization = () => {
  const router = useRouter();
  const [activeWidgets, setActiveWidgets] = useState(availableWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    const updated = activeWidgets.map(widget => 
      widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
    );
    setActiveWidgets(updated);
  };
  
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
      
      {/* Customization UI */}
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
                    onChange={() => toggleWidget(widget.id)}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded border ${widget.enabled ? 'bg-blue-500 border-blue-600' : 'bg-gray-700 border-gray-600'}`}>
                    {widget.enabled && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
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
            {mockRiskAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertLevelColor(alert.level)} flex items-start`}
              >
                <div className="flex-shrink-0 p-1 rounded-md bg-white/10 mr-3">
                  {alert.level === 'critical' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : alert.level === 'warning' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="font-medium mb-1">{alert.title}</div>
                  <div className="text-sm opacity-80">{alert.description}</div>
                  <div className="text-xs opacity-60 mt-1">{alert.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Trading Health */}
      {activeWidgets.find(w => w.id === 'trading-health')?.enabled && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-white mb-3">Trading Health</h3>
          
          <div className="space-y-4">
            {mockTradingHealth.map(metric => {
              const percentage = (metric.value / metric.target) * 100;
              return (
                <div key={metric.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{metric.area}</span>
                    <span className={`${metric.status === 'success' ? 'text-green-400' : metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {metric.value} {typeof metric.value === 'number' && metric.value % 1 === 0 ? '%' : ''} / {metric.target} {typeof metric.target === 'number' && metric.target % 1 === 0 ? '%' : ''}
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
            })}
          </div>
          
          <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-sm">
            <div className="font-medium text-indigo-400 mb-1">Trading Health Score: 78/100</div>
            <div className="text-white/80 text-xs">Work on improving your risk-reward ratio to boost your overall score.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPersonalization; 