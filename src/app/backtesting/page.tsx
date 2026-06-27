'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function BacktestingPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(false);
    
    // Simulate API registration
    setTimeout(() => {
      setSubmitted(true);
      toast.success("Awesome! You've been added to the priority beta list.");
    }, 800);
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Glowing Badge & Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 tracking-wider uppercase">
            ⚡ Coming Soon
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Backtesting Simulator
          </h1>
          <p className="text-gray-400 text-lg">
            Train your eyes, refine your edge, and practice execution candle-by-candle on 24-hour historical broker data.
          </p>
        </div>

        {/* Feature Preview & Waitlist Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-stretch">
          {/* Glassmorphic Mockup Chart (SVG) */}
          <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
            
            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="ml-2 text-xs font-mono text-gray-500">US100.SPOT (15m)</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-white/5 text-xs text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                Replay Mode
              </div>
            </div>

            {/* SVG Candlestick Chart Mockup */}
            <div className="w-full h-64 bg-slate-950/80 rounded-xl border border-white/5 p-4 flex items-center justify-center relative">
              <svg className="w-full h-full opacity-60" viewBox="0 0 500 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Horizontal grid lines */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="160" x2="500" y2="160" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                {/* Candles */}
                <path d="M 30,120 L 30,80 M 30,110 H 35 V 90 H 25 Z" fill="#10B981" stroke="#10B981" strokeWidth="1" />
                <path d="M 70,90 L 70,60 M 70,80 H 75 V 70 H 65 Z" fill="#10B981" stroke="#10B981" strokeWidth="1" />
                <path d="M 110,70 L 110,130 M 110,80 H 115 V 110 H 105 Z" fill="#EF4444" stroke="#EF4444" strokeWidth="1" />
                <path d="M 150,110 L 150,160 M 150,120 H 155 V 150 H 145 Z" fill="#EF4444" stroke="#EF4444" strokeWidth="1" />
                <path d="M 190,150 L 190,110 M 190,140 H 195 V 120 H 185 Z" fill="#10B981" stroke="#10B981" strokeWidth="1" />
                <path d="M 230,120 L 230,70 M 230,105 H 235 V 80 H 225 Z" fill="#10B981" stroke="#10B981" strokeWidth="1" />
                <path d="M 270,80 L 270,110 M 270,90 H 275 V 105 H 265 Z" fill="#EF4444" stroke="#EF4444" strokeWidth="1" />
                <path d="M 310,105 L 310,50 M 310,95 H 315 V 60 H 305 Z" fill="#10B981" stroke="#10B981" strokeWidth="1" />
                <path d="M 350,60 L 350,90 M 350,70 H 355 V 85 H 345 Z" fill="#EF4444" stroke="#EF4444" strokeWidth="1" />
                <path d="M 390,80 L 390,40 M 390,75 H 395 V 45 H 385 Z" fill="#10B981" stroke="#10B981" strokeWidth="1" />

                {/* Entry Target Lines */}
                <line x1="230" y1="105" x2="500" y2="105" stroke="#6366F1" strokeDasharray="3 3" strokeWidth="1.5" />
                <text x="430" y="100" fill="#6366F1" fontSize="9" fontFamily="monospace">BUY ENTRY</text>

                <line x1="230" y1="135" x2="500" y2="135" stroke="#EF4444" strokeDasharray="3 3" strokeWidth="1.5" />
                <text x="435" y="130" fill="#EF4444" fontSize="9" fontFamily="monospace">STOP LOSS</text>

                <line x1="230" y1="45" x2="500" y2="45" stroke="#10B981" strokeDasharray="3 3" strokeWidth="1.5" />
                <text x="430" y="40" fill="#10B981" fontSize="9" fontFamily="monospace">TAKE PROFIT</text>
              </svg>

              {/* Central Premium Overlay */}
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center flex-col">
                <span className="text-4xl">🔮</span>
                <span className="text-white font-bold text-sm tracking-wider mt-2">HIGH FIDELITY CFD CHART</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
              <span>⚡ Powered by TradeTrackr Engine</span>
              <span>1:2 Risk to Reward Setup</span>
            </div>
          </div>

          {/* Premium Registration Card */}
          <div className="lg:col-span-5 bg-gradient-to-b from-indigo-900/30 to-slate-900/30 backdrop-blur-md border border-indigo-500/10 rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-3">
                <span>⭐</span>
                <span>Exclusive Upgrade</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Request Early Access
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                We are finalizing integrations for low-latency, 24-hour continuous historical index & forex feeds. Join our waitlist to be first in line when beta access launches.
              </p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>24-Hour continuous broker candles</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Click-and-drag drawing toolkit</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Playbook link & trade analysis logs</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-center">
                  <p className="font-bold text-sm mb-1">🎉 You are on the List!</p>
                  <p className="text-xs text-emerald-400/80">We have saved your email. You will receive an invite token shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35"
                  >
                    Request Priority Access
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Feature Grid Details */}
        <div className="border-t border-white/5 pt-16">
          <h3 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-12">
            Why Backtest with TradeTrackr?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl font-bold mb-4">
                ⏱️
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Replay Speed Control</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Step through market charts bar-by-bar at your own pace. Increase speed to test multiple trading weeks in a single hour.
              </p>
            </div>

            <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl font-bold mb-4">
                ✏️
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Interactive Drawings</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Easily draw Fibonacci, supply/demand boxes, and place entry targets with real-time risk-to-reward boundary indicators.
              </p>
            </div>

            <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl font-bold mb-4">
                📈
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Detailed Playbooks</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Link simulator runs directly to your playbook strategies, generating rich data reports to isolate patterns that yield high return rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
