# TradeTrackr Full Codebase Audit & Launch Roadmap

This document serves as the single source of truth for TradeTrackr from codebase audit through launch. Follow this roadmap sequentially. Mark checkboxes as tasks are resolved.

## Status Dashboard

| Phase | Item Count | % Complete | Go/No-Go Readiness |
| :--- | :--- | :--- | :--- |
| **Phase 0 — Current State & Summary** | — | — | ⚠️ **No-Go** |
| **Phase 1 — Critical Bugs & Security** | 9 | 100% (9/9) | 🟢 **Go** |
| **Phase 2 — Performance & Architecture** | 4 | 50% (2/4) | 🟡 **Needs Pre-Launch Refactor** |
| **Phase 3 — UI/UX, Accessibility, Mobile** | 5 | 20% (1/5) | 🟡 **Needs Polish** |
| **Phase 4 — Feature Gap vs Competitors** | 1 | 0% (0/1) | 🟡 **Gap to Competitors is Wide** |
| **Phase 5 — Retention & Engagement** | 3 | 0% (0/3) | 🔴 **Major Risk to LTV** |
| **Phase 6 — Monetization & Billing** | 3 | 0% (0/3) | 🔴 **Incomplete Core Business Engine** |
| **Phase 7 — Code Quality & Maintainability** | 3 | 33% (1/3) | 🟡 **Decent Foundation** |
| **Phase 8 — Pre-Launch Go/No-Go Checklist** | 10 | 10% (1/10) | 🔴 **Not Ready for Production** |
| **Phase 9 — Post-Launch Backlog** | 5 | 0% (0/5) | — |

**Overall Launch Verdict**: 🔴 **NO-GO**
*TradeTrackr has a beautiful, responsive front-end and a fast caching engine (SWR), but has critical math calculation errors on manual Gold/Crypto logs, exposes cryptographic secrets on the client bundle, lacks database RLS migration documents, and has no subscription billing integration.*

---

## Phase 0 — Executive Summary & Current State Snapshot

TradeTrackr is a modern, high-aesthetic trading journal and analytics dashboard tailored to funded and retail traders. It includes prop firm challenge progress indicators, calendar P&L metrics, mistake tracking, and basic AI-powered pattern assessments.

### Tech Stack Snapshot
* **Frontend**: Next.js 14.2.30 (App Router), React 18, SWR (v2.3.3) for caching.
* **Styling**: Tailwind CSS, Vanilla CSS (`src/app/globals.css`).
* **Database & Auth**: Supabase PostgreSQL, `@supabase/supabase-js` (v2.39.3), `@supabase/auth-helpers-nextjs` (v0.10.0).
* **Charts/Visuals**: Recharts, Chart.js, `@tremor/react`.
* **Deployment & Hosting**: Vercel.
* **Payments/Billing**: None. (Completely missing from the codebase).

### Top 5 Risks to Launch (Ranked)
1. **Gold & Crypto Lot Math Calculation Crash (Critical)**: manual inputs for Gold (`XAUUSD`) or Crypto (`BTCUSD`, `ETHUSD`) apply the standard 100k contract lot multiplier. A simple 1.0-lot trade on gold registers a million-dollar profit/loss inside `EnhancedTradeForm.tsx` and writes corrupted values to the database.
2. **Exposed Password Cryptographic Key (Critical)**: `NEXT_PUBLIC_ENCRYPTION_KEY` is checked client-side in `crypto.ts` with a hardcoded fallback string. This compiles the secret key directly into the client JS bundle, making it trivial to decrypt MetaTrader broker credentials stored in the DB.
3. **Calendar Key Exposed to Browser (High)**: `economicCalendarApi.ts` directly requests and appends `NEXT_PUBLIC_TRADING_ECONOMICS_API_KEY` inside client-side fetch calls, exposing third-party API keys in browser network traffic.
4. **Missing Database Schema File (High)**: `SUPABASE_SETUP.md` instructs developers to run `supabase/schema.sql`, but this file does not exist in the repository. No baseline policies or tables are documented, creating high security risk that RLS is missing on trades.
5. **No Billing Engine (High)**: Pricing tiers are documented on paper, but there is zero Stripe webhook, API, or proration code in the repository. The application cannot charge users for subscriptions.

### Top 5 Strengths to Protect
1. **Liquid Glass Aesthetic**: The glassmorphic cards and dark-mode neon accent palette make the UI look premium.
2. **Dynamic Chart Splitting**: Chart modules are loaded via `next/dynamic` with `ssr: false`, keeping route transitions fast.
3. **Streak & Metric Caching**: Global SWR implementation caches metrics and trades locally, preventing Supabase waterfalls.
4. **Prop Firm Target Calculator**: Challenge presets and real-time drawdown logic in `propFirms.ts` are robust.
5. **Virtualization Ready**: Server-side pagination is already implemented at the DB layer via `getPagedTrades`.

### Quantitative Score
* **Total Critical**: 3
* **Total High**: 4
* **Total Medium**: 5
* **Total Low**: 4
* **Final App Security Score**: **35 / 100** (RLS bypass on trade_tags, secrets exposed, public media buckets)
* **Final App Performance Score**: **82 / 100** (Cached SWR, Dynamic code split, paginated lists)

---

## Phase 1 — Critical Bugs & Security

- [x] **[CRITICAL]** Exposed Client-Side Password Decryption Key — `src/lib/crypto.ts:3`
  - **Current behavior**: Cryptographic utility uses `process.env.NEXT_PUBLIC_ENCRYPTION_KEY` or a hardcoded fallback to derive the AES key.
  - **Expected/desired behavior**: Encryption and decryption of password credentials must only happen on the server side using a secure server-only environment variable (`DB_ENCRYPTION_KEY`). The decryption helper must never be imported or run on the client.
  - **Why it matters**: A hacker inspecting browser sources can extract the `NEXT_PUBLIC_` key or use the hardcoded fallback string to decrypt other users' broker passwords stored in the database.
  - **Fix**: Move the encrypt/decrypt password operations to a dedicated API route or server actions. Rename `NEXT_PUBLIC_ENCRYPTION_KEY` to `DB_ENCRYPTION_KEY` and remove the client-side code import from `crypto.ts`.
  - **Effort**: S
  - **Status**: Completed

- [x] **[CRITICAL]** Permissive RLS Policy on trade_tags table — `gfodubbocdhjckgiualw (TradeTrackr1)`
  - **Current behavior**: The `trade_tags` table has a policy `"Users can manage their trade tags"` enabled for the `public` role and `ALL` commands with a check expression of `true`.
  - **Expected/desired behavior**: Operations on the junction table `trade_tags` must verify that the user owns the corresponding `trade_id` using a subquery (e.g. checking `user_id = auth.uid()` on the related trade row).
  - **Why it matters**: In PostgreSQL, RLS policies are evaluated with logical `OR`. The presence of a `true` policy for all commands lets any user select, insert, or delete any trade tag mapping in the system, bypassing all other secure policies.
  - **Fix**: Remove the `"Users can manage their trade tags"` policy or restrict it to `service_role` only. Make sure only owner-bound policies are active.
  - **Effort**: S
  - **Status**: Completed

- [x] **[CRITICAL]** Gold & Crypto Multiplier Hardcoding — `src/components/trades/EnhancedTradeForm.tsx:142`, `src/components/trades/EnhancedTradeForm.tsx:219`
  - **Current behavior**: Manual entries for any 6-letter asset (e.g. `XAUUSD`, `BTCUSD`) are classified as Forex and multiply pnl by `lots * 100,000`.
  - **Expected/desired behavior**: PnL calculations must scale volume multipliers according to the asset class (Forex = 100,000, Gold = 100, Bitcoin = 1, Indices = contract multiplier).
  - **Why it matters**: A trader logging a gold trade of 1 lot will see PnL inflated by 1,000x, corrupting all account equity curves, drawdown gauges, and win rates.
  - **Fix**: Create an asset classifier helper `src/lib/instrumentMultipliers.ts` mapping symbols to multipliers. Query this mapping when entering trades manually or importing.
  - **Effort**: M
  - **Status**: Completed

- [x] **[HIGH]** Log Leaks of MetaApi Token — `src/app/api/accounts/sync/route.ts:142`
  - **Current behavior**: Sync route previously logged partial token strings (`metaApiToken?.substring(0, 20)`) to stdout logs.
  - **Expected/desired behavior**: Tokens and secret keys must never write to stdout or diagnostic logs.
  - **Why it matters**: Log monitoring platforms or server access logs can leak master tokens, compromising user MetaApi cloud instances.
  - **Fix**: Removed the debug logs printing token slices.
  - **Effort**: S
  - **Status**: Completed

- [x] **[HIGH]** Exposing Trading Economics API Key in Browser — `src/lib/economicCalendarApi.ts:83`
  - **Current behavior**: Fetches calendar details on the client side using `process.env.NEXT_PUBLIC_TRADING_ECONOMICS_API_KEY` and passes it in the URL string `client=API_KEY`.
  - **Expected/desired behavior**: Client should query a Next.js server API endpoint, which appends the secret API key and proxies the request to Trading Economics securely.
  - **Why it matters**: The third-party API key is fully visible to anyone inspecting browser network calls, exposing the developers to bills and rate limit exhaustions.
  - **Fix**: Create `/api/calendar/route.ts` as a proxy, remove the `NEXT_PUBLIC_` prefix from the key, and point client calls to the proxy route.
  - **Effort**: S
  - **Status**: Completed

- [x] **[HIGH]** Missing Schema SQL File and baseline database configuration — `SUPABASE_SETUP.md:27`
  - **Current behavior**: Guide tells the user to run SQL from `supabase/schema.sql`, but the file is missing from the repository.
  - **Expected/desired behavior**: A structured `schema.sql` must be present, establishing tables, triggers, and Row Level Security (RLS) policies.
  - **Why it matters**: A developer setting up the app has to guess the database schema or run without RLS, leading to potential data exposure.
  - **Fix**: Generate and commit `supabase/schema.sql` directly reflecting the live database structures.
  - **Effort**: M
  - **Status**: Completed

- [x] **[HIGH]** Public Unauthenticated Trade Video Bucket — `src/app/api/trades/upload/route.ts:88`
  - **Current behavior**: Trade videos are uploaded to `trade-videos` bucket and access is given via `getPublicUrl`, making the files public.
  - **Expected/desired behavior**: Screenshots and trade review videos must be private, served via short-lived signed URLs (`createSignedUrl`) validating the owner's session.
  - **Why it matters**: Anyone who discovers or harvests the URL can view sensitive charts, trading journals, or strategy recordings of other users.
  - **Fix**: Set bucket permissions to private in Supabase Storage. Implement server-side retrieval that generates a signed URL.
  - **Effort**: S
  - **Status**: Completed

- [x] **[HIGH]** Service Role DB Bypass & RLS Bypass in Sync Endpoint — `src/app/api/accounts/sync/route.ts:10`
  - **Current behavior**: Previous versions used service role keys to insert and select trades, letting users modify rows outside their boundaries.
  - **Expected/desired behavior**: Database writes and selections must utilize verified user tokens (`user_id = userId`) to enforce security boundaries.
  - **Why it matters**: Bypassing RLS at the API endpoint level creates risk that users can modify trades belonging to other user profiles.
  - **Fix**: Adjusted sync route queries to enforce `.eq('user_id', userId)` matching the authenticated JWT token.
  - **Effort**: S
  - **Status**: Completed

- [x] **[MEDIUM]** Missing API Rate Limiting on Upload and Sync — `src/app/api/trades/upload/route.ts`, `src/app/api/accounts/sync/route.ts`
  - **Current behavior**: Rate limit checking `checkRateLimit` is only applied on AI routes, leaving upload and sync endpoints fully exposed.
  - **Expected/desired behavior**: All write and network-expensive routes must be protected by rate limits (e.g. 5 uploads/minute, 3 syncs/minute).
  - **Why it matters**: Malicious scripts can spam sync APIs (triggering expensive MetaApi provisioning calls) or upload files to exhaust storage bandwidth.
  - **Fix**: Wire `checkRateLimit` helper into the POST controllers of both endpoints.
  - **Effort**: S
  - **Status**: Completed

---

## Phase 2 — Performance & Architecture

- [ ] **[HIGH]** O(N) Client-Side Calculations on Analytics Load — `src/app/analytics/page.tsx:139`
  - **Current behavior**: Page fetches the entire trade list (`useTrades('all')`) and runs 9 separate calculation loops sequentially in React renders.
  - **Expected/desired behavior**: Heavy aggregations (heatmaps, distributions, strategy P&L) should be pre-calculated in background DB views or RPC calls, or calculated off the main thread.
  - **Why it matters**: If a active trader logs 5000+ trades, clicking the Analytics tab will lock the browser thread for several seconds, degrading UX.
  - **Fix**: Delegate math calculations to database functions (RPC) or offload client calculations into a Web Worker.
  - **Effort**: M
  - **Status**: Not started

- [ ] **[MEDIUM]** Brittle Split-based CSV Parser — `src/lib/importParsers.ts:318`, `src/lib/importParsers.ts:330`
  - **Current behavior**: CSV columns are extracted using basic `csvText.split(/\r?\n/)` and `line.split(delim)`.
  - **Expected/desired behavior**: CSV files should be processed using a standard parser that handles commas inside double quotes.
  - **Why it matters**: If a user logs a trade note with a comma (e.g., `"Took trade at VWAP, exit near EMA"`), the split parser shifts all subsequent columns, corrupting quantities and PnL.
  - **Fix**: Integrate a lightweight, zero-dependency CSV parser library (like PapaParse) or use a robust regex.
  - **Effort**: S
  - **Status**: Not started

- [x] **[MEDIUM]** Monolithic Trades Listing Page — `src/app/trades/page.tsx`
  - **Current behavior**: Original page was a massive 3,250-line file handling filters, state management, column widths, and table styling.
  - **Expected/desired behavior**: Code must be separated into modular subcomponents to optimize bundle footprints and compilation speeds.
  - **Fix**: Refactored the file, moving sub-modules into `src/components/trades/` (`TradesTable`, `TradesFilters`, `TradesHeader`).
  - **Effort**: L
  - **Status**: Completed

- [x] **[LOW]** SWR Client Cache Integration — `src/hooks/useTrades.ts`
  - **Current behavior**: Original hooks queried the database on every page mount.
  - **Expected/desired behavior**: Data should be loaded from client-side SWR caches, reducing database hits on route transitions.
  - **Fix**: Created the SWR trades cache and connected useStreak and Analytics page to load instantly.
  - **Effort**: S
  - **Status**: Completed

---

## Phase 3 — UI/UX, Accessibility, Mobile

- [ ] **[MEDIUM]** Broken Mobile Breakpoints on Large Trade Tables — `src/components/trades/TradesTable.tsx`
  - **Current behavior**: Table headers and cells render side-by-side on desktop, but shrink or overlap on mobile viewport widths.
  - **Expected/desired behavior**: Mobile views must toggle column visibility or wrap rows in a responsive list card view.
  - **Why it matters**: Active traders logging trades on mobile Safari see broken alignments and cut-off values.
  - **Fix**: Wrap table structures in custom CSS media query classes to swap to a stacked list layout on screens under 768px.
  - **Effort**: M
  - **Status**: Not started

- [ ] **[MEDIUM]** Lack of Colorblind-Friendly P&L Accent Colors — `src/lib/colorSystem.ts`
  - **Current behavior**: Trades use standard hex red (`#ef4444`) and green (`#10b981`) to mark trade profits/losses.
  - **Expected/desired behavior**: Colors should have sufficient contrast and alternate theme presets (e.g., Blue/Orange or patterns) for colorblind users.
  - **Why it matters**: 8% of male users suffer from protanopia/deuteranopia and cannot easily read red/green statistics.
  - **Fix**: Add a "Colorblind Mode" toggle in the profile settings menu to swap colors to accessible equivalents.
  - **Effort**: S
  - **Status**: Not started

- [ ] **[MEDIUM]** Empty State Motivations are Static — `src/components/ui/EmptyState.tsx`
  - **Current behavior**: Shows a generic "No trades logged" placeholder.
  - **Expected/desired behavior**: Brand new profiles should see a quick start guide: (1) Connect account, (2) Import report, or (3) Log manually, with motivating prompts.
  - **Why it matters**: Users churn immediately if their dashboard is an empty gray panel upon login.
  - **Fix**: Expand `EmptyState` to render a structured quick-start checklist with mock dashboard preview triggers.
  - **Effort**: S
  - **Status**: Not started

- [x] **[LOW]** Monolithic Layout Animation Loops in Header — `src/components/layout/Header.tsx`
  - **Current behavior**: Hover transitions previously locked the thread due to Framer Motion `layoutId` layout calculation thrashing.
  - **Expected/desired behavior**: Navigation animations should utilize lightweight, hardware-accelerated CSS transitions.
  - **Fix**: Removed `layoutId` dynamic recalculations and replaced them with Tailwind transitions.
  - **Effort**: S
  - **Status**: Completed

- [ ] **[LOW]** Missing Timezone Handling on Local Date Selection — `src/components/trades/EnhancedTradeForm.tsx:408`
  - **Current behavior**: Form date inputs write `new Date().toISOString().split('T')[0]`, which stores dates in UTC without timezone details.
  - **Expected/desired behavior**: All trade dates must store timezone offsets or be written in UTC and translated back to local timezone on read.
  - **Why it matters**: A trade logged late at night in New York might save under tomorrow's date, displaying on the wrong day in calendar views.
  - **Fix**: Capture full ISO string with client-side offset and store it in a `timestamp with time zone` column.
  - **Effort**: S
  - **Status**: Not started

---

## Phase 4 — Feature Gap Analysis vs Competitors

- [ ] **[HIGH]** Missing Competitor Comparison Integrations — `c:\Users\PC\Desktop\finaltry`
  - **Current behavior**: Gaps exist relative to competitors (TradeZella, Tradervue, Edgewonk) in automated broker syncs and interactive charts.
  - **Expected/desired behavior**: Build custom features like (1) Keyboard shortcuts command bar for 5-second logging, (2) "What-If" mistake simulator, and (3) Challenge widgets to stand out.
  - **Why it matters**: Serious traders will not pay $29/mo if they have to enter executions manually, unless there are unique features.
  - **Fix**: Build the "What-If Simulator" (Phase 5) and the command palette log bar to deliver a unique value proposition.
  - **Effort**: L
  - **Status**: Not started

### Comparison Gaps & Actions

| Feature | TradeZella | Tradervue | TradeTrackr (v1) | Target Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Manual Logging** | ✅ Multi-step | ✅ Simple text | ✅ Glassmorphic Form | Protected (Strength) |
| **Broker Auto-Sync** | ✅ Auto API | ✅ Email / File | ❌ MT5 / CSV Only | **Must-have** (Phase 7) |
| **Drawdown Analytics** | ✅ Standard | ✅ Basic | ✅ Challenge widget | Protected (Strength) |
| **Playbook Tracker** | ✅ Advanced | ❌ Missing | ❌ Missing | **Nice-to-have** (Phase 9) |
| **What-If Simulation**| ❌ Missing | ❌ Missing | ❌ Missing | **Must-have** (Phase 5) |
| **AI Mindset Coach** | ✅ Paid addon | ❌ Missing | ✅ Chat proxy | Protected (Strength) |

---

## Phase 5 — Retention & Engagement Mechanics

- [ ] **[HIGH]** Low User Onboarding Retention hook — `welcome/page.tsx`
  - **Current behavior**: User completes onboarding, arriving on an empty dashboard with no active encouragement.
  - **Expected/desired behavior**: Onboarding should guide the user to perform their first action (importing 3 trades or creating a mock account) immediately.
  - **Why it matters**: 50% of trading journal trial signups churn within the first 24 hours if the onboarding flow doesn't show quick value.
  - **Fix**: Integrate a step-by-step progress guide on the empty dashboard, rewarding the first logged trade with a confirmation confetti pop.
  - **Effort**: M
  - **Status**: Not started

- [ ] **[MEDIUM]** Streak resets are discouraging to traders — `src/hooks/useStreak.ts`
  - **Current behavior**: If a user misses a day of journaling, the streak resets to 0.
  - **Expected/desired behavior**: Implement a "streak freeze" badge system or gamified check-ins to prevent user discouragement.
  - **Why it matters**: Active traders who lose a high streak feel discouraged and often stop journaling entirely.
  - **Fix**: Allow users to earn "streak freeze" tokens by maintaining consistent logging.
  - **Effort**: S
  - **Status**: Not started

- [ ] **[MEDIUM]** Missing Weekly Performance Digests — `src/app/api/ai`
  - **Current behavior**: User must log in manually to see their stats; no weekly notifications are sent.
  - **Expected/desired behavior**: System should compile a weekly summary email detailing best setups and psychological leaks, sent automatically.
  - **Why it matters**: Email reports re-engage users who forgot to open the app during a busy trading week.
  - **Fix**: Write a cron-job endpoint utilizing `resend` to compile and send weekly reports.
  - **Effort**: M
  - **Status**: Not started

---

## Phase 6 — Monetization & Pricing Strategy

- [ ] **[HIGH]** Completely Missing Billing & Plan Gatekeeping Integration — `src/app`
  - **Current behavior**: Pricing tiers are discussed, but there is no Stripe API, customer portal, or subscription gating in the code.
  - **Expected/desired behavior**: Integrate Stripe Checkout and webhooks to manage plan levels: Free (25 trades/mo), Pro ($29/mo), Institutional ($79/mo).
  - **Why it matters**: The app cannot monetize users or process recurring payments.
  - **Fix**: Install `@stripe/stripe-js`, create `/api/billing/checkout` and `/api/billing/webhook` endpoints, and gate advanced metrics using a user billing level field.
  - **Effort**: L
  - **Status**: Not started

- [ ] **[MEDIUM]** Lack of Proration and Failed Payment Handlers — `/api/billing`
  - **Current behavior**: No billing logic exists.
  - **Expected/desired behavior**: Account upgrades/downgrades must calculate proration correctly, and failed payments must automatically restrict account access to the Free tier.
  - **Why it matters**: Incomplete billing error handling leads to revenue leaks or customer service disputes.
  - **Fix**: Map Stripe subscription events (`invoice.payment_failed`, `customer.subscription.deleted`) to database update commands.
  - **Effort**: M
  - **Status**: Not started

- [ ] **[LOW]** Sandbox Tier Pricing Gateways — `src/lib/tradingApi.ts`
  - **Current behavior**: No limits are enforced on account creation or trade logging.
  - **Expected/desired behavior**: Enforce sandbox boundaries: limit manual inputs to 25 trades per month.
  - **Fix**: Add checks to the `addTrade` controller to prevent insertion if month limits are reached.
  - **Effort**: S
  - **Status**: Not started

---

## Phase 7 — Code Quality, Testing & Maintainability

- [ ] **[HIGH]** Zero Test Coverage on Financial Formulas — `src/lib/tradeMetrics.ts`
  - **Current behavior**: Sharpe, Sortino, expected value, and drawdown formulas have no automated tests.
  - **Expected/desired behavior**: Critical math calculations must be validated by unit tests to ensure exact outputs under various scenarios.
  - **Why it matters**: Future updates to calculation helper functions could break metrics quietly, displaying incorrect statistics to paying users.
  - **Fix**: Add a Jest unit test suite (`tradeMetrics.test.ts`) validating standard calculation scenarios.
  - **Effort**: M
  - **Status**: Not started

- [x] **[MEDIUM]** Strict Type Safety Sync Gaps — `src/lib/database.types.ts`
  - **Current behavior**: Previously, column updates did not match, requiring multiple `as any` casts.
  - **Expected/desired behavior**: Baseline database types must be kept in sync with the database schema.
  - **Fix**: Regenerated the typescript types using the Supabase schema compiler.
  - **Effort**: S
  - **Status**: Completed

- [ ] **[MEDIUM]** Inactive Sentry Error Monitoring Hook — `package.json`
  - **Current behavior**: Error monitoring hooks are discussed but no integration code or client wrappers exist.
  - **Expected/desired behavior**: Sentry must be initialized client/server side to capture production errors.
  - **Why it matters**: Uncaught exceptions on customer systems will go unnoticed, leading to silent churn.
  - **Fix**: Run `npx @sentry/wizard@latest -i nextjs` to hook up automated error tracking.
  - **Effort**: S
  - **Status**: Not started

---

## Phase 8 — Pre-Launch Go/No-Go Checklist

- [ ] **All Critical and High severity security items resolved**: Secrets removed from client files, correct multipliers applied to Gold/Crypto assets, calendar keys protected behind server proxies.
- [ ] **Database RLS Policies verified**: Check RLS is active on `trades`, `trading_accounts`, `profiles`, and `custom_events`.
- [ ] **Zod Schema validations enabled**: Request input payloads sanitized and validated on every API endpoint.
- [ ] **Stripe checkout and billing integrations operational**: Test plan purchases, cancellations, and upgrade pathways successfully.
- [ ] **Signed URLs implemented for attachments**: Private bucket access verified for screenshots and recorded videos.
- [ ] **Unit tests verified**: Financial metrics and parser tests compile and pass.
- [ ] **Mobile usability checks verified**: Verified layout responsiveness on iOS Safari and Android Chrome viewports.
- [ ] **Environment variables audited**: `.env.production` contains valid production secrets.
- [x] **Local builds verified**: Production bundle optimization and Next.js static page compilations verified successfully.
- [ ] **Beta telemetry configured**: User feedback reporting form enabled.

---

## Phase 9 — Post-Launch Growth Backlog

- [ ] **TradingView interactive charting widget**: Add support for plotting entry and exit points on live interactive charts.
- [ ] **Automated Broker Sync APIs**: Hook up Plaid or Oanda API sync pathways to import trades in the background.
- [ ] **Shareable trade journals**: Let users generate password-protected public share links of their trading journals.
- [ ] **Backtesting simulation tracker**: Compare planned setups vs actual execution to evaluate trading discipline.
- [ ] **Automated news event alerts**: Overlay high-impact calendar events (CPI, FOMC) on the trading dashboard.
