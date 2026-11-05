create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop policy if exists "raw_articles_no_client_read" on public.raw_articles;
create policy "raw_articles_no_client_read"
  on public.raw_articles
  for select
  to anon, authenticated
  using (false);

drop policy if exists "current_event_articles_no_client_read" on public.current_event_articles;
create policy "current_event_articles_no_client_read"
  on public.current_event_articles
  for select
  to anon, authenticated
  using (false);
