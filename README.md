# TradeTrackr — The Intelligent Trading Journal

> Track every trade, uncover your edge, master your psychology. **Free forever.**

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Why TradeTrackr?

Most trading journals make you enter data and give you a chart. TradeTrackr goes further — it tracks your **psychology**, detects **behavioral patterns** like revenge trading, shows you the **dollar cost of your mistakes**, and monitors your **prop firm challenge rules** in real time. All wrapped in a premium Liquid Glass UI. And it's **100% free**.

---

## Features

### 📊 Command Center Dashboard
- Equity curve with real-time P&L tracking
- Win/loss streak tracker with behavioral alerts
- Max drawdown gauge with percentage visualization
- Psychology score (% of trades without mistakes)
- Best trading session detection
- Forex pips tracking (auto-detects forex pairs)
- Today's P&L with trade count
- Behavior alert cards (revenge trading, overconfidence)

### 🤖 AI-Powered Intelligence
- **AI Trade Chat**: Ask questions about your trades in natural language
- **Pattern Detection**: Identifies trading patterns across your history
- **What-If Simulator**: "What if I removed all FOMO trades?" — simulates P&L impact
- **Chart Screenshot OCR**: Upload chart screenshots, AI extracts symbol, entry/TP/SL levels, and chart patterns
- **Train the AI**: Correct the AI's analysis to improve future accuracy
- **Emotional Correlation**: Maps how your emotional state affects trade outcomes

### 🏆 Prop Firm Challenge Tracker
- **10 firms**: FTMO, E8, FundedNext, The5%ers, Apex, Topstep, Goat Funded, Funding Pips, MyFundedFX, True Forex Funds
- Daily loss limit danger meter
- Total drawdown tracking with trailing DD support
- Profit target progress bar
- Days remaining countdown
- **Real-time violation alerts** when you approach or breach limits
- Dedicated analytics tab for challenge performance

### 📈 Advanced Analytics (4-Tab System)
- **Overview**: Equity curve, P&L distribution, monthly performance, drawdown chart, cost of mistakes
- **Detailed Breakdown**: Symbol performance, trade type analysis, time-of-day heatmap, strategy comparison
- **Cost of Mistakes**: Aggregates how much each bad habit (FOMO, late entry, oversized) has cost you in real dollars
- **Prop Firm**: Challenge-specific analytics
- Advanced metrics: Sharpe ratio, Sortino ratio, Expected Value, Profit Factor
- Advanced filters by symbol, strategy, tags, date range, profit range
- CSV/JSON export

### 📅 Trading Calendar
- Monthly P&L heat map (green/red coloring per day)
- Click any day to see that day's trades in a sidebar
- Week and month view modes

### 📝 Rich Trade Entry
- Emotional State Selector (calm, confident, fearful, FOMO, etc.)
- Mistake tagger (select common trading mistakes)
- Strategy & tag system with autocomplete
- Screenshot uploader with AI analysis
- Pips and lots tracking for forex
- Preset buttons for quick entry
- Form validation with duplicate prevention

### 📥 Trade Import System
- **MT5 HTML parser**: Handles UTF-16 encoding, detailed reports, positions and deals tables
- **CSV import**: Generic format with configurable column mapping
- **Preset mappings**: cTrader, ThinkorSwim
- Duplicate detection (symbol + entry time + lots)
- Import history log with delete capability
- Drag-and-drop file upload

### 🎨 Liquid Glass Design System
- Premium glassmorphism theme with backdrop-blur effects
- Dynamic gradient borders and ambient neon glows
- Framer Motion entry animations on all cards
- Custom scrollbar, progress bars, tooltips
- Skeleton loaders on all loading states
- Light and dark mode support
- Fully responsive with mobile slide-out navigation

### 🔒 Security & Auth
- Supabase Authentication (email + optional Google OAuth)
- Row Level Security on database tables
- 3-step onboarding wizard for new users
- Profile management (display name, avatar)

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | TailwindCSS + Custom Liquid Glass CSS |
| **Animation** | Framer Motion |
| **Charts** | Recharts (11 chart types), Tremor, Chart.js |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **AI** | OpenAI GPT-3.5/4 via API routes |
| **Data Fetching** | SWR + React Context |
| **Fonts** | Plus Jakarta Sans (Google Fonts) |

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AliAlhashimiIQ/TradeTrackr.git
   cd TradeTrackr
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase URL, anon key, and OpenAI API key. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for database setup.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── analytics/          # 4-tab analytics dashboard
│   ├── api/                # API routes (AI, trade upload)
│   ├── calendar/           # P&L heat calendar
│   ├── dashboard/          # Command Center
│   ├── import/             # MT5/CSV import wizard
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── profile/            # User profile
│   ├── settings/           # App settings
│   ├── trades/             # Trade list, detail, edit, new
│   └── welcome/            # Onboarding wizard
├── components/
│   ├── ai/                 # AI analysis panel, trade insights
│   ├── analytics/          # Advanced filters, export, prop firm tab
│   ├── calendar/           # Calendar components
│   ├── charts/             # 11 chart components (Recharts)
│   ├── common/             # Error boundary, network wrapper
│   ├── dashboard/          # 16 dashboard widgets
│   ├── layout/             # Sidebar, header, authenticated layout
│   ├── trades/             # Trade form, detail, tags, notes, chat
│   └── ui/                 # Skeleton loader, empty state, toast
├── hooks/                  # useAuth, useDashboardData, useTrades
├── lib/
│   ├── ai/                 # AI service (OpenAI integration)
│   ├── importParsers.ts    # MT5 HTML + CSV parsers
│   ├── propFirms.ts        # 10 prop firm presets
│   ├── tradeMetrics.ts     # Performance calculations
│   ├── tradingApi.ts       # Supabase CRUD operations
│   └── types.ts            # TypeScript type definitions
├── providers/              # Context providers (theme, auth, page transition)
└── styles/                 # Global styles
```

---

## Available Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run analyze` | Bundle analysis (requires `ANALYZE=true`) |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
