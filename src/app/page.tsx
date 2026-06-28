'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '@/components/ui/Logo'

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 1, 0.5, 1] }
  })
}

const features = [
  {
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Advanced Performance Metrics',
    description: 'Equity curves, drawdown charts, win/loss distribution, and hourly performance analysis calculated in real time.',
    gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30'
  },
  {
    icon: (
      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Trade Coaching',
    description: 'Audits your trades to discover emotional triggers, strategy compliance gaps, and over-leveraged setups automatically.',
    gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/30'
  },
  {
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Visual P&L Calendar',
    description: 'Track daily profit streaks and losses on an interactive, color-coded calendar featuring custom density layouts.',
    gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30'
  },
]

const testimonials = [
  {
    quote: "TradeTrackr completely replaced my spreadsheets. The automatic MetaApi MT5 sync is flawless, and the drawdown tracking kept me compliant to pass my $100k FTMO challenge in two weeks.",
    author: "Maximilian R.",
    role: "Funded Futures & FX Trader",
    tag: "Passed $100k Challenge"
  },
  {
    quote: "The AI Coach discovered that I consistently lose money on Fridays due to emotional overtrading. Correcting that single mistake boosted my monthly win rate by 12% in the first month.",
    author: "Serena K.",
    role: "Retail Forex Trader",
    tag: "12% Win Rate Boost"
  }
]

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'ai'>('dashboard')
  const [challengeTarget, setChallengeTarget] = useState(100000)

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
      <div className="flex items-center justify-center min-h-screen bg-[#06070b]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
            <div className="w-16 h-16 bg-slate-950 border border-white/[0.08] rounded-2xl flex items-center justify-center shadow-2xl relative z-10 animate-bounce" style={{ animationDuration: '2.8s' }}>
              <Logo className="w-10 h-10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    )
  }

  if (user) return null

  // Challenge Calculations
  const profitTarget = challengeTarget * 0.08
  const dailyLossLimit = challengeTarget * 0.05
  const maxLossLimit = challengeTarget * 0.10

  return (
    <div className="min-h-screen bg-[#06070b] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        {/* Glow ambient filters */}
        <div className="absolute top-[-25%] left-[-15%] w-[80vw] h-[80vh] bg-gradient-to-br from-indigo-600/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[80vw] h-[80vh] bg-gradient-to-tl from-blue-600/8 to-transparent rounded-full blur-[140px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/[0.04] backdrop-blur-md bg-[#06070b]/60 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-950 border border-white/[0.08] rounded-xl flex items-center justify-center shadow-lg">
              <Logo className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">TradeTrackr</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-indigo-500/25 bg-indigo-500/8 text-indigo-300 text-xs font-semibold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Now with AI-Powered Trade Analysis
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 max-w-4xl"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              Trade Smarter.
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
              Journal Better.
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The intelligent trading journal designed for prop challenge and retail traders. Sync trades instantly, monitor consistency thresholds, and unlock AI coach analytics.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mb-20"
          >
            <Link
              href="/signup"
              className="w-full sm:w-auto text-center px-8 py-4 text-sm font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl transition-all duration-300 shadow-xl shadow-indigo-500/20 hover:-translate-y-0.5"
            >
              Start Journaling — Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-center px-8 py-4 text-sm font-semibold border border-white/8 hover:border-white/15 rounded-xl transition-all duration-300 hover:bg-white/5 text-gray-300 hover:text-white"
            >
              I have an account
            </Link>
          </motion.div>

          {/* Interactive Live Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-5xl rounded-2xl border border-white/[0.06] bg-slate-950/60 backdrop-blur-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative"
          >
            {/* Top Bar window controls */}
            <div className="px-4 py-3 bg-[#0d0e16]/80 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
              <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] px-4 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-gray-500">app.tradetrackr.io/dashboard</span>
              </div>
              <div className="w-12" />
            </div>

            <div className="flex min-h-[460px] flex-col md:flex-row">
              {/* Mock Sidebar */}
              <div className="w-full md:w-52 bg-[#090b10]/60 border-r border-white/[0.04] p-4 flex flex-col gap-1 text-left shrink-0">
                <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-2.5 mb-2">Workspace</div>
                {[
                  { id: 'dashboard', label: 'Journal Dashboard', icon: '⚡' },
                  { id: 'analytics', label: 'Advanced Analytics', icon: '📊' },
                  { id: 'ai', label: 'AI Trading Coach', icon: '🤖' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 shadow-inner'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] border border-transparent'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Mock Main Panel */}
              <div className="flex-1 p-6 text-left bg-slate-950/40 relative">
                <AnimatePresence mode="wait">
                  {activeTab === 'dashboard' && (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Widgets */}
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Win Rate', val: '68.2%', color: 'text-indigo-400' },
                          { label: 'Profit Factor', val: '2.14', color: 'text-emerald-400' },
                          { label: 'Net Profit', val: '+$4,250.00', color: 'text-emerald-400' }
                        ].map((w, idx) => (
                          <div key={idx} className="bg-white/[0.015] border border-white/[0.04] p-4 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{w.label}</span>
                            <span className={`text-base sm:text-xl font-black mt-1 tabular-nums ${w.color}`}>{w.val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Line Chart */}
                      <div className="bg-[#0b0c13]/40 border border-white/[0.04] p-5 rounded-xl flex flex-col justify-between h-56 relative">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-gray-400">Equity Curve (USD)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+$4,250 Cumulative</span>
                        </div>
                        {/* Animated SVG Path for Equity Growth */}
                        <div className="flex-1 relative w-full overflow-hidden mt-4">
                          <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15"/>
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            {/* Area */}
                            <motion.path
                              d="M0,100 Q100,80 180,95 T350,30 T500,10 L500,120 L0,120 Z"
                              fill="url(#eqGrad)"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 1 }}
                            />
                            {/* Line */}
                            <motion.path
                              d="M0,100 Q100,80 180,95 T350,30 T500,10"
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1.5, ease: 'easeOut' }}
                            />
                            {/* Hover Node Glow */}
                            <circle cx="500" cy="10" r="4.5" fill="#6366f1" />
                            <circle cx="500" cy="10" r="10" fill="none" stroke="#6366f1" strokeOpacity="0.4" className="animate-ping" />
                          </svg>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'analytics' && (
                    <motion.div
                      key="analytics"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400">Trade Logs / Ledger</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Sync active (MetaApi)</span>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {[
                          { symbol: 'EURUSD', side: 'BUY', lots: '2.50', pnl: '+$450.00', date: 'Jun 28, 02:44', style: 'text-emerald-400' },
                          { symbol: 'XAUUSD', side: 'SELL', lots: '1.00', pnl: '+$1,120.00', date: 'Jun 27, 18:30', style: 'text-emerald-400' },
                          { symbol: 'US30', side: 'BUY', lots: '10.00', pnl: '-$320.00', date: 'Jun 27, 15:12', style: 'text-red-400' },
                          { symbol: 'GBPUSD', side: 'BUY', lots: '3.00', pnl: '+$680.00', date: 'Jun 26, 09:15', style: 'text-emerald-400' }
                        ].map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] rounded-xl transition-all">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${t.side === 'BUY' ? 'bg-indigo-500/10 text-indigo-300' : 'bg-amber-500/10 text-amber-300'}`}>{t.side}</span>
                              <span className="text-xs font-bold text-white">{t.symbol}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{t.lots} lots</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-gray-500 font-mono">{t.date}</span>
                              <span className={`text-xs font-black tabular-nums ${t.style}`}>{t.pnl}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'ai' && (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-xs font-bold text-violet-400">AI Coach Audit Engine</span>
                      </div>
                      <div className="p-5 rounded-xl border border-violet-500/20 bg-violet-500/[0.02] space-y-4">
                        <div className="flex items-start gap-3">
                          <span className="text-xl">💡</span>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Consistency Insight</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              You have a <span className="text-violet-300 font-bold">72% win rate</span> when executing <span className="text-violet-300 font-semibold">Long setups on EURUSD</span> between 08:00 and 10:00 GMT. Keep utilizing this edge.
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-white/[0.04] my-3" />
                        <div className="flex items-start gap-3">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Risk Warning</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Your average loss increases by <span className="text-amber-300 font-bold">42%</span> immediately following a losing session. This points to <span className="text-amber-300 font-semibold">tilt trading</span>. Consider locking your journal for 2 hours after a loss.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
              Everything you need to{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                level up
              </span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
              Professional-grade tools designed for retail, challenge, and funded traders.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={`group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#090b10]/60 border border-white/[0.08] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Prop Firm Target Simulator Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.03] bg-gradient-to-b from-[#06070b] via-[#090b10]/40 to-[#06070b]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest">
              Challenge Evaluator
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Stay compliant with <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">Prop Firm Rules</span>
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Managing challenges like FTMO, FundedNext, or E8 requires extreme discipline. Slide the selector to calculate targets, maximum daily drawdowns, and maximum loss limits automatically.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                <span className="text-xs text-gray-300 font-semibold">Drawdown buffer tracking inside layout</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                <span className="text-xs text-gray-300 font-semibold">Active consistency violation alarms</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                <span className="text-xs text-gray-300 font-semibold">Hourly economic news release blockers</span>
              </div>
            </div>
          </div>

          {/* Interactive Calculator Widget */}
          <div className="lg:col-span-6 bg-slate-950/40 border border-white/[0.04] p-6 rounded-2xl shadow-xl flex flex-col gap-6 text-left">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Sizing</label>
                <span className="text-sm font-black text-indigo-400 tabular-nums">${challengeTarget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={200000}
                step={10000}
                value={challengeTarget}
                onChange={e => setChallengeTarget(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-ew-resize bg-white/5 h-1.5 rounded-lg border-none"
              />
              <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1">
                <span>$10k</span>
                <span>$50k</span>
                <span>$100k</span>
                <span>$200k</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '8% Profit Goal', val: `$${profitTarget.toLocaleString()}`, color: 'text-indigo-400' },
                { label: '5% Daily Limit', val: `$${dailyLossLimit.toLocaleString()}`, color: 'text-amber-500' },
                { label: '10% Max Drawdown', val: `$${maxLossLimit.toLocaleString()}`, color: 'text-red-500' }
              ].map((c, idx) => (
                <div key={idx} className="bg-[#090b10]/60 border border-white/[0.04] p-3.5 rounded-xl">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-1.5">{c.label}</div>
                  <div className={`text-sm sm:text-base font-black ${c.color} tabular-nums`}>{c.val}</div>
                </div>
              ))}
            </div>

            {/* Visual target progress bar preview */}
            <div className="space-y-1 bg-[#090b10]/40 p-4 rounded-xl border border-white/[0.03]">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-500">
                <span>Target Progress Simulation</span>
                <span className="text-indigo-300 font-mono">60% Completed</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.03]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
              Trusted by{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
                funded traders
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Real results from users who upgraded their journaling.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.015] border border-white/[0.04] flex flex-col justify-between text-left"
              >
                <p className="text-xs text-gray-400 italic leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.author}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.role}</p>
                  </div>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t.tag}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.03]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden p-8 sm:p-12 border border-indigo-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 to-blue-600/10 backdrop-blur-sm z-0" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/15 rounded-full blur-[90px] animate-pulse pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/15 rounded-full blur-[90px] animate-pulse pointer-events-none" style={{ animationDelay: '1.2s' }} />

            <div className="relative z-10 text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-white">
                Transform your performance
              </h2>
              <p className="text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
                Join funded prop challenge winners and disciplined retail traders worldwide. Take control of your edge.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex -space-x-1.5">
                  {['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500'].map((bg, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full ${bg} border-2 border-[#06070b] flex items-center justify-center text-[9px] font-extrabold text-white`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Over 25,000+ trades logged securely</span>
              </div>
              <Link
                href="/signup"
                className="inline-flex px-8 py-3.5 text-sm font-bold bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                Create Your Account Free
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-6 bg-[#030406]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-950 border border-white/[0.08] rounded-lg flex items-center justify-center shadow">
              <Logo className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400">TradeTrackr</span>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} TradeTrackr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
