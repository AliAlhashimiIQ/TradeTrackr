# TradeTrackr — The Intelligent Trading Journal

TradeTrackr is a modern, high-performance, and visually premium trading journal and analytics dashboard designed for retail and funded traders (prop firm challenge participants). It tracks not only execution statistics but also trader psychology, mapping emotional correlation to financial performance and displaying the exact dollar cost of trading mistakes.

---

## 🚀 Overview
TradeTrackr integrates a beautiful "Liquid Glass" design system with deep client-side revalidation caching (SWR), off-thread worker-driven mathematical analysis, and direct API broker synchronization (MetaApi). This enables real-time drawdown safety metering, calendar P&L heatmaps, and AI-driven trade audit chats without browser thread blocking.

---

## 🎨 Features
- **📊 Command Center Dashboard**: Real-time equity curves, win/loss streak alerts, max drawdown safety gauges, psychology performance scores, and daily net P&L metrics.
- **🏆 Prop Firm Challenge Tracker**: Live target indicators and drawdown meters supporting 10 leading prop firms (FTMO, E8, Apex, etc.), featuring trailing drawdown rules and daily safety locks.
- **📈 Advanced Analytics (4-Tab System)**: P&L heatmaps, asset distributions, monthly breakdowns, strategy metrics, and "Cost of Mistakes" trackers.
- **📅 Trading Calendar**: Monthly and weekly grid visualizations displaying daily net P&L with slide-out trade detail inspect drawers.
- **🤖 AI Coaching Assistant**: Proxied GPT-3.5 pattern extraction chat boxes, emotional correlation charts, and OCR screenshot scan mock engines.
- **📥 Import Wizard**: Streamlined parsers for MT5 detailed HTML exports and mapped CSV data.
- **🎨 Liquid Glass UI**: Responsive glassmorphic layout animations built on Tailwind CSS and Framer Motion.

---

## 🏗️ Architecture
TradeTrackr utilizes Next.js App Router for server-rendered page frameworks.
- **Client-First reads**: Client components read data directly from Supabase using user JWT tokens, verifying Row-Level Security (RLS) constraints.
- **SWR caching**: Prevents database query waterfalls on client-side route navigation.
- **API proxies**: Operations requiring third-party API keys (like MetaApi cloud provisioning and economic calendar feeds) are executed server-side via Next.js route handlers (`/api/accounts/sync`, `/api/calendar`) to protect secrets.
- **Web Workers**: Heavy O(N) chart aggregations on the Analytics page are processed by `analytics.worker.ts` off the main UI rendering thread.

---

## 📂 Folder Structure
```
src/
├── app/               # App Router pages and API routes
│   ├── (routes)/      # UI pages (dashboard, analytics, calendar, playbook)
│   └── api/           # Server-side proxy endpoints (sync, upload, media)
├── components/        # Layout & Visual Elements
│   ├── common/        # Shared atoms (Form fields, Network indicators)
│   ├── layout/        # Shell layouts (Header, Sidebar, CommandPalette)
│   └── trades/        # Modules specific to the trade logging experience
├── hooks/             # Custom SWR and auth hooks (useTrades, useStreak)
├── lib/               # Utility functions (contract multipliers, metrics math)
├── providers/         # Global React context providers
└── types/             # Common TypeScript schema types
```

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14.2.30 (App Router), React 18.2.0, TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1, Framer Motion 11.0.3, Next-Themes 0.4.6
- **Charts & Data**: Recharts 2.11.0, Chart.js 4.5.1, Tremor React 3.13.1
- **Backend & Auth**: Supabase PostgreSQL 17.6, `@supabase/supabase-js` 2.39.3, SWR 2.3.3
- **HTTP Client**: Axios 1.6.7

---

## ⚙️ Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
META_API_TOKEN=your-metaapi-cloud-token
DB_ENCRYPTION_KEY=32-character-encryption-key-for-broker-passwords
```

---

## 🚀 Installation & Local Development
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/AliAlhashimiIQ/TradeTrackr.git
   cd TradeTrackr
   npm install
   ```
2. Setup database tables and RLS constraints by executing SQL from `supabase/schema.sql` in your Supabase SQL editor.
3. Run the local development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:3000`.

---

## 📦 Build & Deployment
- **Production Build**:
  ```bash
  npm run build
  ```
- **Deployment**: Optimized for one-click deployment on **Vercel** connected to your Supabase project.

---

## 📜 Available Scripts
- `npm run dev`: Starts local development server.
- `npm run build`: Bundles the application for production.
- `npm start`: Starts the built production server.
- `npm run lint`: Performs ESLint syntax validation checks.
- `npm run analyze`: Triggers bundle size analysis.

---

## ⚠️ Known Issues
- **Serverless API Timeout**: Provisioning MetaApi cloud accounts during sync requests can exceed Vercel's 10-second Hobby timeout limit (up to 22.5s loop). A fix to support polling is outlined in the refactoring roadmap.
- **Mock Video Player**: Review videos can be uploaded to private buckets, but the Trade Details sidebar lacks a video rendering player.

---

## 🗺️ Roadmap
Check out [ROADMAP.md](ROADMAP.md) for milestones regarding asynchronous sync status polling, video player embeds, and multi-currency exchange engines.

---

## 🤝 Contributing
1. Fork the project.
2. Create your branch: `git checkout -b feature/AmazingFeature`.
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`.
4. Push to the branch: `git push origin feature/AmazingFeature`.
5. Open a Pull Request.

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for details.
