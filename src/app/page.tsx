'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import Logo from '@/components/ui/Logo'

// Staggered reveal animations
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  })
}

const bentoFade = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
}

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  // Scroll Hooks for Parallax blobs and Top progress bar
  const { scrollY, scrollYProgress } = useScroll()
  const blobY1 = useTransform(scrollY, [0, 1500], [0, -100])
  const blobY2 = useTransform(scrollY, [0, 2500], [0, 150])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Periodic visual simulation
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [mounted])

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 blur-xl animate-pulse" />
            <div className="w-14 h-14 bg-[#08090f] border border-white/[0.06] rounded-2xl flex items-center justify-center relative z-10 animate-pulse">
              <Logo className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-hidden font-sans relative selection:bg-indigo-500/30 selection:text-white">
      
      {/* Scroll indicator */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-indigo-500 z-[9999] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Grid Mesh Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none z-0" />

      {/* Subtle background ambient glow spots */}
      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[50vh] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0" 
        style={{ y: blobY1 }}
      />
      <motion.div 
        className="absolute top-[40%] right-[-10%] w-[50vw] h-[45vh] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" 
        style={{ y: blobY2 }}
      />

      {/* Floating Header Navigation Pill */}
      <div className="fixed top-5 inset-x-0 mx-auto max-w-4xl px-4 z-[999]">
        <header className="w-full h-13 rounded-full border border-white/[0.08] bg-[#07080d]/70 backdrop-blur-md flex items-center justify-between px-6 shadow-xl shadow-black/40">
          <div className="flex items-center gap-2">
            <Logo className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TradeTrackr</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest bg-white text-black hover:bg-gray-200 rounded-full transition-all"
            >
              Start Free
            </Link>
          </nav>
        </header>
      </div>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-36 pb-16 text-center">
        
        {/* Headline block */}
        <div className="max-w-4xl mx-auto flex flex-col items-center mb-16">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 mb-8 rounded-full border border-white/[0.06] bg-white/[0.02] text-gray-400 text-[10px] font-extrabold uppercase tracking-widest"
          >
            <span className="w-1 h-1 bg-indigo-500 rounded-full" />
            Performance Ledger Telemetry
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6"
          >
            The Ledger of
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
              High Performance.
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-gray-400 text-sm sm:text-base mb-10 max-w-xl leading-relaxed"
          >
            A quantitative trading journal designed for evaluation challenges and professional risk models. Zero noise. Pure performance telemetry.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="flex items-center gap-4"
          >
            <Link
              href="/signup"
              className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.02]"
            >
              Access Journal
            </Link>
          </motion.div>
        </div>

        {/* Bento Grid Features Matrix */}
        <section className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            
            {/* Card 1: Drawdown Radar (2 columns, 1 row) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={bentoFade}
              className="md:col-span-2 rounded-3xl border border-white/[0.06] bg-[#07080c]/50 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-md text-left"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">Compliance Audit</span>
                  <h3 className="text-lg font-bold text-white mt-1">Challenge Drawdown Radar</h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Active Test</span>
              </div>

              {/* Progress target bars */}
              <div className="space-y-4 my-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>Evaluation Profit Target</span>
                    <span>$8,200.00 / $10,000.00 (82.0%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" 
                      initial={{ width: 0 }}
                      whileInView={{ width: '82%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/[0.03] p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Daily DD Drawdown</span>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">-$1,240.00 / -$5,000.00</div>
                  </div>
                  <div className="bg-black/40 border border-white/[0.03] p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Max Cumulative DD</span>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">-$3,450.00 / -$10,000.00</div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-gray-500">Auto-compliance checks triggered on account sync.</div>
            </motion.div>

            {/* Card 2: Session Expectancy (1 column, 1 row) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={bentoFade}
              className="rounded-3xl border border-white/[0.06] bg-[#07080c]/50 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-md text-left"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div>
                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Heuristics</span>
                <h3 className="text-lg font-bold text-white mt-1">Session Expectancy</h3>
              </div>

              {/* Bar charts for NY, LDN, TYO */}
              <div className="space-y-3.5 my-2">
                {[
                  { name: 'NY Session', val: '80%', color: 'from-blue-500 to-indigo-500', r: '+3.2 R' },
                  { name: 'London Session', val: '55%', color: 'from-emerald-500 to-teal-500', r: '+1.8 R' },
                  { name: 'Tokyo Session', val: '15%', color: 'from-red-500 to-rose-500', r: '-0.4 R' }
                ].map((bar, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-gray-400">
                      <span>{bar.name}</span>
                      <span className="font-bold text-white">{bar.r}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full bg-gradient-to-r ${bar.color} rounded-full`}
                        initial={{ width: 0 }}
                        whileInView={{ width: bar.val }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card 3: AI Diagnostic Code Block (1 column, 2 rows) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={bentoFade}
              className="md:row-span-2 rounded-3xl border border-white/[0.06] bg-[#050608]/90 p-5 flex flex-col justify-between relative overflow-hidden backdrop-blur-md text-left font-mono"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-[10px] text-gray-500">DIAGNOSTIC_SHELL</span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
              </div>

              {/* Code block output */}
              <div className="text-[10.5px] leading-relaxed text-indigo-300 space-y-3.5 my-4 flex-1">
                <div>
                  <span className="text-gray-600">&gt;</span> run diagnostics --userId=USR_092
                </div>
                <div className="text-gray-400">
                  Calculating session metrics...
                  <br />
                  Analyzing mistake logs...
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg text-xs space-y-1.5">
                  <div><span className="text-gray-500">expectancy:</span> <span className="text-emerald-400 font-bold">2.45 R</span></div>
                  <div><span className="text-gray-500">holdTimeEdge:</span> <span className="text-indigo-400 font-bold">&gt;45 min</span></div>
                  <div><span className="text-gray-500">biasMitigation:</span> <span className="text-indigo-400 font-bold">Enforced</span></div>
                </div>
                <div className="text-xs text-amber-400/90 leading-normal border-l-2 border-amber-500/30 pl-2">
                  Recommendation: Restrict Monday EURUSD size; win expectancy falls to -0.2R during Asian session extensions.
                </div>
              </div>

              <div className="text-[9px] text-gray-600">Secure execution log.</div>
            </motion.div>

            {/* Card 4: Economic Calendar Proxy (1 column, 1 row) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={bentoFade}
              className="rounded-3xl border border-white/[0.06] bg-[#07080c]/50 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-md text-left"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">Risk Guard</span>
                <h3 className="text-lg font-bold text-white mt-1">Economic Calendar</h3>
              </div>

              {/* Event rows */}
              <div className="space-y-2.5 my-2">
                {[
                  { event: 'US Core CPI YoY', impact: 'High', status: 'Hold Execution' },
                  { event: 'FOMC Press Conf', impact: 'High', status: 'Flat Positions' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 bg-black/40 border border-white/[0.03] rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-white">{item.event}</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">Impact: {item.impact}</div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card 5: Screenshots & Media (2 columns, 1 row) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={bentoFade}
              className="md:col-span-2 rounded-3xl border border-white/[0.06] bg-[#07080c]/50 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-md text-left"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest">Media Verification</span>
                  <h3 className="text-lg font-bold text-white mt-1">Execution Screenshots</h3>
                </div>
              </div>

              {/* Simulated overlapping screenshot stack */}
              <div className="flex items-center justify-center h-20 gap-4 mt-2">
                <div className="relative w-40 h-16 rounded-lg border border-white/10 overflow-hidden bg-black/60 shadow-lg flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-gray-500">GBPUSD Entry (1m)</span>
                </div>
                <div className="relative w-40 h-16 rounded-lg border border-indigo-500/30 overflow-hidden bg-black/80 shadow-xl flex items-center justify-center shrink-0">
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-[9px] text-indigo-400 font-bold">EURUSD Breakout (5m)</span>
                </div>
              </div>

              <div className="text-[10px] text-gray-500">Verify execution details directly from attached screenshots.</div>
            </motion.div>

          </div>
        </section>

        {/* Dynamic Action Call Section */}
        <section className="relative z-10 py-28 px-6 mt-12">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative rounded-[2.5rem] overflow-hidden p-12 sm:p-16 text-center bg-gradient-to-br from-indigo-950/20 to-blue-950/20 border border-indigo-500/20 shadow-2xl shadow-indigo-950/10"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                Enhance Performance Today
              </h2>
              <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Connect your account and verify your strategy edge with professional-grade diagnostics.
              </p>

              <div className="flex justify-center gap-8 mb-8 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                <div>Stripe Verified</div>
                <div>SSL Protected</div>
                <div>Ledger Audited</div>
              </div>

              <Link
                href="/signup"
                className="inline-flex px-8 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gray-200 transition-all shadow-xl hover:-translate-y-0.5"
              >
                Create Account
              </Link>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-6 bg-[#030303] text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-400">TradeTrackr</span>
          </div>
          <p className="text-[10px] font-mono">
            &copy; {new Date().getFullYear()} TradeTrackr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
