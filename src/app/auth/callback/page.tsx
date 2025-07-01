'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import COLORS from '@/lib/colorSystem';

export default function AuthCallback() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Successful authentication, redirect to dashboard
        router.push('/dashboard');
      } else {
        // Authentication failed, redirect to login with error
        router.push('/login?error=auth_error');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0c0d14] to-[#0f1117]">
      <div className="text-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[${COLORS.primary}] mx-auto mb-4`}></div>
        <h2 className="text-xl font-semibold text-white mb-2">Completing Authentication</h2>
        <p className="text-gray-400">Please wait while we verify your credentials...</p>
      </div>
    </div>
  );
} 