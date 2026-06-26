# Project Improvements — TradeTrackr

This document details recommended features, UX refinements, and engineering enhancements to improve TradeTrackr.

---

## 1. Interactive TradingView Execution Charting (Product Advantage)
* **Description**: Plot exact entry and exit coordinates (represented as buy/sell arrows) directly on an interactive TradingView chart inside the trade details view.
* **Why it matters**: Power-users need to visually audit execution quality relative to support/resistance. Having to match times manually inside charts is slow.
* **Remediation**: Integrate the TradingView Lightweight Charts library (`lightweight-charts`) inside the Trade Details sidebar. Query entry/exit timestamps and draw markers at entry/exit prices on a candlestick timeline.

---

## 2. Gamified Journaling Streaks (Retention)
* **Description**: Expand the streak tracking widget to award profile badges, level-up notifications, and unlockable journal theme presets.
* **Why it matters**: Trading journals suffer from high user churn. Adding positive reinforcement loops increases daily retention.
* **Remediation**: Create a `milestones` table. Award achievements (e.g. "5-Day Discipline Streak", "No Fomo Week") and show congratulations modals with confetti on the dashboard.

---

## 3. Position Sizing & Monte Carlo Risk Simulator (Growth)
* **Description**: Provide calculators to simulate probability distributions (Monte Carlo) and position calculators matching risk ratios.
* **Why it matters**: Retail traders frequently struggle with risk management. A built-in calculator helps them prevent blown accounts.
* **Remediation**: Create a calculator utility module (`src/lib/riskCalculator.ts`) supporting standard formulas like Kelly Criterion and optimal f.

---

## 4. Execution Slippage Tracker (UX Advantage)
* **Description**: Log planned execution prices vs actual execution prices to monitor broker order slippage.
* **Why it matters**: Prop firm challenges are frequently failed due to bad execution fills.
* **Remediation**: Add `target_entry_price` and `target_exit_price` columns to the `trades` table. Display slippage statistics on the Analytics tab.
