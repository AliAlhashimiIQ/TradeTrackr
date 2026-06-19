import React from 'react';
import { Trade } from '@/lib/types';

export interface TradesHeaderProps {
  quickMetrics: {
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
    tradesPerWeek: number;
  };
  tradesCount: number;
  filteredTradesCount: number;
  filteredTrades: Trade[];
  onLogTradeClick: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  formatCurrency: (value: number) => string;
}

export const TradesHeader: React.FC<TradesHeaderProps> = ({
  quickMetrics,
  tradesCount,
  filteredTradesCount,
  filteredTrades,
  onLogTradeClick,
  showFilters,
  onToggleFilters,
  formatCurrency,
}) => {
  return (
    <>
      {/* Page Title & Log Trade Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Trading Journal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Log, track, and optimize your trading performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFilters}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              showFilters
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                : 'bg-[#0d0e16] text-gray-400 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
            }`}
            title="Toggle Filter Panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          <button
            onClick={onLogTradeClick}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Log Trade
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total P&L',
            value: formatCurrency(quickMetrics.totalPnL),
            color: quickMetrics.totalPnL >= 0 ? '#34d399' : '#f87171',
            glow: quickMetrics.totalPnL >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Win Rate',
            value: `${quickMetrics.winRate.toFixed(1)}%`,
            color: quickMetrics.winRate >= 50 ? '#34d399' : '#f87171',
            glow: quickMetrics.winRate >= 50 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: 'Profit Factor',
            value: quickMetrics.profitFactor.toFixed(2),
            color: quickMetrics.profitFactor >= 1 ? '#34d399' : '#f87171',
            glow: quickMetrics.profitFactor >= 1 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.05)',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )
          },
          {
            label: 'Total Trades',
            value: tradesCount.toString(),
            color: '#818cf8',
            glow: 'rgba(99,102,241,0.05)',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )
          },
        ].map((m, i) => (
          <div key={i} className="stat-card group relative p-5 overflow-hidden hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0e16]">
            <div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{m.label}</span>
                <div className="p-2 rounded-lg group-hover:scale-110 transition-transform duration-300" style={{ background: `${m.color}12`, color: `${m.color}99` }}>{m.icon}</div>
              </div>
              <div className="text-2xl font-bold tracking-tight relative z-10" style={{ color: m.color, textShadow: `0 0 20px ${m.color}33` }}>
                {m.value}
              </div>
            </div>

            {/* Custom Visual Mini Charts */}
            {m.label === 'Total P&L' && (
              <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                  <span>Avg Win</span>
                  <span>Avg Loss</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                  <div
                    style={{
                      width: `${(quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss)) > 0 ? (quickMetrics.avgWin / (quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss))) * 100 : 50}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)'
                    }}
                    className="h-full"
                  />
                  <div
                    style={{
                      width: `${(quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss)) > 0 ? (Math.abs(quickMetrics.avgLoss) / (quickMetrics.avgWin + Math.abs(quickMetrics.avgLoss))) * 100 : 50}%`,
                      background: 'linear-gradient(90deg, #f87171, #ef4444)'
                    }}
                    className="h-full"
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold font-mono tabular-nums">
                  <span className="text-emerald-400">{formatCurrency(quickMetrics.avgWin)}</span>
                  <span className="text-red-400">-{formatCurrency(Math.abs(quickMetrics.avgLoss))}</span>
                </div>
              </div>
            )}

            {m.label === 'Win Rate' && (
              <div className="mt-3 pt-2 border-t border-white/[0.04] relative z-10 space-y-1.5">
                <div className="flex justify-center">
                  <svg className="w-[140px] h-[55px]" viewBox="0 0 100 50">
                    <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9.5" strokeLinecap="round" />
                    <path
                      d="M 10 45 A 35 35 0 0 1 90 45"
                      fill="none"
                      stroke="url(#winRateGrad)"
                      strokeWidth="9.5"
                      strokeLinecap="round"
                      strokeDasharray="110"
                      strokeDashoffset={110 - (110 * quickMetrics.winRate) / 100}
                      style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                    />
                    <defs>
                      <linearGradient id="winRateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 font-semibold tracking-wide px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
                    <span>{Math.round((quickMetrics.winRate / 100) * filteredTradesCount)} Wins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 block" />
                    <span>{filteredTradesCount - Math.round((quickMetrics.winRate / 100) * filteredTradesCount)} Losses</span>
                  </div>
                </div>
              </div>
            )}

            {m.label === 'Profit Factor' && (() => {
              const gpRatio = quickMetrics.profitFactor > 0 ? (quickMetrics.profitFactor / (quickMetrics.profitFactor + 1)) * 100 : 50;
              return (
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-3 relative z-10">
                  <div className="text-xs text-gray-400 leading-normal font-medium max-w-[65%]">
                    <span>Proportion of gross profit vs gross loss</span>
                  </div>
                  <svg className="w-12 h-12 shrink-0 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="5.5" className="opacity-95" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="5.5"
                      strokeDasharray={`${gpRatio} 100`}
                      className="transition-all duration-500"
                    />
                  </svg>
                </div>
              );
            })()}

            {m.label === 'Total Trades' && (() => {
              const longCount = filteredTrades.filter(t => t.type === 'Long').length;
              const shortCount = filteredTrades.filter(t => t.type === 'Short').length;
              const total = longCount + shortCount;
              const longPct = total > 0 ? (longCount / total) * 100 : 50;
              return (
                <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2 relative z-10">
                  <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                    <span>Buy ({longCount})</span>
                    <span>Sell ({shortCount})</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                    <div style={{ width: `${longPct}%` }} className="h-full bg-emerald-500" />
                    <div style={{ width: `${100 - longPct}%` }} className="h-full bg-red-500" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-bold px-0.5">
                    <span>{total > 0 ? `${longPct.toFixed(0)}%` : '--'}</span>
                    <span>{total > 0 ? `${(100 - longPct).toFixed(0)}%` : '--'}</span>
                  </div>
                </div>
              );
            })()}

            {m.glow && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-[50px] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${m.glow} 0%, transparent 70%)` }} />}
          </div>
        ))}
      </div>
    </>
  );
};

export default TradesHeader;
