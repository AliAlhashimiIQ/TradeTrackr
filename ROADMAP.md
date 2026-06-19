# TradeTrackr Implementation Roadmap & Development Checklist
## Sequential Development Plan to Outperform TradeZella and TradesViz

This document details the exact engineering tasks, database migrations, file locations, and UX modifications needed to implement the recommendations from the Product & Codebase Audit. 

---

## 📋 Table of Phases
* [Phase 1: Database Migration & Core Data Fixes](#phase-1-database-migration--core-data-fix) (High Priority)
* [Phase 2: Security & Authentication Hardening](#phase-2-security--authentication-hardening) (High Priority)
* [Phase 3: Code Refactoring & Performance Optimization](#phase-3-code-refactoring--performance-optimization) (Medium Priority)
* [Phase 4: Trader Psychology & Behavioral Engine](#phase-4-trader-psychology--behavioral-engine) (Medium Priority)
* [Phase 5: Competitor Killer Features (The What-If Engine)](#phase-5-competitor-killer-features-the-what-if-engine) (Medium Priority)
* [Phase 6: Advanced Analytics & AI Coaching Engine](#phase-6-advanced-analytics--ai-coaching-engine) (Low Priority)
* [Phase 7: Broker Auto-Sync & Real-Time Events](#phase-7-broker-auto-sync--real-time-events) (Low Priority)

---

## Phase 1: Database Migration & Core Data Fix

Goal: Resolve the hardcoded initial capital bug and stop storing structured metrics inside the text notes field.

### [x] 1.1 Decouple Capital Hardcoding
* **Description**: Remove the hardcoded `$10,000` starting capital from equity curve charts and drawdown calculators. Link these calculations to the user's actual account balance or onboarding balance.
* **Files to Modify**:
  * [tradeMetrics.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/tradeMetrics.ts#L213) (functions `calculateMaxDrawdown` and `generateEquityCurveData` should accept an `initialCapital` parameter).
  * [useDashboardData.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/hooks/useDashboardData.ts#L88) (fetch the account's starting balance from `trading_accounts` table and pass it to metric functions).
  * [page.tsx](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/dashboard/page.tsx) (update the props passed to metrics widgets).

### [x] 1.2 Database Migration for Risk Parameters
* **Description**: Execute a SQL migration in Supabase to add columns for `stop_loss`, `take_profit`, `commission`, and `swap` directly in the `trades` table.
* **SQL Script to Run**:
  ```sql
  ALTER TABLE public.trades 
  ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS take_profit DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS commission DECIMAL(18, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS swap DECIMAL(18, 2) DEFAULT 0.00;
  ```

### [x] 1.3 Migrate Legacy Notes Data to Columns
* **Description**: Write a node utility script to parse existing trades with serialized notes `[SL=X;TP=Y;Comm=Z;Swap=W]`, extract the values, populate the new database columns, and clean the notes text.
* **Files to Create**:
  * `scripts/migrate-notes-metadata.js` (can be executed via terminal command).
* **Expected Output**: Clean notes columns + formatted text comments.

### [x] 1.4 Refactor Codebase to use the New Columns
* **Description**: Update the trade forms, list pages, and API calls to read/write directly to the new schema columns instead of parsing bracket strings.
* **Files to Modify**:
  * [types.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/types.ts) (ensure optional types are non-optional database fields).
  * [tradingApi.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/tradingApi.ts) (update `addTrade` and `updateTrade` insertions).
  * [trades/page.tsx](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/trades/page.tsx) (remove legacy `parseMetadata` and `serializeMetadata` functions).

---

## Phase 2: Security & Authentication Hardening

Goal: Eliminate credentials leaks, secure user authorization paths, and encrypt broker credentials.

### [x] 2.1 AES-256 Encryption for Trading Account Passwords
* **Description**: Encrypt MetaTrader account passwords before storing them in the database. Decrypt them on-the-fly only when calling the MetaApi endpoint.
* **Files to Modify**:
  * [tradingApi.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/tradingApi.ts) (encrypt password parameter on account insert/update).
  * [sync/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/accounts/sync/route.ts) (decrypt password when calling the MetaApi cloud provisioning endpoint).
  * Create helper file `src/lib/crypto.ts`.

### [x] 2.2 Remove Credential Leaks from Server Logs
* **Description**: Strip the `/api/accounts/sync` API route of any console logging that prints MetaApi auth tokens.
* **Files to Modify**:
  * [sync/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/accounts/sync/route.ts#L91-L96) (delete `console.log` lines printing token slices and details).

### [x] 2.3 Secure API Routes (Remove Service Role Bypass)
* **Description**: Ensure that database writes inside API endpoints are executed using the user's Supabase token or verified session object rather than a server-side bypass.
* **Files to Modify**:
  * [upload/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/trades/upload/route.ts#L64) (re-instantiate the client using headers authorization token).
  * [sync/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/accounts/sync/route.ts#L7) (adjust permissions bounds).

### [ ] 2.4 Add Payload Schema Validation (Zod)
* **Description**: Standardize input validations for trade insertions using Zod to block invalid JSON properties or SQL injections.
* **Files to Create**:
  * `src/lib/validation.ts` (define Zod schemas for Trade, Profile Settings, and Account Sync).
  * Update API routes to parse request payloads against schemas.

---

## Phase 3: Code Refactoring & Performance Optimization

Goal: Shrink loading times, lower client-side CPU load, and refactor monolithic files.

### [x] 3.1 Refactor Monolithic `trades/page.tsx`
* **Description**: Split the monolithic 3,250-line file into distinct components inside a folder structure.
* **Proposed Structure**:
  * `src/components/trades/TradesTable.tsx` (renders rows, handles resizing, row click).
  * `src/components/trades/InlineTagPopover.tsx` (handles inline tags/mistakes changes).
  * `src/components/trades/TradesHeader.tsx` (renders stats pills, view toggles).
  * `src/components/trades/TradesFilters.tsx` (renders filters bar).

### [x] 3.2 Implement Server-Side Metrics Calculations
* **Description**: Reduce browser CPU freezing by delegating equity curve computations and risk calculations to database functions (RPC) or backend API routes instead of running them on the client thread.
* **SQL Script (RPC Example)**:
  ```sql
  CREATE OR REPLACE FUNCTION get_user_equity_curve(p_user_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
  RETURNS TABLE (date DATE, pnl NUMERIC) AS $$ ... $$ LANGUAGE plpgsql;
  ```
* **Files to Modify**:
  * [useDashboardData.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/hooks/useDashboardData.ts) (call database RPC instead of doing loop calculations).

### [x] 3.3 Add Database Composite Indexes
* **Description**: Optimize database lookup times for active users by adding PostgreSQL indexes on foreign keys and commonly filtered fields.
* **SQL Script**:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_trades_user_id_entry_time ON public.trades(user_id, entry_time DESC);
  CREATE INDEX IF NOT EXISTS idx_trades_account_id ON public.trades(account_id);
  ```

---

## Phase 4: Trader Psychology & Behavioral Engine

Goal: Gamify execution rules and provide visual psychology warning indicators.

### [ ] 4.1 Live Revenge & Overtrading Detection
* **Description**: Implement a check that triggers alerts when a trader enters a position shortly after a losing trade, or exceeds their maximum daily trade count.
* **Files to Modify**:
  * [EnhancedTradeForm.tsx](file:///c:/Users/ali/Desktop/TradeTrackr/src/components/trades/EnhancedTradeForm.tsx) (warn user before submit if a revenge trade pattern is detected).
  * [dashboard/page.tsx](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/dashboard/page.tsx) (render a "Behavior Alert Badge" on the dashboard).

### [ ] 4.2 Mindset Checklist Integration
* **Description**: Create a pre-flight Checklist modal that displays when logging a trade (e.g. "I followed my plan", "Market trend aligned").
* **Files to Create**:
  * `src/components/trades/PreTradeChecklist.tsx`
  * Add `checklist_score` (numeric) and `checklist_items` (jsonb) to the database `trades` schema.

---

## Phase 5: Competitor Killer Features (The What-If Engine)

Goal: Implement the "What-If Simulator" to let users interactively measure the exact cost of their bad habits.

### [ ] 5.1 Build the "What-If" Calculator
* **Description**: Code the mathematics that subtracts trades tagged with mistakes (e.g. FOMO, late entry) and overlays a parallel "disciplined" equity curve on the dashboard chart.
* **Files to Modify**:
  * [tradeMetrics.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/tradeMetrics.ts) (add functions to recalculate metrics by omitting specific mistake tags).
  * [dashboard/page.tsx](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/dashboard/page.tsx) (add toggle switches and modify the `EquityAreaChart` to overlay the simulated curve).

### [ ] 5.2 Multi-Asset Multipliers & Position Sizing
* **Description**: Replace the hardcoded `quantity = lots * 100000` volume calculation. Auto-detect instrument classes (Futures, Gold, Cryptos, Indices) and apply their correct broker multipliers.
* **Files to Create**:
  * `src/lib/instrumentMultipliers.ts` (contains regex matching tables for symbols).
* **Files to Modify**:
  * [importParsers.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/importParsers.ts) (apply symbolic volume multiplier logic).

---

## Phase 6: Advanced Analytics & AI Coaching Engine

Goal: Transition mock files to fully active, cost-efficient, and professional coaching models.

### [ ] 6.1 Upgrade AI Model to GPT-4o-Mini
* **Description**: Swap out outdated, expensive `gpt-3.5-turbo` endpoints in API routes for `gpt-4o-mini`, providing better JSON output handling and a 60% cost reduction.
* **Files to Modify**:
  * [analyze/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/ai/analyze/route.ts#L50)
  * [chat/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/ai/chat/route.ts#L51)

### [ ] 6.2 Activate OCR Screenshot Analyzer
* **Description**: Replace the static mock analyzer in `aiService.ts` with a real call to OpenAI Vision or similar OCR service to read entry, SL, and TP prices directly from chart images.
* **Files to Modify**:
  * [aiService.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/lib/ai/aiService.ts#L534) (hook up `analyzeTradingScreenshot` to an API route).
  * Create `src/app/api/ai/ocr/route.ts` using OpenAI's image analysis parameters.

### [ ] 6.3 Weekly Coach Report Generation
* **Description**: Trigger an automated, personalized review of the user's trading patterns every Friday at market close.
* **Files to Create**:
  * `src/app/api/ai/weekly-review/route.ts` (calls GPT model with structured inputs).
  * Connect to Cron scheduling.

---

## Phase 7: Broker Auto-Sync & Real-Time Events

Goal: Implement calendar database engines and real-time syncing.

### [ ] 7.1 Deploy Custom Calendar Events Schema
* **Description**: Add the missing database tables for `market_events` and `custom_events` so users can log pre-market calendar events.
* **SQL Script**:
  ```sql
  CREATE TABLE public.custom_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    color VARCHAR(50) DEFAULT '#3b82f6',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can manage their own calendar events" ON public.custom_events FOR ALL USING (auth.uid() = user_id);
  ```

### [x] 7.2 Remove the Intelligent Mock Sync Engine
* **Description**: Clean the syncing API route of code that inserts mock data when MetaApi credentials are missing. Replace this with clean, supportive UX error notifications instructing the user how to configure their account.
* **Files to Modify**:
  * [sync/route.ts](file:///c:/Users/ali/Desktop/TradeTrackr/src/app/api/accounts/sync/route.ts#L216) (delete mock generation loop).

---

## 📈 Tracking Progress
* Mark items with `[x]` as they are completed.
* Keep this roadmap updated at the start and completion of each development task.
