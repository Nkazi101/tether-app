create table if not exists public.domains (
  slug text primary key check (slug = lower(slug)),
  label text not null unique,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_types (
  slug text primary key check (slug = lower(slug)),
  label text not null unique,
  description text not null,
  family text not null default 'general',
  domain_slug text references public.domains (slug) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mechanisms (
  slug text primary key check (slug = lower(slug)),
  label text not null unique,
  description text not null,
  family text not null default 'general',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.historical_cases (
  id uuid primary key default gen_random_uuid(),
  legacy_historical_event_id uuid unique references public.historical_events (id) on delete set null,
  slug text not null unique check (slug = lower(slug)),
  title text not null,
  summary text not null,
  year_label text,
  start_year integer,
  end_year integer,
  start_date date,
  end_date date,
  domain_slug text references public.domains (slug) on delete set null,
  event_type_slug text references public.event_types (slug) on delete set null,
  geography text[] not null default '{}'::text[],
  actor_roles jsonb not null default '[]'::jsonb,
  preconditions jsonb not null default '[]'::jsonb,
  triggers jsonb not null default '[]'::jsonb,
  structural_summary text,
  mechanism_notes text,
  outcome_summary text,
  disanalogy_notes text,
  time_to_outcome_days integer check (time_to_outcome_days is null or time_to_outcome_days >= 0),
  structural_embedding extensions.vector(768),
  source_quality_score numeric(4,3) not null default 0.500 check (source_quality_score >= 0 and source_quality_score <= 1),
  case_confidence_score numeric(4,3) not null default 0.500 check (case_confidence_score >= 0 and case_confidence_score <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint historical_cases_year_range_check
    check (start_year is null or end_year is null or start_year <= end_year),
  constraint historical_cases_date_range_check
    check (start_date is null or end_date is null or start_date <= end_date)
);

create table if not exists public.historical_case_mechanisms (
  historical_case_id uuid not null references public.historical_cases (id) on delete cascade,
  mechanism_slug text not null references public.mechanisms (slug) on delete restrict,
  weight numeric(4,3) not null default 0.500 check (weight > 0 and weight <= 1),
  is_primary boolean not null default false,
  evidence_note text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (historical_case_id, mechanism_slug)
);

create table if not exists public.historical_case_sources (
  id uuid primary key default gen_random_uuid(),
  historical_case_id uuid not null references public.historical_cases (id) on delete cascade,
  source_type text not null default 'secondary'
    check (source_type in ('primary', 'secondary', 'reference', 'dataset', 'other')),
  citation_title text not null,
  citation_url text,
  publisher text,
  published_at timestamptz,
  quality_score numeric(4,3) not null default 0.500 check (quality_score >= 0 and quality_score <= 1),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.raw_articles (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text,
  url text not null,
  title text not null,
  description text,
  content_excerpt text,
  published_at timestamptz,
  language_code text,
  country_codes text[] not null default '{}'::text[],
  source_name text,
  source_domain text,
  byline text,
  image_url text,
  domain_slug text references public.domains (slug) on delete set null,
  event_type_slug text references public.event_types (slug) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  ingestion_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.current_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug)),
  canonical_title text not null,
  summary text not null,
  status text not null default 'emerging'
    check (status in ('emerging', 'active', 'cooling', 'resolved', 'archived')),
  domain_slug text references public.domains (slug) on delete set null,
  event_type_slug text references public.event_types (slug) on delete set null,
  geo_scope text[] not null default '{}'::text[],
  actor_roles jsonb not null default '[]'::jsonb,
  structural_summary text,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  article_count integer not null default 0 check (article_count >= 0),
  source_count integer not null default 0 check (source_count >= 0),
  source_diversity_score numeric(4,3) not null default 0.000 check (source_diversity_score >= 0 and source_diversity_score <= 1),
  novelty_score numeric(4,3) not null default 0.500 check (novelty_score >= 0 and novelty_score <= 1),
  analysis_confidence_score numeric(4,3) not null default 0.500 check (analysis_confidence_score >= 0 and analysis_confidence_score <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.current_event_articles (
  current_event_id uuid not null references public.current_events (id) on delete cascade,
  raw_article_id uuid not null references public.raw_articles (id) on delete cascade,
  relationship_confidence numeric(4,3) not null default 0.500 check (relationship_confidence >= 0 and relationship_confidence <= 1),
  is_representative boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (current_event_id, raw_article_id)
);

create table if not exists public.current_event_mechanisms (
  current_event_id uuid not null references public.current_events (id) on delete cascade,
  mechanism_slug text not null references public.mechanisms (slug) on delete restrict,
  weight numeric(4,3) not null default 0.500 check (weight > 0 and weight <= 1),
  evidence_note text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (current_event_id, mechanism_slug)
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by_user_id uuid references public.profiles (id) on delete set null,
  current_event_id uuid references public.current_events (id) on delete set null,
  input_mode text not null
    check (input_mode in ('current_event', 'ad_hoc_text', 'article_url', 'manual_pairing')),
  query_text text not null,
  domain_slug text references public.domains (slug) on delete set null,
  event_type_slug text references public.event_types (slug) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  coverage_score numeric(4,3) check (coverage_score is null or (coverage_score >= 0 and coverage_score <= 1)),
  archive_candidate_count integer not null default 0 check (archive_candidate_count >= 0),
  selected_historical_case_id uuid references public.historical_cases (id) on delete set null,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parallel_candidates (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs (id) on delete cascade,
  historical_case_id uuid not null references public.historical_cases (id) on delete cascade,
  rank_order integer not null check (rank_order >= 1),
  retrieval_method text not null,
  structural_fit_score numeric(4,3) not null default 0.500 check (structural_fit_score >= 0 and structural_fit_score <= 1),
  coverage_score numeric(4,3) not null default 0.500 check (coverage_score >= 0 and coverage_score <= 1),
  source_quality_score numeric(4,3) not null default 0.500 check (source_quality_score >= 0 and source_quality_score <= 1),
  disanalogy_penalty numeric(4,3) not null default 0.000 check (disanalogy_penalty >= 0 and disanalogy_penalty <= 1),
  overall_confidence_score numeric(4,3) not null default 0.500 check (overall_confidence_score >= 0 and overall_confidence_score <= 1),
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (analysis_run_id, historical_case_id)
);

create table if not exists public.coverage_reports (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid references public.analysis_runs (id) on delete cascade,
  scope_type text not null check (scope_type in ('global', 'domain', 'event_type', 'mechanism', 'query')),
  scope_key text not null,
  coverage_score numeric(4,3) not null check (coverage_score >= 0 and coverage_score <= 1),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists domains_active_sort_idx
  on public.domains (is_active, sort_order);

create index if not exists event_types_domain_sort_idx
  on public.event_types (domain_slug, sort_order);

create index if not exists event_types_family_idx
  on public.event_types (family);

create index if not exists mechanisms_family_sort_idx
  on public.mechanisms (family, sort_order);

create index if not exists historical_cases_domain_idx
  on public.historical_cases (domain_slug);

create index if not exists historical_cases_event_type_idx
  on public.historical_cases (event_type_slug);

create index if not exists historical_cases_years_idx
  on public.historical_cases (start_year, end_year);

create index if not exists historical_cases_embedding_hnsw_idx
  on public.historical_cases
  using hnsw (structural_embedding extensions.vector_cosine_ops);

create index if not exists historical_case_mechanisms_mechanism_idx
  on public.historical_case_mechanisms (mechanism_slug, weight desc);

create index if not exists historical_case_sources_case_idx
  on public.historical_case_sources (historical_case_id);

create unique index if not exists historical_case_sources_case_url_uidx
  on public.historical_case_sources (historical_case_id, citation_url)
  where citation_url is not null;

create unique index if not exists raw_articles_provider_external_id_uidx
  on public.raw_articles (provider, external_id)
  where external_id is not null;

create unique index if not exists raw_articles_url_uidx
  on public.raw_articles (url);

create index if not exists raw_articles_published_at_idx
  on public.raw_articles (published_at desc);

create index if not exists raw_articles_domain_idx
  on public.raw_articles (domain_slug, event_type_slug);

create index if not exists current_events_status_last_seen_idx
  on public.current_events (status, last_seen_at desc);

create index if not exists current_events_domain_idx
  on public.current_events (domain_slug, event_type_slug);

create index if not exists current_event_articles_article_idx
  on public.current_event_articles (raw_article_id);

create index if not exists current_event_mechanisms_mechanism_idx
  on public.current_event_mechanisms (mechanism_slug, weight desc);

create index if not exists analysis_runs_user_created_idx
  on public.analysis_runs (requested_by_user_id, created_at desc);

create index if not exists analysis_runs_current_event_idx
  on public.analysis_runs (current_event_id, created_at desc);

create index if not exists parallel_candidates_run_rank_idx
  on public.parallel_candidates (analysis_run_id, rank_order);

create index if not exists coverage_reports_scope_idx
  on public.coverage_reports (scope_type, scope_key, created_at desc);

insert into public.domains (slug, label, description, sort_order, metadata)
values
  ('geopolitics', 'Geopolitics', 'State competition, diplomacy, war, migration, and institutional legitimacy.', 10, '{"seed":"foundation-v1"}'::jsonb),
  ('business', 'Business', 'Markets, firms, regulation, labor relations, and commercial competition.', 20, '{"seed":"foundation-v1"}'::jsonb),
  ('sports', 'Sports', 'Leagues, teams, dynasties, rules changes, labor disputes, and fan ecosystems.', 30, '{"seed":"foundation-v1"}'::jsonb),
  ('entertainment', 'Entertainment', 'Film, television, music, celebrities, creators, and distribution shifts.', 40, '{"seed":"foundation-v1"}'::jsonb),
  ('culture', 'Culture', 'Cultural movements, taste shifts, identity formation, and symbolic conflict.', 50, '{"seed":"foundation-v1"}'::jsonb),
  ('lifestyle', 'Lifestyle', 'Consumer behavior, wellness, fashion, status signaling, and everyday practice.', 60, '{"seed":"foundation-v1"}'::jsonb),
  ('technology', 'Technology', 'Platform transitions, infrastructure shifts, tooling, and technical adoption cycles.', 70, '{"seed":"foundation-v1"}'::jsonb),
  ('science', 'Science', 'Research paradigms, discovery races, public trust, and scientific institutions.', 80, '{"seed":"foundation-v1"}'::jsonb),
  ('general', 'General', 'Cross-domain events that have not yet been confidently assigned to a specific domain.', 90, '{"seed":"foundation-v1"}'::jsonb)
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  metadata = public.domains.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

insert into public.event_types (slug, label, description, family, domain_slug, sort_order, metadata)
values
  ('strategic-competition', 'Strategic Competition', 'A long contest between established and rising powers, firms, or institutions.', 'power', 'geopolitics', 10, '{"seed":"foundation-v1"}'::jsonb),
  ('regulatory-crackdown', 'Regulatory Crackdown', 'Formal intervention by a governing or sanctioning body to constrain powerful actors.', 'governance', 'business', 20, '{"seed":"foundation-v1"}'::jsonb),
  ('labor-dispute', 'Labor Dispute', 'Collective conflict over compensation, conditions, leverage, or representation.', 'labor', 'business', 30, '{"seed":"foundation-v1"}'::jsonb),
  ('platform-transition', 'Platform Transition', 'A shift in the dominant distribution or technical platform.', 'technology', 'technology', 40, '{"seed":"foundation-v1"}'::jsonb),
  ('leadership-change', 'Leadership Change', 'A change in leadership that reorients expectations, incentives, or strategy.', 'governance', 'sports', 50, '{"seed":"foundation-v1"}'::jsonb),
  ('dynastic-rise-or-decline', 'Dynastic Rise or Decline', 'A dominant institution, team, or empire consolidates or loses its edge over time.', 'power', 'sports', 60, '{"seed":"foundation-v1"}'::jsonb),
  ('distribution-shift', 'Distribution Shift', 'Control over audiences or buyers moves to a new channel or intermediary.', 'distribution', 'entertainment', 70, '{"seed":"foundation-v1"}'::jsonb),
  ('scandal-cycle', 'Scandal Cycle', 'A reputation shock escalates through media attention, institutional response, and public backlash.', 'reputation', 'entertainment', 80, '{"seed":"foundation-v1"}'::jsonb),
  ('cultural-revival', 'Cultural Revival', 'A past style, symbol, or practice returns with new social meaning.', 'culture', 'culture', 90, '{"seed":"foundation-v1"}'::jsonb),
  ('consumer-trend-swing', 'Consumer Trend Swing', 'Taste and status behavior pivot quickly toward or away from a product or practice.', 'consumer', 'lifestyle', 100, '{"seed":"foundation-v1"}'::jsonb),
  ('resource-shock', 'Resource Shock', 'A system is destabilized by scarcity, bottlenecks, or abrupt supply disruption.', 'supply', 'general', 110, '{"seed":"foundation-v1"}'::jsonb),
  ('legitimacy-crisis', 'Legitimacy Crisis', 'The authority of an institution erodes until compliance and narrative control weaken.', 'governance', 'geopolitics', 120, '{"seed":"foundation-v1"}'::jsonb)
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description,
  family = excluded.family,
  domain_slug = excluded.domain_slug,
  sort_order = excluded.sort_order,
  metadata = public.event_types.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

insert into public.mechanisms (slug, label, description, family, sort_order, metadata)
values
  ('power-transition', 'Power Transition', 'A rising actor pressures an established one, hardening rivalry and defensive behavior.', 'power', 10, '{"seed":"foundation-v1"}'::jsonb),
  ('elite-fragmentation', 'Elite Fragmentation', 'Decision-making coherence breaks down as powerful insiders split into rival camps.', 'governance', 20, '{"seed":"foundation-v1"}'::jsonb),
  ('legitimacy-erosion', 'Legitimacy Erosion', 'Authority weakens as institutions lose trust, consent, or moral standing.', 'governance', 30, '{"seed":"foundation-v1"}'::jsonb),
  ('regulatory-backlash', 'Regulatory Backlash', 'Institutions move to constrain actors whose scale or behavior is perceived as destabilizing.', 'governance', 40, '{"seed":"foundation-v1"}'::jsonb),
  ('gatekeeper-collapse', 'Gatekeeper Collapse', 'Old intermediaries lose control over access, attention, or distribution.', 'distribution', 50, '{"seed":"foundation-v1"}'::jsonb),
  ('platform-disintermediation', 'Platform Disintermediation', 'A new platform bypasses incumbents and rewrites how producers reach audiences or buyers.', 'distribution', 60, '{"seed":"foundation-v1"}'::jsonb),
  ('labor-realignment', 'Labor Realignment', 'Changes in labor leverage, organization, or scarcity reset bargaining power.', 'labor', 70, '{"seed":"foundation-v1"}'::jsonb),
  ('scarcity-shock', 'Scarcity Shock', 'Material or financial scarcity cascades through a broader system.', 'supply', 80, '{"seed":"foundation-v1"}'::jsonb),
  ('network-fragility', 'Network Fragility', 'Highly connected systems become brittle when key nodes fail or decouple.', 'supply', 90, '{"seed":"foundation-v1"}'::jsonb),
  ('speculative-excess', 'Speculative Excess', 'Narratives of expansion outrun fundamentals, increasing instability.', 'market', 100, '{"seed":"foundation-v1"}'::jsonb),
  ('reputation-contagion', 'Reputation Contagion', 'Attention and outrage spread faster than institutions can contain them.', 'reputation', 110, '{"seed":"foundation-v1"}'::jsonb),
  ('rivalry-escalation', 'Rivalry Escalation', 'A repeated contest intensifies as each side mirrors and amplifies the other.', 'power', 120, '{"seed":"foundation-v1"}'::jsonb),
  ('institutional-hardening', 'Institutional Hardening', 'Organizations respond to uncertainty by becoming more defensive and less adaptive.', 'governance', 130, '{"seed":"foundation-v1"}'::jsonb),
  ('audience-fragmentation', 'Audience Fragmentation', 'Shared mass audiences splinter into smaller identity or interest clusters.', 'distribution', 140, '{"seed":"foundation-v1"}'::jsonb),
  ('distribution-rebundling', 'Distribution Rebundling', 'Markets rebuild around new bundles, aggregators, or chokepoints after disruption.', 'distribution', 150, '{"seed":"foundation-v1"}'::jsonb),
  ('nostalgia-revival', 'Nostalgia Revival', 'Past symbols re-enter circulation to supply continuity, status, or reassurance.', 'culture', 160, '{"seed":"foundation-v1"}'::jsonb),
  ('commercialization-wave', 'Commercialization Wave', 'A domain shifts toward more intense monetization and formalized extraction.', 'market', 170, '{"seed":"foundation-v1"}'::jsonb),
  ('monopoly-consolidation', 'Monopoly Consolidation', 'Power accumulates around a dominant intermediary or supplier.', 'market', 180, '{"seed":"foundation-v1"}'::jsonb),
  ('frontier-privatization', 'Frontier Privatization', 'States offload risk and expansion into private actors at the edge of a new frontier.', 'market', 190, '{"seed":"foundation-v1"}'::jsonb),
  ('rules-reset', 'Rules Reset', 'A governing framework is rewritten after existing rules no longer fit reality.', 'governance', 200, '{"seed":"foundation-v1"}'::jsonb)
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description,
  family = excluded.family,
  sort_order = excluded.sort_order,
  metadata = public.mechanisms.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

insert into public.historical_cases (
  legacy_historical_event_id,
  slug,
  title,
  summary,
  year_label,
  structural_summary,
  source_quality_score,
  case_confidence_score,
  metadata
)
select
  he.id,
  concat(
    regexp_replace(lower(he.title), '[^a-z0-9]+', '-', 'g'),
    '-',
    left(he.id::text, 8)
  ),
  he.title,
  he.description,
  he.year_label,
  he.structural_skeleton,
  case
    when he.source = 'Golden Set' then 0.700
    when he.source = 'Wikipedia On This Day' then 0.400
    else 0.500
  end,
  case
    when he.source = 'Golden Set' then 0.650
    when he.source = 'Wikipedia On This Day' then 0.350
    else 0.500
  end,
  jsonb_build_object(
    'legacy_source', he.source,
    'legacy_archetype', he.archetype,
    'legacy_metadata', he.metadata
  )
from public.historical_events he
on conflict (legacy_historical_event_id) do update
set
  title = excluded.title,
  summary = excluded.summary,
  year_label = excluded.year_label,
  structural_summary = excluded.structural_summary,
  source_quality_score = excluded.source_quality_score,
  case_confidence_score = excluded.case_confidence_score,
  metadata = public.historical_cases.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

alter table public.domains enable row level security;
alter table public.event_types enable row level security;
alter table public.mechanisms enable row level security;
alter table public.historical_cases enable row level security;
alter table public.historical_case_mechanisms enable row level security;
alter table public.historical_case_sources enable row level security;
alter table public.raw_articles enable row level security;
alter table public.current_events enable row level security;
alter table public.current_event_articles enable row level security;
alter table public.current_event_mechanisms enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.parallel_candidates enable row level security;
alter table public.coverage_reports enable row level security;

drop policy if exists "domains_public_read" on public.domains;
create policy "domains_public_read"
  on public.domains
  for select
  to anon, authenticated
  using (true);

drop policy if exists "event_types_public_read" on public.event_types;
create policy "event_types_public_read"
  on public.event_types
  for select
  to anon, authenticated
  using (true);

drop policy if exists "mechanisms_public_read" on public.mechanisms;
create policy "mechanisms_public_read"
  on public.mechanisms
  for select
  to anon, authenticated
  using (true);

drop policy if exists "historical_cases_public_read" on public.historical_cases;
create policy "historical_cases_public_read"
  on public.historical_cases
  for select
  to anon, authenticated
  using (true);

drop policy if exists "historical_case_mechanisms_public_read" on public.historical_case_mechanisms;
create policy "historical_case_mechanisms_public_read"
  on public.historical_case_mechanisms
  for select
  to anon, authenticated
  using (true);

drop policy if exists "historical_case_sources_public_read" on public.historical_case_sources;
create policy "historical_case_sources_public_read"
  on public.historical_case_sources
  for select
  to anon, authenticated
  using (true);

drop policy if exists "current_events_public_read" on public.current_events;
create policy "current_events_public_read"
  on public.current_events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "current_event_mechanisms_public_read" on public.current_event_mechanisms;
create policy "current_event_mechanisms_public_read"
  on public.current_event_mechanisms
  for select
  to anon, authenticated
  using (true);

drop policy if exists "analysis_runs_select_own" on public.analysis_runs;
create policy "analysis_runs_select_own"
  on public.analysis_runs
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = requested_by_user_id
  );

drop policy if exists "analysis_runs_insert_own" on public.analysis_runs;
create policy "analysis_runs_insert_own"
  on public.analysis_runs
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = requested_by_user_id
  );

drop policy if exists "analysis_runs_update_own" on public.analysis_runs;
create policy "analysis_runs_update_own"
  on public.analysis_runs
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = requested_by_user_id
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = requested_by_user_id
  );

drop policy if exists "parallel_candidates_select_own_run" on public.parallel_candidates;
create policy "parallel_candidates_select_own_run"
  on public.parallel_candidates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.analysis_runs ar
      where ar.id = analysis_run_id
        and ar.requested_by_user_id = (select auth.uid())
    )
  );

drop policy if exists "coverage_reports_select_own_run" on public.coverage_reports;
create policy "coverage_reports_select_own_run"
  on public.coverage_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.analysis_runs ar
      where ar.id = analysis_run_id
        and ar.requested_by_user_id = (select auth.uid())
    )
  );

drop trigger if exists set_domains_updated_at on public.domains;
create trigger set_domains_updated_at
before update on public.domains
for each row execute function public.set_updated_at();

drop trigger if exists set_event_types_updated_at on public.event_types;
create trigger set_event_types_updated_at
before update on public.event_types
for each row execute function public.set_updated_at();

drop trigger if exists set_mechanisms_updated_at on public.mechanisms;
create trigger set_mechanisms_updated_at
before update on public.mechanisms
for each row execute function public.set_updated_at();

drop trigger if exists set_historical_cases_updated_at on public.historical_cases;
create trigger set_historical_cases_updated_at
before update on public.historical_cases
for each row execute function public.set_updated_at();

drop trigger if exists set_historical_case_sources_updated_at on public.historical_case_sources;
create trigger set_historical_case_sources_updated_at
before update on public.historical_case_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_raw_articles_updated_at on public.raw_articles;
create trigger set_raw_articles_updated_at
before update on public.raw_articles
for each row execute function public.set_updated_at();

drop trigger if exists set_current_events_updated_at on public.current_events;
create trigger set_current_events_updated_at
before update on public.current_events
for each row execute function public.set_updated_at();

drop trigger if exists set_analysis_runs_updated_at on public.analysis_runs;
create trigger set_analysis_runs_updated_at
before update on public.analysis_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_parallel_candidates_updated_at on public.parallel_candidates;
create trigger set_parallel_candidates_updated_at
before update on public.parallel_candidates
for each row execute function public.set_updated_at();
