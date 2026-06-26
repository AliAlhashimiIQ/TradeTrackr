# Architecture — TradeTrackr

This document explains the technical architecture, data structures, and lifecycle processes of TradeTrackr.

---

## 1. Technical Architecture Overview
TradeTrackr is built as a Next.js App Router application backed by a serverless database (Supabase) and third-party APIs (MetaApi). It utilizes a hybrid data layer: direct Postgres queries (using Row-Level Security) from browser clients, combined with secure Node.js API routes that proxy external endpoints and run administrative write operations.

```
       +---------------------------------------------+
       |               Browser Client                |
       |                                             |
       |  [React Components] <-> [Context Providers]  |
       |          ^                     ^            |
       |          | (SWR Cache)         |            |
       +----------v---------------------v-------------+
                  |                     |
 (Auth & Reads)   |                     | (API Proxies & Writes)
                  v                     v
       +---------------------+   +-------------------+
       |     Supabase DB     |   | Next.js API Routes|
       |                     |   |                   |
       |  (RLS Policies &    |   |  (MetaApi Sync,   |
       |   Signed Media URLs)|   |   Calendar Proxy) |
       +---------------------+   +---------+---------+
                                           |
                                           v
                                     +-----------+
                                     |  MetaApi  |
                                     +-----------+
```

---

## 2. Directory Layout
```
src/
├── app/               # Application Routes (App Router)
│   ├── api/           # Server API Route handlers
│   └── (routes)       # Visual route pages (Dashboard, Trades, Playbook, Analytics)
├── components/        # Layout & Visual Elements
│   ├── common/        # Shared atoms (Form fields, Network indicators)
│   ├── layout/        # Shell components (Header, CommandPalette)
│   └── trades/        # Modules specific to the trade logging experience
├── hooks/             # Reactive data hooks (useTrades, useStreak)
├── lib/               # Utility services (contract multiplier, metrics math)
├── providers/         # Global React context providers
└── types/             # Common TypeScript schema types
```

---

## 3. Data Lifecycle & State Management
### 3.1 Authentication
- **Authentication Core**: Supported by `@supabase/auth-helpers-nextjs` and `@supabase/supabase-js`.
- **State Provider**: [AuthProvider.tsx](file:///c:/Users/PC/Desktop/finaltry/src/providers/AuthProvider.tsx) registers session changes via `onAuthStateChange`.
- **Access Control**: Handled via the client-side `<AuthenticatedLayout>` wrapping system and page redirection filters.

### 3.2 State Synchronization
Global client-side states are split across four React Context Providers:
1. **AuthProvider**: Manages active user objects and authentication tokens.
2. **AccountProvider**: Synchronizes trading account selections and exposes active sub-account IDs.
3. **SettingsProvider**: Loads global settings (e.g., currency, timezone, starting balance) from Supabase and syncs changes to localStorage.
4. **ThemeProvider**: Manages UI modes (`light` / `dark`) and class hooks.

---

## 4. API & Database Schema Flow
### 4.1 Trade Logging
- Manual trades are submitted to Supabase tables through direct RLS-verified client commands.
- If a screen capture image is attached:
  1. The client uploads the image to Supabase Storage in the private `trade-screenshots` bucket namespaced by `userId`.
  2. The database stores the URL endpoint.
  3. The UI resolves images by proxying calls through `/api/media?url=...`, generating an authenticated `createSignedUrl` redirect.

### 4.2 Account Synchronization
1. User clicks sync on the switcher widget.
2. Client sends request to `/api/accounts/sync`.
3. The server decrypts MT5 broker credentials using standard `crypto` API.
4. The server provisions the MetaApi cloud instance, waits for connection, downloads deals, batch inserts new trades, and stores balances.
