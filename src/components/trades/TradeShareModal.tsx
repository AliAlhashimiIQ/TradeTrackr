'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng, toBlob } from 'html-to-image'
import { toast } from 'react-hot-toast'
import { Trade } from '@/lib/types'
import { 
  X, 
  Copy, 
  Download, 
  Share2, 
  Eye, 
  EyeOff, 
  Check, 
  TrendingUp, 
  TrendingDown,
  ShieldCheck,
  Twitter,
  Clock,
  Crosshair,
  Sparkles,
  Flame,
  Terminal,
  Crown
} from 'lucide-react'

interface TradeShareModalProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade
  accountName?: string
}

type CardTheme = 'cyber' | 'obsidian' | 'matrix' | 'tokyo'

export default function TradeShareModal({
  isOpen,
  onClose,
  trade,
  accountName
}: TradeShareModalProps) {
  const [theme, setTheme] = useState<CardTheme>('cyber')
  const [hideDollarPnl, setHideDollarPnl] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !trade) return null

  const pnl = Number(trade.profit_loss || 0)
  const isWin = pnl >= 0
  const rMultiple = trade.r_multiple != null ? Number(trade.r_multiple).toFixed(2) : null
  const pips = trade.pips != null ? Number(trade.pips).toFixed(1) : null

  // Calculate Duration
  const calculateDuration = () => {
    if (!trade.entry_time || !trade.exit_time) return null
    const diffMs = Math.max(0, new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime())
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
    if (diffMins > 0) return `${diffMins}m`
    return `${Math.floor(diffMs / 1000)}s`
  }

  const durationStr = calculateDuration()

  // Format currency
  const formatAmount = (val: number) => {
    const absVal = Math.abs(val)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(absVal)
  }

  // Format dates
  const entryDate = new Date(trade.entry_time)
  const formattedDate = entryDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const formattedTime = entryDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  // Theme presets
  const themesConfig: Record<CardTheme, {
    label: string
    icon: any
    colorSwatch: string
    cardBg: string
    border: string
    accentGlow: string
    titleColor: string
    badgeBg: string
    gridColor: string
    heroBacklight: string
    accentText: string
    hudTag: string
  }> = {
    cyber: {
      label: 'Cyber HUD',
      icon: Terminal,
      colorSwatch: 'bg-indigo-500',
      cardBg: 'bg-[#070913]',
      border: 'border-[#1e2338]',
      accentGlow: isWin ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      titleColor: 'text-white',
      badgeBg: 'bg-[#101426] border-[#252b48] text-indigo-300',
      gridColor: 'rgba(99, 102, 241, 0.07)',
      heroBacklight: isWin ? 'from-emerald-500/15 via-emerald-500/5 to-transparent' : 'from-rose-500/15 via-rose-500/5 to-transparent',
      accentText: 'text-indigo-400',
      hudTag: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10'
    },
    obsidian: {
      label: 'Gold Obsidian',
      icon: Crown,
      colorSwatch: 'bg-amber-400',
      cardBg: 'bg-[#050505]',
      border: 'border-[#2a2415]',
      accentGlow: 'rgba(245, 158, 11, 0.2)',
      titleColor: 'text-amber-100',
      badgeBg: 'bg-[#161208] border-amber-500/30 text-amber-300',
      gridColor: 'rgba(245, 158, 11, 0.05)',
      heroBacklight: isWin ? 'from-amber-500/15 via-emerald-500/5 to-transparent' : 'from-amber-500/10 via-rose-500/5 to-transparent',
      accentText: 'text-amber-400',
      hudTag: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
    },
    matrix: {
      label: 'Terminal Phos',
      icon: Crosshair,
      colorSwatch: 'bg-emerald-500',
      cardBg: 'bg-[#030d08]',
      border: 'border-emerald-900/50',
      accentGlow: 'rgba(16, 185, 129, 0.3)',
      titleColor: 'text-emerald-100',
      badgeBg: 'bg-[#06180f] border-emerald-500/30 text-emerald-400',
      gridColor: 'rgba(16, 185, 129, 0.08)',
      heroBacklight: isWin ? 'from-emerald-500/20 via-emerald-500/5 to-transparent' : 'from-rose-500/20 via-rose-500/5 to-transparent',
      accentText: 'text-emerald-400',
      hudTag: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
    },
    tokyo: {
      label: 'Tokyo Neon',
      icon: Flame,
      colorSwatch: 'bg-fuchsia-500',
      cardBg: 'bg-[#0a0512]',
      border: 'border-fuchsia-900/40',
      accentGlow: 'rgba(217, 70, 239, 0.25)',
      titleColor: 'text-fuchsia-100',
      badgeBg: 'bg-[#180b26] border-fuchsia-500/30 text-fuchsia-300',
      gridColor: 'rgba(217, 70, 239, 0.07)',
      heroBacklight: isWin ? 'from-fuchsia-500/15 via-emerald-500/5 to-transparent' : 'from-fuchsia-500/15 via-rose-500/5 to-transparent',
      accentText: 'text-fuchsia-400',
      hudTag: 'border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/10'
    }
  }

  const activeTheme = themesConfig[theme]

  // Sub-metrics inside hero box (guaranteed no orphan bullets)
  const heroSubMetrics = [
    rMultiple ? { label: 'RETURN', value: `${Number(rMultiple) > 0 ? '+' : ''}${rMultiple}R`, color: Number(rMultiple) >= 0 ? 'text-emerald-400' : 'text-rose-400' } : null,
    pips ? { label: 'PIPS', value: `${Number(pips) > 0 ? '+' : ''}${pips}`, color: Number(pips) >= 0 ? 'text-emerald-400' : 'text-rose-400' } : null,
    { label: 'EXECUTION', value: isWin ? '100% WIN' : 'STOPPED OUT', color: isWin ? 'text-emerald-400' : 'text-rose-400' }
  ].filter(Boolean) as Array<{ label: string; value: string; color: string }>

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!cardRef.current) return
    try {
      setIsExporting(true)
      const blob = await toBlob(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true
      })
      if (!blob) throw new Error('Failed to generate image blob')

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopied(true)
        toast.success('P&L Card copied to clipboard!')
        setTimeout(() => setCopied(false), 2500)
      } else {
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 2.5 })
        const link = document.createElement('a')
        link.download = `TradeTrackr-${trade.symbol}-${isWin ? 'WIN' : 'LOSS'}.png`
        link.href = dataUrl
        link.click()
        toast.success('P&L Card downloaded as PNG!')
      }
    } catch (err) {
      console.error('Copy image error:', err)
      toast.error('Could not copy image directly. Try downloading PNG.')
    } finally {
      setIsExporting(false)
    }
  }

  // Download Image
  const handleDownload = async () => {
    if (!cardRef.current) return
    try {
      setIsExporting(true)
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true
      })
      const link = document.createElement('a')
      link.download = `TradeTrackr-${trade.symbol}-${isWin ? 'WIN' : 'LOSS'}.png`
      link.href = dataUrl
      link.click()
      toast.success('High-resolution PNG downloaded!')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download image.')
    } finally {
      setIsExporting(false)
    }
  }

  // Share to Twitter/X
  const handleShareToTwitter = () => {
    const pnlDisplay = hideDollarPnl 
      ? (rMultiple ? `+${rMultiple}R` : isWin ? 'Winning Trade' : 'Risk Managed')
      : `${isWin ? '+' : '-'}${formatAmount(pnl)}`
    
    const text = `🎯 Just closed $${trade.symbol} (${trade.type})!

📊 Result: ${pnlDisplay}${rMultiple ? ` (${rMultiple}R)` : ''}${pips ? ` • ${pips} pips` : ''}
⚡ Strategy: ${trade.strategy || 'Systematic Edge'}

Verified on @TradeTrackr 🚀
#Trading #Forex #PropFirm #PriceAction`

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#090a12] border border-white/[0.08] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto"
        >
          {/* Top Modal Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Social P&L Card Generator</h2>
                <p className="text-[11px] text-gray-400">Institutional flex card for Discord & X</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
              aria-label="Close share modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#0d0f1a] border-b border-white/[0.04]">
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Style:</span>
              {(['cyber', 'obsidian', 'matrix', 'tokyo'] as CardTheme[]).map((t) => {
                const item = themesConfig[t]
                const Icon = item.icon
                const isSelected = theme === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-white/[0.12] border-white/20 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.04] text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${item.colorSwatch}`} />
                    <Icon className="w-3 h-3" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Privacy Toggle */}
            <button
              type="button"
              onClick={() => setHideDollarPnl(!hideDollarPnl)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                hideDollarPnl
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-inner'
                  : 'bg-white/[0.04] text-gray-300 border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              {hideDollarPnl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{hideDollarPnl ? 'Dollar Hidden' : 'Hide Dollar P&L'}</span>
            </button>
          </div>

          {/* Card Preview Canvas */}
          <div className="p-6 sm:p-8 flex justify-center items-center bg-[#05060b] overflow-hidden">
            {/* ── THE PRO SHARE CARD (Export Target) ── */}
            <div
              ref={cardRef}
              className={`w-full max-w-[560px] rounded-[24px] p-6 sm:p-7 border ${activeTheme.cardBg} ${activeTheme.border} relative overflow-hidden select-none transition-all duration-300`}
              style={{
                boxShadow: `0 20px 50px -15px ${activeTheme.accentGlow}`
              }}
            >
              {/* High-Tech Perspective Grid Background */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage: `linear-gradient(to right, ${activeTheme.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${activeTheme.gridColor} 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                  maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                }}
              />

              {/* Ambient Glowing Spotlight behind P&L */}
              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[180px] rounded-full blur-[70px] pointer-events-none bg-gradient-to-b ${activeTheme.heroBacklight}`}
              />

              {/* Top Precision HUD Strip */}
              <div className="relative z-10 flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
                {/* Brand Monogram Mark */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center shadow-md border border-indigo-400/30">
                    <span className="text-white font-black text-[10px] tracking-tighter font-mono">TT</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-black text-xs tracking-wider uppercase font-mono">
                        TradeTrackr
                      </span>
                      <ShieldCheck className={`w-3.5 h-3.5 ${activeTheme.accentText}`} />
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono tracking-widest uppercase block">
                      Verified Telemetry
                    </span>
                  </div>
                </div>

                {/* Account / Date Meta */}
                <div className="text-right flex flex-col items-end">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider font-mono bg-white/[0.04] border-white/[0.08] text-gray-300 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {accountName || 'Prop Verified'}
                  </div>
                  <div className="text-[9px] text-gray-400 font-mono mt-1 whitespace-nowrap">
                    {formattedDate} • {formattedTime} UTC
                  </div>
                </div>
              </div>

              {/* Hero Asset Title + Badges */}
              <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                      {trade.symbol}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm whitespace-nowrap ${
                        trade.type === 'Long'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {trade.type === 'Long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {trade.type}
                    </span>
                  </div>

                  {/* Strategy & Tags HUD pills (No line breaking glitch) */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {trade.strategy && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-white/[0.06] border border-white/[0.08] text-gray-200 font-mono whitespace-nowrap">
                        {trade.strategy}
                      </span>
                    )}
                    {trade.emotional_state && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold capitalize tracking-wide bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono whitespace-nowrap">
                        {trade.emotional_state}
                      </span>
                    )}
                    {trade.lots && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-white/[0.06] border border-white/[0.08] text-gray-300 font-mono whitespace-nowrap">
                        {trade.lots} Lots
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration Pill */}
                {durationStr && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-gray-300 text-[11px] font-mono shrink-0 whitespace-nowrap">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{durationStr}</span>
                  </div>
                )}
              </div>

              {/* ── BIG HERO P&L SHOWCASE ── */}
              <div className="relative z-10 my-5 p-5 sm:p-6 rounded-2xl bg-black/50 border border-white/[0.08] backdrop-blur-md flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-gray-400 uppercase mb-1">
                  Net Realized Performance
                </span>
                
                <div
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums drop-shadow-md ${
                    isWin ? 'text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {hideDollarPnl ? (
                    <span className="text-3xl sm:text-4xl tracking-wider">
                      {isWin ? 'PROFIT CLOSED' : 'RISK MANAGED'}
                    </span>
                  ) : (
                    <>
                      {isWin ? '+' : '-'}{formatAmount(pnl)}
                    </>
                  )}
                </div>

                {/* Clean Sub-Metrics Strip (No floating orphan dots) */}
                <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-white/[0.06] text-xs font-mono">
                  {heroSubMetrics.map((metric, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-gray-600">•</span>}
                      <div className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="text-gray-400 font-semibold">{metric.label}:</span>
                        <span className={`font-bold ${metric.color}`}>{metric.value}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* ── EXECUTION TELEMETRY (Entry / Exit / Risk) ── */}
              <div className="relative z-10 grid grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.08]">
                {/* Entry Price */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] flex flex-col justify-center text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-1 whitespace-nowrap">
                    Entry Level
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-white tabular-nums truncate">
                    {trade.entry_price != null ? trade.entry_price : '—'}
                  </span>
                </div>

                {/* Exit Price */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] flex flex-col justify-center text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-1 whitespace-nowrap">
                    Exit Level
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-white tabular-nums truncate">
                    {trade.exit_price != null ? trade.exit_price : '—'}
                  </span>
                </div>

                {/* Risk Factor */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] flex flex-col justify-center text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-1 whitespace-nowrap">
                    Risk Factor
                  </span>
                  <span className={`text-sm sm:text-base font-bold font-mono tabular-nums truncate ${isWin ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {rMultiple ? `${rMultiple}R` : '1.0R'}
                  </span>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="relative z-10 flex items-center justify-between mt-5 pt-3 text-[9px] text-gray-500 font-mono border-t border-white/[0.04]">
                <span className="tracking-widest uppercase">tradetrackr.com // Edge Command</span>
                <span className="text-gray-400 font-bold">#TradeTrackr</span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0c0d16]">
            {/* Post to X */}
            <button
              type="button"
              onClick={handleShareToTwitter}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 text-xs font-bold transition-all active:scale-95"
            >
              <Twitter className="w-4 h-4" />
              <span>Post to X</span>
            </button>

            {/* Download PNG */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-gray-200 border border-white/[0.08] text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            {/* 1-Click Copy Image */}
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Image!' : 'Copy Image to Clipboard'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
