
-- Roles system
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view their roles" on public.user_roles
  for select using (auth.uid() = user_id);

-- Newsletter schema
create extension if not exists pgcrypto;
create schema if not exists newsletter;
grant usage on schema newsletter to authenticated;

create type newsletter.holding_kind as enum ('stock', 'mutual_fund');
create type newsletter.source_key as enum ('finnhub', 'google_rss', 'sebi', 'moneycontrol');
create type newsletter.source_type as enum ('api', 'rss', 'web');
create type newsletter.event_type as enum ('portfolio_update', 'fund_update', 'regulatory_update', 'market_context');
create type newsletter.run_status as enum ('queued', 'running', 'completed', 'failed', 'partial');

create or replace function newsletter.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create table newsletter.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_currency text not null default 'INR',
  is_synthetic boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table newsletter.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references newsletter.portfolios(id) on delete cascade,
  external_id text,
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

create table newsletter.newsletter_runs (
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
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_runs_unique_portfolio_day unique (portfolio_id, run_date)
);

create table newsletter.raw_items (
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
  created_at timestamptz not null default timezone('utc', now())
);

create table newsletter.normalized_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  external_id text,
  event_type newsletter.event_type not null,
  title text not null,
  summary text,
  url text not null,
  source_key newsletter.source_key not null,
  source_label text,
  source_type newsletter.source_type not null,
  published_at timestamptz,
  topic text,
  entities jsonb not null default '{}'::jsonb,
  why_it_matters jsonb not null default '[]'::jsonb,
  actionability jsonb not null default '[]'::jsonb,
  matched_holding_ids jsonb not null default '[]'::jsonb,
  relevance_score numeric(6,2) not null default 0,
  importance_score numeric(6,2) not null default 0,
  final_score numeric(6,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table newsletter.newsletter_sections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  section_key text not null,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (run_id, section_key)
);

create table newsletter.newsletter_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references newsletter.newsletter_sections(id) on delete cascade,
  event_id uuid not null references newsletter.normalized_events(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (section_id, event_id)
);

create table newsletter.evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references newsletter.newsletter_runs(id) on delete cascade,
  evaluator_key text not null default 'deterministic',
  grounding_score numeric(6,2) not null default 0,
  relevance_score numeric(6,2) not null default 0,
  usefulness_score numeric(6,2) not null default 0,
  style_score numeric(6,2) not null default 0,
  compliance_score numeric(6,2) not null default 0,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (run_id, evaluator_key)
);

-- Indexes
create index idx_portfolios_user_id on newsletter.portfolios(user_id);
create index idx_portfolio_holdings_portfolio_id on newsletter.portfolio_holdings(portfolio_id);
create index idx_newsletter_runs_portfolio_id_run_date on newsletter.newsletter_runs(portfolio_id, run_date desc);
create index idx_raw_items_run_id on newsletter.raw_items(run_id);
create index idx_normalized_events_run_id on newsletter.normalized_events(run_id);
create index idx_normalized_events_final_score on newsletter.normalized_events(final_score desc);
create index idx_newsletter_sections_run_id on newsletter.newsletter_sections(run_id);
create index idx_newsletter_section_items_section_id on newsletter.newsletter_section_items(section_id, position);
create index idx_evaluations_run_id on newsletter.evaluations(run_id);

-- Updated-at triggers
create trigger set_portfolios_updated_at before update on newsletter.portfolios
  for each row execute function newsletter.set_updated_at();
create trigger set_portfolio_holdings_updated_at before update on newsletter.portfolio_holdings
  for each row execute function newsletter.set_updated_at();
create trigger set_newsletter_runs_updated_at before update on newsletter.newsletter_runs
  for each row execute function newsletter.set_updated_at();

-- Ownership helper (security definer to avoid recursion)
create or replace function newsletter.owns_portfolio(_portfolio_id uuid)
returns boolean
language sql stable security definer set search_path = newsletter, public
as $$
  select exists (select 1 from newsletter.portfolios p where p.id = _portfolio_id and p.user_id = auth.uid())
$$;

create or replace function newsletter.owns_run(_run_id uuid)
returns boolean
language sql stable security definer set search_path = newsletter, public
as $$
  select exists (
    select 1 from newsletter.newsletter_runs r
    join newsletter.portfolios p on p.id = r.portfolio_id
    where r.id = _run_id and p.user_id = auth.uid()
  )
$$;

-- Enable RLS
alter table newsletter.portfolios enable row level security;
alter table newsletter.portfolio_holdings enable row level security;
alter table newsletter.newsletter_runs enable row level security;
alter table newsletter.raw_items enable row level security;
alter table newsletter.normalized_events enable row level security;
alter table newsletter.newsletter_sections enable row level security;
alter table newsletter.newsletter_section_items enable row level security;
alter table newsletter.evaluations enable row level security;

-- Policies: portfolios
create policy "own portfolios select" on newsletter.portfolios for select using (auth.uid() = user_id);
create policy "own portfolios insert" on newsletter.portfolios for insert with check (auth.uid() = user_id);
create policy "own portfolios update" on newsletter.portfolios for update using (auth.uid() = user_id);
create policy "own portfolios delete" on newsletter.portfolios for delete using (auth.uid() = user_id);

-- Policies: portfolio_holdings
create policy "own holdings select" on newsletter.portfolio_holdings for select using (newsletter.owns_portfolio(portfolio_id));
create policy "own holdings insert" on newsletter.portfolio_holdings for insert with check (newsletter.owns_portfolio(portfolio_id));
create policy "own holdings update" on newsletter.portfolio_holdings for update using (newsletter.owns_portfolio(portfolio_id));
create policy "own holdings delete" on newsletter.portfolio_holdings for delete using (newsletter.owns_portfolio(portfolio_id));

-- Policies: newsletter_runs
create policy "own runs select" on newsletter.newsletter_runs for select using (newsletter.owns_portfolio(portfolio_id));
create policy "own runs insert" on newsletter.newsletter_runs for insert with check (newsletter.owns_portfolio(portfolio_id));
create policy "own runs update" on newsletter.newsletter_runs for update using (newsletter.owns_portfolio(portfolio_id));
create policy "own runs delete" on newsletter.newsletter_runs for delete using (newsletter.owns_portfolio(portfolio_id));

-- Policies: child tables (gated through run ownership)
create policy "own raw select" on newsletter.raw_items for select using (newsletter.owns_run(run_id));
create policy "own raw write" on newsletter.raw_items for all using (newsletter.owns_run(run_id)) with check (newsletter.owns_run(run_id));

create policy "own events select" on newsletter.normalized_events for select using (newsletter.owns_run(run_id));
create policy "own events write" on newsletter.normalized_events for all using (newsletter.owns_run(run_id)) with check (newsletter.owns_run(run_id));

create policy "own sections select" on newsletter.newsletter_sections for select using (newsletter.owns_run(run_id));
create policy "own sections write" on newsletter.newsletter_sections for all using (newsletter.owns_run(run_id)) with check (newsletter.owns_run(run_id));

create policy "own section items select" on newsletter.newsletter_section_items for select
  using (exists (select 1 from newsletter.newsletter_sections s where s.id = section_id and newsletter.owns_run(s.run_id)));
create policy "own section items write" on newsletter.newsletter_section_items for all
  using (exists (select 1 from newsletter.newsletter_sections s where s.id = section_id and newsletter.owns_run(s.run_id)))
  with check (exists (select 1 from newsletter.newsletter_sections s where s.id = section_id and newsletter.owns_run(s.run_id)));

create policy "own evaluations select" on newsletter.evaluations for select using (newsletter.owns_run(run_id));
create policy "own evaluations write" on newsletter.evaluations for all using (newsletter.owns_run(run_id)) with check (newsletter.owns_run(run_id));
