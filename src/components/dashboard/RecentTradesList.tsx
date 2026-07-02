import React from 'react';
import Link from 'next/link';
import { Trade } from '@/lib/types';
import { getPLColorClasses } from '@/lib/utils';

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

  const formatMonthDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div 
        className="card rounded-2xl p-5 animate-pulse text-left"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="h-5 w-32 bg-slate-200 dark:bg-white/5 rounded-lg mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center justify-between">
              <div className="h-4 w-16 bg-slate-100 dark:bg-white/[0.02] rounded"></div>
              <div className="h-4 w-20 bg-slate-100 dark:bg-white/[0.02] rounded"></div>
              <div className="h-4 w-12 bg-slate-100 dark:bg-white/[0.02] rounded"></div>
              <div className="h-4 w-16 bg-slate-100 dark:bg-white/[0.02] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no trades
  if (trades.length === 0) {
    return (
      <div 
        className="card rounded-2xl p-6 text-left"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white mb-6">
          Recent Trades
        </h3>
        <div className="text-gray-400 dark:text-gray-500 text-center py-10 text-xs font-medium">
          No trades logged recently
        </div>
      </div>
    );
  }

  return (
    <div 
      className="card rounded-2xl overflow-hidden text-left"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.03] flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          Recent Trades
        </h3>
        <Link 
          href="/trades" 
          className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 uppercase tracking-wider transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-white/[0.03]">
          <thead className="bg-slate-50 dark:bg-[#0c0d14]">
            <tr>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date/Time</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Side</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Entry</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Exit</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">P/L</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-transparent divide-y divide-slate-50 dark:divide-white/[0.02]">
            {trades.map((trade) => {
              const isLong = trade.type === 'Long';
              const pnlColors = getPLColorClasses(trade.profit_loss ?? 0, false);
              const dirColors = getPLColorClasses(isLong ? 1 : -1, false);

              return (
                <tr key={trade.id} className="hover:bg-slate-50/50 dark:hover:bg-[#12131f] transition-all group/row">
                  {/* Time */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-mono">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatMonthDay(trade.entry_time)}, {formatTime(trade.entry_time)}</span>
                    </div>
                  </td>

                  {/* Symbol with arrow */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold flex-shrink-0 transition-transform duration-200 group-hover/row:scale-105 ${dirColors.bg10} ${dirColors.text} ring-1 ${dirColors.ring20}`}>
                        {isLong ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0-7 7m7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0-7-7m7 7 7-7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white group-hover/row:text-indigo-500 dark:group-hover/row:text-indigo-300 transition-colors">
                        {trade.symbol}
                      </span>
                    </div>
                  </td>

                  {/* Side */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span 
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center"
                      style={isLong
                        ? { background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }
                        : { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }
                      }
                    >
                      {isLong ? 'BUY' : 'SELL'}
                    </span>
                  </td>

                  {/* Entry Price */}
                  <td className="px-5 py-3 whitespace-nowrap text-right text-xs text-gray-650 dark:text-gray-400 font-mono font-medium">
                    {trade.entry_price != null ? trade.entry_price.toFixed(4) : '--'}
                  </td>

                  {/* Exit Price */}
                  <td className="px-5 py-3 whitespace-nowrap text-right text-xs text-gray-650 dark:text-gray-400 font-mono font-medium">
                    {trade.exit_price != null ? trade.exit_price.toFixed(4) : '--'}
                  </td>

                  {/* P/L Badge */}
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <span 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono shadow-sm"
                      style={{ 
                        color: pnlColors.hexColor, 
                        background: pnlColors.hexBg,
                        border: `1px solid ${pnlColors.hexBg.replace('0.06', '0.2').replace('0.15', '0.35')}`
                      }}
                    >
                      {trade.profit_loss > 0 ? '+' : ''}
                      {trade.profit_loss != null ? formatPnL(trade.profit_loss) : '--'}
                    </span>
                  </td>

                  {/* Details Button */}
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    <Link 
                      href={`/trades/${trade.id}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-indigo-650 dark:hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/10 transition-all hover:scale-105 active:scale-95"
                      title="View trade details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
