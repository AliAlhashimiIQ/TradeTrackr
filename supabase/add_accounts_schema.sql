-- 1. Create trading_accounts table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  server_name VARCHAR(255) NOT NULL,
  password TEXT, -- Encrypted or stored as investor password
  type VARCHAR(50) DEFAULT 'LIVE', -- LIVE or DEMO
  platform VARCHAR(50) DEFAULT 'MT5',
  balance DECIMAL(15, 2) DEFAULT 0.00,
  connection_status VARCHAR(50) DEFAULT 'DISCONNECTED', -- CONNECTED, DISCONNECTED, ERROR
  connection_type VARCHAR(50) DEFAULT 'API', -- API, EA, etc.
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add account_id to trades table (references trading_accounts)
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL;

-- 3. Enable Row Level Security (RLS) on the new table
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies for the new table
CREATE POLICY "Users can manage their own trading accounts"
  ON public.trading_accounts FOR ALL
  USING (auth.uid() = user_id);
