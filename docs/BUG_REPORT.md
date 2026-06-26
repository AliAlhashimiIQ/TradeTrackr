# Bug Report — TradeTrackr

This document details all discovered active bugs, potential edge cases, and runtime risks in TradeTrackr.

---

## 1. Sync Route Next.js Gateway Timeout (Vercel)
* **Severity**: High
* **Location**: `src/app/api/accounts/sync/route.ts` (lines 153–161)
* **Description**: The sync handler contains a blocking loop that waits for a MetaApi cloud account instance to connect. It attempts up to 15 times with a `1500ms` delay between checks, totaling up to `22.5 seconds` of execution time. On serverless hosting providers like Vercel (Hobby tier), API routes are capped at a `10-second` timeout. This results in standard requests returning a `504 Gateway Timeout` error, leaving the account synchronization state fractured.
* **Recommended Fix**: Refactor the sync sequence to start provisioning asynchronously. Return a `202 Accepted` status code immediately with a status URL. Let the client poll a separate status route (`/api/accounts/sync/status/[id]`) to monitor deployment progress and trigger data fetch only when connection status changes to `CONNECTED`.
* **Priority**: High

---

## 2. Video Uploads Uploaded But Unplayable in UI (Dead Feature / Missing Component)
* **Severity**: Medium
* **Location**: `src/app/api/trades/upload/route.ts` vs `src/components/trades/TradeDetail.tsx`
* **Description**: The API route POST `/api/trades/upload` successfully accepts file uploads for trade screen-recording videos and saves the corresponding `video_url` in the database. However, the trade details sidebar (`TradeDetail.tsx`) only supports rendering screenshots—there is no visual indicator, video link, or HTML5 `<video>` player to render uploaded videos.
* **Recommended Fix**: Add a conditional video review section in [TradeDetail.tsx](file:///c:/Users/PC/Desktop/finaltry/src/components/trades/TradeDetail.tsx). If `trade.video_url` is present, resolve it through the `/api/media` proxy and embed an HTML5 `<video>` player with custom controls, play/pause speed controls, and full-screen support.
* **Priority**: Medium

---

## 3. Scraping LocalStorage for Supabase Token (Brittle Pattern)
* **Severity**: Medium
* **Location**: `src/lib/utils.ts` (lines 50–64)
* **Description**: In `resolveScreenshotUrl`, the client scrapes `localStorage` using a key filter (`sb-*-auth-token`) to find and parse the active user JWT token to pass to the `/api/media` proxy. If the browser operates in private/incognito mode with storage disabled, or if Supabase Auth changes its client caching key structure, the proxy will fail to authenticate, causing all screenshots to render as broken images.
* **Recommended Fix**: Modify the hook calling `resolveScreenshotUrl` to obtain the token directly from the authenticated Supabase client session (`supabase.auth.getSession()`), or wrap the image source inside a custom authenticated component `<AuthenticatedImage>` that handles requests via fetch header authorization instead of token query params.
* **Priority**: Medium

---

## 4. Lack of Batch Operations Rate Limiting
* **Severity**: Low
* **Location**: `src/app/api/trades/route.ts` or trade delete handlers
* **Description**: While individual sync and upload routes are protected by rate limits, bulk deletion requests (`deleteTradesBulk`) and CSV imports do not check rate limit consumption. A user can run script macros to spam the deletion endpoint, hitting PostgreSQL connection pool limits and locking rows.
* **Recommended Fix**: Wire the `checkRateLimit` helper into the bulk delete route handler and set a threshold of 10 bulk updates per minute.
* **Priority**: Low

---

## 5. Mock Sync Balancing Side-Effects
* **Severity**: Low
* **Location**: `src/app/api/accounts/sync/route.ts` (stale mock logic)
* **Description**: If a MetaApi token is absent or fails to load, previous versions used to mock mock data. While the mock generation is commented out, if a sync request is sent, it still changes the account status to `ERROR` and locks the syncing state.
* **Recommended Fix**: Ensure that when a MetaApi token is missing, the API returns a clear configuration error payload to let the user know they need to supply their MetaApi credentials.
* **Priority**: Low
