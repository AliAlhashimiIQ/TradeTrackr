'use client'

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import COLORS, { TRANSITIONS } from "@/lib/colorSystem";
import { TEXT, BUTTONS, FORMS, LAYOUT } from "@/lib/designSystem";

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
    
    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password');
      setLoading(false);
      return;
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }
    
    try {
      await signUp(email, password);
      setSuccessMessage('Account created successfully! Please check your email for verification.');
      // Router will handle navigation after email verification
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
      // OAuth will handle navigation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.score) {
      case 4:
        return COLORS.success;
      case 3:
        return COLORS.primary;
      case 2:
        return COLORS.warning;
      default:
        return COLORS.danger;
    }
  };

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
          <h2 className={TEXT.heading.h1}>Create your account</h2>
          <p className={`mt-2 ${TEXT.body.regular} text-[${COLORS.text.secondary}]`}>
            Join TradeJournal to improve your trading performance
          </p>
        </div>

        <div className="gradient-border">
          <div className={`bg-[${COLORS.background.dark}] rounded-xl p-8`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className={`bg-[${COLORS.danger}]/10 border border-[${COLORS.danger}]/30 text-[${COLORS.dangerLight}] ${TEXT.body.small} p-4 rounded-lg flex items-start`}>
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
              
              <div className={FORMS.group}>
                <label htmlFor="password" className={FORMS.label.primary}>Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Create a strong password"
                  className={FORMS.input}
                  required
                />
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 w-1/4 rounded-full ${
                            level <= passwordStrength.score
                              ? `bg-[${getPasswordStrengthColor()}]`
                              : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`mt-1 text-sm`}
                      style={{ color: getPasswordStrengthColor() }}
                    >
                      {passwordStrength.feedback}
                    </p>
                  </div>
                )}
              </div>
              
              <div className={FORMS.group}>
                <label htmlFor="confirmPassword" className={FORMS.label.primary}>Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={FORMS.input}
                  required
                />
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="terms" className={`${TEXT.body.small} text-[${COLORS.text.secondary}]`}>
                    I agree to the{' '}
                    <Link href="/terms" className={`text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}]`}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className={`text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}]`}>
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
              
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
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

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
                Sign up with Google
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className={`${TEXT.body.small} text-[${COLORS.text.secondary}]`}>
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className={`font-medium text-[${COLORS.primary}] hover:text-[${COLORS.primaryLight}] ${TRANSITIONS.fast}`}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
