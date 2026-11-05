create table if not exists public.gdelt_historical_episodes (
  id uuid primary key default gen_random_uuid(),
  dataset text not null,
  snapshot_id uuid references public.gdelt_snapshots (id) on delete set null,
  episode_key text not null,
  title text not null,
  summary text not null,
  structural_pattern text not null,
  archetype_slug text,
  event_root_code text,
  event_base_code text,
  actor1_code text,
  actor2_code text,
  action_geo_country_code text,
  start_date date not null,
  end_date date not null,
  member_count integer not null default 0 check (member_count >= 0),
  total_events bigint not null default 0 check (total_events >= 0),
  total_articles bigint not null default 0 check (total_articles >= 0),
  peak_articles integer not null default 0 check (peak_articles >= 0),
  average_goldstein numeric(8,3),
  minimum_goldstein numeric(8,3),
  maximum_goldstein numeric(8,3),
  dominant_quad_class smallint,
  evidence_score numeric(6,4) not null default 0 check (evidence_score >= 0 and evidence_score <= 1),
  source_completeness text not null default 'sampled'
    check (source_completeness in ('sampled', 'complete', 'unknown')),
  status text not null default 'candidate'
    check (status in ('candidate', 'enriched', 'promoted', 'rejected')),
  narrative_summary text,
  outcome_summary text,
  search_document tsvector not null default ''::tsvector,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (dataset, episode_key)
);

create table if not exists public.gdelt_historical_episode_memberships (
  episode_id uuid not null references public.gdelt_historical_episodes (id) on delete cascade,
  dataset text not null,
  global_event_id bigint not null,
  event_date date,
  membership_score numeric(6,4) not null default 0 check (membership_score >= 0 and membership_score <= 1),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (episode_id, dataset, global_event_id),
  foreign key (dataset, global_event_id)
    references public.gdelt_event_index (dataset, global_event_id)
    on delete cascade
);

create index if not exists gdelt_historical_episodes_dataset_score_idx
  on public.gdelt_historical_episodes (dataset, evidence_score desc, total_articles desc);

create index if not exists gdelt_historical_episodes_dataset_dates_idx
  on public.gdelt_historical_episodes (dataset, start_date desc, end_date desc);

create index if not exists gdelt_historical_episodes_archetype_idx
  on public.gdelt_historical_episodes (dataset, archetype_slug, evidence_score desc)
  where archetype_slug is not null;

create index if not exists gdelt_historical_episodes_search_idx
  on public.gdelt_historical_episodes using gin (search_document);

create index if not exists gdelt_episode_memberships_episode_idx
  on public.gdelt_historical_episode_memberships (episode_id, event_date desc);

create index if not exists gdelt_episode_memberships_event_idx
  on public.gdelt_historical_episode_memberships (dataset, global_event_id);

create or replace function public.populate_gdelt_episode_search_document()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_document := to_tsvector(
    'simple'::regconfig,
    concat_ws(
      ' ',
      coalesce(new.title, ''),
      coalesce(new.summary, ''),
      coalesce(new.structural_pattern, ''),
      coalesce(new.narrative_summary, ''),
      coalesce(new.outcome_summary, ''),
      coalesce(new.archetype_slug, ''),
      coalesce(new.event_root_code, ''),
      coalesce(new.event_base_code, ''),
      coalesce(new.actor1_code, ''),
      coalesce(new.actor2_code, ''),
      coalesce(new.action_geo_country_code, '')
    )
  );
  return new;
end;
$$;

drop trigger if exists populate_gdelt_episode_search_document on public.gdelt_historical_episodes;
create trigger populate_gdelt_episode_search_document
before insert or update on public.gdelt_historical_episodes
for each row execute function public.populate_gdelt_episode_search_document();

create or replace function public.search_gdelt_historical_episodes(
  query_text text default null,
  match_count integer default 20,
  dataset_filter text default null
)
returns table (
  id uuid,
  dataset text,
  episode_key text,
  title text,
  summary text,
  structural_pattern text,
  archetype_slug text,
  event_root_code text,
  actor1_code text,
  actor2_code text,
  action_geo_country_code text,
  start_date date,
  end_date date,
  member_count integer,
  total_events bigint,
  total_articles bigint,
  peak_articles integer,
  average_goldstein numeric,
  evidence_score numeric,
  source_completeness text,
  status text,
  rank real
)
language sql
stable
set search_path = public
as $$
  select
    episodes.id,
    episodes.dataset,
    episodes.episode_key,
    episodes.title,
    episodes.summary,
    episodes.structural_pattern,
    episodes.archetype_slug,
    episodes.event_root_code,
    episodes.actor1_code,
    episodes.actor2_code,
    episodes.action_geo_country_code,
    episodes.start_date,
    episodes.end_date,
    episodes.member_count,
    episodes.total_events,
    episodes.total_articles,
    episodes.peak_articles,
    episodes.average_goldstein,
    episodes.evidence_score,
    episodes.source_completeness,
    episodes.status,
    case
      when nullif(trim(query_text), '') is null then 0::real
      else ts_rank_cd(
        episodes.search_document,
        websearch_to_tsquery('simple', query_text)
      )
    end as rank
  from public.gdelt_historical_episodes as episodes
  where (dataset_filter is null or episodes.dataset = dataset_filter)
    and (
      nullif(trim(query_text), '') is null
      or episodes.search_document @@ websearch_to_tsquery('simple', query_text)
    )
    and episodes.status <> 'rejected'
  order by rank desc, episodes.evidence_score desc, episodes.total_articles desc, episodes.start_date desc
  limit least(greatest(coalesce(match_count, 20), 1), 100);
$$;

alter table public.gdelt_historical_episodes enable row level security;
alter table public.gdelt_historical_episode_memberships enable row level security;

drop policy if exists "gdelt_historical_episodes_service_role_only" on public.gdelt_historical_episodes;
create policy "gdelt_historical_episodes_service_role_only"
  on public.gdelt_historical_episodes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "gdelt_episode_memberships_service_role_only" on public.gdelt_historical_episode_memberships;
create policy "gdelt_episode_memberships_service_role_only"
  on public.gdelt_historical_episode_memberships
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists set_gdelt_historical_episodes_updated_at on public.gdelt_historical_episodes;
create trigger set_gdelt_historical_episodes_updated_at
before update on public.gdelt_historical_episodes
for each row execute function public.set_updated_at();
