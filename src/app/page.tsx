'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '@/components/ui/Logo'

// Staggered reveal animations
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  })
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
      <div className="flex items-center justify-center min-h-screen bg-[#06080e]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#0B0F19] border border-slate-800 rounded-xl flex items-center justify-center animate-pulse">
            <Logo className="w-7 h-7 text-indigo-400" />
          </div>
        </div>
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-[#06070b] text-[#e2e8f0] font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* Institutional Top Market Ticker Tape */}
      <div className="w-full bg-[#0b0e17] border-b border-slate-800/80 px-4 py-1.5 text-[11px] font-mono text-slate-400 overflow-x-auto whitespace-nowrap flex items-center justify-between gap-6 select-none">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE TELEMETRY
          </span>
          <span>XAUUSD <strong className="text-emerald-400 font-bold">$2,384.50 (+1.4%)</strong></span>
          <span className="text-slate-700">|</span>
          <span>NAS100 <strong className="text-emerald-400 font-bold">19,840.20 (+2.1%)</strong></span>
          <span className="text-slate-700">|</span>
          <span>EURUSD <strong className="text-rose-400 font-bold">1.0842 (-0.3%)</strong></span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-slate-400 text-[10px]">
          <span>PROP FIRM PASS RATE: <strong className="text-slate-200">94.2%</strong></span>
          <span>DISCIPLINE LEAK SAVINGS: <strong className="text-emerald-400">+$4,108/MO</strong></span>
        </div>
      </div>

      {/* Header Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#06070b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0b0f19] border border-slate-800 rounded-lg flex items-center justify-center shadow-inner">
              <Logo className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-white font-sans">TradeTrackr</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/20"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-md border border-slate-800 bg-[#0B0F19] text-indigo-400 text-[10px] font-mono font-bold uppercase tracking-widest"
          >
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            INSTITUTIONAL PERFORMANCE TELEMETRY & DISCIPLINE AUDITING
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6 text-white"
          >
            The Trading Journal Built For
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">
              Prop Firm & Quantitative Traders.
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-slate-400 text-sm sm:text-base mb-8 max-w-2xl leading-relaxed"
          >
            Stop losing funded accounts to emotional execution leaks. TradeTrackr calculates your exact <strong className="text-slate-200">Execution Leak Cost</strong>, enforces prop firm drawdown guardrails, and syncs MT4/MT5 automatically.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-3 mb-12"
          >
            <Link
              href="/signup"
              className="px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/25"
            >
              Launch Terminal Free
            </Link>
            <Link
              href="/login"
              className="px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-800 bg-[#0c0e17] hover:border-slate-700 text-slate-300 transition-all"
            >
              Explore Live Demo
            </Link>
          </motion.div>
        </div>

        {/* High-Density Interactive Terminal Preview Frame */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto border border-slate-800 rounded-2xl bg-[#0b0e17] overflow-hidden shadow-2xl shadow-black"
        >
          {/* OS Terminal Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#080a11]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <span className="text-[11px] font-mono text-slate-400 ml-2">TradeTrackr Terminal v2.4</span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-[#05060a] p-1 rounded-lg border border-slate-800">
              {(['DASHBOARD', 'TRADES', 'ANALYTICS', 'CALENDAR', 'ACCOUNTS'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] font-bold font-mono uppercase tracking-wider px-3 py-1 rounded transition-all ${
                    activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono">
                ● MT5 CONNECTED
              </span>
            </div>
          </div>

          {/* Terminal Workspace Content */}
          <div className="p-6 bg-[#0B0F19] text-left">
            <AnimatePresence mode="wait">
              {activeTab === 'DASHBOARD' && (
                <motion.div
                  key="DASHBOARD"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-[#0e1320] border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">NET REALIZED P&L</span>
                      <div className="text-lg font-black font-mono text-emerald-400 mt-1">+$8,342.00</div>
                      <span className="text-[9px] text-emerald-400 font-bold font-mono">▲ +12.4% Capital</span>
                    </div>

                    <div className="bg-[#0e1320] border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">WIN RATE</span>
                      <div className="text-lg font-black font-mono text-white mt-1">67.4%</div>
                      <span className="text-[9px] text-emerald-400 font-bold font-mono">31 W / 15 L</span>
                    </div>

                    <div className="bg-[#0e1320] border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">PROFIT FACTOR</span>
                      <div className="text-lg font-black font-mono text-white mt-1">2.14</div>
                      <span className="text-[9px] text-slate-400 font-mono">Expectancy: +1.8R</span>
                    </div>

                    <div className="bg-[#0e1320] border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">DISCIPLINE LEAK COST</span>
                      <div className="text-lg font-black font-mono text-rose-400 mt-1">-$4,108.00</div>
                      <span className="text-[9px] text-rose-400 font-bold font-mono">FOMO & Revenge Trades</span>
                    </div>
                  </div>

                  {/* Execution Leak Banner */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-[#080a11] flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Execution Leak Audit</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Without FOMO & revenge trades, your P&L would be <strong className="text-emerald-400 font-mono">+$12,450.00</strong> (+49% higher profit).
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono whitespace-nowrap">
                      Disciplined Edge: 82%
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'TRADES' && (
                <motion.div key="TRADES" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="text-xs font-bold text-slate-300 font-mono">TRADE EXECUTION LEDGER</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                          <th className="py-2">TIME (EST)</th>
                          <th>SYMBOL</th>
                          <th>SIDE</th>
                          <th>LOTS</th>
                          <th>ENTRY</th>
                          <th>EXIT</th>
                          <th className="text-right">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr className="hover:bg-slate-800/30">
                          <td className="py-2.5 text-slate-400">09:32 AM</td>
                          <td className="font-bold text-white">NAS100</td>
                          <td className="text-emerald-400 font-bold">LONG</td>
                          <td className="text-slate-300">5.00</td>
                          <td className="text-slate-300">19,820.50</td>
                          <td className="text-slate-300">19,865.00</td>
                          <td className="text-right text-emerald-400 font-bold">+$2,250.00</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                          <td className="py-2.5 text-slate-400">10:15 AM</td>
                          <td className="font-bold text-white">XAUUSD</td>
                          <td className="text-rose-400 font-bold">SHORT</td>
                          <td className="text-slate-300">2.00</td>
                          <td className="text-slate-300">2,385.00</td>
                          <td className="text-slate-300">2,372.50</td>
                          <td className="text-right text-emerald-400 font-bold">+$2,500.00</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                          <td className="py-2.5 text-slate-400">11:05 AM</td>
                          <td className="font-bold text-white">US30</td>
                          <td className="text-rose-400 font-bold">SHORT</td>
                          <td className="text-slate-300">3.00</td>
                          <td className="text-slate-300">39,450.00</td>
                          <td className="text-slate-300">39,520.00</td>
                          <td className="text-right text-rose-400 font-bold">-$2,100.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'ANALYTICS' && (
                <motion.div key="ANALYTICS" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="text-xs font-bold text-slate-300 font-mono">SESSION & SYMBOL EXPECTANCY MATRIX</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0e1320] p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Win Rate by Session</div>
                      <div className="space-y-2 font-mono text-xs">
                        <div className="flex justify-between"><span>New York Open (8:30-11:00 EST)</span><strong className="text-emerald-400">74% WR</strong></div>
                        <div className="flex justify-between"><span>London Open (3:00-6:00 EST)</span><strong className="text-indigo-400">62% WR</strong></div>
                        <div className="flex justify-between"><span>Asian Session (20:00-0:00 EST)</span><strong className="text-rose-400">38% WR</strong></div>
                      </div>
                    </div>

                    <div className="bg-[#0e1320] p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Prop Firm Compliance Safeguards</div>
                      <div className="space-y-2 font-mono text-xs">
                        <div className="flex justify-between"><span>Daily Loss Limit ($5,000)</span><strong className="text-emerald-400">Used 12% ($600)</strong></div>
                        <div className="flex justify-between"><span>Max Trailing Drawdown ($10,000)</span><strong className="text-emerald-400">Used 34.5%</strong></div>
                        <div className="flex justify-between"><span>FTMO Stage 1 Status</span><strong className="text-indigo-400">83.4% Target Met</strong></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'CALENDAR' && (
                <motion.div key="CALENDAR" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="text-xs font-bold text-slate-300 font-mono">TRADING CALENDAR MATRIX</div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-mono">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-slate-500 font-bold">{d}</div>)}
                    {Array.from({ length: 14 }).map((_, i) => {
                      const day = i + 1;
                      const isWin = [2, 5, 6, 8, 9, 12, 13].includes(day);
                      const isLoss = [3, 10].includes(day);
                      return (
                        <div key={i} className={`p-2 rounded-lg border text-left min-h-12 flex flex-col justify-between ${
                          isWin ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' :
                          isLoss ? 'bg-rose-950/40 border-rose-500/30 text-rose-400' :
                          'bg-[#0e1320] border-slate-800 text-slate-500'
                        }`}>
                          <span className="text-[10px] text-slate-400">{day}</span>
                          {isWin && <span className="font-bold text-[10px]">+${(day * 220).toFixed(0)}</span>}
                          {isLoss && <span className="font-bold text-[10px]">-${(day * 180).toFixed(0)}</span>}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ACCOUNTS' && (
                <motion.div key="ACCOUNTS" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="text-xs font-bold text-slate-300 font-mono">MULTI-ACCOUNT CLOUD HUB</div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3.5 bg-[#0e1320] border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">FTMO Evaluation $100K</div>
                        <div className="text-[10px] text-slate-400">MetaTrader 5 · Server: FTMO-Demo</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        ● AUTO SYNCED
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#0e1320] border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">FundedNext $50K Challenge</div>
                        <div className="text-[10px] text-slate-400">MetaTrader 5 · Server: FundedNext-Server</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        ● AUTO SYNCED
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-16 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">ENGINEERED FOR DISCIPLINE</span>
          <h2 className="text-3xl font-black tracking-tight text-white">Everything You Need To Pass & Keep Funded Accounts</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0b0e17] border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold font-mono">01</div>
            <h3 className="text-base font-bold text-white">Execution Leak Cost</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Computes the exact dollar impact of FOMO and revenge trades on your monthly P&L so you know how much money poor discipline costs you.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b0e17] border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono">02</div>
            <h3 className="text-base font-bold text-white">Prop Firm Guardrails</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time daily loss & max trailing drawdown progress monitors built specifically for FTMO, FundedNext, and Funding Pips rules.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b0e17] border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold font-mono">03</div>
            <h3 className="text-base font-bold text-white">Auto MT4/MT5 Cloud Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero manual data entry. Connect your MetaTrader credentials and trades stream into your journal in real-time via cloud API.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Call to Action */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center border-t border-slate-800/80">
        <div className="p-10 rounded-3xl bg-[#0b0e17] border border-slate-800 space-y-6">
          <h2 className="text-3xl font-black text-white">Ready To Protect Your Funded Edge?</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Join professional prop firm traders who use TradeTrackr to audit discipline, pass challenges, and scale funded capital.
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xl shadow-indigo-600/30"
            >
              Start Free Today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs font-mono text-slate-500">
        © {new Date().getFullYear()} TradeTrackr. All rights reserved. Built for prop firm & quantitative traders.
      </footer>
    </div>
  )
}
