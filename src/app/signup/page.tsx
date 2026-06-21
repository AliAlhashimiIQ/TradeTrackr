'use client'

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let feedback = '';

    // Length check
    if (password.length < 8) {
      feedback = 'Password should be at least 8 characters long';
    } else {
      score += 1;
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    // Numbers check
    if (/[0-9]/.test(password)) score += 1;
    // Special characters check
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score >= 4) {
      feedback = 'Strong password';
    } else if (score >= 3) {
      feedback = 'Good password';
    } else if (score >= 2) {
      feedback = 'Moderate password';
    } else {
      feedback = 'Weak password';
    }

    return { score, feedback };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password');
      setLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }
    
    try {
      await signUp(email, password);
      setSuccessMessage('Account created successfully! Please check your email for verification.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.score) {
      case 4: return 'bg-emerald-500';
      case 3: return 'bg-blue-500';
      case 2: return 'bg-amber-500';
      default: return 'bg-red-500';
    }
  };

  const getPasswordStrengthTextColor = () => {
    switch (passwordStrength.score) {
      case 4: return 'text-emerald-500';
      case 3: return 'text-blue-500';
      case 2: return 'text-amber-500';
      default: return 'text-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#06070b] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Ambient light */}
      <div className="absolute top-[-30%] left-[-15%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-600/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 bg-slate-950 border border-white/[0.08] rounded-lg flex items-center justify-center shadow-md shadow-black/25">
              <Logo className="w-5.5 h-5.5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">TradeTrackr</span>
          </Link>
          <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
          <p className="text-sm text-gray-400">
            Join TradeTrackr to improve your trading performance
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Create a strong password"
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 w-1/4 rounded-full ${
                          level <= passwordStrength.score ? getPasswordStrengthColor() : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-medium ${getPasswordStrengthTextColor()}`}>
                    {passwordStrength.feedback}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="input"
                required
              />
            </div>

            <div className="flex items-start pt-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="terms" className="text-sm text-gray-400">
                  I agree to the{' '}
                  <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 transition-colors">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</Link>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-transparent text-gray-500 backdrop-blur-md">
                  or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-sm font-medium"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 
