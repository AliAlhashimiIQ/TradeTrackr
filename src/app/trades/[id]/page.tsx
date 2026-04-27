'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Trade } from '@/lib/types';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import Link from 'next/link';

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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!trade) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Trade Not Found</h1>
          <p className="text-gray-400 mb-8">This trade doesn't exist or you don't have permission to view it.</p>
          <Link href="/trades" className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
            Back to Trades
          </Link>
        </div>
      </AuthenticatedLayout>
    );
  }

  const isWin = trade.profit_loss >= 0;

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/trades" className="p-2 bg-white/[0.05] text-gray-400 hover:text-white rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">{trade.symbol}</h1>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${trade.type === 'Long' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {trade.type}
                </span>
              </div>
              <p className="text-gray-500 mt-1">
                {new Date(trade.entry_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href={`/trades/${trade.id}/edit`} className="px-5 py-2.5 bg-white/[0.05] text-white font-medium rounded-xl border border-white/[0.1] hover:bg-white/[0.1] transition-all">
              Edit Trade
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* P&L Banner */}
            <div className={`p-6 rounded-2xl border ${isWin ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isWin ? 'text-emerald-500/70' : 'text-red-500/70'}`}>Net P&L</p>
                <div className={`text-4xl font-black ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isWin ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(trade.profit_loss)}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isWin ? 'text-emerald-500/70' : 'text-red-500/70'}`}>Pips</p>
                <div className={`text-2xl font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trade.pips !== null && trade.pips !== undefined ? (trade.pips > 0 ? `+${trade.pips}` : trade.pips) : '—'}
                </div>
              </div>
            </div>

            {/* Execution Details */}
            <div className="bg-[#151823] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Execution Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Entry Price</p>
                  <p className="text-lg font-semibold text-white">{trade.entry_price}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Exit Price</p>
                  <p className="text-lg font-semibold text-white">{trade.exit_price}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Lots / Qty</p>
                  <p className="text-lg font-semibold text-white">{trade.lots || trade.quantity || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Duration</p>
                  <p className="text-lg font-semibold text-white">
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
            <div className="bg-[#151823] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Trade Notes</h2>
              {trade.notes ? (
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{trade.notes}</div>
              ) : (
                <p className="text-gray-600 italic">No notes recorded for this trade.</p>
              )}
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Tags & Mistakes */}
            <div className="bg-[#151823] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Categorization</h2>
              
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {trade.tags && trade.tags.length > 0 ? (
                    trade.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-medium">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-600">No tags</span>
                  )}
                </div>
              </div>

              {trade.mistakes && trade.mistakes.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Mistakes</p>
                  <div className="flex flex-wrap gap-2">
                    {trade.mistakes.map((mistake, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-xs font-medium flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {mistake}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Emotional State */}
            {trade.emotional_state && (
              <div className="bg-[#151823] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-2">Emotional State</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-xl">🧠</span>
                  </div>
                  <span className="text-white font-medium capitalize">{trade.emotional_state.replace('_', ' ')}</span>
                </div>
              </div>
            )}

            {/* Screenshot */}
            {trade.screenshot_url && (
              <div className="bg-[#151823] border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
                <h2 className="text-lg font-bold text-white mb-4">Screenshot</h2>
                <a href={trade.screenshot_url} target="_blank" rel="noreferrer" className="block relative rounded-lg overflow-hidden border border-white/[0.06] group">
                  <img src={trade.screenshot_url} alt="Trade chart" className="w-full object-cover aspect-video group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium bg-black/80 px-4 py-2 rounded-full border border-white/10">View Full Size</span>
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
