'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/layout/Header'
import { addTrade } from '@/lib/tradingApi'
import { Trade } from '@/lib/types'
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm'

export default function NewTrade() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSubmit = async (tradeData: Partial<Trade>) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare trade data with user ID
      const completeTradeData = {
        ...tradeData,
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      // Add the trade
      await addTrade(completeTradeData as Trade);
      
      // Redirect to trades page
      router.push('/trades');
    } catch (error) {
      console.error('Error adding trade:', error);
      alert('Failed to add trade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBatch = async (trades: Partial<Trade>[]) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Process each trade in sequence
      for (const trade of trades) {
        const completeTradeData = {
          ...trade,
          user_id: user.id,
          created_at: new Date().toISOString()
        };
        
        await addTrade(completeTradeData as Trade);
      }
      
      // Redirect to trades page
      router.push('/trades');
    } catch (error) {
      console.error('Error adding batch trades:', error);
      alert('Failed to add some trades. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/trades');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null // This prevents the page from flashing before redirect
  }

  return (
    <div className="bg-[#0a0a10] min-h-screen">
      <Header />
      
      <EnhancedTradeForm
        onSubmit={handleSubmit}
        onSubmitBatch={handleSubmitBatch}
        onCancel={handleCancel}
      />
    </div>
  )
} 