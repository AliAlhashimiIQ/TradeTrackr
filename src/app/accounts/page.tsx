'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import { TradingAccount } from '@/lib/types'
import {
  getTradingAccounts,
  addTradingAccount,
  updateTradingAccount,
  deleteTradingAccount,
  getUnassignedTradesCount,
  assignLegacyTradesToAccount,
} from '@/lib/tradingApi'
import { toast } from 'react-hot-toast'

type TabType = 'accounts' | 'portfolios'
type SyncStep = 'idle' | 'connect' | 'auth' | 'fetch' | 'db' | 'done'

const COMMON_SERVERS = [
  'FinotiveMarkets-Server',
  'FTMO-Server',
  'FTMO-Server2',
  'FundingPips-Server',
  'FundedNext-Server',
  'The5ers-Server',
  'E8Funding-Server',
  'Apex-Server',
  'Topstep-Server'
]

export default function AccountsPage() {
  const { user, loading } = useAuth()
  const [unassignedCount, setUnassignedCount] = useState<number>(0)
  const [isMigrating, setIsMigrating] = useState(false)
  const [selectedMigrationAccountId, setSelectedMigrationAccountId] = useState<string>('')
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('accounts')
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)

  // Add Account Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAccName, setNewAccName] = useState('')
  const [newAccNumber, setNewAccNumber] = useState('')
  const [newAccServer, setNewAccServer] = useState('')
  const [newAccPassword, setNewAccPassword] = useState('')
  const [newAccType, setNewAccType] = useState<'LIVE' | 'DEMO'>('DEMO')
  const [newAccPlatform, setNewAccPlatform] = useState('MT5')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverSearchOpen, setServerSearchOpen] = useState(false)
  const [filteredServers, setFilteredServers] = useState<string[]>(COMMON_SERVERS)

  const handleServerChange = (val: string) => {
    setNewAccServer(val)
    if (val.trim() === '') {
      setFilteredServers(COMMON_SERVERS)
    } else {
      setFilteredServers(
        COMMON_SERVERS.filter(s => s.toLowerCase().includes(val.toLowerCase()))
      )
    }
  }

  // Sync state
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
  const [syncStep, setSyncStep] = useState<SyncStep>('idle')
  const [syncProgress, setSyncProgress] = useState(0)

  // Fetch Accounts
  const fetchAccounts = async () => {
    if (!user) return
    try {
      const data = await getTradingAccounts(user.id)
      setAccounts(data)
      const count = await getUnassignedTradesCount(user.id)
      setUnassignedCount(count)
      if (data.length > 0 && !selectedMigrationAccountId) {
        setSelectedMigrationAccountId(data[0].id)
      }
    } catch (err) {
      toast.error('Failed to load accounts')
    } finally {
      setAccountsLoading(false)
    }
  }

  const handleMigrateTrades = async () => {
    if (!user || !selectedMigrationAccountId || unassignedCount === 0) return
    setIsMigrating(true)
    try {
      const count = await assignLegacyTradesToAccount(user.id, selectedMigrationAccountId)
      toast.success(`Success! Assigned ${count} legacy trades to the selected account.`)
      setUnassignedCount(0)
    } catch (err) {
      toast.error('Failed to migrate trades')
    } finally {
      setIsMigrating(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  // Handle Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newAccNumber || !newAccServer || !newAccPassword) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const finalName = newAccName.trim() || `${newAccServer.split('-')[0]} (${newAccNumber})`
      await addTradingAccount({
        user_id: user.id,
        name: finalName,
        account_number: newAccNumber,
        server_name: newAccServer,
        password: newAccPassword,
        type: newAccType,
        platform: newAccPlatform,
        connection_type: 'API',
      })
      toast.success('Trading account added successfully')
      setIsAddModalOpen(false)
      // Reset form
      setNewAccName('')
      setNewAccNumber('')
      setNewAccServer('')
      setNewAccPassword('')
      setNewAccType('DEMO')
      setNewAccPlatform('MT5')
      fetchAccounts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add trading account')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Account
  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect and delete account "${name}"? Synced trades will remain but will be unlinked.`)) {
      return
    }
    try {
      await deleteTradingAccount(id)
      toast.success('Account deleted successfully')
      fetchAccounts()
    } catch (err) {
      toast.error('Failed to delete account')
    }
  }

  // Sync Single Account
  const handleSyncAccount = async (accountId: string) => {
    setSyncingAccountId(accountId)
    setSyncStep('connect')
    setSyncProgress(15)
    
    // Simulate multi-step progress for premium UI feeling
    const progressTimer = (step: SyncStep, delay: number, nextProgress: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setSyncStep(step)
          setSyncProgress(nextProgress)
          resolve()
        }, delay)
      })
    }

    try {
      await progressTimer('auth', 700, 40)
      await progressTimer('fetch', 900, 70)
      await progressTimer('db', 600, 90)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/accounts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ accountId }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sync request failed')
      }

      setSyncStep('done')
      setSyncProgress(100)
      
      const accountResult = result.results?.[0]
      if (accountResult?.status === 'ERROR') {
        throw new Error(accountResult.errors?.[0] || 'Sync failed')
      }

      toast.success(
        `Sync Complete! Imported ${accountResult?.imported || 0} new trades, skipped ${accountResult?.skipped || 0} duplicates.`
      )
      
      setTimeout(() => {
        setSyncingAccountId(null)
        setSyncStep('idle')
        setSyncProgress(0)
        fetchAccounts()
      }, 1000)

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Sync failed')
      setSyncingAccountId(null)
      setSyncStep('idle')
      setSyncProgress(0)
      fetchAccounts()
    }
  }

  // Sync All Accounts
  const handleSyncAll = async () => {
    if (accounts.length === 0) {
      toast.error('No accounts connected to sync')
      return
    }
    
    setSyncingAccountId('all')
    setSyncStep('connect')
    setSyncProgress(20)

    const progressTimer = (step: SyncStep, delay: number, nextProgress: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setSyncStep(step)
          setSyncProgress(nextProgress)
          resolve()
        }, delay)
      })
    }

    try {
      await progressTimer('auth', 800, 50)
      await progressTimer('fetch', 1000, 80)
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/accounts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ all: true }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sync request failed')
      }

      setSyncStep('done')
      setSyncProgress(100)

      let totalImported = 0
      result.results?.forEach((r: any) => {
        totalImported += r.imported || 0
      })

      toast.success(`Sync All Complete! Synced ${result.results?.length || 0} accounts, imported ${totalImported} new trades.`)
      
      setTimeout(() => {
        setSyncingAccountId(null)
        setSyncStep('idle')
        setSyncProgress(0)
        fetchAccounts()
      }, 1000)

    } catch (err: any) {
      toast.error(err.message || 'Sync All failed')
      setSyncingAccountId(null)
      setSyncStep('idle')
      setSyncProgress(0)
      fetchAccounts()
    }
  }

  if (loading) return null

  // Stats calculation
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
  const connectedCount = accounts.filter(acc => acc.connection_status === 'CONNECTED').length

  return (
    <>
      <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-8">
        
        {/* Top bar with tabs and buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.04] pb-4">
          <div className="flex items-center gap-4">
            {/* Tabs */}
            <div className="flex bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'accounts'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Accounts
              </button>
              <button
                onClick={() => setActiveTab('portfolios')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white flex items-center gap-1.5 cursor-not-allowed"
                title="Portfolios Pro features coming soon"
                disabled
              >
                Portfolios
                <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                  Pro
                </span>
              </button>
            </div>
            
            {/* Limit text */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-lg">
              <span>{accounts.length}/3 Accounts Linked</span>
              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (accounts.length / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSyncAll}
              disabled={syncingAccountId !== null || accounts.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.1] text-gray-300 hover:text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg 
                className={`w-4 h-4 ${syncingAccountId === 'all' ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
              Sync All
            </button>
            
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Account
            </button>
          </div>
        </div>

        {/* Stats Summary Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Total Connected Balance</p>
            <p className="text-2xl font-black text-white bg-clip-text bg-gradient-to-r from-white to-gray-400">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Connection Status</p>
            <p className="text-2xl font-black text-white flex items-center gap-2">
              {connectedCount} <span className="text-sm font-medium text-gray-500">of {accounts.length} online</span>
            </p>
          </div>

          <div className="card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">MT5 Cloud Platform</p>
            <p className="text-2xl font-black text-white">
              API Bridge <span className="text-xs font-semibold text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full ml-1.5 uppercase">Stable</span>
            </p>
          </div>
        </div>

        {/* Sync Progress Banner (When Syncing) */}
        <AnimatePresence>
          {syncingAccountId && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-white space-y-3 relative">
                {/* Glow */}
                <div className="absolute inset-0 bg-indigo-500/5 blur-[30px] rounded-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {syncingAccountId === 'all' 
                          ? 'Synchronizing all trading accounts...' 
                          : `Syncing account: ${accounts.find(a => a.id === syncingAccountId)?.name}...`}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {syncStep === 'connect' && 'Establishing handshake with MetaTrader server...'}
                        {syncStep === 'auth' && 'Validating credentials and server settings...'}
                        {syncStep === 'fetch' && 'Fetching raw deals from account history...'}
                        {syncStep === 'db' && 'Processing deals, checking duplicates, mapping fields...'}
                        {syncStep === 'done' && 'Sync completed successfully!'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-400 tabular-nums">{syncProgress}%</span>
                </div>
                
                {/* Bar */}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative z-10">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legacy Trades Migration Panel */}
        {unassignedCount > 0 && accounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
          >
            <div className="space-y-1">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span className="text-amber-400">⚠️</span> Legacy Unassigned Trades Detected
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed max-w-2xl">
                You have <strong className="text-white">{unassignedCount} trades</strong> logged without an associated trading account. You can bulk-assign all of them to one of your accounts to make them visible under individual account analytics.
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={selectedMigrationAccountId}
                onChange={(e) => setSelectedMigrationAccountId(e.target.value)}
                className="input text-xs py-2 bg-[#0a0b0f] border-white/[0.06] focus:border-indigo-500/50 w-full md:w-48 [color-scheme:dark]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMigrateTrades}
                disabled={isMigrating || !selectedMigrationAccountId}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                {isMigrating ? 'Assigning...' : 'Assign Trades'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Grid/Table */}
        <div className="card overflow-hidden">
          {accountsLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto text-gray-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-semibold">No accounts connected</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  Connect your MT5 account via API to track your trades automatically in real time without importing HTML files.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex px-5 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-sm font-semibold transition-all"
              >
                + Link MT5 Account
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-white/[0.06] bg-white/[0.01]">
                  <tr>
                    {['Name', 'Number', 'Server', 'Type', 'Platform', 'Balance', 'Connection', 'Last Sync', 'Actions'].map((h) => (
                      <th key={h} className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {accounts.map((acc) => {
                    const isSyncing = syncingAccountId === acc.id || syncingAccountId === 'all'
                    return (
                      <tr key={acc.id} className="hover:bg-white/[0.01] transition-colors relative group">
                        
                        {/* Name with connection dot */}
                        <td className="p-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-2.5 w-2.5">
                              {acc.connection_status === 'CONNECTED' && (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </>
                              )}
                              {acc.connection_status === 'ERROR' && (
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" title="Connection error"></span>
                              )}
                              {acc.connection_status === 'DISCONNECTED' && (
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-600" title="Disconnected"></span>
                              )}
                            </div>
                            {acc.name}
                          </div>
                        </td>
                        
                        <td className="p-4 text-gray-300 font-mono">{acc.account_number}</td>
                        <td className="p-4 text-gray-400 max-w-[150px] truncate" title={acc.server_name}>{acc.server_name}</td>
                        
                        {/* Type Badge */}
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                            acc.type === 'LIVE'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {acc.type}
                          </span>
                        </td>
                        
                        {/* Platform with MetaTrader logo mock */}
                        <td className="p-4 font-semibold text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-blue-600/10 text-blue-400 flex items-center justify-center text-[10px] font-black border border-blue-500/20">
                              M
                            </div>
                            {acc.platform}
                          </div>
                        </td>
                        
                        <td className="p-4 font-bold text-white">
                          ${Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* Connection Method */}
                        <td className="p-4 text-gray-400">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md">
                            {acc.connection_type}
                          </span>
                        </td>
                        
                        <td className="p-4 text-xs text-gray-500">
                          {acc.last_sync 
                            ? new Date(acc.last_sync).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Never'
                          }
                        </td>
                        
                        {/* Actions */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {/* Wrench Config */}
                            <button
                              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                              title="Configure Settings"
                              disabled={isSyncing}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            
                            {/* Sync */}
                            <button
                              onClick={() => handleSyncAccount(acc.id)}
                              disabled={isSyncing}
                              className={`p-2 rounded-lg transition-all ${
                                isSyncing 
                                  ? 'text-indigo-400 bg-indigo-500/10' 
                                  : 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                              }`}
                              title="Sync account history"
                            >
                              <svg 
                                className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
                              </svg>
                            </button>
                            
                            {/* Share */}
                            <button
                              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                              title="Share Performance"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.684-2.342m0 7.2l-4.684-2.342M19 12a3 3 0 11-6 0 3 3 0 016 0zM6 6a3 3 0 11-6 0 3 3 0 016 0zm0 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            
                            {/* Edit */}
                            <button
                              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                              title="Edit Account Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteAccount(acc.id, acc.name)}
                              disabled={isSyncing}
                              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete account link"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Helper Note */}
        <div className="card p-5 border border-white/[0.04] bg-white/[0.01]">
          <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About MT5 API Synchronization
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            TradeTrackr connects to MetaTrader cloud terminal managers to synchronize trades directly. 
            All trades are checked for duplicates before being appended. Deleting an account link will not delete the trades 
            already synced to your journal.
          </p>
        </div>
      </div>
      </AuthenticatedLayout>

      {/* Add Account Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e1017] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden z-10 p-6 space-y-6"
            >
              {/* Neon Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />
              
              {/* Modal Top Header (Back & Close) */}
              <div className="flex items-center justify-between text-gray-400">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-white/5 hover:text-white rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* MT5 Logo & Title */}
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative flex items-center justify-center">
                  {/* Glowing background */}
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  
                  <svg className="w-14 h-14 relative z-10" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="14" r="8" fill="#3b82f6" />
                    <circle cx="15" cy="29" r="8" fill="#10b981" />
                    <circle cx="33" cy="29" r="8" fill="#06b6d4" />
                    <circle cx="24" cy="24" r="9" fill="#eab308" stroke="#0e1017" strokeWidth="2" />
                    <text x="24" y="27.5" textAnchor="middle" fill="#0e1017" fontSize="11" fontWeight="900" fontFamily="sans-serif">5</text>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">MT5</h3>
                  <p className="text-gray-500 text-[11px] mt-0.5">Link your MetaTrader 5 account credentials to sync trades</p>
                </div>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-4">
                
                {/* Name (optional) */}
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-400">Name (optional)</label>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="e.g. Personal Live Account"
                    className="input w-full text-sm py-2.5 bg-[#0a0b0f] border-white/[0.06] focus:border-indigo-500/50"
                  />
                  <div className="text-[10px] text-gray-600 text-right mt-1 font-mono">
                    {newAccName.length}/50
                  </div>
                </div>

                {/* Select Server * */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Select Server *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newAccServer}
                      onChange={(e) => handleServerChange(e.target.value)}
                      onFocus={() => setServerSearchOpen(true)}
                      onBlur={() => setTimeout(() => setServerSearchOpen(false), 200)}
                      placeholder="e.g. FinotiveMarkets-Server"
                      className="input w-full text-sm py-2.5 pr-10 bg-[#0a0b0f] border-white/[0.06] focus:border-indigo-500/50"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {serverSearchOpen && filteredServers.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-[#12141d] border border-white/[0.08] rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/[0.04] scrollbar-thin">
                      {filteredServers.map((srv) => (
                        <button
                          key={srv}
                          type="button"
                          onMouseDown={() => {
                            setNewAccServer(srv)
                            setServerSearchOpen(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-indigo-600/20 transition-all font-medium"
                        >
                          {srv}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <span className="block text-[10px] text-gray-600 mt-1">
                    Server Missing from the list? Just type in the server name
                  </span>
                </div>

                {/* Account ID * and Password * */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Account ID * */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Account ID *</label>
                    <input
                      type="text"
                      required
                      value={newAccNumber}
                      onChange={(e) => setNewAccNumber(e.target.value)}
                      placeholder="e.g. 80142705"
                      className="input w-full text-sm py-2.5 bg-[#0a0b0f] border-white/[0.06] focus:border-indigo-500/50 font-mono"
                    />
                  </div>
                  
                  {/* Account Password * */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Account Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newAccPassword}
                        onChange={(e) => setNewAccPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input w-full text-sm py-2.5 pr-10 bg-[#0a0b0f] border-white/[0.06] focus:border-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit buttons (Cancel & Confirm) */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-semibold border border-white/[0.08] hover:border-white/[0.15] text-gray-300 hover:text-white rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newAccNumber || !newAccServer || !newAccPassword}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Linking...
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
