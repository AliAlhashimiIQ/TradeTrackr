'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { TradingAccount } from '@/lib/types'
import { getTradingAccounts } from '@/lib/tradingApi'
import { useAuth } from '@/hooks/useAuth'

// 'all' means no filter — show all accounts combined
// A non-empty string[] means filter to only those account IDs
export type AccountSelection = 'all' | string[]

interface AccountContextType {
  accounts: TradingAccount[]
  /** 'all' OR an array of selected account IDs */
  selectedAccountIds: AccountSelection
  /** Convenience: single-account mode (exactly one ID selected), or null */
  selectedAccount: TradingAccount | null
  isLoading: boolean
  /** Select a single account, toggle multi-select, or set 'all' */
  selectAccount: (accountId: string | 'all') => void
  /** Directly set the full selection */
  setSelection: (selection: AccountSelection) => void
  refreshAccounts: () => Promise<void>
  // ─── Legacy compat helpers ─────────────────────────────────────────────
  /** Returns 'all' if all accounts selected, or the single ID if exactly one, or 'multi' if >1 */
  selectedAccountId: string | 'all'
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

function serializeSelection(sel: AccountSelection): string {
  if (sel === 'all') return 'all'
  return JSON.stringify(sel)
}

function deserializeSelection(raw: string | null, accounts: TradingAccount[]): AccountSelection {
  if (!raw || raw === 'all') return 'all'
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      // Validate that IDs still exist
      const valid = parsed.filter(id => accounts.some(a => a.id === id))
      return valid.length > 0 ? valid : 'all'
    }
  } catch {}
  // Legacy: single ID string
  if (accounts.some(a => a.id === raw)) return [raw]
  return 'all'
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<AccountSelection>('all')
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

  useEffect(() => {
    refreshAccounts()
  }, [user])

  // Load persisted selection after accounts are loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('selected_account_id')
      setSelectedAccountIds(deserializeSelection(saved, accounts))
    }
  }, [accounts])

  const setSelection = (sel: AccountSelection) => {
    setSelectedAccountIds(sel)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selected_account_id', serializeSelection(sel))
    }
  }

  /**
   * selectAccount(id)  → toggles that account in the multi-select list
   * selectAccount('all') → resets to 'all'
   */
  const selectAccount = (accountId: string | 'all') => {
    if (accountId === 'all') {
      setSelection('all')
      return
    }
    // Read current value from closure instead of functional updater (avoids implicit-any)
    const current = selectedAccountIds
    if (current === 'all') {
      setSelection([accountId])
    } else {
      const arr = current as string[]
      if (arr.includes(accountId)) {
        // Deselect — if empty, go back to 'all'
        const next = arr.filter(id => id !== accountId)
        setSelection(next.length === 0 ? 'all' : next)
      } else {
        setSelection([...arr, accountId])
      }
    }
  }

  // Legacy compat: single account
  const selectedAccount =
    Array.isArray(selectedAccountIds) && selectedAccountIds.length === 1
      ? accounts.find(a => a.id === selectedAccountIds[0]) || null
      : null

  // Legacy: expose a simple string for components that only need to know
  // 'all' vs one id vs 'multi'
  const selectedAccountId: string | 'all' =
    selectedAccountIds === 'all'
      ? 'all'
      : selectedAccountIds.length === 1
      ? selectedAccountIds[0]
      : 'all' // when multiple selected, treat as 'all' for legacy compat

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccountIds,
        selectedAccount,
        isLoading,
        selectAccount,
        setSelection,
        refreshAccounts,
        selectedAccountId,
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
