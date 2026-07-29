'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '@/components/ui/Logo'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRADES' | 'MISTAKES' | 'PROPFIRM'>('DASHBOARD')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#07090e]">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-transparent blur-[120px] pointer-events-none z-0" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#07090e]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0e121e] border border-slate-800 rounded-xl flex items-center justify-center shadow-inner">
              <Logo className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-base font-black tracking-tight text-white">TradeTrackr</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#demo" className="text-slate-400 hover:text-white transition-colors hidden sm:block">Live Demo</a>
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors">Sign In</Link>
            <Link
              href="/signup"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center max-w-5xl mx-auto">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Auto MT4/MT5 Sync · Prop Firm Guardrails · Discipline Telemetry
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] mb-6">
          The Journal That Protects
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">
            Your Funded Edge.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Automatically import your MetaTrader trades, quantify the exact dollar cost of your discipline mistakes, and track prop firm rules in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/signup"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2"
          >
            Start Free Trial — No Credit Card Needed
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </Link>
          <a
            href="#demo"
            className="px-8 py-4 bg-[#0e121e] border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Interactive Demo ↓
          </a>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 border-t border-slate-800/60 max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <span>COMPATIBLE WITH:</span>
          <span className="text-slate-300 font-bold">FTMO</span>
          <span>·</span>
          <span className="text-slate-300 font-bold">FundedNext</span>
          <span>·</span>
          <span className="text-slate-300 font-bold">Funding Pips</span>
          <span>·</span>
          <span className="text-slate-300 font-bold">MetaTrader 4/5</span>
          <span>·</span>
          <span className="text-slate-300 font-bold">TradingView</span>
        </div>
      </section>

      {/* Interactive App Demo Showcase */}
      <section id="demo" className="py-12 px-6 max-w-6xl mx-auto">
        <div className="border border-slate-800 rounded-2xl bg-[#0c0f1a] overflow-hidden shadow-2xl shadow-black">
          
          {/* Top Window Bar */}
          <div className="px-6 py-4 border-b border-slate-800/80 bg-[#080a12] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-2">TradeTrackr Terminal</span>
            </div>

            {/* Interactive Tab Buttons */}
            <div className="flex bg-[#040509] p-1 rounded-xl border border-slate-800">
              {(['DASHBOARD', 'TRADES', 'MISTAKES', 'PROPFIRM'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-bold font-mono px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'DASHBOARD' && 'Dashboard'}
                  {tab === 'TRADES' && 'Trade Log'}
                  {tab === 'MISTAKES' && 'Mistake Audit'}
                  {tab === 'PROPFIRM' && 'Prop Firm Rules'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-6 sm:p-8 bg-[#0b0e18] text-left">
            <AnimatePresence mode="wait">
              {activeTab === 'DASHBOARD' && (
                <motion.div key="DASHBOARD" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Net Realized P&L</div>
                      <div className="text-xl font-black font-mono text-emerald-400 mt-1">+$8,342.00</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Win Rate</div>
                      <div className="text-xl font-black font-mono text-white mt-1">67.4%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Profit Factor</div>
                      <div className="text-xl font-black font-mono text-white mt-1">2.14</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Disciplined Edge</div>
                      <div className="text-xl font-black font-mono text-indigo-400 mt-1">82%</div>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[#0e1322] border border-slate-800 space-y-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">EQUITY CURVE & DISCIPLINE LEAK OVERLAY</span>
                      <span className="text-emerald-400 font-bold">+12.4% Capital Growth</span>
                    </div>
                    <svg viewBox="0 0 500 80" className="w-full h-24">
                      <path d="M0,70 Q50,60 100,52 T200,45 T300,25 T400,18 T500,8" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                    </svg>
                  </div>
                </motion.div>
              )}

              {activeTab === 'TRADES' && (
                <motion.div key="TRADES" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 font-mono text-xs">
                  <div className="text-slate-300 font-bold">AUTOMATED META-TRADER AUDIT LOG</div>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#0e1322] border border-slate-800 rounded-xl flex justify-between items-center">
                      <div><strong className="text-white">NAS100 BUY</strong> · 5 Lots</div>
                      <div className="text-emerald-400 font-bold">+$2,250.00</div>
                    </div>
                    <div className="p-3 bg-[#0e1322] border border-slate-800 rounded-xl flex justify-between items-center">
                      <div><strong className="text-white">XAUUSD SELL</strong> · 2 Lots</div>
                      <div className="text-emerald-400 font-bold">+$2,500.00</div>
                    </div>
                    <div className="p-3 bg-[#0e1322] border border-slate-800 rounded-xl flex justify-between items-center">
                      <div><strong className="text-white">US30 SELL</strong> · 3 Lots</div>
                      <div className="text-rose-400 font-bold">-$2,100.00</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'MISTAKES' && (
                <motion.div key="MISTAKES" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
                    <div className="font-bold text-sm text-rose-400">⚠️ Discipline Leak Diagnostic</div>
                    <div>FOMO & revenge trading cost you <strong className="text-white">-$4,108.00</strong> this month.</div>
                    <div>Without these 4 emotional trades, your P&L would be <strong className="text-emerald-400">+$12,450.00</strong>.</div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'PROPFIRM' && (
                <motion.div key="PROPFIRM" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400">FTMO Stage 1 Goal ($10,000)</span><span className="text-emerald-400 font-bold">83.4% Complete</span></div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-emerald-400 h-full w-[83.4%]" /></div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400">Daily Loss Limit Buffer ($5,000 max)</span><span className="text-emerald-400 font-bold">Safe (Used $600)</span></div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full w-[12%]" /></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/60">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">BUILT FOR DISCIPLINED SCALPERS</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">3 Tools Every Serious Trader Needs</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-[#0c0f1a] border border-slate-800 space-y-4 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-lg">01</div>
            <h3 className="text-lg font-bold text-white">Automated MT4/MT5 Cloud Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your MetaTrader credentials once. Your entry, exit, volume, and profit stream into TradeTrackr automatically without manual typing.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0c0f1a] border border-slate-800 space-y-4 hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg">02</div>
            <h3 className="text-lg font-bold text-white">Execution Leak Audit</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              See the exact dollar amount lost to revenge trading and FOMO. Compare your Actual P&L vs. Disciplined P&L side-by-side.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0c0f1a] border border-slate-800 space-y-4 hover:border-blue-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-lg">03</div>
            <h3 className="text-lg font-bold text-white">Prop Firm Rule Safeguards</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time daily drawdown and trailing loss gauges tuned to FTMO, FundedNext, and Funding Pips rules to prevent account breaches.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-b from-[#0c0f1a] to-[#080a12] border border-slate-800 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Start Tracking Your Edge Today</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Take control of your execution. Join prop firm traders who use TradeTrackr to audit discipline and scale capital.
          </p>
          <div className="pt-4">
            <Link
              href="/signup"
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-2xl shadow-indigo-600/40"
            >
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8 text-center text-xs font-mono text-slate-500">
        © {new Date().getFullYear()} TradeTrackr. All rights reserved. Built for prop firm & quantitative traders.
      </footer>
    </div>
  )
}
