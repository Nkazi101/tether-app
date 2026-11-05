create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.curations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  modern_title text not null,
  historical_title text not null,
  modern_event text not null,
  historical_event text not null,
  description text not null,
  image_url text,
  link text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_echoes (
  id uuid primary key default gen_random_uuid(),
  date_key date not null unique,
  echoes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.historical_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  year_label text not null,
  archetype text not null,
  structural_skeleton text,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(768),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists curations_user_id_created_at_idx
  on public.curations (user_id, created_at desc);

create index if not exists daily_echoes_date_key_idx
  on public.daily_echoes (date_key desc);

create index if not exists historical_events_source_idx
  on public.historical_events (source);

create index if not exists historical_events_archetype_idx
  on public.historical_events (archetype);

create index if not exists historical_events_embedding_hnsw_idx
  on public.historical_events
  using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.match_historical_events(
  query_embedding extensions.vector(768),
  match_count integer default 10,
  filter_source text default null
)
returns table (
  id uuid,
  title text,
  year_label text,
  archetype text,
  description text,
  structural_skeleton text,
  source text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    historical_events.id,
    historical_events.title,
    historical_events.year_label,
    historical_events.archetype,
    historical_events.description,
    historical_events.structural_skeleton,
    historical_events.source,
    1 - (historical_events.embedding <=> query_embedding) as similarity
  from public.historical_events
  where historical_events.embedding is not null
    and (filter_source is null or historical_events.source = filter_source)
  order by historical_events.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.profiles enable row level security;
alter table public.curations enable row level security;
alter table public.daily_echoes enable row level security;
alter table public.historical_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "curations_select_own" on public.curations;
create policy "curations_select_own"
  on public.curations
  for select
  using (auth.uid() = user_id);

drop policy if exists "curations_insert_own" on public.curations;
create policy "curations_insert_own"
  on public.curations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "curations_update_own" on public.curations;
create policy "curations_update_own"
  on public.curations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "curations_delete_own" on public.curations;
create policy "curations_delete_own"
  on public.curations
  for delete
  using (auth.uid() = user_id);

drop policy if exists "daily_echoes_public_read" on public.daily_echoes;
create policy "daily_echoes_public_read"
  on public.daily_echoes
  for select
  using (true);

drop policy if exists "historical_events_public_read" on public.historical_events;
create policy "historical_events_public_read"
  on public.historical_events
  for select
  using (true);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_curations_updated_at on public.curations;
create trigger set_curations_updated_at
before update on public.curations
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_echoes_updated_at on public.daily_echoes;
create trigger set_daily_echoes_updated_at
before update on public.daily_echoes
for each row execute function public.set_updated_at();

drop trigger if exists set_historical_events_updated_at on public.historical_events;
create trigger set_historical_events_updated_at
before update on public.historical_events
for each row execute function public.set_updated_at();
