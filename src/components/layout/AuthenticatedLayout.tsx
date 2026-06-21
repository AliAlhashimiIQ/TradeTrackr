'use client'

import React, { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

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
  const [checkingOnboard, setCheckingOnboard] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem('onboarded') !== 'true';
    }
    return true;
  });

  useEffect(() => {
    let isMounted = true;
    
    if (!loading && !user) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('onboarded');
      }
      router.push('/login');
    } else if (!loading && user) {
      const checkOnboarding = async () => {
        if (typeof window !== 'undefined' && window.sessionStorage.getItem('onboarded') === 'true') {
          if (isMounted) setCheckingOnboard(false);
          return;
        }
        try {
          const { data, error } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
          
          if (isMounted) {
            const isNewUser = error?.code === 'PGRST116';
            const hasNotOnboarded = isNewUser || !(data?.settings as any)?.onboarded;

            if (hasNotOnboarded && pathname !== '/welcome') {
              router.push('/welcome');
            } else {
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('onboarded', 'true');
              }
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
            <div className="w-16 h-16 bg-slate-950 border border-white/[0.08] rounded-2xl flex items-center justify-center shadow-2xl shadow-black/40 relative z-10 animate-bounce" style={{ animationDuration: '2s' }}>
              <Logo className="w-10 h-10 animate-pulse" />
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
    <div className="liquid-bg flex-1 flex flex-col relative bg-[#06070b]">
      <main className="flex-1 py-4 relative z-10 w-full overflow-x-auto">
        {children}
      </main>
      <footer className="py-4 px-6 text-center border-t border-white/[0.04] relative z-10">
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} TradeTrackr. All rights reserved.</p>
      </footer>
    </div>
  );
}
