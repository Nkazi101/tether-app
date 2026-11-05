create table if not exists public.deep_dives (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  modern_event text not null,
  historical_event text not null,
  payload jsonb not null,
  source text not null default 'gemini',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists deep_dives_modern_historical_idx
  on public.deep_dives (modern_event, historical_event);

alter table public.deep_dives enable row level security;

drop policy if exists "deep_dives_public_read" on public.deep_dives;
create policy "deep_dives_public_read"
  on public.deep_dives
  for select
  using (true);

drop trigger if exists set_deep_dives_updated_at on public.deep_dives;
create trigger set_deep_dives_updated_at
before update on public.deep_dives
for each row execute function public.set_updated_at();
