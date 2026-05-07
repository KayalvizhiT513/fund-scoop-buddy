# Plan: Complete the Newsletter Pipeline (Option B)

Wire the existing `fetch-news` edge function and frontend into the persistent `newsletter` schema, add authentication, secure everything with RLS, and add a run-history view.

## 1. Apply & harden the database migration

Run a migration that:
- Creates the existing `newsletter` schema (portfolios, holdings, runs, raw_items, normalized_events, event_matches, sections, section_items, evaluations) — based on the existing unused `20260507_create_newsletter_schema.sql`.
- Makes `portfolios.user_id` **NOT NULL** and references `auth.users(id) on delete cascade`.
- Creates a `public.user_roles` table (+ `app_role` enum + `has_role()` security-definer function) for future admin access.
- **Enables RLS** on every table in `newsletter`.
- Adds policies:
  - `portfolios`: owner can SELECT/INSERT/UPDATE/DELETE rows where `user_id = auth.uid()`.
  - `portfolio_holdings`, `newsletter_runs`, `raw_items`, `normalized_events`, `event_matches`, `newsletter_sections`, `newsletter_section_items`, `evaluations`: all gated through the parent `portfolio_id` belonging to `auth.uid()` via a security-definer helper `newsletter.owns_portfolio(uuid)` to avoid recursion.
- Adds missing `updated_at` triggers where applicable.
- Grants `usage` on the `newsletter` schema to `authenticated`.

## 2. Authentication

- Default: **email/password + Google** sign-in (no email confirmation, per project defaults — easier dev).
- New `/auth` route with sign-in / sign-up tabs.
- `useAuth` hook wrapping `supabase.auth.onAuthStateChange` + initial `getSession`.
- Protect `/` route — redirect unauthenticated users to `/auth`.
- Header gets a user menu with sign-out.

## 3. Edge function: persist each run

Update `supabase/functions/fetch-news/index.ts`:
- Read `Authorization` header, call `supabase.auth.getClaims(token)` to resolve `userId`. Reject if missing.
- Use service-role client server-side to:
  1. Upsert a default portfolio for the user (if none exists) and seed the 4 default holdings.
  2. Upsert a `newsletter_runs` row keyed by `(portfolio_id, run_date)` → status `running`.
  3. Run the existing ingest → normalize → score → compose pipeline.
  4. Insert `raw_items`, `normalized_events`, `event_matches`, `newsletter_sections`, `newsletter_section_items`, `evaluations` for that run (idempotent: delete children for the run first, then re-insert).
  5. Update the run row with counts, headline, summary, watchlist, source_runs, rule_log, status `completed` (or `partial` if any source degraded, `failed` on exception).
- Still return the in-memory `NewsletterResponse` so the UI keeps working without a second round-trip.

## 4. Frontend wiring

- `Index.tsx`: unchanged response shape — the optional-chaining fix already handles loading states. Pass the user's auth token through `supabase.functions.invoke` (it's automatic when logged in).
- New `History` panel (collapsible section under hero) that queries `newsletter.newsletter_runs` ordered by `run_date desc` limit 14, showing date, status, item count, and a "Load this run" button that hydrates the page from the persisted `normalized_events` + `newsletter_sections` for that run instead of refetching.
- New "My Portfolio" drawer to view the seeded holdings (read-only for now; edit can come later).

## 5. Parag Parikh coverage

- Keep current Finnhub general-feed filter as a fallback.
- Rely on the **Google News RSS** ingestor (already implemented) for `Parag Parikh` / `PPFAS` Indian coverage — it queries `news.google.com/rss/search` per holding alias, which works for Indian AMCs.

## 6. Cleanup

- Delete unused legacy `src/components/NewsCard.tsx` (newsletter components replaced it).
- Confirm `supabase/config.toml` keeps `verify_jwt = false` for `fetch-news` (we validate the JWT inside the function instead).

## Technical notes

- **No CHECK constraints with `now()`** — the existing migration only uses static range checks, which is fine.
- **Security-definer helper** `newsletter.owns_portfolio(_portfolio_id uuid)` returns boolean by checking `portfolios.user_id = auth.uid()` — used in all child-table policies to avoid RLS recursion.
- **Idempotency**: `(portfolio_id, run_date)` unique constraint already exists on `newsletter_runs`; child tables get cleared and re-inserted per run.
- **Performance**: existing indexes in the migration cover the new query patterns (run history, section items by position).

## Out of scope (future)

- Editing/managing portfolio holdings from the UI.
- Multi-agent LLM evaluation (currently deterministic scoring stub).
- Moneycontrol scraper (intentionally skipped per spec).
- Scheduled daily runs (cron) — runs are still on-demand.
