# TradeTrackr Product Roadmap

This document outlines structural development milestones to bring TradeTrackr from development preview to production launch.

---

## Milestone 1 — Critical Bugs & Security Hardening
- [ ] **Asynchronous Synchronization (Vercel Timeout Fix)**
  - Move the blocking 22.5s loop in `/api/accounts/sync` to a background worker.
  - Return `202 Accepted` immediately and implement a status checking endpoint.
  - Add client polling inside the switcher UI component.
- [ ] **Enforce RLS Auditing**
  - Verify that no service role inserts bypass boundary validations on user profiles.

---

## Milestone 2 — Architectural Stability
- [ ] **Stabilize User Dependency Contexts**
  - Prevent Alt+Tab from triggering full page refreshes by replacing raw user objects with stable `userId` strings in all `useEffect`/`useMemo` hook parameters (Completed).
- [ ] **Decouple API layer queries**
  - Move inline queries from routes into a unified service layer.

---

## Milestone 3 — UI/UX & Feature Completion
- [ ] **Implement Signed Video Player**
  - Add video player container inside [TradeDetail.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/trades/TradeDetail.tsx).
  - Proxy private media access securely through `/api/media`.
- [ ] **Colorblind Accessibility Mode**
  - Connect colorblind theme toggle in settings to alternate CSS classes (blue/orange P&L colors).

---

## Milestone 4 — Performance Tuning
- [ ] **Tune SWR Caching parameters**
  - Set `dedupingInterval: 15000` on historical list calls.
  - Leverage SWR client-side mutation updates on CRUD transactions instead of hard router refreshes.

---

## Milestone 5 — Testing Suite
- [ ] **Math Calculation Unit Tests**
  - Install Vitest and testing libraries.
  - Write test cases for symbol multipliers (forex 100k, gold 100, crypto 1) inside `forexUtils.ts`.

---

## Milestone 6 — Production Readiness
- [ ] **Subscription Billing Engine**
  - Build Stripe billing portal webhooks.
  - Deploy pricing tiers and onboarding logic.
- [ ] **Launch Readiness checklist**
  - Clean dev dependencies.
  - Monitor database transaction pool size under concurrent loads.
