import { supabase } from './supabaseClient';
import { Trade, TradeMetrics, OpenPosition, ChartData, TradeNote, TradingAccount } from './types';
import { sanitizeTradeInput } from './sanitize';

async function attachTagsToTrades(trades: Trade[]): Promise<Trade[]> {
  if (!trades.length) return trades;

  const tradeIds = trades.map((trade) => trade.id);
  const { data, error } = await supabase
    .from('trade_tags')
    .select(`
      trade_id,
      tags:tag_id (name)
    `)
    .in('trade_id', tradeIds);

  if (error || !data) {
    return trades.map((trade) => ({ ...trade, tags: trade.tags || [] }));
  }

  const tagsByTradeId: Record<string, string[]> = {};
  data.forEach((row: any) => {
    const tradeId = row.trade_id as string;
    const tagName = row.tags?.name as string | undefined;
    if (!tagName) return true;
    if (!tagsByTradeId[tradeId]) tagsByTradeId[tradeId] = [];
    tagsByTradeId[tradeId].push(tagName);
  });

  return trades.map((trade) => ({
    ...trade,
    tags: tagsByTradeId[trade.id] || []
  }));
}

// Function to get recent trades
export async function getRecentTrades(userId: string, limit: number = 5): Promise<Trade[]> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    const trades = (data as Trade[]) || [];
    return await attachTagsToTrades(trades);
  } catch (error) {
    
    return [];
  }
}

interface GetAllTradesOptions {
  startDate?: string;
  endDate?: string;
  accountId?: string | null;
}

// Function to get all trades (used for analytics, dashboard — full dataset needed)
export async function getAllTrades(userId?: string, options?: GetAllTradesOptions): Promise<Trade[]> {
  try {
    let query = supabase
      .from('trades')
      .select('*')
      .order('entry_time', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (options?.startDate) {
      query = query.gte('entry_time', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('entry_time', options.endDate);
    }

    if (options?.accountId) {
      query = query.eq('account_id', options.accountId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    const trades = (data as Trade[]) || [];
    return await attachTagsToTrades(trades);
  } catch (error) {
    
    return [];
  }
}

// ─── 6.2 Server-side Paginated Trades ──────────────────────────────────────
// Returns one page of trades + the total count in a single round-trip.
// Use this on the /trades list page to avoid loading 500+ rows at once.
export interface PagedTradesResult {
  trades: Trade[];
  total: number;
}

export interface PagedTradesOptions {
  userId: string;
  page?: number;        // 1-indexed
  pageSize?: number;    // default 25
  search?: string;
  symbol?: string | null;
  type?: 'All' | 'Long' | 'Short';
  dateFilter?: 'All' | '7d' | '30d' | '90d' | '1y';
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  accountId?: string | null;
}

export async function getPagedTrades(opts: PagedTradesOptions): Promise<PagedTradesResult> {
  const {
    userId,
    page = 1,
    pageSize = 25,
    search,
    symbol,
    type,
    dateFilter,
    sortField = 'entry_time',
    sortDirection = 'desc',
    accountId,
  } = opts;

  try {
    // Use count: 'exact' to get total without a second query
    let query = supabase
      .from('trades')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order(sortField, { ascending: sortDirection === 'asc' });

    // Filters
    if (accountId) query = query.eq('account_id', accountId);
    if (symbol) query = query.eq('symbol', symbol);
    if (type && type !== 'All') query = query.eq('type', type);

    if (dateFilter && dateFilter !== 'All') {
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[dateFilter];
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      query = query.gte('entry_time', cutoff);
    }

    if (search) {
      // Supabase full-text search is unavailable without a ts_vector column,
      // so we filter symbol + notes via ilike
      query = query.or(`symbol.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Server-side pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const trades = (data as Trade[]) || [];
    const withTags = await attachTagsToTrades(trades);

    return { trades: withTags, total: count ?? 0 };
  } catch (err) {
    console.error('getPagedTrades error:', err);
    return { trades: [], total: 0 };
  }
}

export async function getFilteredTradeMetrics(opts: Omit<PagedTradesOptions, 'page' | 'pageSize' | 'sortField' | 'sortDirection'>): Promise<Trade[]> {
  const {
    userId,
    search,
    symbol,
    type,
    dateFilter,
    accountId,
  } = opts;

  try {
    let query = supabase
      .from('trades')
      .select('profit_loss, entry_time')
      .eq('user_id', userId);

    if (accountId) query = query.eq('account_id', accountId);
    if (symbol) query = query.eq('symbol', symbol);
    if (type && type !== 'All') query = query.eq('type', type);

    if (dateFilter && dateFilter !== 'All') {
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[dateFilter as string];
      if (days) {
        const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
        query = query.gte('entry_time', cutoff);
      }
    }

    if (search) {
      query = query.or(`symbol.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data as Trade[]) || [];
  } catch (err) {
    console.error('getFilteredTradeMetrics error:', err);
    return [];
  }
}

// Function to add a new trade
export async function addTrade(trade: Trade): Promise<Trade> {
  try {
    // Sanitize user-editable fields before saving
    const sanitized = sanitizeTradeInput(trade) as Trade;

    // Generate a UUID if not provided
    if (!sanitized.id) {
      sanitized.id = crypto.randomUUID();
    }
    
    // Use the database fields directly - only include columns that exist in the table
    const tradeData: Record<string, unknown> = {
      id: sanitized.id,
      user_id: sanitized.user_id,
      account_id: sanitized.account_id || null,
      symbol: sanitized.symbol,
      type: sanitized.type,
      entry_price: sanitized.entry_price,
      exit_price: sanitized.exit_price,
      entry_time: sanitized.entry_time,
      exit_time: sanitized.exit_time,
      quantity: sanitized.quantity,
      profit_loss: sanitized.profit_loss,
      screenshot_url: sanitized.screenshot_url,
      notes: sanitized.notes,
      emotional_state: sanitized.emotional_state,
      mistakes: sanitized.mistakes || [],
      lots: sanitized.lots,
      pips: sanitized.pips,
      stop_loss: sanitized.stop_loss,
      take_profit: sanitized.take_profit,
      commission: sanitized.commission,
      swap: sanitized.swap,
      strategy: sanitized.strategy || null,
    };
    
    // Only include optional fields if they have values
    if (sanitized.risk) tradeData.risk = sanitized.risk;
    if (sanitized.r_multiple) tradeData.r_multiple = sanitized.r_multiple;
    
    // Insert the trade
    const { data, error } = await supabase
      .from('trades')
      .insert([tradeData])
      .select()
      .single();

    if (error) {
      
      throw error;
    }
    
    // Handle tags separately if they exist
    if (sanitized.tags && sanitized.tags.length > 0) {
      await addTradeTagsToDatabase(sanitized.id, sanitized.user_id, sanitized.tags);
    }
    
    return { ...sanitized, ...data } as Trade;
  } catch (error) {
    
    throw error;
  }
}

// New helper function to handle tags
async function addTradeTagsToDatabase(tradeId: string, userId: string, tagNames: string[]) {
  try {
    // First, ensure all tags exist in the database
    for (const tagName of tagNames) {
      // Try to find the tag first
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .eq('user_id', userId)
        .single();
      
      // If tag doesn't exist, create it
      if (!existingTag) {
        await supabase.from('tags').insert({
          name: tagName,
          user_id: userId,
          color: getRandomColor() // You could implement a function to generate colors
        });
      }
    }
    
    // Now get all the tag IDs
    const { data: tags } = await supabase
      .from('tags')
      .select('id, name')
      .eq('user_id', userId)
      .in('name', tagNames);
    
    if (!tags || tags.length === 0) return true;
    
    // Create the trade_tags relationships
    const tradeTagsData = tags.map(tag => ({
      trade_id: tradeId,
      tag_id: tag.id
    }));
    
    await supabase.from('trade_tags').insert(tradeTagsData);
  } catch (error) {
    
  }
}

// Helper function to generate random colors for tags
function getRandomColor() {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#ef4444', // red
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#6366f1'  // indigo
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Function to update a trade
export async function updateTrade(trade: Trade): Promise<Trade> {
  try {
    // Sanitize user-editable fields before saving
    const sanitized = sanitizeTradeInput(trade) as Trade;

    // Use the database fields directly
    const tradeData: Record<string, unknown> = {
      id: sanitized.id,
      user_id: sanitized.user_id,
      account_id: sanitized.account_id || null,
      symbol: sanitized.symbol,
      type: sanitized.type,
      entry_price: sanitized.entry_price,
      exit_price: sanitized.exit_price,
      entry_time: sanitized.entry_time,
      exit_time: sanitized.exit_time,
      quantity: sanitized.quantity,
      profit_loss: sanitized.profit_loss,
      screenshot_url: sanitized.screenshot_url,
      notes: sanitized.notes,
      emotional_state: sanitized.emotional_state,
      mistakes: sanitized.mistakes || [],
      lots: sanitized.lots,
      pips: sanitized.pips,
      stop_loss: sanitized.stop_loss,
      take_profit: sanitized.take_profit,
      commission: sanitized.commission,
      swap: sanitized.swap,
      strategy: sanitized.strategy || null,
    };
    
    if (sanitized.risk) tradeData.risk = sanitized.risk;
    if (sanitized.r_multiple) tradeData.r_multiple = sanitized.r_multiple;
    
    const { data, error } = await supabase
      .from('trades')
      .update(tradeData)
      .eq('id', trade.id)
      .select()
      .single();

    if (error) {
      
      throw error;
    }
    
    // Handle tag updates if provided
    if (trade.tags) {
      // First remove existing tag associations
      await supabase
        .from('trade_tags')
        .delete()
        .eq('trade_id', trade.id);
      
      // Then add new tags
      if (trade.tags.length > 0) {
        await addTradeTagsToDatabase(trade.id, trade.user_id, trade.tags);
      }
    }
    
    return { ...trade, ...data } as Trade;
  } catch (error) {
    
    throw error;
  }
}

// Function to delete a trade
export async function deleteTrade(tradeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    
    throw error;
  }
}

// Function to delete multiple trades in bulk
export async function deleteTradesBulk(tradeIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .in('id', tradeIds);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('deleteTradesBulk error:', error);
    throw error;
  }
}

// Function to get trade metrics
export async function getTradeMetrics(userId: string): Promise<TradeMetrics> {
  try {
    // Fetch trades from Supabase
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    const trades = data as Trade[] || [];
    
    if (trades.length === 0) {
      return {
        total_pnl: 0,
        win_rate: 0,
        avg_win: 0,
        avg_loss: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0
      };
    }
    
    // Calculate metrics from real data
    const winningTrades = trades.filter(trade => trade.profit_loss > 0);
    const losingTrades = trades.filter(trade => trade.profit_loss <= 0);
    
    const totalPnL = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const totalWinAmount = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const totalLossAmount = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit_loss, 0));
    
    return {
      total_pnl: totalPnL,
      win_rate: winningTrades.length / trades.length,
      avg_win: winningTrades.length > 0 ? totalWinAmount / winningTrades.length : 0,
      avg_loss: losingTrades.length > 0 ? totalLossAmount / losingTrades.length : 0,
      total_trades: trades.length,
      winning_trades: winningTrades.length,
      losing_trades: losingTrades.length
    };
  } catch (error) {
    
    return {
      total_pnl: 0,
      win_rate: 0,
      avg_win: 0,
      avg_loss: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0
    };
  }
}

// Function to get open positions
export async function getOpenPositions(userId: string): Promise<OpenPosition[]> {
  try {
    const { data, error } = await supabase
      .from('open_positions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    return data as OpenPosition[] || [];
  } catch (error) {
    
    return [];
  }
}

// Function to get equity curve data
export async function getEquityCurveData(userId: string): Promise<ChartData> {
  try {
    // Fetch trades from Supabase
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_time', { ascending: true });

    if (error) throw error;
    
    const trades = data as Trade[] || [];
    
    if (trades.length === 0) {
      return {
        labels: [],
        values: []
      };
    }
    
    // Fetch starting balance from profile settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .single();
    
    // Get trading accounts to see if we have connected balances
    const { data: accountsData } = await supabase
      .from('trading_accounts')
      .select('balance')
      .eq('user_id', userId);

    const settings = (profile?.settings as any) || {};
    const profileStartingBalance = Number(settings.startingBalance) || 10000;
    
    let initialCapital = profileStartingBalance;
    if (accountsData && accountsData.length > 0) {
      const totalAccountBalance = accountsData.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
      if (totalAccountBalance > 0) {
        initialCapital = totalAccountBalance;
      }
    }

    // Process trades to create equity curve
    const tradesByDate: { [date: string]: number } = {};
    let runningTotal = initialCapital; // Starting capital
    
    trades.forEach(trade => {
      const date = new Date(trade.exit_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      runningTotal += trade.profit_loss;
      tradesByDate[date] = runningTotal;
    });
    
    return {
      labels: Object.keys(tradesByDate),
      values: Object.values(tradesByDate)
    };
  } catch (error) {
    
    return {
      labels: [],
      values: []
    };
  }
}

// Function to get notes for a trade
export async function getTradeNotes(tradeId: string): Promise<TradeNote[]> {
  try {
    const { data, error } = await supabase
      .from('trade_notes')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return data as TradeNote[] || [];
  } catch (error) {
    
    return [];
  }
}

// Function to add a note to a trade
export async function addTradeNote(note: Omit<TradeNote, 'id' | 'created_at' | 'updated_at'>): Promise<TradeNote> {
  try {
    const { data, error } = await supabase
      .from('trade_notes')
      .insert([note])
      .select()
      .single();

    if (error) throw error;
    
    return data as TradeNote;
  } catch (error) {
    
    throw error;
  }
}

// Function to update a trade note
export async function updateTradeNote(id: string, content: string): Promise<TradeNote> {
  try {
    const { data, error } = await supabase
      .from('trade_notes')
      .update({ content })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return data as TradeNote;
  } catch (error) {
    
    throw error;
  }
}

// Function to delete a trade note
export async function deleteTradeNote(noteId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    
    throw error;
  }
}

// Calendar integration functions

// Function to get market events
export async function getMarketEvents(startDate: string, endDate: string): Promise<any[]> {
  // Remove or comment out all functions and code that fetch from 'market_events' or 'custom_events', as these tables do not exist and cause errors.
  return [];
}

// Function to get economic calendar events
export async function getEconomicEvents(startDate: string, endDate: string, countries?: string[]): Promise<any[]> {
  return [];
}

// Function to get user's custom events
export async function getCustomEvents(userId: string, startDate: string, endDate: string): Promise<any[]> {
  // Remove or comment out all functions and code that fetch from 'market_events' or 'custom_events', as these tables do not exist and cause errors.
  return [];
}

// Function to add a custom event
export async function addCustomEvent(event: any): Promise<any> {
  // Remove or comment out all functions and code that fetch from 'market_events' or 'custom_events', as these tables do not exist and cause errors.
  return true;
}

// Function to update a custom event
export async function updateCustomEvent(event: any): Promise<any> {
  // Remove or comment out all functions and code that fetch from 'market_events' or 'custom_events', as these tables do not exist and cause errors.
  return true;
}

// Function to delete a custom event
export async function deleteCustomEvent(eventId: string): Promise<boolean> {
  // Remove or comment out all functions and code that fetch from 'market_events' or 'custom_events', as these tables do not exist and cause errors.
  return true;
}

// Function to get all tags for a user
export async function getUserTags(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    
    return [];
  }
}

// Function to get tags for a specific trade
export async function getTradeTagsById(tradeId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('trade_tags')
      .select(`
        tag_id,
        tags:tag_id (id, name, color)
      `)
      .eq('trade_id', tradeId);

    if (error) throw error;
    return data?.map(item => item.tags) || [];
  } catch (error) {
    return [];
  }
}

// Function to update a tag
export async function updateTag(
  tagId: string, 
  updates: { name?: string; color?: string; description?: string | null; rules?: string | null }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tags')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', tagId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating tag:', error);
    return false;
  }
}

// Function to delete a tag
export async function deleteTag(tagId: string): Promise<boolean> {
  try {
    // Delete trade_tags relationships first to avoid foreign key violations
    await supabase.from('trade_tags').delete().eq('tag_id', tagId);
    // Delete the tag itself
    const { error } = await supabase.from('tags').delete().eq('id', tagId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting tag:', error);
    return false;
  }
}

// ─── Phase 5: Bulk Import ───────────────────────────────────────────────────

export interface ImportRecord {
  id: string
  user_id: string
  file_name: string
  source: 'mt5' | 'csv'
  total_parsed: number
  trades_imported: number
  duplicates_skipped: number
  errors: string[]
  created_at: string
}

export interface BulkImportResult {
  imported: number
  skipped: number
  errors: string[]
  importId: string
}

/**
 * Checks existing trades for duplicates using symbol + entry_time + lots as key.
 * Returns a Set of keys that already exist in the database.
 */
export async function getExistingTradeKeys(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('symbol, entry_time, lots')
      .eq('user_id', userId);

    if (error) throw error;

    const keys = new Set<string>();
    (data || []).forEach((t: any) => {
      keys.add(`${t.symbol}|${t.entry_time}|${t.lots ?? 0}`);
    });
    return keys;
  } catch {
    return new Set();
  }
}

/**
 * Bulk inserts a list of parsed trades. Skips duplicates.
 * Records an import_history entry when done.
 */
export async function bulkInsertTrades(
  userId: string,
  parsedTrades: Array<{
    symbol: string; type: 'Long' | 'Short'; entry_time: string; exit_time: string
    entry_price: number; exit_price: number; quantity: number; lots: number
    profit_loss: number; commission?: number; swap?: number; notes?: string
    _key: string
  }>,
  source: 'mt5' | 'csv',
  fileName: string,
  accountId?: string | null,
): Promise<BulkImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    const existingKeys = await getExistingTradeKeys(userId);

    const toInsert = parsedTrades.filter((t) => {
      if (existingKeys.has(t._key)) {
        skipped++;
        return false;
      }
      return true;
    });

    if (toInsert.length > 0) {
      const rows = toInsert.map((t) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        account_id: accountId || null,
        symbol: t.symbol,
        type: t.type,
        entry_time: t.entry_time,
        exit_time: t.exit_time,
        entry_price: t.entry_price,
        exit_price: t.exit_price,
        quantity: t.quantity,
        lots: t.lots,
        profit_loss: t.profit_loss,
        notes: [
          t.notes,
          t.commission ? `Commission: ${t.commission}` : null,
          t.swap ? `Swap: ${t.swap}` : null,
        ].filter(Boolean).join(' | ') || null,
        mistakes: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Insert in batches of 100 to avoid payload limits
      const BATCH = 100;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase.from('trades').insert(batch);
        if (error) {
          errors.push(`Batch ${Math.ceil(i / BATCH) + 1} failed: ${error.message}`);
        } else {
          imported += batch.length;
        }
      }
    }
  } catch (e: unknown) {
    errors.push(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Record import history (best-effort — don't fail if table doesn't exist)
  let importId = crypto.randomUUID();
  try {
    const { data } = await supabase
      .from('import_history')
      .insert({
        id: importId,
        user_id: userId,
        file_name: fileName,
        source,
        total_parsed: parsedTrades.length,
        trades_imported: imported,
        duplicates_skipped: skipped,
        errors,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (data?.id) importId = data.id;
  } catch {
    // import_history table may not exist yet — silently ignore
  }

  return { imported, skipped, errors, importId };
}

/**
 * Fetches the import history for a user.
 */
export async function getImportHistory(userId: string): Promise<ImportRecord[]> {
  try {
    const { data, error } = await supabase
      .from('import_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data as ImportRecord[]) || [];
  } catch {
    return [];
  }
}

/**
 * Deletes an import history record.
 */
export async function deleteImportRecord(id: string): Promise<void> {
  await supabase.from('import_history').delete().eq('id', id);
}

/**
 * Retrieves all trading accounts for a user.
 */
export async function getTradingAccounts(userId: string): Promise<TradingAccount[]> {
  try {
    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as TradingAccount[]) || [];
  } catch (err) {
    console.error('getTradingAccounts error:', err);
    return [];
  }
}

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

/**
 * Deletes a trading account.
 */
export async function deleteTradingAccount(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('trading_accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Gets the count of trades with no account assigned.
 */
export async function getUnassignedTradesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('account_id', null);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('getUnassignedTradesCount error:', err);
    return 0;
  }
}

/**
 * Assigns all unassigned trades of a user to a specific account.
 */
export async function assignLegacyTradesToAccount(userId: string, accountId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .update({ account_id: accountId })
      .eq('user_id', userId)
      .is('account_id', null)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  } catch (err) {
    console.error('assignLegacyTradesToAccount error:', err);
    throw err;
  }
}



