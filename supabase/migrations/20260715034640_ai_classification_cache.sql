alter table public.raw_articles
  add column if not exists ai_classification_cache jsonb not null default '{}'::jsonb,
  add column if not exists ai_classification_content_hash text,
  add column if not exists ai_classification_model text,
  add column if not exists ai_classification_cached_at timestamptz;

create index if not exists raw_articles_ai_classification_hash_idx
  on public.raw_articles (ai_classification_content_hash)
  where ai_classification_content_hash is not null;
