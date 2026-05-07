create extension if not exists pgcrypto;

create schema if not exists newsletter;

create type newsletter.holding_kind as enum ('stock', 'mutual_fund');
create type newsletter.source_key as enum ('finnhub', 'google_rss', 'sebi', 'moneycontrol');
create type newsletter.source_type as enum ('api', 'rss', 'web');
create type newsletter.event_type as enum (
  'portfolio_update',
  'fund_update',
  'regulatory_update',
  'market_context'
);
create type newsletter.run_status as enum ('queued', 'running', 'completed', 'failed', 'partial');

create or replace function newsletter.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists newsletter.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  base_currency text not null default 'INR',
  is_synthetic boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists newsletter.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references newsletter.portfolios(id) on delete cascade,
  holding_kind newsletter.holding_kind not null,
  name text not null,
  symbol text,
  isin text,
  fund_house text,
  sector text,
  weight numeric(8,4) not null default 0,
  themes jsonb not null default '[]'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portfolio_holdings_weight_non_negative check (weight >= 0)
);

create table if not exists newsletter.newsletter_runs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references newsletter.portfolios(id) on delete cascade,
  run_date date not null,
  status newsletter.run_status not null default 'queued',
  headline text,
  summary text,
  raw_count integer not null default 0,
  normalized_count integer not null default 0,
  watchlist jsonb not null default '[]'::jsonb,
  source_runs jsonb not null default '[]'::jsonb,
  rule_log jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_runs_unique_portfolio_day unique (portfolio_id, run_date)
);

create table if not exists newsletter.raw_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  source_key newsletter.source_key not null,
  source_type newsletter.source_type not null,
  external_id text,
  title text not null,
  snippet text,
  url text not null,
  published_at timestamptz,
  topic text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text generated always as (md5(lower(coalesce(url, '') || '|' || coalesce(title, '')))) stored,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists newsletter.normalized_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  raw_item_id uuid references newsletter.raw_items(id) on delete set null,
  event_type newsletter.event_type not null,
  title text not null,
  summary text,
  url text not null,
  source_key newsletter.source_key not null,
  source_type newsletter.source_type not null,
  published_at timestamptz,
  topic text,
  entities jsonb not null default '{}'::jsonb,
  why_it_matters jsonb not null default '[]'::jsonb,
  actionability jsonb not null default '[]'::jsonb,
  relevance_score numeric(6,2) not null default 0,
  importance_score numeric(6,2) not null default 0,
  final_score numeric(6,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint normalized_events_score_range check (
    relevance_score between 0 and 100
    and importance_score between 0 and 100
    and final_score between 0 and 100
  )
);

create table if not exists newsletter.event_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references newsletter.normalized_events(id) on delete cascade,
  holding_id uuid not null references newsletter.portfolio_holdings(id) on delete cascade,
  match_reason text,
  matched_fields jsonb not null default '[]'::jsonb,
  relevance_score numeric(6,2) not null default 0,
  importance_score numeric(6,2) not null default 0,
  final_score numeric(6,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint event_matches_unique unique (event_id, holding_id)
);

create table if not exists newsletter.newsletter_sections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  section_key text not null,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_sections_unique unique (run_id, section_key)
);

create table if not exists newsletter.newsletter_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references newsletter.newsletter_sections(id) on delete cascade,
  event_id uuid not null references newsletter.normalized_events(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_section_items_unique unique (section_id, event_id)
);

create table if not exists newsletter.evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  evaluator_key text not null,
  grounding_score numeric(6,2) not null default 0,
  relevance_score numeric(6,2) not null default 0,
  usefulness_score numeric(6,2) not null default 0,
  style_score numeric(6,2) not null default 0,
  compliance_score numeric(6,2) not null default 0,
  notes jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint evaluations_unique unique (run_id, evaluator_key)
);

create index if not exists idx_portfolio_holdings_portfolio_id
  on newsletter.portfolio_holdings (portfolio_id);

create index if not exists idx_newsletter_runs_portfolio_id_run_date
  on newsletter.newsletter_runs (portfolio_id, run_date desc);

create index if not exists idx_raw_items_run_id
  on newsletter.raw_items (run_id);

create index if not exists idx_raw_items_source_key_published_at
  on newsletter.raw_items (source_key, published_at desc);

create index if not exists idx_normalized_events_run_id
  on newsletter.normalized_events (run_id);

create index if not exists idx_normalized_events_event_type
  on newsletter.normalized_events (event_type);

create index if not exists idx_normalized_events_final_score
  on newsletter.normalized_events (final_score desc);

create index if not exists idx_event_matches_event_id
  on newsletter.event_matches (event_id);

create index if not exists idx_event_matches_holding_id
  on newsletter.event_matches (holding_id);

create index if not exists idx_newsletter_sections_run_id
  on newsletter.newsletter_sections (run_id);

create index if not exists idx_newsletter_section_items_section_id
  on newsletter.newsletter_section_items (section_id, position);

create index if not exists idx_evaluations_run_id
  on newsletter.evaluations (run_id);

create trigger set_portfolios_updated_at
before update on newsletter.portfolios
for each row
execute function newsletter.set_updated_at();

create trigger set_portfolio_holdings_updated_at
before update on newsletter.portfolio_holdings
for each row
execute function newsletter.set_updated_at();

create trigger set_newsletter_runs_updated_at
before update on newsletter.newsletter_runs
for each row
execute function newsletter.set_updated_at();
