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
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    user, 
    signIn,
    signInWithGoogle, 
    resetPassword, 
    loading: authLoading 
  } = useAuth();

  // Load remembered email if exists
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password
    if (!forgotPasswordMode && !validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    if (forgotPasswordMode) {
      try {
        await resetPassword(email);
        setSuccessMessage('Password reset link sent to your email');
        setForgotPasswordMode(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send reset link');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      await signIn(email, password);
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      // Navigation is handled by useAuth hook onAuthStateChange
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Navigation will be handled by the OAuth callback
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
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
                <>
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

                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                      Remember me
                    </label>
                  </div>
                </>
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

              {!forgotPasswordMode && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className={`px-2 bg-[${COLORS.background.dark}] text-gray-400`}>
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                    </svg>
                    Sign in with Google
                  </button>
                </>
              )}

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
          By signing in, you agree to our{' '}
          <Link href="/terms" className={`text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}]`}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className={`text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}]`}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
} 