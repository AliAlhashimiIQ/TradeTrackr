'use client'

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import COLORS, { TRANSITIONS } from "@/lib/colorSystem";
import { TEXT, BUTTONS, FORMS, LAYOUT } from "@/lib/designSystem";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    user, 
    signIn, 
    resetPassword, 
    loading: authLoading
  } = useAuth();

  useEffect(() => {
    // Show login errors from URL
    const errorParam = searchParams.get('error');
    if (errorParam) {
      console.log('Login page: Error parameter detected in URL:', errorParam);
      
      // Show specific error messages based on the error type
      if (errorParam === 'missing_verifier') {
        setError('Authentication session expired. Please try signing in again.');
      } else if (errorParam === 'auth_error') {
        setError('Authentication failed. Please try again or use a different sign-in method.');
      } else if (errorParam === 'no_session') {
        setError('Unable to establish a secure session. Please try again.');
      } else if (errorParam === 'unexpected') {
        setError('An unexpected error occurred. Please try again later.');
      } else {
      setError('Authentication failed. Please try again.');
      }
    }
    
    // Redirect if already logged in
    if (!authLoading && user) {
      console.log('Login page: User already logged in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [searchParams, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (forgotPasswordMode) {
      try {
        console.log('Login page: Sending password reset email to', email);
        await resetPassword(email);
        setSuccessMessage('Password reset link sent to your email');
        setForgotPasswordMode(false);
      } catch (err) {
        console.error('Login page: Reset password error', err);
        setError(err instanceof Error ? err.message : 'Failed to send reset link');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      console.log('Login page: Attempting sign in with email', email);
      await signIn(email, password);
      // Navigation is handled by useAuth hook onAuthStateChange
    } catch (err) {
      console.error('Login page: Sign in error', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setForgotPasswordMode(!forgotPasswordMode);
    setError(null);
    setSuccessMessage(null);
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className={`${LAYOUT.flexCenter} min-h-screen`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[${COLORS.primary}]`}></div>
      </div>
    );
  }

  // Prevent showing login page if already logged in
  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className={`${LAYOUT.flexCenter} min-h-screen w-full py-12 px-4`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <div className={`${LAYOUT.flexCenter}`}>
              <div className={`w-10 h-10 bg-gradient-to-tr from-[${COLORS.primary}] to-[${COLORS.primaryDark}] rounded-lg ${LAYOUT.flexCenter} mr-2`}>
                <svg className={`w-6 h-6 text-[${COLORS.text.primary}]`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 9L15 3L9 9L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className={`${TEXT.heading.h3} bg-clip-text text-transparent bg-gradient-to-r from-[${COLORS.primary}] to-[${COLORS.primaryLight}]`}>TradeJournal</span>
            </div>
          </Link>
          <h2 className={TEXT.heading.h1}>{forgotPasswordMode ? 'Reset Password' : 'Sign in to your account'}</h2>
          <p className={`mt-2 ${TEXT.body.regular} text-[${COLORS.text.secondary}]`}>
            {forgotPasswordMode 
              ? 'Enter your email to receive a password reset link' 
              : 'Your smart trading companion for improving performance'}
          </p>
        </div>

        <div className="gradient-border">
          <div className={`bg-[${COLORS.background.dark}] rounded-xl p-8`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className={`bg-[${COLORS.danger}]/10 border border-[${COLORS.danger}]/30 text-[${COLORS.danger}Light] ${TEXT.body.small} p-4 rounded-lg flex items-start`}>
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              
              {successMessage && (
                <div className={`bg-[${COLORS.success}]/10 border border-[${COLORS.success}]/30 text-[${COLORS.successLight}] ${TEXT.body.small} p-4 rounded-lg flex items-start`}>
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              <div className={FORMS.group}>
                <label htmlFor="email" className={FORMS.label.primary}>Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={FORMS.input}
                  required
                />
              </div>
              
              {!forgotPasswordMode && (
                <div className={FORMS.group}>
                  <div className={`flex justify-between items-center mb-1`}>
                    <label htmlFor="password" className={FORMS.label.primary}>Password</label>
                    <button 
                      type="button"
                      onClick={toggleForgotPassword}
                      className={`text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}] ${TEXT.body.small} font-medium ${TRANSITIONS.fast}`}
                    >
                      Forgot your password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={FORMS.input}
                    required
                  />
                </div>
              )}
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${LAYOUT.flexCenter} px-4 py-3 bg-gradient-to-r from-[${COLORS.primary}] to-[${COLORS.primaryDark}] hover:from-[${COLORS.primaryLight}] hover:to-[${COLORS.primary}] text-[${COLORS.text.primary}] font-medium rounded-lg ${TRANSITIONS.medium} transform hover:translate-y-[-1px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                >
                  {loading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {loading 
                    ? 'Processing...' 
                    : forgotPasswordMode 
                      ? 'Send Reset Link' 
                      : 'Sign In'
                  }
                </button>
              </div>

              {forgotPasswordMode && (
                <button
                  type="button"
                  onClick={toggleForgotPassword}
                  className={`w-full text-center text-[${COLORS.text.secondary}] hover:text-[${COLORS.text.primary}] ${TEXT.body.small} ${TRANSITIONS.fast}`}
                >
                  ← Back to Sign In
                </button>
              )}
            </form>

            {!forgotPasswordMode && (
                <div className="mt-6 text-center">
                  <p className={`${TEXT.body.small} text-[${COLORS.text.secondary}]`}>
                    Don't have an account?{' '}
                    <Link 
                      href="/signup" 
                      className={`font-medium text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}] ${TRANSITIONS.fast}`}
                    >
                      Sign up for free
                    </Link>
                  </p>
                </div>
            )}
          </div>
        </div>
        
        <p className={`text-center ${TEXT.body.small} text-[${COLORS.text.tertiary}]`}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
} 