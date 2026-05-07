# Fund Scoop Buddy

Fund Scoop Buddy is a personalized finance newsletter app built with `React`, `Vite`, and `Supabase`.

It generates a portfolio-aware daily brief by:
- ingesting finance news from `Finnhub`, `Google News RSS`, and `SEBI`
- normalizing items into a common event format
- matching events against a synthetic portfolio of stocks and mutual funds
- scoring relevance and importance
- composing a newsletter with sections, watchlist cues, and source links
- returning evaluation scores for grounding, relevance, usefulness, style, and compliance

## Project Structure

- `src/pages/Index.tsx`: main newsletter UI
- `src/components/newsletter/`: newsletter-specific UI components
- `src/lib/newsletter.ts`: frontend formatting helpers
- `src/types/newsletter.ts`: shared response types for the app
- `supabase/functions/fetch-news/index.ts`: Edge Function that fetches, ranks, and composes the newsletter
- `supabase/migrations/20260507_create_newsletter_schema.sql`: SQL schema for newsletter storage

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` from `.env.example` and fill:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

3. Add the Edge Function secret in Supabase:
- `FINNHUB_API_KEY`

4. Run the app:
```bash
npm run dev
```

## Database

Run the SQL in [supabase/migrations/20260507_create_newsletter_schema.sql](/Users/kayalvizhi/Public/fund-scoop-buddy/supabase/migrations/20260507_create_newsletter_schema.sql) in the Supabase SQL editor.

The migration creates a dedicated `newsletter` schema with tables for:
- portfolios
- holdings
- newsletter runs
- raw ingested items
- normalized events
- event-to-holding matches
- newsletter sections
- evaluation results

## Edge Function

The app calls the `fetch-news` Supabase Edge Function.

The function:
- reads `FINNHUB_API_KEY` from the Supabase function environment
- fetches remote news and RSS feeds
- cleans and deduplicates summaries
- ranks items against the portfolio
- returns the structured newsletter JSON used by the frontend

## Very Short Deploy Guide

1. Create a Supabase project.
2. Set frontend env values from that project in `.env`.
3. In the same project, add the secret `FINNHUB_API_KEY`.
4. Run the SQL migration in the Supabase SQL editor.
5. Deploy the `fetch-news` Edge Function.
6. Make sure `JWT verification` is off for `fetch-news` if you want public access from the frontend.

## Scripts

- `npm run dev`: start local development server
- `npm run build`: production build
- `npm run test`: run tests
- `npm run lint`: lint the codebase

## Notes

- `.env` should not be committed.
- `.env.example` should contain placeholders only.
- The current function returns structured newsletter JSON; persistence into the SQL tables can be extended further if needed.
