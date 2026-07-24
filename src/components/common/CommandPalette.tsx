'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from '@/providers/AccountProvider';
import { toast } from 'react-hot-toast';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Accounts' | 'Actions' | 'Quick Log';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { accounts, selectAccount } = useAccount();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut trigger (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Actions list
  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Command Center & Stats Overview',
      icon: (
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      shortcut: 'G D',
      action: () => {
        router.push('/dashboard');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-trades',
      category: 'Navigation',
      title: 'Go to Trades Journal',
      subtitle: 'Table view of all executed trades',
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      shortcut: 'G T',
      action: () => {
        router.push('/trades');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Go to Analytics & Mistake Cost',
      subtitle: 'Heatmaps, drawdowns & behavioral metrics',
      icon: (
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 002-2h2a2 2 0 002 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 002-2h2a2 2 0 002 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      shortcut: 'G A',
      action: () => {
        router.push('/analytics');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-calendar',
      category: 'Navigation',
      title: 'Go to Trading Calendar',
      subtitle: 'Daily P&L matrix & session review',
      icon: (
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      shortcut: 'G C',
      action: () => {
        router.push('/calendar');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-accounts',
      category: 'Navigation',
      title: 'Go to Trading Accounts',
      subtitle: 'Manage MT4/MT5 connections & prop firm parameters',
      icon: (
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      action: () => {
        router.push('/accounts');
        setIsOpen(false);
      },
    },
    {
      id: 'action-theme',
      category: 'Actions',
      title: 'Toggle Theme (Dark / Light)',
      subtitle: 'Switch application color theme',
      icon: (
        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
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
      },
    },
    {
      id: 'acc-all',
      category: 'Accounts',
      title: 'Filter: All Accounts Combined',
      subtitle: 'View consolidated portfolio stats across all accounts',
      icon: (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      action: () => {
        selectAccount('all');
        toast.success('Selected all accounts');
        setIsOpen(false);
      },
    },
    ...accounts.map((acc) => ({
      id: `acc-${acc.id}`,
      category: 'Accounts' as const,
      title: `Switch to ${acc.name}`,
      subtitle: `${acc.platform} • ${acc.type} • $${acc.balance?.toLocaleString() ?? 0}`,
      icon: (
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
      ),
      action: () => {
        selectAccount(acc.id);
        toast.success(`Filtered to account: ${acc.name}`);
        setIsOpen(false);
      },
    })),
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase())) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-[#0B0F19] text-slate-100 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-10 font-sans"
          >
            {/* Input Bar */}
            <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
              <svg className="w-5 h-5 text-slate-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command, navigate, or filter account (Cmd+K)..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No commands found matching "{query}"
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-indigo-600/20 border border-indigo-500/30 text-white' : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded-md bg-slate-800/80 border border-slate-700/50">
                          {cmd.icon}
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-wide">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-[11px] text-slate-400 font-normal">{cmd.subtitle}</div>
                          )}
                        </div>
                      </div>

                      {cmd.shortcut && (
                        <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-3">
                <span><kbd className="px-1 py-0.5 bg-slate-800 rounded">↑↓</kbd> Navigate</span>
                <span><kbd className="px-1 py-0.5 bg-slate-800 rounded">↵</kbd> Select</span>
              </div>
              <div>TradeTrackr Command Palette</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
