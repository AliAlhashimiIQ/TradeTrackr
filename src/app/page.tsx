'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Logo from '@/components/ui/Logo'

// Standardized animations for staggered reveal
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  })
}

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Quantitative Metrics',
    description: 'Auto-calculate equity curves, relative drawdown cycles, win-rate distributions, and strategy expectancy heatmaps.',
    gradient: 'from-blue-600/20 to-cyan-500/10'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Cognitive & Behavioral Analysis',
    description: 'Uncover hidden execution patterns, identify emotional triggers, and quantify the cost of rule deviations using AI heuristics.',
    gradient: 'from-violet-600/20 to-purple-500/10'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Chronological Performance Logs',
    description: 'Visualize periodic performance distribution on a financial calendar. Identify optimal execution days at a glance.',
    gradient: 'from-emerald-600/20 to-teal-500/10'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    title: 'Setup & Tag Expectancy',
    description: 'Structure setups with custom tags. Compare statistical expectancy across instruments, sessions, and market states.',
    gradient: 'from-amber-600/20 to-orange-500/10'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Data Portability & Audits',
    description: 'Retain full control of trade ledger history. Standardized CSV and JSON exports ensure frictionless data portability.',
    gradient: 'from-rose-600/20 to-pink-500/10'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Private Cryptographic Ledger',
    description: 'Enforced with row-level database security policies. Your performance records belong solely to you.',
    gradient: 'from-indigo-600/20 to-blue-500/10'
  }
]

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Chart state simulation
  const [chartActiveStep, setChartActiveStep] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Periodic simulated update for chart preview
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setChartActiveStep((prev) => (prev + 1) % 3)
    }, 4500)
    return () => clearInterval(interval)
  }, [mounted])

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#06070b]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
            <div className="w-16 h-16 bg-[#0d0e16] border border-white/[0.08] rounded-2xl flex items-center justify-center shadow-2xl relative z-10 animate-bounce" style={{ animationDuration: '2s' }}>
              <Logo className="w-10 h-10 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-[#06070b] text-white overflow-hidden font-sans relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Ambient Radial Blobs */}
      <div className="absolute top-[-10%] left-[-15%] w-[80vw] h-[60vh] bg-gradient-to-br from-indigo-900/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vh] bg-gradient-to-bl from-violet-900/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[40vh] bg-gradient-to-tr from-blue-900/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation */}
      <header className="relative z-50 border-b border-white/[0.04] bg-[#06070b]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-b from-[#11131e] to-[#08090f] border border-white/[0.08] rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
              <Logo className="w-5.5 h-5.5" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">TradeTrackr</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25"
            >
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 lg:pt-24 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider"
            >
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              Machine Intelligence Integration
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                Log Trades.
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                Isolate Edge.
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl leading-relaxed"
            >
              Quantify performance, audit consistency rules, and capture behavioral biases with a secure, highly-integrated trading journal built for prop firm and retail traders.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-center bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl transition-all duration-300 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-center border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 hover:bg-white/5 text-gray-300 hover:text-white"
              >
                Access Journal
              </Link>
            </motion.div>
          </div>

          {/* Right Column: Interactive Dashboard Mockup */}
          <div className="lg:col-span-6 relative w-full flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[540px] rounded-2xl bg-gradient-to-b from-[#0f111a] to-[#07080d] border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] p-4 flex flex-col gap-4 relative overflow-hidden backdrop-blur-xl"
            >
              {/* Card glossy shimmer */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Mockup Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="text-[10px] font-mono text-gray-500 ml-2">LEDGER_MOCKUP_v2.0</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  +$2,450.00 Today
                </span>
              </div>

              {/* Candlestick & Target Chart (Animate) */}
              <div className="h-44 bg-[#05060a] rounded-xl border border-white/[0.04] p-3 flex flex-col justify-between relative overflow-hidden">
                {/* Horizontal target/entry/SL lines */}
                <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-indigo-500/20 flex justify-between px-2">
                  <span className="text-[8px] font-mono text-indigo-400/60 bg-[#05060a]/90 px-1 py-0.5 rounded">Take Profit (1.1040)</span>
                </div>
                <div className="absolute inset-x-0 top-[50%] border-t border-dashed border-emerald-500/20 flex justify-between px-2">
                  <span className="text-[8px] font-mono text-emerald-400/60 bg-[#05060a]/90 px-1 py-0.5 rounded">Entry Price (1.0920)</span>
                </div>
                <div className="absolute inset-x-0 top-[80%] border-t border-dashed border-red-500/20 flex justify-between px-2">
                  <span className="text-[8px] font-mono text-red-400/60 bg-[#05060a]/90 px-1 py-0.5 rounded">Stop Loss (1.0850)</span>
                </div>

                {/* Animated Candlesticks */}
                <div className="flex justify-around items-end h-28 pt-4 z-10 px-2">
                  {[
                    { h: 'h-16', w: 'h-24', isUp: true },
                    { h: 'h-12', w: 'h-18', isUp: false },
                    { h: 'h-20', w: 'h-28', isUp: true },
                    { h: 'h-14', w: 'h-22', isUp: true },
                    { h: 'h-10', w: 'h-16', isUp: false },
                    { h: 'h-24', w: 'h-32', isUp: true }
                  ].map((item, idx) => (
                    <motion.div 
                      key={idx} 
                      className="flex flex-col items-center w-6"
                      animate={{ scaleY: chartActiveStep === 0 ? 0.95 : chartActiveStep === 1 ? 1.05 : 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Wick */}
                      <div className={`w-0.5 ${item.w} ${item.isUp ? 'bg-emerald-500' : 'bg-red-500'} opacity-40`} />
                      {/* Body */}
                      <div className={`w-3.5 ${item.h} ${item.isUp ? 'bg-emerald-500/90' : 'bg-red-500/90'} rounded-sm shadow-md`} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Sub-metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Win Rate Circular Progress */}
                <div className="bg-[#05060a] border border-white/[0.04] p-3 rounded-xl flex items-center gap-3">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="24" className="stroke-white/5 fill-none" strokeWidth="3" />
                      <motion.circle 
                        cx="28" 
                        cy="28" 
                        r="24" 
                        className="stroke-indigo-500 fill-none" 
                        strokeWidth="3.5"
                        strokeDasharray="150"
                        animate={{ strokeDashoffset: chartActiveStep === 0 ? 45 : chartActiveStep === 1 ? 30 : 40 }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold font-mono">68%</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Win Ratio</h4>
                    <span className="text-xs font-bold text-white font-mono">34-16 Ledger</span>
                  </div>
                </div>

                {/* AI Performance insights widget */}
                <div className="bg-[#05060a] border border-white/[0.04] p-3 rounded-xl flex flex-col justify-between">
                  <h4 className="text-[9px] text-indigo-400 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    AI Optimization
                  </h4>
                  <p className="text-[9.5px] text-gray-400 leading-normal text-left mt-1">
                    Win expectancy peaks at <span className="text-emerald-400 font-bold font-mono">82%</span> trading EURUSD on Tuesday NY Sessions.
                  </p>
                </div>
              </div>

              {/* Recent executing trades */}
              <div className="flex flex-col gap-2">
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-extrabold text-left px-1">Ledger Feed</div>
                {[
                  { pair: 'EURUSD', type: 'BUY', vol: '1.20 Lots', pnl: '+$450.00', isWin: true },
                  { pair: 'GBPUSD', type: 'BUY', vol: '0.80 Lots', pnl: '+$280.00', isWin: true },
                  { pair: 'USDJPY', type: 'SELL', vol: '1.50 Lots', pnl: '-$110.00', isWin: false }
                ].map((trade, i) => (
                  <div key={i} className="px-3 py-2 bg-[#05060a] border border-white/[0.03] rounded-lg flex items-center justify-between text-xs transition-colors hover:border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono text-white">{trade.pair}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${trade.isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {trade.type}
                      </span>
                      <span className="text-gray-500 font-mono text-[10px]">{trade.vol}</span>
                    </div>
                    <span className={`font-mono font-bold ${trade.isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnl}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Glowing absolute background accent behind dashboard mockup */}
            <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl filter blur-3xl -z-10 transform scale-95" />
          </div>
        </section>

        {/* Stats Strip */}
        <section className="relative z-20 py-12 border-y border-white/[0.04] bg-[#07080f]/40 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '15+', label: 'Analytical Views' },
              { value: '24/7', label: 'Machine Inference' },
              { value: '100%', label: 'Self-Custody Ledger' },
              { value: '6+', label: 'Supported Evaluators' }
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400 mb-1 font-mono">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="relative z-10 py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                Designed for{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                  Disciplined Execution
                </span>
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                A system built to eliminate subjective bias, manage risk targets, and maintain clear records of your strategy metrics.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#0f111a] to-[#07080d] border border-white/[0.04] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} border border-white/5 flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                    <div className="text-indigo-400">{feature.icon}</div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Prop Firm Target Audits Section */}
        <section className="relative z-10 py-24 px-6 border-t border-white/[0.04] bg-[#07080f]/20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Side: Copy */}
              <div className="lg:col-span-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Evaluation Audits
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight leading-snug">
                  Enforce Evaluation{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                    Challenge Rules
                  </span>
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Maintain compliance across key challenge targets. The system logs daily balance adjustments, tracks relative drawdowns, and calculates position size limits.
                </p>
                <div className="space-y-4">
                  {[
                    'Automated Daily Drawdown limits tracking.',
                    'Checklist rule consistency checkers (e.g. 40% rule).',
                    'Frictionless MT5 account sync updates.'
                  ].map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-300 font-semibold">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Animated Evaluator Visualizer */}
              <div className="lg:col-span-7 flex justify-center w-full">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="w-full max-w-[500px] bg-[#0c0d15] border border-white/[0.06] rounded-2xl p-5 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                    <span className="text-xs font-bold text-gray-400">Evaluation Phase 1 Progress</span>
                    <span className="text-xs font-bold font-mono text-amber-400">$8,200.00 / $10,000.00</span>
                  </div>

                  {/* Target progress indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                      <span>Profit Target Status</span>
                      <span>82.0% Completed</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" 
                        initial={{ width: 0 }}
                        whileInView={{ width: '82%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Limits metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 bg-[#05060a] border border-white/[0.03] rounded-xl text-left space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Daily DD Drawdown</span>
                      <div className="text-base font-bold font-mono text-emerald-400">-$1,240.00 / -$5,000.00</div>
                      <div className="text-[9px] text-gray-500">Safe Status (3.76% Remaining)</div>
                    </div>
                    <div className="p-3.5 bg-[#05060a] border border-white/[0.03] rounded-xl text-left space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Maximum Drawdown</span>
                      <div className="text-base font-bold font-mono text-emerald-400">-$3,450.00 / -$10,000.00</div>
                      <div className="text-[9px] text-gray-500">Safe Status (6.55% Remaining)</div>
                    </div>
                  </div>

                  {/* Log list */}
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left px-1">Challenge Checklists</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Minimum 5 Execution Days rule', ok: true },
                      { label: 'Consistency check (Single day under 40% target)', ok: true },
                      { label: 'All trades closed over weekend hours', ok: true }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#05060a] border border-white/[0.03] rounded-lg">
                        <span className="text-xs text-gray-300 font-medium">{item.label}</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">Passed</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* Action Call Section */}
        <section className="relative z-10 py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-3xl overflow-hidden p-10 sm:p-14 text-center bg-gradient-to-br from-indigo-950/20 to-blue-950/25 border border-indigo-500/20 shadow-2xl shadow-indigo-950/10"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                Enhance Performance Today
              </h2>
              <p className="text-gray-300 text-base mb-8 max-w-md mx-auto leading-relaxed">
                Connect your account and verify your strategy edge with professional-grade diagnostics.
              </p>
              
              <div className="flex justify-center gap-8 mb-8 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                <div>Stripe Security</div>
                <div>SSL Encrypted</div>
                <div>GDPR Compliant</div>
              </div>

              <Link
                href="/signup"
                className="inline-flex px-8 py-3.5 text-sm font-bold uppercase tracking-wider bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-xl hover:-translate-y-0.5"
              >
                Create Account
              </Link>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-6 bg-[#06070b]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-b from-[#11131e] to-[#08090f] border border-white/[0.08] rounded-lg flex items-center justify-center shadow">
              <Logo className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm font-semibold text-gray-400">TradeTrackr</span>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} TradeTrackr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
