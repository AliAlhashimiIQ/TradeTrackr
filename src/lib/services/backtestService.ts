import { supabase } from '../supabaseClient';
import { BacktestingSession, BacktestTrade } from '../types';

export async function getBacktestSessions(userId: string): Promise<BacktestingSession[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('backtest_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as BacktestingSession[];
  } catch (error) {
    console.error('Error fetching backtest sessions:', error);
    throw error;
  }
}

export async function createBacktestSession(
  session: Omit<BacktestingSession, 'id' | 'created_at' | 'updated_at'>
): Promise<BacktestingSession> {
  try {
    const { data, error } = await (supabase as any)
      .from('backtest_sessions')
      .insert([session])
      .select()
      .single();

    if (error) throw error;
    return data as BacktestingSession;
  } catch (error) {
    console.error('Error creating backtest session:', error);
    throw error;
  }
}

export async function updateSessionState(
  id: string,
  currentIndex: number,
  currentBalance: number,
  activeTrade: BacktestingSession['active_trade']
): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('backtest_sessions')
      .update({
        current_index: currentIndex,
        current_balance: currentBalance,
        active_trade: activeTrade,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating backtest session state:', error);
    throw error;
  }
}

export async function deleteBacktestSession(id: string): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('backtest_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting backtest session:', error);
    throw error;
  }
}

export async function getBacktestTrades(sessionId: string): Promise<BacktestTrade[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('backtest_trades')
      .select('*')
      .eq('session_id', sessionId)
      .order('entry_time', { ascending: true });

    if (error) throw error;
    return (data || []) as BacktestTrade[];
  } catch (error) {
    console.error('Error fetching backtest trades:', error);
    throw error;
  }
}

export async function addBacktestTrade(
  trade: Omit<BacktestTrade, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<BacktestTrade> {
  try {
    const { data, error } = await (supabase as any)
      .from('backtest_trades')
      .insert([trade])
      .select()
      .single();

    if (error) throw error;
    return data as BacktestTrade;
  } catch (error) {
    console.error('Error adding backtest trade:', error);
    throw error;
  }
}

export async function deleteBacktestTrade(id: string): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('backtest_trades')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting backtest trade:', error);
    throw error;
  }
}

export async function getBacktestSession(id: string): Promise<BacktestingSession> {
  try {
    const { data, error } = await (supabase as any)
      .from('backtest_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as BacktestingSession;
  } catch (error) {
    console.error('Error fetching backtest session:', error);
    throw error;
  }
}
