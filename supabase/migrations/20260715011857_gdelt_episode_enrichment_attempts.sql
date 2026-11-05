alter table public.gdelt_historical_episodes
  add column if not exists enrichment_attempted boolean not null default false;

create index if not exists gdelt_episodes_enrichment_queue_idx
  on public.gdelt_historical_episodes (dataset, enrichment_attempted, evidence_score desc)
  where status <> 'promoted' and status <> 'rejected';
