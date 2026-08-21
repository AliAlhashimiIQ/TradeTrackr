# TradeTrackr — Agent & Project Instructions

## Tech Stack
- **Frontend**: Next.js 14.2 (App Router), React 18.2, TypeScript 5.3
- **Styling**: Tailwind CSS 3.4, Custom "Liquid Glass" Dark Theme (`src/app/globals.css`), Next-Themes
- **Charts & Motion**: TradingView Lightweight Charts 5.2, Chart.js 4.5, Recharts 2.11, Framer Motion 11.0
- **Database & Auth**: Supabase PostgreSQL 16/17, `@supabase/ssr` 0.12, Supabase Auth with secure SSR cookies
- **Data Caching**: SWR 2.3 (Stale-While-Revalidate)
- **Testing**: Vitest 4.1

## Core Project Mission & Features
TradeTrackr is an intelligent trading journal and psychological performance command center for retail, funded, and prop firm traders.
- **Trader Psychology**: Emotional tag tracking (FOMO, Revenge Trading, Tilt), emotional correlation matrix, and "Cost of Mistakes" dollar calculations.
- **Prop Firm Tracker**: Real-time compliance monitoring for 10 top prop firms (FTMO, E8, Apex) with trailing drawdown rules and daily safety locks.
- **Trading Calendar & Analytics**: Daily net P&L heatmaps, interactive inspect drawers, asset distributions, strategy breakdowns.
- **Simulation**: Interactive Candlestick Replay Simulator with mock order fills & What-If Mistake Excluder.
- **Import Wizard**: MT5 detailed HTML exports, CSV imports, and broker sync.

## Project Structure
- `src/app/` — Next.js App Router (dashboard, analytics, calendar, journal, playbook, backtesting, accounts, api)
- `src/components/` — Liquid Glass UI components (layout, common, trades)
- `src/hooks/` — Custom SWR hooks (`useTrades`, `useStreak`, `useAccounts`, `usePropFirmMetrics`)
- `src/lib/` — Math utilities, lot multipliers, Supabase client configuration
- `src/providers/` — React Context providers (Auth, Theme, Accounts, Settings)
- `src/types/` — Database schemas and TypeScript type declarations
- `supabase/` — Database schema, migrations, and RLS policies

## Code Style & Conventions
- **TypeScript**: Strict typing required. Avoid `any`. Derive types from database types where possible.
- **File Naming**: PascalCase for React components (`TradeDetail.tsx`), camelCase for utilities and hooks (`useTrades.ts`, `multipliers.ts`), kebab-case for directories.
- **Security First**: 
  - Never store or log broker credentials or auth tokens in plaintext.
  - Always enforce Supabase Row Level Security (RLS) on client queries.
  - Proxy all external API requests (OpenAI, MetaApi) through serverless route handlers.
- **Error Handling**: Use try/catch with user-facing toast notifications (`react-hot-toast`) and structured error logs.

## Commands
- **Dev Server**: `npm run dev` (starts on port 3000)
- **Build**: `npm run build`
- **Unit Tests**: `npx vitest run`
- **Lint**: `npm run lint`
- **Bundle Analysis**: `npm run analyze`
