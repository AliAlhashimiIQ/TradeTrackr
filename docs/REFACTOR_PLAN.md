# Refactoring Plan — TradeTrackr

This refactoring plan organizes proposed codebase changes into logical phases.

---

## Phase 1 — Critical Fixes & Security
### 1.1 Asynchronous Account Syncing (Timeout Fix)
* **Goal**: Prevent Vercel `504 Gateway Timeout` errors on sync requests.
* **Steps**:
  1. Add an asynchronous worker pattern to [sync/route.ts](file:///c:/Users/PC/Desktop/finaltry/src/app/api/accounts/sync/route.ts).
  2. Immediately return a `202 Accepted` status along with a unique `sync_job_id`.
  3. Deploy sync execution to an background worker or use an edge function that updates the `trading_accounts` table.
  4. Create a status checker route `/api/accounts/sync/status/[id]`.

### 1.2 RLS Audit Enforcement
* **Goal**: Ensure no public roles can bypass RLS on junction tables.
* **Steps**:
  1. Verify RLS constraints on all tables in `supabase/schema.sql`.
  2. Confirm `trade_tags` policies are strictly owner-bound via subqueries.

---

## Phase 2 — Architecture Cleanup
### 2.1 Context Optimization
* **Goal**: Prevent context-triggered re-render loops when changing active windows.
* **Steps**:
  1. Verify all `useEffect` dependency arrays that listen to `user` (reference) and change them to stable string primitives like `user?.id`.
  2. Implement deep comparison on selection updates in `AccountProvider.tsx` to prevent cascading array pointer changes.

### 2.2 API Layer Abstraction
* **Goal**: Decouple database clients from page routes.
* **Steps**:
  1. Move inline database calls from route files into dedicated service modules (e.g., `src/lib/services/tradeService.ts`).

---

## Phase 3 — Component Refactoring
### 3.1 Embed Video Player in Trade Details
* **Goal**: Implement visual video review for logged trades.
* **Steps**:
  1. Add a conditional check for `trade.video_url` inside [TradeDetail.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/trades/TradeDetail.tsx).
  2. Build a high-aesthetic video preview card with overlay play buttons.
  3. Load the video via the authenticated `/api/media` proxy using a short-lived signed URL.

### 3.2 Modularize EnhancedTradeForm
* **Goal**: Shrink the massive `EnhancedTradeForm.tsx` (over 1,000 lines).
* **Steps**:
  1. Extract form fields like symbol inputs, price calculators, and tag selectors into modular components under `src/components/trades/form/`.

---

## Phase 4 — Performance Optimization
### 4.1 Fine-Tune SWR Settings
* **Goal**: Stop browser thread freezing on large tables.
* **Steps**:
  1. Configure `dedupingInterval` on `useTrades` to `15000` to prevent redundant fetches.
  2. Use SWR mutating helpers after write actions instead of reloading entire pages.

### 4.2 Web Worker Calculations
* **Goal**: Optimize off-thread math.
* **Steps**:
  1. Validate that the worker file `analytics.worker.ts` correctly processes O(N) loops for heatmaps and performance distribution curves.

---

## Phase 5 — UI & UX Enhancements
### 5.1 Colorblind Theme Presets
* **Goal**: Support accessible colors.
* **Steps**:
  1. Wire the `colorblindMode` context variable into global layout styles.
  2. Replace standard green/red indicators with high-contrast blue/orange variants.

---

## Phase 6 — Testing Suite Setup
### 6.1 Math Unit Testing
* **Goal**: Ensure contract sizing logic is error-free.
* **Steps**:
  1. Set up Jest or Vitest in the workspace.
  2. Write unit tests for contract sizing calculation logic, ensuring `BTCUSD`, `XAUUSD`, and forex pairs scale correctly.
