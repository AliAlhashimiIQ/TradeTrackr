'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/providers/SettingsProvider'
import { useAuth } from '@/hooks/useAuth'
import { 
  Search, 
  LayoutDashboard, 
  BarChart3, 
  PieChart, 
  Settings as SettingsIcon, 
  Eye, 
  Terminal, 
  CornerDownLeft, 
  X,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ParsedLog {
  symbol?: string;
  type?: 'Long' | 'Short';
  lots?: number;
  quantity?: number;
  entryPrice?: number;
}

export default function CommandPalette() {
  const router = useRouter()
  const { user } = useAuth()
  const { colorblindMode, setColorblindMode } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only enable for authenticated users
  if (!user) return null

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        setQuery('')
        setSelectedIndex(0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Parse command helper
  const parseLogCommand = (text: string): ParsedLog | null => {
    if (!text.toLowerCase().startsWith('/log')) return null
    const clean = text.substring(4).trim()
    if (!clean) return {}

    const result: ParsedLog = {}
    
    // Pattern to match: [buy/sell/long/short]? [lots/qty]? [symbol]? [@ price]?
    const regex = /^(buy|sell|long|short)?\s*([\d\.]+)?\s*([a-zA-Z\d\.\-_]+)?\s*(?:@|at)?\s*([\d\.]+)?$/i
    const match = clean.match(regex)

    if (match) {
      const [, side, size, sym, price] = match
      if (side) {
        result.type = (side.toLowerCase() === 'sell' || side.toLowerCase() === 'short') ? 'Short' : 'Long'
      }
      if (size) {
        const val = parseFloat(size)
        if (!isNaN(val)) {
          result.lots = val
          result.quantity = val
        }
      }
      if (sym) {
        result.symbol = sym.toUpperCase()
      }
      if (price) {
        const val = parseFloat(price)
        if (!isNaN(val)) {
          result.entryPrice = val
        }
      }
    }
    return result
  }

  const parsedLog = parseLogCommand(query)

  // Build the list of static actions
  const staticItems = [
    {
      id: 'dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'View your account performance and quick stats',
      icon: LayoutDashboard,
      action: () => {
        router.push('/dashboard')
        setIsOpen(false)
      }
    },
    {
      id: 'trades',
      category: 'Navigation',
      title: 'Go to Trades Log',
      subtitle: 'View, filter, and manage your logged trades',
      icon: BarChart3,
      action: () => {
        router.push('/trades')
        setIsOpen(false)
      }
    },
    {
      id: 'analytics',
      category: 'Navigation',
      title: 'Go to Analytics & Mistakes',
      subtitle: 'Deep dive into statistics, what-if simulations, and metrics',
      icon: PieChart,
      action: () => {
        router.push('/analytics')
        setIsOpen(false)
      }
    },
    {
      id: 'settings',
      category: 'Navigation',
      title: 'Go to Settings',
      subtitle: 'Manage your timezone, currency, and preferences',
      icon: SettingsIcon,
      action: () => {
        router.push('/settings')
        setIsOpen(false)
      }
    },
    {
      id: 'colorblind',
      category: 'Preferences',
      title: colorblindMode ? 'Disable Colorblind Mode' : 'Enable Colorblind Mode',
      subtitle: 'Toggle colorblind-friendly green/red status colors',
      icon: Eye,
      action: () => {
        const nextState = !colorblindMode
        setColorblindMode(nextState)
        toast.success(`Colorblind mode ${nextState ? 'enabled' : 'disabled'}`)
        setIsOpen(false)
      }
    }
  ]

  // Filter actions based on query, or handle custom commands
  const filteredItems = (() => {
    if (parsedLog) {
      // It's a quick command!
      return [
        {
          id: 'quick-log',
          category: 'Quick Command',
          title: 'Quick Log Trade',
          subtitle: `Parse and open trade form: ${
            parsedLog.type ? parsedLog.type : 'Long'
          } ${parsedLog.lots ? parsedLog.lots + ' lots' : ''} ${parsedLog.symbol ? parsedLog.symbol : ''} ${
            parsedLog.entryPrice ? '@ ' + parsedLog.entryPrice : ''
          }`,
          icon: Plus,
          action: () => {
            const params = new URLSearchParams()
            if (parsedLog.symbol) params.set('symbol', parsedLog.symbol)
            if (parsedLog.type) params.set('type', parsedLog.type)
            if (parsedLog.lots) {
              params.set('lots', String(parsedLog.lots))
              params.set('quantity', String(parsedLog.lots))
            }
            if (parsedLog.entryPrice) params.set('entry_price', String(parsedLog.entryPrice))
            
            router.push(`/trades/new?${params.toString()}`)
            setIsOpen(false)
          }
        }
      ]
    }

    if (!query) return staticItems

    return staticItems.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    )
  })()

  // Handle navigate list
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedIndex(0)
      return
    }
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(filteredItems.length - 1)
    }
  }, [filteredItems, selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action()
      }
    }
  }

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  if (!isOpen) return null

  // Group filtered items by category
  const categories = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof filteredItems>)

  // Order categories for sequential arrow index mapping
  const categoryKeys = Object.keys(categories)
  let itemCounter = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 overflow-y-auto bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-800 bg-[#161a24]/95 shadow-2xl backdrop-blur-md flex flex-col max-h-[70vh] transition-all transform duration-300"
      >
        {/* Search header */}
        <div className="flex items-center border-b border-gray-800/80 px-4 py-4 gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none border-none outline-none ring-0 p-0 focus:ring-0"
            placeholder="Type a command (e.g. /log buy 1.0 XAUUSD @ 2350) or search navigation..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-800 bg-gray-900/60 text-[10px] font-mono text-gray-500">
            ESC
          </span>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* /log helper guide if user typed /log */}
        {query.toLowerCase().startsWith('/log') && (
          <div className="px-4 py-2 bg-blue-500/5 border-b border-blue-500/10 text-xs text-blue-400/90 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Format: <code className="bg-blue-500/10 px-1 rounded text-blue-300 font-mono">/log [buy/sell] [size] [symbol] @ [entry]</code></span>
            </span>
            <span className="text-[10px] text-gray-500">Auto-fills new trade form</span>
          </div>
        )}

        {/* Action list */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-500 mt-1">Try searching for dashboard, trades, analytics, or colorblind</p>
            </div>
          ) : (
            categoryKeys.map((catName) => (
              <div key={catName} className="mb-2">
                <h3 className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {catName}
                </h3>
                <div className="space-y-0.5">
                  {categories[catName].map((item) => {
                    // Find actual flat list index of this item
                    const currentFlatIndex = filteredItems.findIndex(i => i.id === item.id)
                    const isSelected = currentFlatIndex === selectedIndex
                    const IconComp = item.icon

                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                        className={`w-full flex items-center text-left px-3 py-2.5 rounded-xl transition-all duration-150 gap-3 group ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                            : 'text-gray-300 hover:bg-gray-800/40 hover:text-gray-100'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${
                          isSelected ? 'bg-white/10' : 'bg-gray-800/80 group-hover:bg-gray-800 text-gray-400 group-hover:text-gray-200'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none">{item.title}</p>
                          <p className={`text-xs mt-1 truncate ${
                            isSelected ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {item.subtitle}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 px-1.5 py-0.5 rounded shrink-0">
                            <span>Select</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Palette footer */}
        <div className="flex items-center justify-between border-t border-gray-800/80 px-4 py-3 bg-[#11141c]/60 text-[11px] text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-gray-900 border border-gray-800">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-gray-900 border border-gray-800">Enter</kbd> Select
            </span>
          </div>
          <div>
            Press <kbd className="px-1 rounded bg-gray-900 border border-gray-800">Ctrl + K</kbd> to toggle anywhere
          </div>
        </div>
      </div>
    </div>
  )
}
