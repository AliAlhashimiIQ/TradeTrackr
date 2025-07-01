'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import COLORS, { TRANSITIONS } from '@/lib/colorSystem';
import { TEXT, BUTTONS, FORMS, LAYOUT } from '@/lib/designSystem';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { updatePassword } = useAuth();

  const validatePassword = (password: string) => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password strength
    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters');
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      await updatePassword(newPassword);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${LAYOUT.flexCenter} min-h-screen w-full py-12 px-4 bg-gradient-to-b from-[#0c0d14] to-[#0f1117]`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className={TEXT.heading.h1}>Reset Your Password</h2>
          <p className={`mt-2 ${TEXT.body.regular} text-[${COLORS.text.secondary}]`}>
            Please enter your new password below
          </p>
        </div>

        <div className="gradient-border">
          <div className={`bg-[${COLORS.background.dark}] rounded-xl p-8`}>
            {success ? (
              <div className={`bg-[${COLORS.success}]/10 border border-[${COLORS.success}]/30 text-[${COLORS.successLight}] ${TEXT.body.small} p-4 rounded-lg flex items-start`}>
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Password updated successfully! Redirecting to login...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className={`bg-[${COLORS.danger}]/10 border border-[${COLORS.danger}]/30 text-[${COLORS.dangerLight}] ${TEXT.body.small} p-4 rounded-lg flex items-start`}>
                    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className={FORMS.group}>
                  <label htmlFor="newPassword" className={FORMS.label.primary}>New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className={FORMS.input}
                    required
                  />
                </div>

                <div className={FORMS.group}>
                  <label htmlFor="confirmPassword" className={FORMS.label.primary}>Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className={FORMS.input}
                    required
                  />
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
                    {loading ? 'Updating Password...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 