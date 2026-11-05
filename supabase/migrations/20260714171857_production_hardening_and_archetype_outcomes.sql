-- Durable user preferences used by onboarding and future personalized ranking.
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  event_archetype_slugs jsonb not null default '[]'::jsonb,
  preferred_domains jsonb not null default '[]'::jsonb,
  analysis_depth text not null default 'balanced'
    check (analysis_depth in ('quick', 'balanced', 'deep')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_preferences_event_archetypes_array
    check (jsonb_typeof(event_archetype_slugs) = 'array'),
  constraint user_preferences_domains_array
    check (jsonb_typeof(preferred_domains) = 'array')
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own"
  on public.user_preferences
  for delete
  using ((select auth.uid()) = user_id);

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- Durable pipeline observability. This table intentionally has no public policies;
-- the service-role worker/API is the only writer and reader.
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by text not null check (triggered_by in ('manual', 'scheduled', 'worker')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  raw_articles_count integer not null default 0 check (raw_articles_count >= 0),
  current_events_count integer not null default 0 check (current_events_count >= 0),
  echoes_count integer not null default 0 check (echoes_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.pipeline_runs enable row level security;

create index if not exists pipeline_runs_started_at_idx
  on public.pipeline_runs (started_at desc);

create index if not exists pipeline_runs_running_idx
  on public.pipeline_runs (started_at desc)
  where status = 'running';

drop trigger if exists set_pipeline_runs_updated_at on public.pipeline_runs;
create trigger set_pipeline_runs_updated_at
before update on public.pipeline_runs
for each row execute function public.set_updated_at();

-- Current-event reads consistently filter to active/emerging records and a freshness window.
create index if not exists current_events_active_last_seen_idx
  on public.current_events (last_seen_at desc)
  where status in ('emerging', 'active');

create index if not exists current_event_mechanisms_event_weight_idx
  on public.current_event_mechanisms (current_event_id, weight desc);

-- Store explicit historical persona mappings when editorial enrichment is available.
alter table public.historical_cases
  add column if not exists persona_archetypes jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'historical_cases_persona_archetypes_array'
      and conrelid = 'public.historical_cases'::regclass
  ) then
    alter table public.historical_cases
      add constraint historical_cases_persona_archetypes_array
      check (jsonb_typeof(persona_archetypes) = 'array');
  end if;
end $$;
