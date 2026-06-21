'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { TradingAccount } from '@/lib/types'
import { getTradingAccounts } from '@/lib/tradingApi'
import { useAuth } from '@/hooks/useAuth'

interface AccountContextType {
  accounts: TradingAccount[]
  selectedAccountId: string | 'all'
  selectedAccount: TradingAccount | null
  isLoading: boolean
  selectAccount: (accountId: string | 'all') => void
  refreshAccounts: () => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)

  const refreshAccounts = async () => {
    if (!user) {
      setAccounts([])
      setIsLoading(false)
      return
    }
    try {
      const data = await getTradingAccounts(user.id)
      setAccounts(data)
    } catch (err) {
      console.error('Failed to load accounts in AccountProvider:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch accounts on user change
  useEffect(() => {
    refreshAccounts()
  }, [user])

  // Load selected account from localStorage when accounts are loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('selected_account_id')
      if (saved) {
        // Verify that the saved ID still exists in the accounts list, or is 'all'
        if (saved === 'all' || accounts.some(acc => acc.id === saved)) {
          setSelectedAccountId(saved)
          return
        }
      }
      setSelectedAccountId('all')
    }
  }, [accounts])

  const selectAccount = (accountId: string | 'all') => {
    setSelectedAccountId(accountId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selected_account_id', accountId)
    }
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId) || null

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccountId,
        selectedAccount,
        isLoading,
        selectAccount,
        refreshAccounts
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider')
  }
  return context
}
