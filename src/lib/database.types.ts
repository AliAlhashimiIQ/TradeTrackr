export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          email: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          email: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          email?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          symbol: string
          type: 'Long' | 'Short'
          entry_price: number
          exit_price: number
          entry_time: string
          exit_time: string
          quantity: number
          profit_loss: number
          strategy: string | null
          screenshot_url: string | null
          notes: string | null
          emotional_state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          type: 'Long' | 'Short'
          entry_price: number
          exit_price: number
          entry_time: string
          exit_time: string
          quantity: number
          profit_loss: number
          strategy?: string | null
          screenshot_url?: string | null
          notes?: string | null
          emotional_state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          type?: 'Long' | 'Short'
          entry_price?: number
          exit_price?: number
          entry_time?: string
          exit_time?: string
          quantity?: number
          profit_loss?: number
          strategy?: string | null
          screenshot_url?: string | null
          notes?: string | null
          emotional_state?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      open_positions: {
        Row: {
          id: string
          user_id: string
          symbol: string
          type: 'Long' | 'Short'
          entry_price: number
          entry_time: string
          quantity: number
          current_price: number | null
          unrealized_pnl: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          type: 'Long' | 'Short'
          entry_price: number
          entry_time: string
          quantity: number
          current_price?: number | null
          unrealized_pnl?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          type?: 'Long' | 'Short'
          entry_price?: number
          entry_time?: string
          quantity?: number
          current_price?: number | null
          unrealized_pnl?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      trade_notes: {
        Row: {
          id: string
          trade_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trade_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trade_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 