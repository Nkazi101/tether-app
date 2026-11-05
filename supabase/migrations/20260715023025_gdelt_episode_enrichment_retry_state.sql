alter table public.gdelt_historical_episodes
  add column if not exists enrichment_last_error text;
