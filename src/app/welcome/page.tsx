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

      const currentSettings = (profile?.settings as any) || {};
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
          email: user.email || '',
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

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
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-10 max-w-sm mx-auto px-4">
          {[
            { stepNum: 1, label: 'Currency' },
            { stepNum: 2, label: 'Capital' },
            { stepNum: 3, label: 'Launch' }
          ].map((item, idx) => (
            <React.Fragment key={item.stepNum}>
              <div className="flex flex-col items-center">
                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                  step === item.stepNum 
                    ? 'text-indigo-400' 
                    : step > item.stepNum 
                      ? 'text-emerald-400' 
                      : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
                <div className={`mt-2 w-2 h-2 rounded-full transition-all duration-500 ${
                  step === item.stepNum 
                    ? 'bg-indigo-500 ring-4 ring-indigo-500/20' 
                    : step > item.stepNum 
                      ? 'bg-emerald-500' 
                      : 'bg-[#151823]'
                }`} />
              </div>
              {idx < 2 && (
                <div className={`flex-1 h-[1px] mx-4 -mt-2 transition-colors duration-500 ${
                  step > item.stepNum ? 'bg-emerald-500/30' : 'bg-white/[0.04]'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Content Container */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-8 md:p-12 rounded-3xl shadow-2xl overflow-hidden relative min-h-[460px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full flex-1 justify-between"
              >
                <div>
                  <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                      Welcome to TradeTrackr
                    </h1>
                    <p className="text-gray-400 text-sm">
                      Select your primary base currency to track account metrics and performance.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CURRENCIES.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setCurrency(c.code)}
                        className={`py-4 px-3 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group ${
                          currency === c.code
                            ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg'
                            : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                        }`}
                      >
                        <span className={`text-xl font-bold transition-colors ${
                          currency === c.code ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white'
                        }`}>{c.symbol}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          currency === c.code ? 'text-white' : 'text-gray-600'
                        }`}>{c.code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={nextStep} 
                    className="px-6 py-3 bg-white hover:bg-gray-150 text-black text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2"
                  >
                    Continue
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full flex-1 justify-between"
              >
                <div>
                  <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                      Starting Capital
                    </h1>
                    <p className="text-gray-400 text-sm">
                      Enter the starting balance for your primary trading account to calculate growth.
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <span className="text-xl font-bold text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                          {CURRENCIES.find(c => c.code === currency)?.symbol}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={balance}
                        onChange={e => setBalance(e.target.value)}
                        placeholder="10000"
                        className="w-full pl-12 pr-5 py-4 bg-slate-950/60 border border-white/10 rounded-xl text-2xl font-bold text-white placeholder-gray-800 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner font-mono text-center"
                      />
                    </div>
                    {errorMsg && (
                      <p className="text-red-400 text-center mt-3 text-xs font-semibold">{errorMsg}</p>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button 
                    onClick={() => setStep(1)} 
                    className="px-5 py-3 text-gray-400 hover:text-white text-xs font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={nextStep} 
                    className="px-6 py-3 bg-white hover:bg-gray-150 text-black text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2"
                  >
                    Continue
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full items-center text-center flex-1 justify-between"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                    Setup Complete
                  </h1>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Your journal is ready. Proceed to the Command Center to import your trade history or log executions.
                  </p>

                  {errorMsg && (
                    <p className="text-red-400 mt-4 text-xs font-semibold">{errorMsg}</p>
                  )}
                </div>

                <div className="mt-8 w-full flex justify-between items-center gap-4">
                  <button 
                    onClick={() => setStep(2)} 
                    disabled={isSaving} 
                    className="px-5 py-3 text-gray-400 hover:text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleComplete} 
                    disabled={isSaving}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Enter Dashboard
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
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