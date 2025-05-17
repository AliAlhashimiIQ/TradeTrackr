export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  type: 'Long' | 'Short';
  entry_price: number;
  exit_price: number;
  entry_time: string;
  exit_time: string;
  quantity: number;
  profit_loss: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  strategy?: string | null;
  screenshot_url?: string | null;
  screenshots?: File[];
  tags?: string[];
  risk?: number;
  r_multiple?: number;
  emotional_state?: string;
}

export interface TradeMetrics {
  total_pnl: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
}

export interface OpenPosition {
  id: string;
  user_id: string;
  symbol: string;
  type: 'Long' | 'Short';
  entry_price: number;
  entry_time: string;
  quantity: number;
  current_price?: number;
  unrealized_pnl?: number;
  created_at: string;
}

export interface ChartData {
  labels: string[];
  values: number[];
}

export interface TradeNote {
  id: string;
  trade_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// New interfaces for calendar integration

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  type: 'earnings' | 'dividend' | 'split' | 'ipo' | 'other';
  symbols: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface EconomicEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  country: string;
  impact: 'low' | 'medium' | 'high';
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface CustomEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  color?: string;
  tags?: string[];
  reminder?: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
} 