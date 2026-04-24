"use client";
import { useRouter } from 'next/navigation';
import { addTrade } from '@/lib/tradingApi';
import { Trade } from '@/lib/types';
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function NewTrade() {
  const router = useRouter();
  
  const handleSubmit = async (trade: Partial<Trade>) => {
    await addTrade(trade as Trade);
    router.push('/trades');
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <EnhancedTradeForm 
          onSubmit={handleSubmit} 
          onCancel={() => router.push('/trades')}
        />
      </div>
    </AuthenticatedLayout>
  );
}
