alter table public.gdelt_historical_episodes
  add column if not exists source_count integer not null default 0 check (source_count >= 0),
  add column if not exists enrichment_score numeric(6,4) check (enrichment_score >= 0 and enrichment_score <= 1),
  add column if not exists promotion_eligible boolean not null default false,
  add column if not exists enriched_at timestamptz;

create table if not exists public.gdelt_historical_episode_sources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.gdelt_historical_episodes (id) on delete cascade,
  source_type text not null default 'wikipedia'
    check (source_type in ('wikipedia', 'wikidata', 'manual', 'other')),
  source_title text not null,
  source_url text not null,
  source_excerpt text,
  source_rank integer not null default 1 check (source_rank > 0),
  retrieved_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (episode_id, source_url)
);

create index if not exists gdelt_episode_sources_episode_idx
  on public.gdelt_historical_episode_sources (episode_id, source_rank);

create index if not exists gdelt_episodes_promotion_idx
  on public.gdelt_historical_episodes (dataset, promotion_eligible, enrichment_score desc)
  where promotion_eligible = true;

alter table public.gdelt_historical_episode_sources enable row level security;

drop policy if exists "gdelt_episode_sources_service_role_only" on public.gdelt_historical_episode_sources;
create policy "gdelt_episode_sources_service_role_only"
  on public.gdelt_historical_episode_sources
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop function if exists public.search_gdelt_historical_episodes(text, integer, text);

create function public.search_gdelt_historical_episodes(
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
  narrative_summary text,
  outcome_summary text,
  source_count integer,
  enrichment_score numeric,
  promotion_eligible boolean,
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
    episodes.narrative_summary,
    episodes.outcome_summary,
    episodes.source_count,
    episodes.enrichment_score,
    episodes.promotion_eligible,
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
  order by rank desc, episodes.promotion_eligible desc, episodes.enrichment_score desc nulls last, episodes.evidence_score desc, episodes.total_articles desc, episodes.start_date desc
  limit least(greatest(coalesce(match_count, 20), 1), 100);
$$;
