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
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  ShieldCheck,
  Twitter
} from 'lucide-react'

interface TradeShareModalProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade
  accountName?: string
}

type CardTheme = 'midnight' | 'oled' | 'emerald' | 'sunset'

export default function TradeShareModal({
  isOpen,
  onClose,
  trade,
  accountName
}: TradeShareModalProps) {
  const [theme, setTheme] = useState<CardTheme>('midnight')
  const [hideDollarPnl, setHideDollarPnl] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !trade) return null

  const pnl = Number(trade.profit_loss || 0)
  const isWin = pnl >= 0
  const rMultiple = trade.r_multiple != null ? Number(trade.r_multiple).toFixed(2) : null
  const pips = trade.pips != null ? Number(trade.pips).toFixed(1) : null

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

  // Format date and duration
  const entryDate = new Date(trade.entry_time)
  const formattedDate = entryDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Theme styles
  const themeStyles: Record<CardTheme, {
    container: string
    cardBg: string
    border: string
    heroGlow: string
    accentBadge: string
    watermark: string
  }> = {
    midnight: {
      container: 'from-[#0b0d17] via-[#0e1222] to-[#070913]',
      cardBg: 'bg-[#0a0c16]/90 backdrop-blur-xl',
      border: 'border-indigo-500/30 shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)]',
      heroGlow: isWin ? 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]' : 'shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]',
      accentBadge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      watermark: 'text-indigo-400'
    },
    oled: {
      container: 'from-[#000000] via-[#050505] to-[#000000]',
      cardBg: 'bg-black/95',
      border: 'border-white/15 shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]',
      heroGlow: isWin ? 'shadow-[0_0_40px_-10px_rgba(34,197,94,0.35)]' : 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.35)]',
      accentBadge: 'bg-white/10 text-white border-white/20',
      watermark: 'text-white'
    },
    emerald: {
      container: 'from-[#04120e] via-[#061e16] to-[#030e0b]',
      cardBg: 'bg-[#051711]/90 backdrop-blur-xl',
      border: 'border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]',
      heroGlow: isWin ? 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]' : 'shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]',
      accentBadge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      watermark: 'text-emerald-400'
    },
    sunset: {
      container: 'from-[#140b18] via-[#1f0f24] to-[#0c0610]',
      cardBg: 'bg-[#150a1b]/90 backdrop-blur-xl',
      border: 'border-purple-500/30 shadow-[0_0_50px_-12px_rgba(168,85,247,0.25)]',
      heroGlow: isWin ? 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]' : 'shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]',
      accentBadge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      watermark: 'text-purple-400'
    }
  }

  const currentTheme = themeStyles[theme]

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!cardRef.current) return
    try {
      setIsExporting(true)
      const blob = await toBlob(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
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
        // Fallback for browsers without ClipboardItem
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
        const link = document.createElement('a')
        link.download = `TradeTrackr-${trade.symbol}-${isWin ? 'WIN' : 'LOSS'}.png`
        link.href = dataUrl
        link.click()
        toast.success('P&L Card downloaded as PNG!')
      }
    } catch (err) {
      console.error('Copy image error:', err)
      toast.error('Could not copy image. Try downloading as PNG.')
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
        quality: 0.95,
        pixelRatio: 2,
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
    
    const text = `🎯 Just logged a trade on $${trade.symbol} (${trade.type})!

📊 Result: ${pnlDisplay}${rMultiple ? ` (${rMultiple}R)` : ''}
⚡ Execution: ${trade.strategy || 'Systematic Execution'}

Logged on @TradeTrackr 🚀
#Trading #Forex #PropFirm #PriceAction`

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#0e101a] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Share2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Share Trade Card</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
              aria-label="Close share modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white/[0.02] border-b border-white/[0.04]">
            {/* Theme Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-400 mr-1">Theme:</span>
              {(['midnight', 'oled', 'emerald', 'sunset'] as CardTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    theme === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Privacy Toggle */}
            <button
              type="button"
              onClick={() => setHideDollarPnl(!hideDollarPnl)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                hideDollarPnl
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-white/[0.04] text-gray-300 border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              {hideDollarPnl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{hideDollarPnl ? 'Dollar P&L Hidden' : 'Hide Dollar P&L'}</span>
            </button>
          </div>

          {/* Canvas / Preview Container */}
          <div className="p-6 flex justify-center items-center bg-black/40 overflow-hidden">
            {/* The Actual Shareable Card (Exported by html-to-image) */}
            <div
              ref={cardRef}
              className={`w-full max-w-[540px] rounded-3xl p-6 sm:p-8 border bg-gradient-to-br ${currentTheme.container} ${currentTheme.border} ${currentTheme.heroGlow} transition-all duration-300 relative overflow-hidden select-none`}
            >
              {/* Background Geometric Grid Accent */}
              <div 
                className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
              />

              {/* Top Watermark & Meta */}
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-extrabold text-sm tracking-tight">TradeTrackr</span>
                      <ShieldCheck className={`w-3.5 h-3.5 ${currentTheme.watermark}`} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Verified Trade Execution</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentTheme.accentBadge}`}>
                    {accountName || 'Journal Live'}
                  </span>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{formattedDate}</p>
                </div>
              </div>

              {/* Trade Identity: Symbol + Side */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                    {trade.symbol}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                      trade.type === 'Long'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {trade.type === 'Long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {trade.type}
                  </span>
                </div>
                
                {trade.strategy && (
                  <span className="text-xs text-gray-300 font-semibold px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                    {trade.strategy}
                  </span>
                )}
              </div>

              {/* Big Hero P&L Display */}
              <div className="relative z-10 my-6 py-5 px-6 rounded-2xl bg-black/40 border border-white/[0.06] backdrop-blur-md flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Net Realized P&L
                </span>
                <div
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums ${
                    isWin ? 'text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {hideDollarPnl ? (
                    <span className="text-3xl sm:text-4xl">
                      {isWin ? 'PROFITABLE' : 'RISK CONTROLLED'}
                    </span>
                  ) : (
                    <>
                      {isWin ? '+' : '-'}{formatAmount(pnl)}
                    </>
                  )}
                </div>
              </div>

              {/* Key Trading Metrics Grid */}
              <div className="relative z-10 grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
                {/* R-Multiple */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Return
                  </span>
                  <span className={`text-base font-extrabold font-mono tabular-nums ${isWin ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {rMultiple ? `${Number(rMultiple) > 0 ? '+' : ''}${rMultiple}R` : '1.0R'}
                  </span>
                </div>

                {/* Entry Price */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Entry
                  </span>
                  <span className="text-base font-bold font-mono text-gray-200 tabular-nums">
                    {trade.entry_price != null ? trade.entry_price : '—'}
                  </span>
                </div>

                {/* Exit Price / Pips */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    {pips ? 'Net Pips' : 'Exit'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-200 tabular-nums">
                    {pips ? `${Number(pips) > 0 ? '+' : ''}${pips}` : trade.exit_price || '—'}
                  </span>
                </div>
              </div>

              {/* Bottom Footer Watermark */}
              <div className="relative z-10 flex items-center justify-between mt-6 pt-3 text-[10px] text-gray-500 font-medium border-t border-white/[0.04]">
                <span>tradetrackr.com</span>
                <span>Discipline • Execution • Edge</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0c0d16]">
            {/* Share to X */}
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
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Image to Clipboard'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
