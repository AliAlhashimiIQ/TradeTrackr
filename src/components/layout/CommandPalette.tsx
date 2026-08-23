'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/providers/SettingsProvider';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/providers/AccountProvider';
import { 
  Search, 
  LayoutDashboard, 
  BarChart3, 
  PieChart, 
  Settings as SettingsIcon, 
  Eye, 
  Terminal, 
  X,
  Plus,
  Calendar,
  BookOpen,
  FileText,
  Sun,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ParsedLog {
  symbol?: string;
  type?: 'Long' | 'Short';
  lots?: number;
  quantity?: number;
  entryPrice?: number;
}

export default function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorblindMode, setColorblindMode } = useSettings();
  const { accounts, selectAccount } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!user) return null;

  // Quick /log command parser
  const parseLogCommand = (text: string): ParsedLog | null => {
    if (!text.toLowerCase().startsWith('/log')) return null;
    const clean = text.substring(4).trim();
    if (!clean) return {};

    const result: ParsedLog = {};
    const regex = /^(buy|sell|long|short)?\s*([\d\.]+)?\s*([a-zA-Z\d\.\-_]+)?\s*(?:@|at)?\s*([\d\.]+)?$/i;
    const match = clean.match(regex);

    if (match) {
      const [, side, size, sym, price] = match;
      if (side) {
        result.type = (side.toLowerCase() === 'sell' || side.toLowerCase() === 'short') ? 'Short' : 'Long';
      }
      if (size) {
        const val = parseFloat(size);
        if (!isNaN(val)) {
          result.lots = val;
          result.quantity = val;
        }
      }
      if (sym) {
        result.symbol = sym.toUpperCase();
      }
      if (price) {
        const val = parseFloat(price);
        if (!isNaN(val)) {
          result.entryPrice = val;
        }
      }
    }
    return result;
  };

  const parsedLog = parseLogCommand(query);

  // Build static actions
  const staticItems = [
    {
      id: 'dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Command Center & quick portfolio stats overview',
      icon: LayoutDashboard,
      shortcut: 'G D',
      action: () => {
        router.push('/dashboard');
        setIsOpen(false);
      }
    },
    {
      id: 'trades',
      category: 'Navigation',
      title: 'Go to Trades Journal',
      subtitle: 'High-density table view of executed trades',
      icon: BarChart3,
      shortcut: 'G T',
      action: () => {
        router.push('/trades');
        setIsOpen(false);
      }
    },
    {
      id: 'analytics',
      category: 'Navigation',
      title: 'Go to Analytics & Mistake Cost',
      subtitle: 'Drawdowns, heatmaps, and disciplined execution leak analysis',
      icon: PieChart,
      shortcut: 'G A',
      action: () => {
        router.push('/analytics');
        setIsOpen(false);
      }
    },
    {
      id: 'calendar',
      category: 'Navigation',
      title: 'Go to Trading Calendar',
      subtitle: 'Daily P&L matrix & session performance',
      icon: Calendar,
      shortcut: 'G C',
      action: () => {
        router.push('/calendar');
        setIsOpen(false);
      }
    },
    {
      id: 'journal',
      category: 'Navigation',
      title: 'Go to Macro Prep & Session Journal',
      subtitle: 'Pre-market daily bias, key levels, & post-market review',
      icon: FileText,
      shortcut: 'G J',
      action: () => {
        router.push('/journal');
        setIsOpen(false);
      }
    },
    {
      id: 'settings',
      category: 'Navigation',
      title: 'Go to Settings',
      subtitle: 'Manage timezone, currency, and account parameters',
      icon: SettingsIcon,
      action: () => {
        router.push('/settings');
        setIsOpen(false);
      }
    },
    {
      id: 'theme-toggle',
      category: 'Preferences',
      title: 'Toggle Dark / Light Theme',
      subtitle: 'Switch application color theme mode',
      icon: Sun,
      action: () => {
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        if (isCurrentlyDark) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
          toast.success('Switched to Light Mode');
        } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
          toast.success('Switched to Dark Mode');
        }
        setIsOpen(false);
      }
    },
    {
      id: 'colorblind',
      category: 'Preferences',
      title: colorblindMode ? 'Disable Colorblind Mode' : 'Enable Colorblind Mode',
      subtitle: 'Toggle colorblind-accessible green/red status palette',
      icon: Eye,
      action: () => {
        const nextState = !colorblindMode;
        setColorblindMode(nextState);
        toast.success(`Colorblind mode ${nextState ? 'enabled' : 'disabled'}`);
        setIsOpen(false);
      }
    },
    {
      id: 'acc-all',
      category: 'Accounts',
      title: 'Filter: All Accounts Combined',
      subtitle: 'View consolidated portfolio stats across all connected accounts',
      icon: Layers,
      action: () => {
        selectAccount('all');
        toast.success('Filtered to All Accounts');
        setIsOpen(false);
      }
    },
    ...accounts.map(acc => ({
      id: `acc-${acc.id}`,
      category: 'Accounts' as const,
      title: `Switch to ${acc.name}`,
      subtitle: `${acc.platform || 'Account'} • ${acc.type || 'LIVE'} • $${acc.balance?.toLocaleString() ?? 0}`,
      icon: Layers,
      action: () => {
        selectAccount(acc.id);
        toast.success(`Filtered to account: ${acc.name}`);
        setIsOpen(false);
      }
    }))
  ];

  // Filter actions based on query
  const filteredItems = (() => {
    if (parsedLog) {
      return [
        {
          id: 'quick-log',
          category: 'Quick Command',
          title: 'Quick Log Trade',
          subtitle: `Parse & open trade form: ${parsedLog.type || 'Long'} ${parsedLog.lots ? parsedLog.lots + ' lots' : ''} ${parsedLog.symbol || ''} ${parsedLog.entryPrice ? '@ ' + parsedLog.entryPrice : ''}`,
          icon: Plus,
          action: () => {
            const params = new URLSearchParams();
            if (parsedLog.symbol) params.set('symbol', parsedLog.symbol);
            if (parsedLog.type) params.set('type', parsedLog.type);
            if (parsedLog.lots) {
              params.set('lots', String(parsedLog.lots));
              params.set('quantity', String(parsedLog.lots));
            }
            if (parsedLog.entryPrice) params.set('entry_price', String(parsedLog.entryPrice));
            
            router.push(`/trades/new?${params.toString()}`);
            setIsOpen(false);
          }
        }
      ];
    }

    if (!query) return staticItems;

    return staticItems.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    );
  })();

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(filteredItems.length - 1);
    }
  }, [filteredItems, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof filteredItems>);

  const categoryKeys = Object.keys(categories);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xl transition-opacity duration-200">
      <div 
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--surface-1)] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col max-h-[75vh] font-sans"
      >
        {/* Search header */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800/80 px-4 py-3.5 bg-slate-50/80 dark:bg-slate-900/40 gap-3">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none border-none outline-none ring-0 p-0"
            placeholder="Type a command (e.g. /log buy 1.0 XAUUSD @ 2350) or search…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
            ESC
          </kbd>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close command palette"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* /log helper guide */}
        {query.toLowerCase().startsWith('/log') && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between font-sans">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Format: <code className="bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200 font-mono">/log [buy/sell] [size] [symbol] @ [entry]</code></span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Press Enter to pre-fill trade form</span>
          </div>
        )}

        {/* Action list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">No results matching "{query}"</p>
            </div>
          ) : (
            categoryKeys.map((catName) => (
              <div key={catName} className="space-y-1">
                <h3 className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  {catName}
                </h3>
                <div className="space-y-1">
                  {categories[catName].map((item) => {
                    const currentFlatIndex = filteredItems.findIndex(i => i.id === item.id);
                    const isSelected = currentFlatIndex === selectedIndex;
                    const IconComp = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                        className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl transition-all duration-150 border ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2 rounded-lg border shrink-0 ${
                            isSelected
                              ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-semibold tracking-wide ${isSelected ? 'text-indigo-950 dark:text-white font-bold' : 'text-slate-900 dark:text-slate-200'}`}>
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className={`text-[11px] truncate mt-0.5 font-normal ${isSelected ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.shortcut && (
                          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shrink-0 ml-2">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Palette footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">↵</kbd> Select</span>
          </div>
          <div className="font-mono text-[10px]">TradeTrackr Command Palette</div>
        </div>
      </div>
    </div>
  );
}
