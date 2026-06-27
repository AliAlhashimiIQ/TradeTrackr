'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

type EmptyVariant = 'trades' | 'analytics' | 'calendar' | 'generic'

interface EmptyStateProps {
  variant?: EmptyVariant
  title?: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
  onManualLogClick?: () => void
  onLoadDemoClick?: () => Promise<void> | void
  isDemoLoading?: boolean
}

const illustrations: Record<EmptyVariant, React.ReactNode> = {
  trades: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="24" width="80" height="72" rx="8" stroke="url(#trades-grad)" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M40 68L52 54L64 62L80 44" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dashoffset" from="60" to="0" dur="1.5s" fill="freeze" />
        <animate attributeName="stroke-dasharray" from="0 60" to="60 0" dur="1.5s" fill="freeze" />
      </path>
      <circle cx="80" cy="44" r="3" fill="#6366f1">
        <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.2s" fill="freeze" />
      </circle>
      <rect x="36" y="78" width="14" height="6" rx="2" fill="#10b981" opacity="0.3" />
      <rect x="54" y="76" width="14" height="8" rx="2" fill="#6366f1" opacity="0.3" />
      <rect x="72" y="74" width="14" height="10" rx="2" fill="#3b82f6" opacity="0.3" />
      <defs>
        <linearGradient id="trades-grad" x1="20" y1="24" x2="100" y2="96">
          <stop stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  ),
  analytics: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="36" stroke="url(#analytics-grad)" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M60 32V60L82 72" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="12s" repeatCount="indefinite" />
      </path>
      <circle cx="60" cy="60" r="4" fill="#6366f1" />
      <rect x="28" y="86" width="8" height="12" rx="2" fill="#10b981" opacity="0.4">
        <animate attributeName="height" values="4;12;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y" values="94;86;94" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="40" y="82" width="8" height="16" rx="2" fill="#3b82f6" opacity="0.4">
        <animate attributeName="height" values="8;16;8" dur="2.3s" repeatCount="indefinite" />
        <animate attributeName="y" values="90;82;90" dur="2.3s" repeatCount="indefinite" />
      </rect>
      <rect x="52" y="88" width="8" height="10" rx="2" fill="#8b5cf6" opacity="0.4">
        <animate attributeName="height" values="4;10;4" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="94;88;94" dur="1.8s" repeatCount="indefinite" />
      </rect>
      <defs>
        <linearGradient id="analytics-grad" x1="24" y1="24" x2="96" y2="96">
          <stop stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  ),
  calendar: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="28" width="80" height="68" rx="8" stroke="url(#cal-grad)" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="20" y1="48" x2="100" y2="48" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <rect x="36" y="32" width="2" height="10" rx="1" fill="#6366f1" opacity="0.6" />
      <rect x="82" y="32" width="2" height="10" rx="1" fill="#6366f1" opacity="0.6" />
      {/* Calendar grid dots */}
      {[0, 1, 2, 3, 4].map(row =>
        [0, 1, 2, 3, 4, 5, 6].map(col => (
          <circle
            key={`${row}-${col}`}
            cx={32 + col * 9}
            cy={56 + row * 9}
            r="2"
            fill="#374151"
            opacity="0.5"
          />
        ))
      )}
      <circle cx="50" cy="65" r="2.5" fill="#10b981" opacity="0.8">
        <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="68" cy="74" r="2.5" fill="#ef4444" opacity="0.8">
        <animate attributeName="r" values="2;3;2" dur="2.3s" repeatCount="indefinite" />
      </circle>
      <defs>
        <linearGradient id="cal-grad" x1="20" y1="28" x2="100" y2="96">
          <stop stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  ),
  generic: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="30" width="60" height="60" rx="12" stroke="url(#gen-grad)" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M52 60H68M60 52V68" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </path>
      <defs>
        <linearGradient id="gen-grad" x1="30" y1="30" x2="90" y2="90">
          <stop stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  ),
}

const defaults: Record<EmptyVariant, { title: string; subtitle: string; ctaLabel: string; ctaHref: string }> = {
  trades: {
    title: 'No trades logged yet',
    subtitle: 'Start journaling your trades to unlock powerful analytics, streak tracking, and AI-powered insights.',
    ctaLabel: 'Log Your First Trade',
    ctaHref: '/trades/new',
  },
  analytics: {
    title: 'No data to analyze',
    subtitle: 'Log some trades first and come back here to see your performance metrics, equity curve, and breakdown charts.',
    ctaLabel: 'Go Log Trades',
    ctaHref: '/trades/new',
  },
  calendar: {
    title: 'Your calendar is empty',
    subtitle: 'Once you start logging trades, each trading day will appear here with P&L totals, win rates, and AI analysis.',
    ctaLabel: 'Log Your First Trade',
    ctaHref: '/trades/new',
  },
  generic: {
    title: 'Nothing here yet',
    subtitle: 'Get started by adding some data.',
    ctaLabel: 'Get Started',
    ctaHref: '/dashboard',
  },
}

export default function EmptyState({
  variant = 'generic',
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  onManualLogClick,
  onLoadDemoClick,
  isDemoLoading = false
}: EmptyStateProps) {
  const d = defaults[variant]
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  if (variant === 'trades') {
    const checklistSteps = [
      {
        id: 1,
        title: 'Link Trading Account',
        description: 'Connect MetaTrader 5 or other accounts to automate executions sync and track prop firm rules.',
        btnLabel: 'Link Account',
        href: '/accounts',
        color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      },
      {
        id: 2,
        title: 'Import CSV Report',
        description: 'Bulk upload historical trades from MetaTrader, TradeZella, TraderSync, or custom files.',
        btnLabel: 'Import Report',
        href: '/import',
        color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        )
      },
      {
        id: 3,
        title: 'Add Manual Trade',
        description: 'Log a ticket manually with lot sizing, strategy tags, entry/exit parameters, screenshots, and emotional notes.',
        btnLabel: 'Add Trade',
        action: onManualLogClick,
        color: 'from-emerald-500/20 to-indigo-500/10 border-emerald-500/30 text-emerald-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        )
      },
      {
        id: 4,
        title: 'Preview with Demo Data',
        description: 'Inject 5 high-fidelity mock trades to instantly check out dashboard gauges, streaks, and analytics curves.',
        btnLabel: 'Inject Demo Data',
        action: onLoadDemoClick,
        loading: isDemoLoading,
        color: 'from-amber-500/20 to-indigo-500/10 border-amber-500/30 text-amber-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )
      }
    ]

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Onboarding Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-semibold mb-4 uppercase tracking-widest">
            🏁 Getting Started Onboarding
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Welcome to TradeTrackr!</h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Your journal is currently empty. Get started by connecting an account, uploading a CSV, adding a manual trade, or loading demo data.
          </p>
        </motion.div>

        {/* Onboarding Checklist Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {checklistSteps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
              className="card bg-white dark:bg-[#0d0e16] border border-black/5 dark:border-white/[0.06] rounded-2xl p-5 hover:border-indigo-500/40 transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-xl"
              style={{
                boxShadow: hoveredStep === step.id ? '0 12px 32px rgba(99, 102, 241, 0.08)' : 'none'
              }}
            >
              {/* Subtle background glow */}
              {hoveredStep === step.id && (
                <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${step.color.split(' ').slice(0, 2).join(' ')} border border-white/5`}>
                    {step.icon}
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 bg-white/5 w-5 h-5 rounded-full flex items-center justify-center font-mono">
                      {step.id}
                    </span>
                    {step.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div>
                {step.href ? (
                  <Link
                    href={step.href}
                    className="w-full inline-flex items-center justify-center py-2.5 rounded-xl border border-white/[0.08] hover:border-indigo-500/30 bg-white/[0.02] hover:bg-indigo-500/10 text-gray-300 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200"
                  >
                    {step.btnLabel}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={step.action}
                    disabled={step.loading}
                    className="w-full inline-flex items-center justify-center py-2.5 rounded-xl border border-white/[0.08] hover:border-indigo-500/30 bg-white/[0.02] hover:bg-indigo-500/10 text-gray-300 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 disabled:opacity-50"
                  >
                    {step.loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Injecting...
                      </div>
                    ) : (
                      step.btnLabel
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="mb-6 opacity-80">
        {illustrations[variant]}
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{title ?? d.title}</h2>
      <p className="text-gray-500 text-sm max-w-md mb-8 leading-relaxed">{subtitle ?? d.subtitle}</p>
      <Link
        href={ctaHref ?? d.ctaHref}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {ctaLabel ?? d.ctaLabel}
      </Link>
    </motion.div>
  )
}
