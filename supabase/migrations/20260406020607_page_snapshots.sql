create table if not exists public.page_snapshots (
  page_key text primary key,
  payload jsonb not null,
  source text not null default 'server',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.page_snapshots enable row level security;

drop policy if exists "page_snapshots_public_read" on public.page_snapshots;
create policy "page_snapshots_public_read"
  on public.page_snapshots
  for select
  using (true);

drop trigger if exists set_page_snapshots_updated_at on public.page_snapshots;
create trigger set_page_snapshots_updated_at
before update on public.page_snapshots
for each row execute function public.set_updated_at();
