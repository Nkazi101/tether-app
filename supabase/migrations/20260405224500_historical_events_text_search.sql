alter table public.historical_events
  add column if not exists search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(archetype, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(structural_skeleton, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index if not exists historical_events_search_document_idx
  on public.historical_events
  using gin (search_document);

create or replace function public.search_historical_events(
  query_text text,
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
  similarity real
)
language sql
stable
set search_path = public
as $$
  select
    historical_events.id,
    historical_events.title,
    historical_events.year_label,
    historical_events.archetype,
    historical_events.description,
    historical_events.structural_skeleton,
    historical_events.source,
    ts_rank_cd(
      historical_events.search_document,
      websearch_to_tsquery('english', query_text)
    )::real as similarity
  from public.historical_events
  where historical_events.search_document @@ websearch_to_tsquery('english', query_text)
    and (filter_source is null or historical_events.source = filter_source)
  order by similarity desc, historical_events.created_at desc
  limit greatest(match_count, 1);
$$;
