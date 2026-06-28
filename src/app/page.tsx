'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '@/components/ui/Logo'

// Staggered reveal animations
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  })
}

const sectionFade = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  }
}

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRADES' | 'ANALYTICS' | 'CALENDAR' | 'ACCOUNTS'>('DASHBOARD')

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
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] dark:bg-[#080a0f]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 blur-xl animate-pulse" />
            <div className="w-14 h-14 bg-white dark:bg-[#0d1018] border border-slate-200 dark:border-white/[0.06] rounded-2xl flex items-center justify-center relative z-10 animate-pulse">
              <Logo className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080a0f] text-slate-900 dark:text-[#e2e8f0] overflow-hidden font-sans relative selection:bg-indigo-500/30 selection:text-white transition-colors duration-300">
      
      {/* Top ambient radial blobs (Theme-responsive opacity) */}
      <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[55vh] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[40%] right-[-10%] w-[60vw] h-[50vh] bg-blue-500/[0.03] dark:bg-blue-500/[0.05] rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none z-0" />

      {/* Floating Header Navigation */}
      <nav className="relative z-50 border-b border-slate-200 dark:border-white/[0.06] bg-white/70 dark:bg-[#080a0f]/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 bg-gradient-to-b from-white to-slate-50 dark:from-[#1b1e2c] dark:to-[#0d1018] border border-slate-200 dark:border-white/[0.08] rounded-lg flex items-center justify-center shadow-sm">
              <Logo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-gray-300">TradeTrackr</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-500 dark:text-[#6b7694] hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full border border-indigo-500/20 dark:border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest"
          >
            <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-pulse" />
            Built for Funded and Challenge Traders
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
          >
            The journal that
            <br />
            actually <span className="text-indigo-600 dark:text-indigo-400">improves</span> your edge.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-slate-500 dark:text-[#6b7694] text-sm sm:text-base mb-10 max-w-lg leading-relaxed"
          >
            Deep analytics. Challenge compliance tracking. Multi-account hubs. Complete performance telemetry letting you visualize your strengths.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="flex items-center gap-4 mb-16"
          >
            <Link
              href="/signup"
              className="px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/15"
            >
              Start Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-gray-300 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.02]"
            >
              See It Live
            </Link>
          </motion.div>
        </div>

        {/* Interactive App Mockup Frame (Theme responsive visual updates) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto border border-slate-200 dark:border-white/[0.08] border-b-0 rounded-t-2xl bg-white dark:bg-[#0d1018] overflow-hidden shadow-2xl shadow-slate-300/40 dark:shadow-black/80"
        >
          {/* OS window top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0b0d14]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>

            {/* Main Tabs */}
            <div className="flex bg-slate-100 dark:bg-black/20 p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.04]">
              {(['DASHBOARD', 'TRADES', 'ANALYTICS', 'CALENDAR', 'ACCOUNTS'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${
                    activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-[#3d4460] hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {tab.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono">
                ● LIVE
              </div>
              <span className="text-[10px] text-slate-500 dark:text-gray-500 font-mono">FTMO — $100K</span>
            </div>
          </div>

          {/* Window Workspace Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] min-h-[380px] text-left">
            
            {/* Sidebar Mockup */}
            <aside className="border-r border-slate-100 dark:border-white/[0.04] p-4 bg-slate-50/50 dark:bg-[#0b0d14]/40 space-y-6 hidden md:block">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-gray-600 uppercase tracking-widest px-2">Overview</span>
                <div className="mt-2 space-y-1">
                  {(['DASHBOARD', 'TRADES', 'ANALYTICS', 'CALENDAR'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                        activeTab === tab 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                          : 'text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {tab === 'DASHBOARD' && 'Dashboard'}
                      {tab === 'TRADES' && 'Trade Log'}
                      {tab === 'ANALYTICS' && 'Analytics'}
                      {tab === 'CALENDAR' && 'Calendar'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-gray-600 uppercase tracking-widest px-2">Accounts</span>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => setActiveTab('ACCOUNTS')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                      activeTab === 'ACCOUNTS' 
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    FTMO $100K
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 dark:text-gray-500">
                    FundedNext $50K
                  </div>
                </div>
              </div>
            </aside>

            {/* Stateful content workspace */}
            <div className="p-6 bg-white dark:bg-[#0d1018] relative">
              <AnimatePresence mode="wait">
                
                {/* 1. DASHBOARD VIEW */}
                {activeTab === 'DASHBOARD' && (
                  <motion.div
                    key="DASHBOARD"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Performance Metrics</span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">This Month</span>
                    </div>

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-3 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Net P&L</span>
                        <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">+$8,342.00</div>
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-500 font-bold font-mono">▲ 12.4%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-3 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Win Rate</span>
                        <div className="text-base font-bold font-mono text-slate-800 dark:text-white mt-1">67.4%</div>
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-500 font-bold font-mono">▲ 3.1%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-3 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Avg RR</span>
                        <div className="text-base font-bold font-mono text-slate-800 dark:text-white mt-1">2.14 R</div>
                        <span className="text-[8px] text-slate-400 dark:text-gray-500 font-mono">Consistent</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-3 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Max Drawdown</span>
                        <div className="text-base font-bold font-mono text-red-600 dark:text-red-400 mt-1">-$3,450.00</div>
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">Under limit</span>
                      </div>
                    </div>

                    {/* SVG Equity Curve with path-drawing animation */}
                    <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-4 rounded-xl">
                      <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block mb-3">Equity Growth Curve</span>
                      <svg viewBox="0 0 500 80" className="w-full">
                        <defs>
                          <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.15"/>
                            <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
                          </linearGradient>
                        </defs>
                        <motion.path 
                          d="M0,70 Q50,60 100,52 T200,45 T300,25 T400,18 T500,8 L500,80 L0,80 Z" 
                          fill="url(#eq-grad)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1 }}
                        />
                        <motion.path 
                          d="M0,70 Q50,60 100,52 T200,45 T300,25 T400,18 T500,8" 
                          fill="none" 
                          stroke="#4f46e5" 
                          strokeWidth="2" 
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                        <motion.circle 
                          cx="500" 
                          cy="8" 
                          r="4" 
                          fill="#4f46e5" 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.4 }}
                        />
                      </svg>
                    </div>

                    {/* Expectancy lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-3 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 tracking-wider block mb-2 uppercase">Session Expectancy</span>
                        <div className="space-y-2">
                          {[
                            { name: 'New York', val: '+3.2R', color: 'text-emerald-600 dark:text-emerald-400' },
                            { name: 'London', val: '+1.8R', color: 'text-indigo-600 dark:text-indigo-400' },
                            { name: 'Tokyo', val: '-0.4R', color: 'text-red-600 dark:text-red-400' }
                          ].map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[9px] font-semibold">
                              <span className="text-slate-600 dark:text-gray-300">{item.name}</span>
                              <span className={`${item.color} font-mono font-bold`}>{item.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] p-3 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 tracking-wider block mb-2 uppercase">Recent Trades</span>
                        <div className="space-y-1.5 text-[9px] font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-700 dark:text-gray-200">NQ Long</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">+$480</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700 dark:text-gray-200">ES Short</span>
                            <span className="text-red-600 dark:text-red-400 font-mono">-$220</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. TRADES VIEW */}
                {activeTab === 'TRADES' && (
                  <motion.div
                    key="TRADES"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-4 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Trade Execution Ledger</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/[0.04] text-slate-400 dark:text-gray-500 text-left font-mono">
                            <th className="py-2">Date</th>
                            <th>Symbol</th>
                            <th>Side</th>
                            <th>Size</th>
                            <th className="text-right">Net PnL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.02]">
                          {[
                            { date: 'Jun 28, 14:20', pair: 'NQ1!', type: 'BUY', vol: '2 Lots', pnl: '+$480.00', win: true },
                            { date: 'Jun 27, 09:15', pair: 'ES1!', type: 'SELL', vol: '1 Lot', pnl: '-$220.00', win: false },
                            { date: 'Jun 26, 11:30', pair: 'GC1!', type: 'BUY', vol: '3 Lots', pnl: '+$750.00', win: true },
                            { date: 'Jun 25, 10:45', pair: 'CL1!', type: 'BUY', vol: '2 Lots', pnl: '+$360.00', win: true },
                          ].map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                              <td className="py-2 text-slate-400 dark:text-gray-500 font-mono">{t.date}</td>
                              <td className="font-bold text-slate-800 dark:text-white">{t.pair}</td>
                              <td className={t.type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>{t.type}</td>
                              <td className="text-slate-400 dark:text-gray-400 font-mono">{t.vol}</td>
                              <td className={`text-right font-mono font-bold ${t.win ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{t.pnl}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* 3. ANALYTICS VIEW */}
                {activeTab === 'ANALYTICS' && (
                  <motion.div
                    key="ANALYTICS"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-5"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Heuristic Diagnostics</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#0f1219] p-4 rounded-xl border border-slate-200 dark:border-white/[0.05] space-y-4">
                      <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono block uppercase">Win-Rate Expectations by Day</span>
                      <div className="space-y-3">
                        {[
                          { day: 'Tuesday', rate: '82%', w: 'w-[82%]', color: 'bg-emerald-500' },
                          { day: 'Wednesday', rate: '68%', w: 'w-[68%]', color: 'bg-indigo-500' },
                          { day: 'Thursday', rate: '60%', w: 'w-[60%]', color: 'bg-indigo-500' },
                          { day: 'Monday', rate: '35%', w: 'w-[35%]', color: 'bg-red-500' }
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono">
                              <span className="text-slate-500 dark:text-gray-400">{item.day}</span>
                              <span className="text-slate-800 dark:text-white font-bold">{item.rate}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                className={`h-full ${item.color} rounded-full`} 
                                initial={{ width: 0 }}
                                animate={{ width: item.rate }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. CALENDAR VIEW */}
                {activeTab === 'CALENDAR' && (
                  <motion.div
                    key="CALENDAR"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Ledger Calendar Heatmap</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 text-center text-[9px]">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
                        <div key={d} className="text-slate-400 dark:text-gray-600 font-bold">{d}</div>
                      ))}
                      {Array.from({ length: 28 }).map((_, i) => {
                        const dayNo = i + 1;
                        let pnl = '';
                        let color = 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/[0.02] text-slate-700 dark:text-[#e2e8f0]';
                        if (dayNo === 2) { pnl = '+$450'; color = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'; }
                        if (dayNo === 4) { pnl = '-$120'; color = 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'; }
                        if (dayNo === 9) { pnl = '+$310'; color = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'; }
                        if (dayNo === 15) { pnl = '+$920'; color = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'; }
                        if (dayNo === 22) { pnl = '-$450'; color = 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'; }
                        return (
                          <div key={i} className={`p-2 rounded-lg border ${color} min-h-11 flex flex-col justify-between items-start text-left`}>
                            <span className="text-slate-400 dark:text-gray-500 font-mono">{dayNo}</span>
                            {pnl && <span className="font-bold text-[8px] font-mono mt-1">{pnl}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* 5. ACCOUNTS VIEW */}
                {activeTab === 'ACCOUNTS' && (
                  <motion.div
                    key="ACCOUNTS"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Account Synchronization Hub</span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { name: 'FTMO Evaluation $100K', type: 'MetaTrader 5', status: 'SYNCED', time: 'Synced 2m ago' },
                        { name: 'FundedNext $50K Challenge', type: 'MetaTrader 5', status: 'SYNCED', time: 'Synced 15m ago' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-white/[0.05] rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-white">{item.name}</div>
                            <div className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">{item.type} · {item.time}</div>
                          </div>
                          <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats strip bar */}
      <section className="relative z-10 py-12 border-y border-slate-200 dark:border-white/[0.05] bg-white/40 dark:bg-[#0d1018]/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
          {[
            { value: '50K+', label: 'Active traders' },
            { value: '12+', label: 'Metrics per trade' },
            { value: '$2.4M', label: 'P&L analyzed daily' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '4.9★', label: 'Average rating' }
          ].map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">{stat.value}</div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-semibold mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Traders Switch Comparison Matrix */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionFade}
        className="max-w-4xl mx-auto py-24 px-6 relative z-10"
      >
        <div className="text-left mb-12">
          <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Why traders switch</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-slate-900 dark:text-white">Compare the Ledger Edge</h2>
          <p className="text-slate-500 dark:text-[#6b7694] text-xs sm:text-sm mt-1 max-w-md">No fluff. A straight feature comparison against traditional methods.</p>
        </div>

        <div className="border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden bg-white/60 dark:bg-[#0d1018]/50 shadow-xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.06] text-[10px] font-bold text-slate-400 dark:text-gray-500 font-mono">
                <th className="p-4 bg-slate-50 dark:bg-[#0b0d14] w-[40%]">Feature Matrix</th>
                <th className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-center">TradeTrackr</th>
                <th className="p-4 bg-slate-50 dark:bg-[#0b0d14] text-center">Standard Journals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] text-xs">
              {[
                { name: 'Multi-account aggregate logs', ok: '✓ Funded + Live + Demo', bad: '—' },
                { name: 'Prop firm compliance radar', ok: '✓ Daily Drawdown locks', bad: 'Basic / Manual' },
                { name: 'Session expectancy analytics', ok: '✓ NY / London / Tokyo', bad: '—' },
                { name: 'Equity curve + Drawdown overlays', ok: '✓ Fully Integrated', bad: '✓ (Manual calculation)' },
                { name: 'AI heuristics & mistake detection', ok: '✓ Included', bad: '—' },
                { name: 'Trade Calendar view heatmaps', ok: '✓ Included', bad: '✓ (Basic only)' },
              ].map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-indigo-50/10 dark:bg-indigo-950/5' : ''}>
                  <td className="p-4 font-bold text-slate-700 dark:text-gray-300">{row.name}</td>
                  <td className="p-4 text-center text-indigo-600 dark:text-indigo-300 font-semibold">{row.ok}</td>
                  <td className="p-4 text-center text-slate-400 dark:text-gray-600 font-mono">{row.bad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* Core Features section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionFade}
        className="max-w-5xl mx-auto py-16 px-6 relative z-10"
      >
        <div className="text-left mb-16">
          <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Core Features</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-slate-900 dark:text-white">Everything your edge needs.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Live Equity Curve', desc: 'Visual P&L with drawdown overlays, daily targets, and session annotations. See your edge evolve in real time.' },
            { title: 'Compliance Radar', desc: 'Auto-checks against evaluation challenge rules. Daily drawdown and cumulative limits, always visible.' },
            { title: 'Session Expectancy', desc: 'Know exactly which sessions make you money and which drain it. Stop trading your worst hours.' },
            { title: 'Multi-Account Hub', desc: 'Funded, live, and demo accounts in one view. Aggregate or compare — switch in one click.' },
            { title: 'AI Heuristics', desc: 'Pattern detection across your journal. Tells you what your setups, times, and mistakes actually cost you.' },
            { title: 'Trade Calendar', desc: 'Daily P&L heatmap. Find your best days, worst days, and why — at a glance.' },
          ].map((item, idx) => (
            <div key={idx} className="p-6 bg-white dark:bg-[#0d1018] border border-slate-200 dark:border-white/[0.06] rounded-2xl flex flex-col justify-between min-h-48 hover:border-indigo-500/20 transition-all hover:-translate-y-1 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
              {idx === 3 && (
                <span className="inline-block mt-4 text-[9px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded self-start font-bold uppercase tracking-widest">
                  Unique Edge
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.section>

      {/* Social proof testimonials section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionFade}
        className="max-w-4xl mx-auto py-16 px-6 relative z-10"
      >
        <div className="text-left mb-12">
          <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Traders Say</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-slate-900 dark:text-white">Real results, real traders.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'James M.', role: 'Futures Trader', quote: 'Session expectancy alone changed how I size positions. I stopped trading Tokyo completely. Up 18% since.' },
            { name: 'Sara R.', role: 'Forex Trader', quote: 'Switched because of the multi-account view. Managing 3 funded accounts is actually manageable now.' },
            { name: 'Kevin L.', role: 'Crypto Scalper', quote: 'The compliance radar saved me from a drawdown breach on a bad week. It literally paid for a year of the subscription.' }
          ].map((item, idx) => (
            <div key={idx} className="p-6 bg-white dark:bg-[#0d1018] border border-slate-200 dark:border-white/[0.06] rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
              <p className="text-xs text-slate-500 dark:text-gray-400 italic leading-relaxed">"{item.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {item.name.substring(0, 2)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{item.name}</div>
                  <div className="text-[9px] text-slate-400 dark:text-gray-500 font-semibold uppercase">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* CTA section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionFade}
        className="max-w-3xl mx-auto py-24 px-6 text-center z-10 relative"
      >
        <div className="p-12 sm:p-16 bg-white dark:bg-[#0d1018] border border-slate-200 dark:border-white/[0.06] rounded-3xl space-y-6 shadow-xl">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Start journaling. Start winning.</h2>
          <p className="text-slate-500 dark:text-gray-500 text-xs sm:text-sm max-w-xs mx-auto">Free forever on the base plan. Upgrade when you are ready.</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/15"
            >
              Create Free Account
            </Link>
          </div>
          <div className="flex justify-center gap-6 pt-4 text-[9px] font-mono text-slate-400 dark:text-gray-600">
            <div>✓ No credit card</div>
            <div>✓ Cancel anytime</div>
            <div>✓ Import in 2 minutes</div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/[0.04] py-8 px-6 bg-white dark:bg-[#080a0f] text-slate-400 dark:text-gray-600 text-xs transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>&copy; {new Date().getFullYear()} TradeTrackr. Built for traders, by traders.</div>
          <div className="flex gap-4">
            <span className="hover:text-slate-700 dark:hover:text-white cursor-pointer">Privacy</span>
            <span className="hover:text-slate-700 dark:hover:text-white cursor-pointer">Terms</span>
            <span className="hover:text-slate-700 dark:hover:text-white cursor-pointer">Support</span>
            <span className="hover:text-slate-700 dark:hover:text-white cursor-pointer">Changelog</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
