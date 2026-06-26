# Dependency Report — TradeTrackr

This document details all package dependencies, their usage, and updates required.

---

## 1. Production Dependencies

| Package | Status | Usage / Action |
| :--- | :--- | :--- |
| `@headlessui/react` | **Used** | UI interactions (modals, dropdown lists, accordions). |
| `@supabase/auth-helpers-nextjs` | **Deprecated** | Used for user auth. **Action**: Supabase has deprecated auth-helpers in favor of `@supabase/ssr`. Plan migration to `@supabase/ssr` to align with Next.js App Router standards. |
| `@supabase/supabase-js` | **Used** | Supabase client requests. |
| `@tremor/react` | **Used** | UI charts and components. |
| `axios` | **Used** | Sync API requests to MetaApi. |
| `chart.js` | **Used** | Background engine for performance distribution visualizers. |
| `critters` | **Used** | Next.js server-side CSS inlining engine (`optimizeCss` enabled in `next.config.js`). |
| `date-fns` | **Used** | Date ranges, calendar indexing, and streak calculations. |
| `downshift` | **Used** | Tag autocomplete input dropdown rendering. |
| `formidable` | **Unused** | Multipart parser. **Action**: Remove. Next.js App Router natively supports `request.formData()` parsing, making this redundant. |
| `framer-motion` | **Used** | Route animations, drawer slides, and page transition effects. |
| `lucide-react` | **Used** | Icon library. |
| `next` | **Used** | Main application framework. |
| `next-themes` | **Used** | Dark/Light/System theme toggles. |
| `partytown` | **Unused** | Web worker scripts engine. **Action**: Remove. Not active in config or codebase. |
| `react` | **Used** | Core engine. |
| `react-chartjs-2` | **Used** | React wrapper for Chart.js. |
| `react-confetti` | **Used** | Celebration animations on logging first trades or milestones. |
| `react-dom` | **Used** | Core DOM engine. |
| `react-hot-toast` | **Used** | Toast alerts and notifications. |
| `recharts` | **Used** | Interactive dashboard performance graphs. |
| `swr` | **Used** | Client-side revalidation caching. |
| `uuid` | **Unused** | UUID generation package. **Action**: Remove. The codebase relies entirely on native browser/Node API `crypto.randomUUID()`. |

---

## 2. Dev Dependencies

| Package | Status | Usage / Action |
| :--- | :--- | :--- |
| `@next/bundle-analyzer` | **Used** | Tree-shaking chunk analyzer. |
| `@tailwindcss/forms` | **Used** | Normalizes form input styles in Tailwind. |
| `@types/*` | **Used** | TypeScript support declarations. |
| `autoprefixer` | **Used** | Browser CSS compatibility manager. |
| `eslint` / `eslint-config-next` | **Used** | Code syntax enforcement rules. |
| `postcss` | **Used** | Processes CSS files. |
| `tailwindcss` | **Used** | Main styles layout system. |
| `typescript` | **Used** | Strict typing compliance check. |
