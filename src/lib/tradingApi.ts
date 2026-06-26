import { TradingAccount } from './types';
import { supabase } from './supabaseClient';
import * as tradeService from './services/tradeService';

// Re-export type definitions/interfaces so that other files importing from tradingApi get them
export type { PagedTradesResult, PagedTradesOptions, ImportRecord, BulkImportResult } from './services/tradeService';

// Delegate to tradeService
export const getRecentTrades = tradeService.getRecentTrades;
export const getAllTrades = tradeService.getAllTrades;
export const getPagedTrades = tradeService.getPagedTrades;
export const getFilteredTradeMetrics = tradeService.getFilteredTradeMetrics;
export const addTrade = tradeService.addTrade;
export const updateTrade = tradeService.updateTrade;
export const deleteTrade = tradeService.deleteTrade;
export const deleteTradesBulk = tradeService.deleteTradesBulk;
export const getTradeMetrics = tradeService.getTradeMetrics;
export const getOpenPositions = tradeService.getOpenPositions;
export const getEquityCurveData = tradeService.getEquityCurveData;
export const getTradeNotes = tradeService.getTradeNotes;
export const addTradeNote = tradeService.addTradeNote;
export const updateTradeNote = tradeService.updateTradeNote;
export const deleteTradeNote = tradeService.deleteTradeNote;
export const getMarketEvents = tradeService.getMarketEvents;
export const getEconomicEvents = tradeService.getEconomicEvents;
export const getCustomEvents = tradeService.getCustomEvents;
export const addCustomEvent = tradeService.addCustomEvent;
export const updateCustomEvent = tradeService.updateCustomEvent;
export const deleteCustomEvent = tradeService.deleteCustomEvent;
export const getUserTags = tradeService.getUserTags;
export const getTradeTagsById = tradeService.getTradeTagsById;
export const updateTag = tradeService.updateTag;
export const deleteTag = tradeService.deleteTag;
export const getExistingTradeKeys = tradeService.getExistingTradeKeys;
export const bulkInsertTrades = tradeService.bulkInsertTrades;
export const getTradingAccounts = tradeService.getTradingAccounts;
export const deleteTradingAccount = tradeService.deleteTradingAccount;
export const getUnassignedTradesCount = tradeService.getUnassignedTradesCount;
export const assignLegacyTradesToAccount = tradeService.assignLegacyTradesToAccount;
export const getImportHistory = tradeService.getImportHistory;
export const deleteImportRecord = tradeService.deleteImportRecord;

/**
 * Adds a new trading account.
 */
export async function addTradingAccount(
  account: Omit<TradingAccount, 'id' | 'created_at' | 'updated_at' | 'balance' | 'connection_status' | 'last_sync'>
): Promise<TradingAccount> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(account),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to add trading account');
  }

  return await res.json() as TradingAccount;
}

/**
 * Updates a trading account details.
 */
export async function updateTradingAccount(
  id: string,
  account: Partial<Omit<TradingAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<TradingAccount> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`/api/accounts?id=${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(account),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to update trading account');
  }

  return await res.json() as TradingAccount;
}
