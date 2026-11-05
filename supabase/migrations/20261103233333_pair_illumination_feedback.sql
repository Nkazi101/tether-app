-- Writes are mediated by the API's session identity and situation access checks.
create table if not exists public.tether_illumination (
  analysis_id uuid not null references public.tether_analyses(id) on delete cascade,
  owner_key text not null check (length(owner_key) between 10 and 100),
  owner_user_id uuid references auth.users(id) on delete cascade,
  pair_fingerprint text not null check (length(pair_fingerprint) = 64),
  case_id text not null,
  case_version text not null,
  alignment_version text not null check (alignment_version = 'ordered-relations-1'),
  verdict text not null check (verdict in ('helpful','unhelpful','unsure')),
  reason text check (reason in ('structure','difference','too-loose','unclear','source-issue')),
  pattern text not null default '' check (length(pattern) <= 500),
  explanation_seen boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (analysis_id, owner_key)
);
create index if not exists tether_illumination_owner on public.tether_illumination(owner_key, updated_at desc);
create index if not exists tether_illumination_user on public.tether_illumination(owner_user_id) where owner_user_id is not null;
alter table public.tether_illumination enable row level security;
revoke all on public.tether_illumination from public, anon, authenticated;
grant select, insert, update, delete on public.tether_illumination to service_role;
comment on table public.tether_illumination is 'Private, version-specific usefulness feedback. Not a factual accuracy vote. explanation_seen is client-reported exposure, not a blinded test.';
