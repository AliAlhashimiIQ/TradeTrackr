'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { updateTrade } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import toast from 'react-hot-toast';

export default function EditTradePage({ params }: { params: { id: string } }) {
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
      } catch (err) {
        console.error('Error fetching trade for edit:', err);
        toast.error('Failed to load trade details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrade();
  }, [params.id, user]);

  const handleSubmit = async (updatedTrade: Partial<Trade>) => {
    if (!trade) return;
    try {
      await updateTrade({ ...trade, ...updatedTrade } as Trade);
      toast.success('Trade updated successfully!');
      router.push(`/trades/${params.id}`);
    } catch (err) {
      console.error('Failed to update trade:', err);
      toast.error('Failed to update trade');
    }
  };

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
          <p className="text-slate-500 dark:text-gray-400 mb-8">This trade doesn't exist or you don't have permission to edit it.</p>
          <button 
            onClick={() => router.push('/trades')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-bold text-sm shadow-md shadow-indigo-600/20"
          >
            Back to Trades
          </button>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Edit Trade <span className="font-mono text-indigo-600 dark:text-indigo-400">#{trade.symbol}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Update trade parameters, execution prices, tags, and psychological notes.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-6 shadow-sm">
          <EnhancedTradeForm 
            initialTrade={trade}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/trades/${params.id}`)}
          />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}