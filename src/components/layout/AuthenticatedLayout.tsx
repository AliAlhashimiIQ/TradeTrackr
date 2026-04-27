'use client'

import React, { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Header from './Header'

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePathname } from 'next/navigation';

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingOnboard, setCheckingOnboard] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user) {
      const checkOnboarding = async () => {
        try {
          const { data, error } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
          
          if (isMounted) {
            const isNewUser = error?.code === 'PGRST116';
            const hasNotOnboarded = isNewUser || !data?.settings?.onboarded;

            if (hasNotOnboarded && pathname !== '/welcome') {
              router.push('/welcome');
            } else {
              setCheckingOnboard(false);
            }
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          if (isMounted) setCheckingOnboard(false);
        }
      };
      checkOnboarding();
    }
    
    return () => { isMounted = false; };
  }, [user, loading, router, pathname]);

  if (loading || (user && checkingOnboard)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#06070b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 9L15 3L9 9L3 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="liquid-bg min-h-screen bg-[#06070b] flex flex-col relative">
      <Header />
      <main className="flex-1 py-4 relative z-10">
        {children}
      </main>
      <footer className="py-4 px-6 text-center border-t border-white/[0.04] relative z-10">
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} TradeJournal. All rights reserved.</p>
      </footer>
    </div>
  );
}
