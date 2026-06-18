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
import Logo from '@/components/ui/Logo';

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
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 relative z-10 animate-bounce" style={{ animationDuration: '2s' }}>
              <Logo className="w-9 h-9 text-white animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
          </div>
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
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} TradeTrackr. All rights reserved.</p>
      </footer>
    </div>
  );
}
