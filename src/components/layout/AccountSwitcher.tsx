'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/hooks/useAccount'
import { motion, AnimatePresence } from 'framer-motion'

export default function AccountSwitcher() {
  const router = useRouter()
  const { accounts, selectedAccountId, selectedAccount, selectAccount } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-emerald-500'
      case 'ERROR':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-gray-300 hover:text-white rounded-xl text-xs font-semibold select-none shadow-sm transition-all duration-200"
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex h-2 w-2">
            {selectedAccount?.connection_status === 'CONNECTED' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                selectedAccount
                  ? getStatusColor(selectedAccount.connection_status)
                  : 'bg-indigo-400'
              }`}
            />
          </div>
          <span className="max-w-[120px] truncate">
            {selectedAccount ? selectedAccount.name : 'All Accounts'}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-64 bg-[#0f1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden py-1.5 z-[100] backdrop-blur-md"
          >
            {/* Header */}
            <div className="px-4 py-2 border-b border-white/[0.04]">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Trading Account</p>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.03] scrollbar-thin">
              {/* All Accounts Option */}
              <button
                onClick={() => {
                  selectAccount('all')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors ${
                  selectedAccountId === 'all'
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  <span>All Accounts</span>
                </div>
                {selectedAccountId === 'all' && (
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Accounts list */}
              {accounts.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500 italic text-center">
                  No accounts connected
                </div>
              ) : (
                accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      selectAccount(acc.id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors ${
                      selectedAccountId === acc.id
                        ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(acc.connection_status)}`} />
                      <span className="truncate" title={acc.name}>
                        {acc.name}
                      </span>
                    </div>
                    {selectedAccountId === acc.id && (
                      <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer link */}
            <div className="border-t border-white/[0.04] mt-1.5 pt-1.5 px-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/accounts')
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                </svg>
                <span>Manage Accounts</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
