# Product Strategy & Feature Roadmap

This document outlines the strategic direction, target audience, and planned features to make this Trade Journal the premier tool for Forex, Prop Firm, and TradingView traders, positioning it to compete fiercely with tools like TradeZella.

## Target Audience
- MT5 Forex Traders
- Prop Firm Challengers (FTMO, Funding Pips, etc.)
- Day Traders heavily utilizing TradingView

---

## 1. Immediate App Improvements (Work on these now)
These are changes that adapt the current "equities-focused" app to speak the language of Forex and Prop Firm traders.

- **Forex Terminology & Metrics Update:**
  - Switch default metrics from purely Dollar P&L to include **Pips** and **Lots**.
  - Ensure currency pairs (e.g., EUR/USD, GBP/JPY) are natively recognized and categorized differently than stock tickers.
- **Enhanced AI Insights (Prop Firm Focus):**
  - Update the existing AI logic (`detectStreaksAndBehaviors`) to generate warnings related to drawdown limits, rather than just general losing streaks.
  - Make the "What-If" simulator more visible and focus it on things like "What if I didn't trade during news?"
- **UI/UX Polishing for Day Traders:**
  - Day traders need speed. Ensure the dashboard loads instantly and critical metrics (Daily P&L vs. Daily Limit) are the largest items on the screen.

---

## 2. New Core Features (The Prop Firm & MT5 Ecosystem)
These are the heavy-hitting features that will convince users to switch from spreadsheets or competitors.

- **Zero-Friction Prop Firm Rule Tracker:**
  - **No Manual Entry:** Create a dropdown menu of the Top 20 Prop Firms and their specific challenge tiers (e.g., "FTMO 100k Challenge").
  - Selecting a preset automatically configures the user's dashboard with the exact Max Daily Drawdown, Max Overall Loss, and Profit Target lines.
- **The "Challenge Dashboard" Widget:**
  - A highly visible, gamified widget showing a progress bar to the profit target and a "danger zone" meter for the daily drawdown limit.
- **MT5 Statement Parser (Drag & Drop):**
  - Allow users to export their HTML report directly from MetaTrader 5 and drag it into the app. The app instantly parses all trades, lots, and timestamps without manual data entry.
- **News Event Flagging:**
  - Integrate a Forex Factory (or similar) API to overlay high-impact news events on the user's trading timeline. Flag any trades taken within 15 minutes of a major news release.

---

## 3. Advanced Automation Features (The "Holy Grail")
This is the ambitious, high-value tier designed for TradingView users who want a 100% automated journaling experience.

- **TradingView Companion Chrome Extension:**
  - **Auto-Sync:** The extension detects when a trade is executed directly within the TradingView UI (Paper Trading or Broker Integration) and silently sends the trade data to our Supabase backend.
  - **Auto-Video Recording:** Upon detecting a trade execution, the extension uses browser APIs to retroactively save the last 30 seconds of screen activity and the subsequent 30 seconds, automatically attaching this video to the trade entry in the journal.
  - *Note:* This completely removes the "laziness" factor. The user trades on TradingView as normal, and the journal builds itself, complete with video replays of the execution.

---

## Monetization Strategy (Freemium Model)

**Free Tier (Growth & Hook):**
- Manual trade entry.
- Drag & Drop MT5 Statement parsing (limited to past 30 days).
- Basic Dashboard & P&L metrics.

**Pro Tier ($15 - $25/month - The Value Add):**
- The Automated Prop Firm Challenge Tracker widget.
- The TradingView Chrome Extension (Auto-Sync & Auto-Video).
- Advanced AI Drawdown Warnings & Strategy Insights.
- Unlimited historical data parsing and unlimited video storage for trades.
