'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Trade } from '@/lib/types';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import Link from 'next/link';
import { resolveTradingViewUrl } from '@/lib/utils';
import { ArrowLeft, Edit3, AlertTriangle, ExternalLink } from 'lucide-react';

export default function TradeDetailPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTrade = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        // Fetch tags
        const { data: tagsData } = await supabase
          .from('trade_tags')
          .select('tags:tag_id(name)')
          .eq('trade_id', params.id);
          
        const tags = tagsData?.map((t: any) => t.tags.name) || [];
        setTrade({ ...data, tags } as Trade);
      } catch (error) {
        console.error('Error fetching trade:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrade();
  }, [params.id, user]);

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!trade) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Trade Not Found</h1>
          <p className="text-slate-500 dark:text-gray-400 mb-8">This trade doesn't exist or you don't have permission to view it.</p>
          <Link href="/trades" className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-bold text-sm shadow-md shadow-indigo-600/20">
            Back to Trades
          </Link>
        </div>
      </AuthenticatedLayout>
    );
  }

  const isWin = trade.profit_loss >= 0;

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/trades" 
              className="p-2.5 bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] rounded-2xl transition-colors shadow-sm"
              title="Back to Trades"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{trade.symbol}</h1>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono uppercase tracking-wider ${
                  trade.type === 'Long' 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {trade.type}
                </span>
              </div>
              <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
                {new Date(trade.entry_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href={`/trades/${trade.id}/edit`} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Trade
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* P&L Banner */}
            <div className={`p-6 rounded-3xl border shadow-md flex items-center justify-between ${
              isWin 
                ? 'bg-emerald-500/[0.06] dark:bg-emerald-950/20 border-emerald-500/30' 
                : 'bg-rose-500/[0.06] dark:bg-rose-950/20 border-rose-500/30'
            }`}>
              <div>
                <p className={`text-xs font-mono font-bold uppercase tracking-widest mb-1 ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Net P&L</p>
                <div className={`text-4xl font-black font-mono tracking-tight ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isWin ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(trade.profit_loss)}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-mono font-bold uppercase tracking-widest mb-1 ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Pips</p>
                <div className={`text-2xl font-black font-mono ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {trade.pips !== null && trade.pips !== undefined ? (trade.pips > 0 ? `+${trade.pips}` : trade.pips) : '—'}
                </div>
              </div>
            </div>

            {/* Execution Details */}
            <div className="bg-white dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6">Execution Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Entry Price</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">{trade.entry_price}</p>
                </div>
                <div>
                  <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Exit Price</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">{trade.exit_price}</p>
                </div>
                <div>
                  <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Lots / Qty</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">{trade.lots || trade.quantity || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {trade.exit_time ? (() => {
                      const mins = Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000);
                      if (mins < 60) return `${mins}m`;
                      const hrs = Math.floor(mins / 60);
                      const m = mins % 60;
                      if (hrs < 24) return `${hrs}h ${m}m`;
                      return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
                    })() : 'Open'}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Trade Notes</h2>
              {trade.notes ? (
                <div className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{trade.notes}</div>
              ) : (
                <p className="text-slate-400 dark:text-gray-500 text-sm italic">No notes recorded for this trade.</p>
              )}
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Tags & Mistakes */}
            <div className="bg-white dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Categorization</h2>
              
              <div className="mb-6">
                <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {trade.tags && trade.tags.length > 0 ? (
                    trade.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-gray-500">No tags</span>
                  )}
                </div>
              </div>

              {trade.mistakes && trade.mistakes.length > 0 && (
                <div>
                  <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Mistakes</p>
                  <div className="flex flex-wrap gap-2">
                    {trade.mistakes.map((mistake, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-xl text-xs font-semibold">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {mistake}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Emotional State */}
            {trade.emotional_state && (
              <div className="bg-white dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Emotional State</h2>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
                    </svg>
                  </div>
                  <span className="text-slate-800 dark:text-white font-bold text-sm capitalize">{trade.emotional_state.replace('_', ' ')}</span>
                </div>
              </div>
            )}

            {/* Screenshot */}
            {trade.screenshot_url && (
              <div className="bg-white dark:bg-[#151823] border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 overflow-hidden shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Screenshot</h2>
                <a href={resolveTradingViewUrl(trade.screenshot_url)} target="_blank" rel="noreferrer" className="block relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.08] group">
                  <img src={resolveTradingViewUrl(trade.screenshot_url)} alt="Trade chart" className="w-full object-cover aspect-video group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 text-white font-bold text-xs bg-black/80 px-3.5 py-1.5 rounded-full border border-white/20">
                      <ExternalLink className="w-3.5 h-3.5" /> View Full Size
                    </span>
                  </div>
                </a>
              </div>
            )}

          </div>
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
