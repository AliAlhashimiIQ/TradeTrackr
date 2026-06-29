'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/hooks/useAccount'
import { motion, AnimatePresence } from 'framer-motion'

export default function AccountSwitcher() {
  const router = useRouter()
  const { accounts, selectedAccountIds, selectedAccount, selectAccount, setSelection } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAll = selectedAccountIds === 'all'
  const selectedArr = isAll ? [] : (selectedAccountIds as string[])
  const selectedCount = selectedArr.length

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
      case 'CONNECTED': return 'bg-emerald-500'
      case 'ERROR':     return 'bg-red-500'
      default:          return 'bg-gray-500'
    }
  }

  // Label shown in the trigger button
  const triggerLabel = isAll
    ? 'All Accounts'
    : selectedCount === 1
      ? (accounts.find(a => a.id === selectedArr[0])?.name ?? 'Account')
      : `${selectedCount} Accounts`

  // Dot color for trigger button
  const triggerDotClass = isAll
    ? 'bg-indigo-400'
    : selectedCount === 1
      ? getStatusColor(accounts.find(a => a.id === selectedArr[0])?.connection_status ?? '')
      : 'bg-indigo-400'

  const isPinging = !isAll && selectedCount === 1 &&
    accounts.find(a => a.id === selectedArr[0])?.connection_status === 'CONNECTED'

  const isAccountSelected = (id: string) => !isAll && selectedArr.includes(id)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#0d0e16] hover:bg-slate-50 dark:hover:bg-[#121420] border border-slate-250 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold select-none shadow-sm transition-all duration-200"
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex h-2 w-2">
            {isPinging && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${triggerDotClass}`} />
          </div>
          <span className="max-w-[120px] truncate">{triggerLabel}</span>
          {!isAll && selectedCount > 1 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500/10 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold">
              {selectedCount}
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 w-72 bg-white dark:bg-[#0d0e16] border border-slate-250 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden py-1.5 z-[100]"
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
              <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Trading Account</p>
              {!isAll && (
                <button
                  onClick={() => setSelection('all')}
                  className="text-[10px] text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 font-semibold transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.03] scrollbar-thin">
              {/* All Accounts Option */}
              <button
                onClick={() => {
                  setSelection('all')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors ${
                  isAll
                    ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isAll
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 dark:border-white/[0.15] bg-slate-50 dark:bg-white/[0.03]'
                  }`}>
                    {isAll && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  <span>All Accounts</span>
                </div>
              </button>

              {/* Individual accounts — checkboxes for multi-select */}
              {accounts.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-450 dark:text-gray-505 italic text-center">
                  No accounts connected
                </div>
              ) : (
                accounts.map((acc) => {
                  const checked = isAccountSelected(acc.id)
                  return (
                    <button
                      key={acc.id}
                      onClick={() => selectAccount(acc.id)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-colors ${
                        checked
                          ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-300 font-semibold'
                          : 'text-slate-600 dark:text-gray-450 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
                        checked
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-slate-250 dark:border-white/[0.15] bg-slate-50 dark:bg-white/[0.03]'
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(acc.connection_status)}`} />

                      {/* Name */}
                      <span className="truncate flex-1 font-medium text-slate-800 dark:text-slate-205" title={acc.name}>
                        {acc.name}
                      </span>

                      {/* Connection badge */}
                      {acc.connection_status === 'CONNECTED' && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide flex-shrink-0">
                          Live
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Multi-select hint */}
            {accounts.length > 1 && (
              <div className="px-4 py-2 border-t border-slate-100 dark:border-white/[0.04]">
                <p className="text-[10px] text-slate-400 dark:text-gray-600 text-center">
                  Click accounts to select one or more
                </p>
              </div>
            )}

            {/* Footer link */}
            <div className={`${accounts.length > 1 ? '' : 'border-t border-slate-100 dark:border-white/[0.04] mt-1.5'} pt-1.5 px-2 pb-1`}>
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/accounts')
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-605 dark:text-indigo-400 rounded-xl text-xs font-semibold border border-indigo-100 dark:border-indigo-900/20 transition-all"
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
