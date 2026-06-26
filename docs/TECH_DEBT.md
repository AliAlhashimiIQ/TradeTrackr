# Technical Debt — TradeTrackr

This document tracks all existing technical debt in TradeTrackr, ordered from High to Low priority.

---

## 1. Packed Notes Metadata Cleanup (High Priority)
* **Description**: Historically, critical numbers (Stop Loss, Take Profit, Commission, and Swap) were packed into the `notes` column as text: `[SL=1.08500;TP=1.09200;Comm=7.00;Swap=0.00]`.
* **Debt Location**: [tradingApi.ts](file:///c:/Users/PC/Desktop/finaltry/src/lib/tradingApi.ts) and [importParsers.ts](file:///c:/Users/PC/Desktop/finaltry/src/lib/importParsers.ts)
* **Current Hack**: The fetching code reads `notes`, runs a regex match to extract these values, strips them, and returns the cleaned notes text.
* **Problem**: This prevents direct SQL aggregations or index searches on stop loss/take profit values, and requires processing overhead on every trade fetch.
* **Remediation**: Run a database migration script to parse all packed values from `notes` and populate the actual database columns (`stop_loss`, `take_profit`, `commission`, `swap`). Once migrated, delete the regex stripping logic from the codebase.

---

## 2. Brittle Regex HTML Table Parsing (Medium Priority)
* **Description**: In [importParsers.ts](file:///c:/Users/PC/Desktop/finaltry/src/lib/importParsers.ts), MetaTrader 5 detailed reports are parsed using custom regex matches (`html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)`).
* **Problem**: Regular expressions are not equipped to parse irregular nested HTML. A minor update to MetaTrader's export layout or the addition of custom columns can break the regex engine, resulting in silent parsing failures or column shifts.
* **Remediation**: Use a dedicated lightweight HTML parser library (like `html-dom-parser` or browser-native `DOMParser` via client) to securely walk the DOM tree nodes.

---

## 3. Direct Inline Database Queries (Medium Priority)
* **Description**: API routes and custom page hooks directly query database tables using Supabase clients.
* **Problem**: This couples the database layout directly to the UI rendering layer. If table schemas change, developers must search and edit queries across dozens of files.
* **Remediation**: Abstract database queries behind a repository layer (e.g., `src/lib/repository/`).

---

## 4. Stale Mock Sync Codes (Low Priority)
* **Description**: Stale mock data generator code blocks and commented sections clutter the synchronization route `/api/accounts/sync/route.ts`.
* **Problem**: Code bloating increases cognitive load for engineers auditing MetaApi provisioning paths.
* **Remediation**: Clean out all inactive mock code blocks, leaving only the real API synchronization sequence.
