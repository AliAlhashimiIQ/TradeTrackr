# Refactoring Plan — TradeTrackr

This document serves as the step-by-step sequential execution plan for refactoring TradeTrackr. The tasks are ordered by priority and impact.

---

## Phase 1 — Critical Fixes & Security
### 1.1 Asynchronous Account Syncing (Vercel Timeout Fix)
* **Goal**: Prevent Vercel `504 Gateway Timeout` errors on sync requests.
* **File Execution Order**:
  1. [MODIFY] [sync/route.ts](file:///c:/Users/PC/Desktop/finaltry/src/app/api/accounts/sync/route.ts)
     - Reduce the inline polling loop duration to 2 iterations (max 3 seconds).
     - If the MetaApi connection takes longer, update the account `connection_status` to `DEPLOYING` and return `success: true` with status `DEPLOYING`.
  2. [NEW] [status/route.ts](file:///c:/Users/PC/Desktop/finaltry/src/app/api/accounts/sync/status/route.ts)
     - Create an endpoint `/api/accounts/sync/status?accountId=...` to query connection status and balance from the database.
  3. [MODIFY] [accounts/page.tsx](file:///c:/Users/PC/Desktop/finaltry/src/app/accounts/page.tsx)
     - Refactor frontend `handleSyncAccount` and `handleSyncAll` to poll the status endpoint if the API returns a `DEPLOYING` status, updating the UI spinner dynamically.

### 1.2 RLS Audit Enforcement
* **Goal**: Validate RLS owner policies.
* **File Execution Order**:
  1. [MODIFY] [schema.sql](file:///c:/Users/PC/Desktop/finaltry/supabase/schema.sql)
     - Verify constraints on all table policies.

---

## Phase 2 — Architecture Cleanup
### 2.1 Context Optimization (Completed)
* **Goal**: Prevent context-triggered re-render loops on window focus.
* **File Execution Order**:
  1. [MODIFY] [AccountProvider.tsx](file:///c:/Users/PC/Desktop/finaltry/src/providers/AccountProvider.tsx) (Completed)
  2. [MODIFY] [SettingsProvider.tsx](file:///c:/Users/PC/Desktop/finaltry/src/providers/SettingsProvider.tsx) (Completed)
  3. [MODIFY] [useStreak.ts](file:///c:/Users/PC/Desktop/finaltry/src/hooks/useStreak.ts) (Completed)
  4. [MODIFY] [AuthenticatedLayout.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/layout/AuthenticatedLayout.tsx) (Completed)
  5. [MODIFY] [accounts/page.tsx](file:///c:/Users/PC/Desktop/finaltry/src/app/accounts/page.tsx) (Completed)
  6. [MODIFY] [dashboard/page.tsx](file:///c:/Users/PC/Desktop/finaltry/src/app/dashboard/page.tsx) (Completed)
  7. [MODIFY] [calendar/page.tsx](file:///c:/Users/PC/Desktop/finaltry/src/app/calendar/page.tsx) (Completed)
  8. [MODIFY] [analytics/page.tsx](file:///c:/Users/PC/Desktop/finaltry/src/app/analytics/page.tsx) (Completed)
  9. [MODIFY] [playbook/page.tsx](file:///c:/Users/PC/Desktop/finaltry/src/app/playbook/page.tsx) (Completed)
  10. [MODIFY] [EnhancedTradeForm.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/trades/EnhancedTradeForm.tsx) (Completed)

### 2.2 API Layer Abstraction
* **Goal**: Decouple database client invocations from UI logic.
* **File Execution Order**:
  1. [NEW] `src/lib/services/tradeService.ts`
     - Create service helpers to wrap DB interactions.
  2. [MODIFY] [tradingApi.ts](file:///c:/Users/PC/Desktop/finaltry/src/lib/tradingApi.ts)
     - Migrate direct calls to repository methods.

---

## Phase 3 — Component Refactoring
### 3.1 Embed Video Player in Trade Details
* **Goal**: Enable video play reviews for logged trades.
* **File Execution Order**:
  1. [MODIFY] [media/route.ts](file:///c:/Users/PC/Desktop/finaltry/src/app/api/media/route.ts)
     - Ensure the proxy resolves `trade-videos` signed URLs properly.
  2. [MODIFY] [TradeDetail.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/trades/TradeDetail.tsx)
     - Check if `trade.video_url` is present, resolve it through media route proxy, and render a high-aesthetic video player.

### 3.2 Modularize EnhancedTradeForm
* **Goal**: Clean up monolithic 1,000+ line forms.
* **File Execution Order**:
  1. [NEW] `src/components/trades/form/FormCalculators.tsx`
  2. [NEW] `src/components/trades/form/FormTags.tsx`
  3. [MODIFY] [EnhancedTradeForm.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/trades/EnhancedTradeForm.tsx)
     - Import custom sub-modules and reduce direct LOC weight.

---

## Phase 4 — Performance Optimization
### 4.1 Fine-Tune SWR Settings
* **Goal**: Lower background refetch counts.
* **File Execution Order**:
  1. [MODIFY] [useTrades.ts](file:///c:/Users/PC/Desktop/finaltry/src/hooks/useTrades.ts)
     - Set specific deduping intervals and configure direct SWR mutators.

---

## Phase 5 — UI & UX Enhancements
### 5.1 Colorblind Theme Presets
* **Goal**: Support accessible layouts.
* **File Execution Order**:
  1. [MODIFY] [colorSystem.ts](file:///c:/Users/PC/Desktop/finaltry/src/lib/colorSystem.ts)
     - Add alternative color keys.
  2. [MODIFY] [globals.css](file:///c:/Users/PC/Desktop/finaltry/src/app/globals.css)
     - Incorporate CSS class overrides for the colorblind theme.

---

## Phase 6 — Testing Suite Setup
### 6.1 Math Unit Testing
* **Goal**: Confirm symbol multiplier formulas are secure.
* **File Execution Order**:
  1. [NEW] `vitest.config.ts`
     - Initialize testing configurations.
  2. [NEW] `src/test/multipliers.test.ts`
     - Test lot contract sizing logic.
