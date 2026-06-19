export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      economic_calendar_cache: {
        Row: {
          cached_at: string | null
          data: Json
          date_key: string
          id: string
        }
        Insert: {
          cached_at?: string | null
          data: Json
          date_key: string
          id?: string
        }
        Update: {
          cached_at?: string | null
          data?: Json
          date_key?: string
          id?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string | null
          duplicates_skipped: number | null
          errors: Json | null
          file_name: string
          id: string
          source: string
          total_parsed: number | null
          trades_imported: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duplicates_skipped?: number | null
          errors?: Json | null
          file_name: string
          id?: string
          source: string
          total_parsed?: number | null
          trades_imported?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duplicates_skipped?: number | null
          errors?: Json | null
          file_name?: string
          id?: string
          source?: string
          total_parsed?: number | null
          trades_imported?: number | null
          user_id?: string
        }
        Relationships: []
      }
      market_data_cache: {
        Row: {
          cached_at: string | null
          data: Json
          id: string
          symbol: string
        }
        Insert: {
          cached_at?: string | null
          data: Json
          id?: string
          symbol: string
        }
        Update: {
          cached_at?: string | null
          data?: Json
          id?: string
          symbol?: string
        }
        Relationships: []
      }
      open_positions: {
        Row: {
          created_at: string
          current_price: number | null
          entry_price: number
          entry_time: string
          id: string
          quantity: number
          symbol: string
          type: string
          unrealized_pnl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_price?: number | null
          entry_price: number
          entry_time: string
          id?: string
          quantity: number
          symbol: string
          type: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_price?: number | null
          entry_price?: number
          entry_time?: string
          id?: string
          quantity?: number
          symbol?: string
          type?: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          settings: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          settings?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          settings?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          trade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          trade_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          trade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_notes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string | null
          trade_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id?: string | null
          trade_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_tags_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          created_at: string | null
          emotional_state: string | null
          entry_price: number | null
          entry_time: string | null
          exit_price: number | null
          exit_time: string | null
          id: string
          lots: number | null
          mistakes: string[] | null
          notes: string | null
          pips: number | null
          profit_loss: number | null
          quantity: number | null
          r_multiple: number | null
          risk: number | null
          screenshot_url: string | null
          symbol: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          emotional_state?: string | null
          entry_price?: number | null
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lots?: number | null
          mistakes?: string[] | null
          notes?: string | null
          pips?: number | null
          profit_loss?: number | null
          quantity?: number | null
          r_multiple?: number | null
          risk?: number | null
          screenshot_url?: string | null
          symbol?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          emotional_state?: string | null
          entry_price?: number | null
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lots?: number | null
          mistakes?: string[] | null
          notes?: string | null
          pips?: number | null
          profit_loss?: number | null
          quantity?: number | null
          r_multiple?: number | null
          risk?: number | null
          screenshot_url?: string | null
          symbol?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_number: string
          balance: number | null
          connection_status: string | null
          connection_type: string | null
          created_at: string | null
          id: string
          last_sync: string | null
          name: string
          password: string | null
          platform: string | null
          server_name: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          balance?: number | null
          connection_status?: string | null
          connection_type?: string | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          name: string
          password?: string | null
          platform?: string | null
          server_name: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          balance?: number | null
          connection_status?: string | null
          connection_type?: string | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          name?: string
          password?: string | null
          platform?: string | null
          server_name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
