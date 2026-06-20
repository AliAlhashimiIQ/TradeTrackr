-- Supabase Baseline Database Schema for TradeTrackr

-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. FUNCTIONS & TRIGGERS ──────────────────────────────────────────────────

-- Automatically update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Automatically set user_id from auth.uid() on insert if not provided
CREATE OR REPLACE FUNCTION public.set_user_id_on_trades()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_user_id_on_open_positions()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_user_id_on_tags()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_user_id_on_trade_notes()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 2. TABLES & INDEXES ──────────────────────────────────────────────────────

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trading Accounts Table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  server_name VARCHAR(255) NOT NULL,
  password TEXT, -- Encrypted AES password
  type VARCHAR(50) DEFAULT 'LIVE',
  platform VARCHAR(50) DEFAULT 'MT5',
  balance DECIMAL(15, 2) DEFAULT 0.00,
  connection_status VARCHAR(50) DEFAULT 'DISCONNECTED',
  connection_type VARCHAR(50) DEFAULT 'API',
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT,
  type TEXT,
  entry_price NUMERIC,
  exit_price NUMERIC,
  entry_time TIMESTAMP WITH TIME ZONE,
  exit_time TIMESTAMP WITH TIME ZONE,
  quantity NUMERIC,
  profit_loss NUMERIC,
  screenshot_url TEXT,
  notes TEXT,
  emotional_state TEXT,
  risk NUMERIC,
  r_multiple NUMERIC,
  video_url TEXT,
  mistakes TEXT[] DEFAULT '{}'::text[],
  lots NUMERIC,
  pips NUMERIC,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  commission NUMERIC DEFAULT 0.00,
  swap NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade Notes Table
CREATE TABLE IF NOT EXISTS public.trade_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_tag_name UNIQUE (user_id, name)
);

-- Trade Tags Junction Table
CREATE TABLE IF NOT EXISTS public.trade_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_trade_tag UNIQUE (trade_id, tag_id)
);

-- Open Positions Table
CREATE TABLE IF NOT EXISTS public.open_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  quantity NUMERIC NOT NULL,
  current_price NUMERIC,
  unrealized_pnl NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Import History Table
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  source TEXT NOT NULL,
  total_parsed INTEGER DEFAULT 0,
  trades_imported INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Economic Calendar Cache Table
CREATE TABLE IF NOT EXISTS public.economic_calendar_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Data Cache Table
CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ── 3. WIRE TRIGGERS ─────────────────────────────────────────────────────────

-- Trigger for profile creation on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for default user_id settings
CREATE TRIGGER set_user_id_on_trades_trigger
  BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_trades();

CREATE TRIGGER set_user_id_on_open_positions_trigger
  BEFORE INSERT ON public.open_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_open_positions();

CREATE TRIGGER set_user_id_on_tags_trigger
  BEFORE INSERT ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_tags();

CREATE TRIGGER set_user_id_on_trade_notes_trigger
  BEFORE INSERT ON public.trade_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_trade_notes();

-- Trigger for updating updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_notes_updated_at
  BEFORE UPDATE ON public.trade_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_open_positions_updated_at
  BEFORE UPDATE ON public.open_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── 4. ROW LEVEL SECURITY (RLS) & POLICIES ────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trading Accounts Policies
CREATE POLICY "Users can manage their own trading accounts"
  ON public.trading_accounts FOR ALL USING (auth.uid() = user_id);

-- Trades Policies
CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON public.trades FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- Trade Notes Policies
CREATE POLICY "Users can view their own trade notes"
  ON public.trade_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade notes"
  ON public.trade_notes FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own trade notes"
  ON public.trade_notes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade notes"
  ON public.trade_notes FOR DELETE USING (auth.uid() = user_id);

-- Tags Policies
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Trade Tags Policies (Owner-bound only)
CREATE POLICY "Users can view tags on their own trades"
  ON public.trade_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_tags.trade_id AND trades.user_id = auth.uid()));

CREATE POLICY "Users can add tags to their own trades"
  ON public.trade_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_tags.trade_id AND trades.user_id = auth.uid()));

CREATE POLICY "Users can delete their own trade tags"
  ON public.trade_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.trades WHERE trades.id = trade_tags.trade_id AND trades.user_id = auth.uid()));

-- Open Positions Policies
CREATE POLICY "Users can view their own positions"
  ON public.open_positions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own positions"
  ON public.open_positions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own positions"
  ON public.open_positions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own positions"
  ON public.open_positions FOR DELETE USING (auth.uid() = user_id);

-- Import History Policies
CREATE POLICY "Users own their import history"
  ON public.import_history FOR ALL USING (auth.uid() = user_id);

-- Cache Tables Policies (Public read, admin write)
CREATE POLICY "Anyone can view economic calendar data"
  ON public.economic_calendar_cache FOR SELECT USING (true);

CREATE POLICY "Anyone can view market data"
  ON public.market_data_cache FOR SELECT USING (true);


-- ── 5. STORAGE BUCKETS & STORAGE POLICIES ─────────────────────────────────────

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false),
       ('trade-screenshots', 'trade-screenshots', false),
       ('trade-videos', 'trade-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars storage policies
CREATE POLICY "Allow users to access their own avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trade screenshots storage policies
CREATE POLICY "Allow users to access their own screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to upload their own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to update their own screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trade videos storage policies
CREATE POLICY "Allow users to access their own videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to upload their own videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trade-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to update their own videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'trade-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'trade-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
