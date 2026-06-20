# TradeTrackr: Public Launch 10-Phase Roadmap
## The Ultimate Deployment Checklist to Scale TradeTrackr for the Public

This document establishes the definitive 10-phase roadmap to transition TradeTrackr from a development build into a secure, premium, high-retention, and commercially viable production app.

---

## 📋 Table of Phases
1. [Phase 1: Security & Database Hardening (Pre-Launch Guardrails)](#phase-1-security--database-hardening)
2. [Phase 2: UI/UX & Liquid Glass Aesthetics Polish](#phase-2-uiux--liquid-glass-aesthetics-polish)
3. [Phase 3: Core Feature Completion & Asset Class Extensions](#phase-3-core-feature-completion--asset-class-extensions)
4. [Phase 4: Advanced Performance & Scalability Optimization](#phase-4-advanced-performance--scalability-optimization)
5. [Phase 5: Competitor Killer Features (The "What-If" Engine)](#phase-5-competitor-killer-features)
6. [Phase 6: Practical AI Coaching Engine Upgrade](#phase-6-practical-ai-coaching-engine-upgrade)
7. [Phase 7: Broker API Integrations & Onboarding Sync](#phase-7-broker-api-integrations--onboarding-sync)
8. [Phase 8: Marketing, Monetization & Virality Loop](#phase-8-marketing-monetization--virality-loop)
9. [Phase 9: Production Infrastructure & Monitoring](#phase-9-production-infrastructure--monitoring)
10. [Phase 10: DevOps, CI/CD & Launch Smoke Testing](#phase-10-devops-cicd--launch-smoke-testing)

---

## Phase 1: Security & Database Hardening
> **Goal:** Secure user data, eliminate leaks, encrypt credentials, and block potential database hacks.

### Tasks
- [ ] **1.1 Row-Level Security (RLS) Audit**
  - Audit all database tables (`trades`, `profiles`, `trading_accounts`, `custom_events`) to ensure RLS is active.
  - Test policies: Verify that user A cannot query, update, or delete records belonging to user B.
- [ ] **1.2 Strict Input Sanitization**
  - Integrate Zod schema validation on API entry points (`/api/trades/upload`, `/api/accounts/sync`).
  - Pass user inputs (notes, strategy, tags) through the `stripHtml` parser inside `src/lib/sanitize.ts` before hitting the database.
- [ ] **1.3 Session Token Validation in API Routes**
  - Replace service-role database inserts with user-scoped clients. Ensure the database requests use the verified token of the request header:
    ```typescript
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    ```
- [ ] **1.4 MetaTrader Passwords AES-256 Encryption**
  - Wire up `src/lib/crypto.ts` to encrypt passwords on creation and decrypt only inside serverless runtime memory when invoking the MetaApi credentials check.

---

## Phase 2: UI/UX & Liquid Glass Aesthetics Polish
> **Goal:** Wow the user with frictionless data entry, keyboard productivity shortcuts, and perfect dark/light accessibility.

### Tasks
- [ ] **2.1 Bulk Selection & Actions**
  - Add row checkboxes on the `/trades` list screen.
  - Implement a sticky action header for: Bulk Delete, Bulk Tag, and Bulk Assign Mistakes (e.g. FOMO, Revenge Trade).
- [ ] **2.2 Keyboard Shortcuts & Command Palette**
  - Implement `Cmd+K` / `Ctrl+K` to open a search and trade input overlay.
  - Enable keyboard shortcuts for manual logging: typing `/log buy 1.0 eurusd @ 1.0850` instantly parses inputs for quick entry.
- [ ] **2.3 Dark / Light Mode Contrast Audit**
  - Test chart text and background contrast against WCAG AA standards.
  - Fix any hardcoded gray/white borders in liquid-glass elements that are difficult to see in Light Mode.
- [ ] **2.4 Import Interface Feedback**
  - Improve the drag-and-drop file uploader on `/import`.
  - Display progress bars, validation errors, and clear summary dialogs (e.g. "98 trades loaded successfully. 2 duplicates skipped.").

---

## Phase 3: Core Feature Completion & Asset Class Extensions
> **Goal:** Remove assumptions and handle stocks, futures, cryptos, and prop challenges properly.

### Tasks
- [ ] **3.1 Pre-Flight Confluence Checklist**
  - Create a pre-trade rules checklist ("Mindset Checklist") in the log form.
  - Prevent users from submitting trades unless they tick their customized execution criteria (e.g. "Trend Align", "Stop Loss Defined").
- [ ] **3.2 TradingView Execution Plotter**
  - Integrate a lightweight TradingView chart widget on `/trades/[id]`.
  - Draw entry (`buy`/`sell` arrows) and exit nodes directly on the asset price series graph.
- [ ] **3.3 Multi-Asset Multiplier Registry**
  - Replace forex-only lot/multiplier formulas (e.g., `quantity = lots * 100000`).
  - Deploy a mapper matching indices (US30, SPX500), commodities (Gold/XAUUSD, Oil), cryptos, and stocks to apply correct tick/pip value multipliers.
- [ ] **3.4 Live Prop Firm Tracker Sync**
  - Connect the challenge progress bars to actual account balances fetched from the database, preventing hardcoded references.

---

## Phase 4: Advanced Performance & Scalability Optimization
> **Goal:** Keep LCP/FCP sub-200ms and eliminate client memory crashes.

### Tasks
- [ ] **4.1 Paginated Server-Side Data Retrieval**
  - Upgrade the main trades feed to use infinite scroll or server-side cursor pagination.
  - Do not fetch all trades to the browser; query ranges dynamically (`.range(start, end)`).
- [ ] **4.2 Edge/Serverless Route Optimization**
  - Switch computationally heavy database aggregations to database RPC functions or Edge Functions to run closer to the user.
- [ ] **4.3 Bundle Optimization**
  - Monitor chunk sizes using `@next/bundle-analyzer`.
  - Ensure Framer Motion and large charting packages (`recharts`, `chart.js`) are fully code-split and only fetched when routes are accessed.

---

## Phase 5: Competitor Killer Features (The "What-If" Engine)
> **Goal:** Build the primary competitive differentiator to prove the economic value of trader discipline.

### Tasks
- [ ] **5.1 The "What-If" Equity Simulator**
  - Add interactive toggle switches on the Dashboard: `[ ] Filter FOMO Trades`, `[ ] Filter Revenge Trades`, `[ ] Filter Oversized Positions`.
  - Calculate a parallel "disciplined" equity curve and render it as a secondary, glowing gold line over the standard equity curve.
- [ ] **5.2 Behavioral Mistake Cost Panel**
  - Quantify the direct financial drain of bad habits: "Discipline Score: 78%. Ticking off mistakes would save you $2,450 this month."

---

## Phase 6: Practical AI Coaching Engine Upgrade
> **Goal:** Deliver next-gen automated mentoring with minimal token cost.

### Tasks
- [ ] **6.1 GPT-4o-Mini Migration**
  - Swap all legacy OpenAI model configurations to `gpt-4o-mini` to slash token bills by 60% and improve processing speeds.
- [ ] **6.2 OCR Screenshot Chart Analyzer**
  - Activate the vision analyzer API: let traders upload chart screenshots, auto-populate Entry, SL, TP, and extract chart patterns.
- [ ] **6.3 Weekly Coach Report**
  - Write an automated background job to compile weekly trading reports on Fridays.
  - Summarize: (1) Main behavioral leak, (2) Top performing asset class, (3) Discipline focus for the next trading week.

---

## Phase 7: Broker API Integrations & Onboarding Sync
> **Goal:** Connect live accounts directly, bypassing manual Excel exports.

### Tasks
- [ ] **7.1 Native Broker Auto-Sync API**
  - Add broker authorization wizards (MetaApi for MT4/MT5, direct integrations for Interactive Brokers, Oanda).
- [ ] **7.2 Remove Sandbox Mock Syncing**
  - Completely strip the `/api/accounts/sync` route of dummy mock data generation to maintain absolute data integrity.
- [ ] **7.3 Account Connection Status UI**
  - Show live network check widgets indicating when the user's trading account was last synced, showing explicit sync logs.

---

## Phase 8: Marketing, Monetization & Virality Loop
> **Goal:** Incentivize growth, shareability, and establish recurring revenue.

### Tasks
- [ ] **8.1 Multi-Tier Pricing Model**
  - Set up Stripe portal integration.
  - Implement three tiers:
    - *Free Sandbox:* 25 trades/month limit, manual entry only.
    - *Pro ($29/mo):* Unlimited imports, advanced Sharpe/Sortino stats, 3 synced accounts.
    - *Institutional Edge ($79/mo):* Live API sync, full AI coach, What-If simulation.
- [ ] **8.2 "Share Execution" Image Generator**
  - Add a "Share Trade" button generating a styled, anonymous PNG layout of a winning/losing trade to easily post on Twitter/X, Discord, or Reddit.
- [ ] **8.3 Viral Referral Rewards**
  - Give users 1 month of Pro free for every new user referred who logs 10 trades.

---

## Phase 9: Production Infrastructure & Monitoring
> **Goal:** Establish production database, error capture pipelines, and secure keys.

### Tasks
- [ ] **9.1 Isolated Production Databases**
  - Provision a fresh Supabase database target for public users. Do not run public traffic through development database nodes.
- [ ] **9.2 Production Environment Variables**
  - Populate API secrets, Supabase public URLs, OpenAI keys, and Stripe endpoints inside the host environment manager. Ensure `.env.local` is listed in `.gitignore`.
- [ ] **9.3 Rate-Limiting & DDoS Protection**
  - Deploy Upstash or edge middleware rate limiters on OpenAI endpoints to restrict brute-force API requests.
- [ ] **9.4 Error Capture & Speed Audits**
  - Install Sentry for telemetry logging.
  - Monitor Vercel Speed Insights for real-time LCP/FID metrics.

---

## Phase 10: DevOps, CI/CD & Launch Smoke Testing
> **Goal:** Guarantee zero-downtime releases, auto-run tests, and test user onboarding.

### Tasks
- [ ] **10.1 GitHub Actions CI/CD Pipeline**
  - Set up build tests running linting, TypeScript compiler checks (`tsc`), and Next.js builds on every pull request to `main`.
- [ ] **10.2 Public Onboarding Smoke Test**
  - Run a complete user scenario: Create new account → onboarding wizard → import 50 MT5 trades → check analytics dashboards → toggle light/dark theme → delete account.
- [ ] **10.3 In-App Feedback Widget**
  - Inject a permanent feedback modal (Formbricks or Tally) in the navigation sidebar so early beta users can report bugs directly.
