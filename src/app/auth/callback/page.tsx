'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Make sure we're in a browser environment
      if (typeof window === 'undefined') return;
      
      // Generic authentication callback handling for email verification
      // and password recovery flows
      try {
        // Get the current URL
        const url = window.location.href;
        const { error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Authentication callback error:', error.message);
          setError(`Authentication error: ${error.message}`);
          setProcessing(false);
          
          // Redirect back to login after a delay
          setTimeout(() => {
            window.location.href = '/login?error=auth_error';
          }, 3000);
          return;
        }
        
        // Check if we have a session now
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Success! Redirect to dashboard
          console.log('Authentication successful');
          setProcessing(false);
          window.location.href = '/dashboard';
        } else {
          // This shouldn't happen if there was no error, but just in case
          setError('Unable to complete authentication. Please try again.');
          setProcessing(false);
          setTimeout(() => {
            window.location.href = '/login?error=no_session';
          }, 3000);
        }
      } catch (err) {
        // Handle any unexpected errors
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Unexpected error during authentication:', errorMessage);
        
        setError(`Authentication error: ${errorMessage}`);
        setProcessing(false);
        setTimeout(() => {
          window.location.href = '/login?error=unexpected';
        }, 3000);
      }
    };

    handleAuthCallback();
  }, []); // Empty dependency array since we only need to run this once when the component mounts

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Completing authentication...</h1>
          <p className="mt-2">Please wait while we verify your authentication.</p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded">
              <p>{error}</p>
            </div>
          )}
          
          {processing && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 