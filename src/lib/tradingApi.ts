import { supabase } from './supabaseClient';
import { Trade, TradeMetrics, OpenPosition, ChartData, TradeNote } from './types';

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
    
    return data as Trade[] || [];
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    return [];
  }
}

// Function to get all trades
export async function getAllTrades(userId: string): Promise<Trade[]> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_time', { ascending: false });

    if (error) throw error;
    
    return data as Trade[] || [];
  } catch (error) {
    console.error('Error fetching all trades:', error);
    return [];
  }
}

// Function to add a new trade
export async function addTrade(trade: Trade): Promise<Trade> {
  try {
    // Generate a UUID if not provided
    if (!trade.id) {
      trade.id = crypto.randomUUID();
    }
    
    // Use the database fields directly now that they exist
    const tradeData = {
      id: trade.id,
      user_id: trade.user_id,
      symbol: trade.symbol,
      type: trade.type,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      entry_time: trade.entry_time,
      exit_time: trade.exit_time,
      quantity: trade.quantity,
      profit_loss: trade.profit_loss,
      strategy: trade.strategy,
      screenshot_url: trade.screenshot_url,
      notes: trade.notes,
      emotional_state: trade.emotional_state, // Now using direct field
      risk: trade.risk,                      // Now using direct field
      r_multiple: trade.r_multiple           // Now using direct field
    };
    
    // Insert the trade
    const { data, error } = await supabase
      .from('trades')
      .insert([tradeData])
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }
    
    // Handle tags separately if they exist
    if (trade.tags && trade.tags.length > 0) {
      await addTradeTagsToDatabase(trade.id, trade.user_id, trade.tags);
    }
    
    return { ...trade, ...data } as Trade;
  } catch (error) {
    console.error('Error adding trade:', error);
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
    
    if (!tags || tags.length === 0) return;
    
    // Create the trade_tags relationships
    const tradeTagsData = tags.map(tag => ({
      trade_id: tradeId,
      tag_id: tag.id
    }));
    
    await supabase.from('trade_tags').insert(tradeTagsData);
  } catch (error) {
    console.error('Error adding trade tags:', error);
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
    // Use the database fields directly
    const tradeData = {
      id: trade.id,
      user_id: trade.user_id,
      symbol: trade.symbol,
      type: trade.type,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      entry_time: trade.entry_time,
      exit_time: trade.exit_time,
      quantity: trade.quantity,
      profit_loss: trade.profit_loss,
      strategy: trade.strategy,
      screenshot_url: trade.screenshot_url,
      notes: trade.notes,
      emotional_state: trade.emotional_state,
      risk: trade.risk,
      r_multiple: trade.r_multiple
    };
    
    const { data, error } = await supabase
      .from('trades')
      .update(tradeData)
      .eq('id', trade.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
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
    console.error('Error updating trade:', error);
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
    console.error('Error deleting trade:', error);
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
    console.error('Error calculating trade metrics:', error);
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
    console.error('Error fetching open positions:', error);
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
    
    // Process trades to create equity curve
    const tradesByDate: { [date: string]: number } = {};
    let runningTotal = 10000; // Starting capital
    
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
    console.error('Error generating equity curve data:', error);
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
    console.error('Error fetching trade notes:', error);
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
    console.error('Error adding trade note:', error);
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
    console.error('Error updating trade note:', error);
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
    console.error('Error deleting trade note:', error);
    throw error;
  }
}

// Calendar integration functions

// Function to get market events
export async function getMarketEvents(startDate: string, endDate: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('market_events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching market events:', error);
    return [];
  }
}

// Function to get economic calendar events
export async function getEconomicEvents(startDate: string, endDate: string, countries?: string[]): Promise<any[]> {
  try {
    let query = supabase
      .from('economic_events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    // Filter by countries if provided
    if (countries && countries.length > 0) {
      query = query.in('country', countries);
    }
    
    const { data, error } = await query.order('date', { ascending: true });

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching economic events:', error);
    return [];
  }
}

// Function to get user's custom events
export async function getCustomEvents(userId: string, startDate: string, endDate: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('custom_events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching custom events:', error);
    return [];
  }
}

// Function to add a custom event
export async function addCustomEvent(event: any): Promise<any> {
  try {
    // Generate a UUID if not provided
    if (!event.id) {
      event.id = crypto.randomUUID();
    }
    
    const { data, error } = await supabase
      .from('custom_events')
      .insert([event])
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding custom event:', error);
    throw error;
  }
}

// Function to update a custom event
export async function updateCustomEvent(event: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('custom_events')
      .update(event)
      .eq('id', event.id)
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating custom event:', error);
    throw error;
  }
}

// Function to delete a custom event
export async function deleteCustomEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('custom_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting custom event:', error);
    throw error;
  }
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
    console.error('Error fetching user tags:', error);
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
    console.error('Error fetching trade tags:', error);
    return [];
  }
} 