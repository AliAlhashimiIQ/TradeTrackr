-- Create backtest_sessions table
CREATE TABLE IF NOT EXISTS public.backtest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  timeframe VARCHAR(50) NOT NULL,
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 10000.00,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 10000.00,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  current_index INT NOT NULL DEFAULT 100,
  active_trade JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create backtest_trades table
CREATE TABLE IF NOT EXISTS public.backtest_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.backtest_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('Long', 'Short')),
  entry_price DECIMAL(15, 5) NOT NULL,
  exit_price DECIMAL(15, 5) NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL DEFAULT 1.0,
  profit_loss DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  pips DECIMAL(10, 2),
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.backtest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist
DROP POLICY IF EXISTS "Users can manage their own backtest sessions" ON public.backtest_sessions;
DROP POLICY IF EXISTS "Users can manage their own backtest trades" ON public.backtest_trades;

-- Create policies
CREATE POLICY "Users can manage their own backtest sessions"
  ON public.backtest_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own backtest trades"
  ON public.backtest_trades
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Set up trigger for set_user_id on INSERT
CREATE OR REPLACE FUNCTION public.set_user_id_on_backtest()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_id_on_backtest_sessions_trg ON public.backtest_sessions;
CREATE TRIGGER set_user_id_on_backtest_sessions_trg
  BEFORE INSERT ON public.backtest_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id_on_backtest();

DROP TRIGGER IF EXISTS set_user_id_on_backtest_trades_trg ON public.backtest_trades;
CREATE TRIGGER set_user_id_on_backtest_trades_trg
  BEFORE INSERT ON public.backtest_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id_on_backtest();
