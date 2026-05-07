
create or replace view public.newsletter_runs_view
with (security_invoker = on) as
select r.id, r.portfolio_id, r.run_date, r.status, r.headline, r.summary,
       r.raw_count, r.normalized_count, r.watchlist, r.created_at, r.updated_at
from newsletter.newsletter_runs r;

grant select on public.newsletter_runs_view to authenticated;
