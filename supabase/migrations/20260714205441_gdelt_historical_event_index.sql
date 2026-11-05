create table if not exists public.gdelt_snapshots (
  id uuid primary key default gen_random_uuid(),
  dataset text not null,
  source_file text not null,
  source_url text not null,
  source_md5 text,
  coverage_start date,
  coverage_end date,
  status text not null default 'discovered'
    check (status in ('discovered', 'downloaded', 'verified', 'census_complete', 'importing', 'loaded', 'failed')),
  compressed_bytes bigint,
  row_count bigint not null default 0 check (row_count >= 0),
  imported_row_count bigint not null default 0 check (imported_row_count >= 0),
  imported_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (dataset, source_file)
);

create table if not exists public.gdelt_event_index (
  dataset text not null,
  global_event_id bigint not null,
  source_file text not null,
  snapshot_id uuid references public.gdelt_snapshots (id) on delete set null,
  event_date date,
  date_added_key text,
  actor1_code text,
  actor1_name text,
  actor1_country_code text,
  actor1_type1_code text,
  actor2_code text,
  actor2_name text,
  actor2_country_code text,
  actor2_type1_code text,
  event_code text,
  event_base_code text,
  event_root_code text,
  quad_class smallint,
  goldstein_scale numeric(6,3),
  num_mentions integer,
  num_sources integer,
  num_articles integer,
  avg_tone numeric(8,3),
  action_geo_name text,
  action_geo_country_code text,
  action_geo_lat numeric(9,6),
  action_geo_long numeric(9,6),
  source_url text,
  search_document tsvector not null default ''::tsvector,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (dataset, global_event_id)
);

create index if not exists gdelt_snapshots_status_idx
  on public.gdelt_snapshots (status, created_at desc);

create index if not exists gdelt_event_index_event_date_idx
  on public.gdelt_event_index (event_date desc);

create index if not exists gdelt_event_index_event_code_idx
  on public.gdelt_event_index (event_root_code, event_base_code, event_code);

create index if not exists gdelt_event_index_actor1_idx
  on public.gdelt_event_index (actor1_country_code, actor1_type1_code);

create index if not exists gdelt_event_index_actor2_idx
  on public.gdelt_event_index (actor2_country_code, actor2_type1_code);

create index if not exists gdelt_event_index_action_geo_idx
  on public.gdelt_event_index (action_geo_country_code, action_geo_name);

create index if not exists gdelt_event_index_search_idx
  on public.gdelt_event_index using gin (search_document);

create or replace function public.populate_gdelt_search_document()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_document := to_tsvector(
    'simple'::regconfig,
    concat_ws(
      ' ',
      coalesce(new.actor1_name, ''),
      coalesce(new.actor1_code, ''),
      coalesce(new.actor1_country_code, ''),
      coalesce(new.actor1_type1_code, ''),
      coalesce(new.actor2_name, ''),
      coalesce(new.actor2_code, ''),
      coalesce(new.actor2_country_code, ''),
      coalesce(new.actor2_type1_code, ''),
      coalesce(new.event_code, ''),
      coalesce(new.event_base_code, ''),
      coalesce(new.event_root_code, ''),
      coalesce(new.action_geo_name, ''),
      coalesce(new.action_geo_country_code, '')
    )
  );
  return new;
end;
$$;

drop trigger if exists populate_gdelt_search_document on public.gdelt_event_index;
create trigger populate_gdelt_search_document
before insert or update on public.gdelt_event_index
for each row execute function public.populate_gdelt_search_document();

create or replace function public.search_gdelt_event_index(
  query_text text,
  match_count integer default 50
)
returns table (
  dataset text,
  global_event_id bigint,
  source_file text,
  event_date date,
  actor1_name text,
  actor1_country_code text,
  actor2_name text,
  actor2_country_code text,
  event_code text,
  event_base_code text,
  event_root_code text,
  quad_class smallint,
  goldstein_scale numeric,
  num_mentions integer,
  num_sources integer,
  num_articles integer,
  avg_tone numeric,
  action_geo_name text,
  action_geo_country_code text,
  source_url text,
  rank real
)
language sql
stable
set search_path = public
as $$
  select
    events.dataset,
    events.global_event_id,
    events.source_file,
    events.event_date,
    events.actor1_name,
    events.actor1_country_code,
    events.actor2_name,
    events.actor2_country_code,
    events.event_code,
    events.event_base_code,
    events.event_root_code,
    events.quad_class,
    events.goldstein_scale,
    events.num_mentions,
    events.num_sources,
    events.num_articles,
    events.avg_tone,
    events.action_geo_name,
    events.action_geo_country_code,
    events.source_url,
    ts_rank_cd(events.search_document, websearch_to_tsquery('simple', query_text)) as rank
  from public.gdelt_event_index as events
  where nullif(trim(query_text), '') is not null
    and events.search_document @@ websearch_to_tsquery('simple', query_text)
  order by rank desc, events.num_mentions desc nulls last, events.event_date desc nulls last
  limit least(greatest(coalesce(match_count, 50), 1), 500);
$$;

alter table public.gdelt_snapshots enable row level security;
alter table public.gdelt_event_index enable row level security;

drop policy if exists "gdelt_snapshots_service_role_only" on public.gdelt_snapshots;
create policy "gdelt_snapshots_service_role_only"
  on public.gdelt_snapshots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "gdelt_event_index_service_role_only" on public.gdelt_event_index;
create policy "gdelt_event_index_service_role_only"
  on public.gdelt_event_index
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists set_gdelt_snapshots_updated_at on public.gdelt_snapshots;
create trigger set_gdelt_snapshots_updated_at
before update on public.gdelt_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists set_gdelt_event_index_updated_at on public.gdelt_event_index;
create trigger set_gdelt_event_index_updated_at
before update on public.gdelt_event_index
for each row execute function public.set_updated_at();
