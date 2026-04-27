'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleComplete = async () => {
    if (!user) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      const numericBalance = parseFloat(balance) || 0;
      
      // Fetch current settings if they exist
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      const currentSettings = profile?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        onboarded: true,
        currency,
        startingBalance: numericBalance,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          email: user.email,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // Success, route to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error saving onboarding data:', err);
      setErrorMsg(err.message || 'Failed to save setup. Please try again.');
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 2 && (!balance || isNaN(parseFloat(balance)))) {
      setErrorMsg('Please enter a valid starting balance');
      return;
    }
    setErrorMsg('');
    setStep(s => s + 1);
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-[#06070b]" />;
  }

  return (
    <div className="min-h-screen bg-[#06070b] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />

      <div className="max-w-xl w-full relative z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500 ${step >= i ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-[#151823] text-gray-500'}`}>
                  {i}
                </div>
                {i < 3 && (
                  <div className={`w-12 h-1 rounded-full transition-colors duration-500 ${step > i ? 'bg-indigo-500/50' : 'bg-[#151823]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0d0e16]/80 backdrop-blur-2xl border border-white/[0.08] p-8 md:p-12 rounded-3xl shadow-2xl overflow-hidden relative min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <div className="text-center mb-10">
                  <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-3">Welcome to TradeTrackr</h1>
                  <p className="text-gray-400 text-lg">Let's configure your journal. What's your base currency?</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-auto">
                  {CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`py-4 px-3 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group ${
                        currency === c.code
                          ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                          : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1]'
                      }`}
                    >
                      <span className={`text-2xl font-bold ${currency === c.code ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white transition-colors'}`}>{c.symbol}</span>
                      <span className={`text-xs font-semibold ${currency === c.code ? 'text-white' : 'text-gray-500'}`}>{c.code}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-10 flex justify-end">
                  <button onClick={nextStep} className="px-8 py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-xl shadow-white/10 flex items-center gap-2">
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <div className="text-center mb-10">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Starting Balance</h1>
                  <p className="text-gray-400 text-lg">What balance are you starting this journal with?</p>
                </div>

                <div className="mb-auto">
                  <div className="relative group max-w-sm mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                        {CURRENCIES.find(c => c.code === currency)?.symbol}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={balance}
                      onChange={e => setBalance(e.target.value)}
                      placeholder="10000"
                      className="w-full pl-14 pr-6 py-5 bg-[#06070b] border-2 border-white/[0.08] rounded-2xl text-3xl font-bold text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
                    />
                  </div>
                  {errorMsg && <p className="text-red-400 text-center mt-4 text-sm font-medium">{errorMsg}</p>}
                </div>

                <div className="mt-10 flex justify-between">
                  <button onClick={() => setStep(1)} className="px-6 py-3.5 text-gray-400 font-bold hover:text-white transition-colors">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-xl shadow-white/10 flex items-center gap-2">
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full items-center text-center"
              >
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">All Set!</h1>
                <p className="text-gray-400 text-lg mb-10 max-w-md">Your journal is ready. It's time to log your first trade and start tracking your edge.</p>

                {errorMsg && <p className="text-red-400 mb-6 text-sm font-medium">{errorMsg}</p>}

                <div className="mt-auto w-full flex justify-between items-center gap-4">
                  <button onClick={() => setStep(2)} disabled={isSaving} className="px-6 py-3.5 text-gray-400 font-bold hover:text-white transition-colors disabled:opacity-50">
                    Back
                  </button>
                  <button 
                    onClick={handleComplete} 
                    disabled={isSaving}
                    className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-blue-500 transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Go to Dashboard
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}