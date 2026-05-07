
create or replace function newsletter.set_updated_at()
returns trigger language plpgsql
set search_path = newsletter, public
as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

revoke execute on function newsletter.owns_portfolio(uuid) from public, anon, authenticated;
revoke execute on function newsletter.owns_run(uuid) from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
