# TradeTrackr — The Intelligent Trading Journal & Performance Command Center

TradeTrackr is a modern, high-performance, and visually premium trading journal and analytics dashboard designed for retail, funded, and prop firm traders. It tracks not only execution statistics but also trader psychology, mapping emotional correlation to financial performance and displaying the exact dollar cost of trading mistakes.

TradeTrackr is designed to be the ultimate self-hosted alternative to platforms like TradeZella, providing deep psychological analytics, advanced drawdown safety locks, interactive simulation tools, and AI-driven coaching insights.

---

## 🚀 Key Highlights & Core Features

*   **📊 Performance Command Center Dashboard**: Real-time equity curves, win/loss streak alerts, max drawdown safety gauges, psychology performance scores, and daily net P&L metrics.
*   **🏆 Prop Firm Challenge Tracker**: Live target indicators and drawdown meters supporting 10 leading prop firms (FTMO, E8, Apex, etc.), featuring trailing drawdown rules and daily safety locks.
*   **📈 Advanced Analytics (4-Tab System)**: P&L heatmaps, asset distributions, monthly breakdowns, strategy metrics, and "Cost of Mistakes" trackers.
*   **📅 Trading Calendar**: Monthly and weekly grid visualizations displaying daily net P&L with slide-out trade detail inspect drawers and seamless week-by-week navigation.
*   **🤖 AI Coaching Assistant**: Proxied GPT-3.5 pattern extraction chat boxes, emotional correlation charts, and OCR screenshot scan engines.
*   **📉 What-If Mistake Excluder**: Interactive simulator allowing traders to preview their equity curve and recovery statistics if specific mistakes (e.g., FOMO, Revenge Trading) were avoided.
*   **🕯️ Candlestick Replay Simulator**: Built-in interactive backtesting simulator containing real-time candle playback, execution mock order fills (Buy/Sell), and instant performance metrics tracking.
*   **📥 Import Wizard**: Streamlined parsers for MT5 detailed HTML exports, CSV imports, and custom JSON data.

---

## 🛡️ Production Security & Architecture

TradeTrackr is built on Next.js 14 (App Router) and structured with robust production-grade security practices:
*   **Cookie-based Server Middleware**: Secure route protection via `src/middleware.ts` using Supabase auth tokens, preventing unauthorized clients from reaching sensitive pages or API endpoints.
*   **Hardcoded Protection**: Zero plain-text passwords or client fallback variables. All broker account credentials are encrypted with AES-256-GCM using Web Crypto APIs.
*   **Enhanced Security Headers**: Automated CSP policies, clickjacking defense (`X-Frame-Options: DENY`), mime sniffing protection (`nosniff`), and strict HTTPS transport requirements (`HSTS`) configured directly in `next.config.js`.
*   **Rate Limiting**: Integrated sliding-window rate limiting on critical serverless endpoints (such as OpenAI AI Chat) to prevent spamming and Denial of Service.
*   **SWR Caching**: Prevent database query waterfalls and reduce API overhead using client-side cache revalidation.
*   **Web Workers**: Heavy aggregations and O(N) calculations are handled off-thread using worker scripts to guarantee zero UI thread blocking.

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

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Third-Party Integrations
OPENAI_API_KEY=your-openai-key
FINNHUB_API_KEY=your-finnhub-key
TWELVE_DATA_API_KEY=your-twelve-data-key
GOOGLE_VISION_API_KEY=your-google-vision-key

# App Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DB_ENCRYPTION_KEY=32-character-encryption-key-for-passwords
```

---

## 🚀 Installation & Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/AliAlhashimiIQ/TradeTrackr.git
    cd TradeTrackr
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup the Database**:
    Execute the SQL commands in `supabase/schema.sql` inside your Supabase project's SQL Editor to set up the baseline tables, RLS policies, functions, and storage buckets.
4.  **Run local development**:
    ```bash
    npm run dev
    ```
5.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Deployment

*   **Production Build**:
    ```bash
    npm run build
    ```
*   **Deployment**: Optimized for deployment on **Vercel** with automatic environment variable bindings to your active Supabase database project.

---

## 📜 Available Scripts

*   `npm run dev`: Starts the local development server.
*   `npm run build`: Bundles the application for production.
*   `npm start`: Starts the built production server.
*   `npm run lint`: Performs ESLint syntax validation checks.
*   `npm run analyze`: Triggers bundle size analysis (`ANALYZE=true`).

---

## 📝 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
