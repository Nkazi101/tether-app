-- Reviewed case revisions are append-only, independent of discovery imports.
-- The application validates their evidence references before publication.
create table public.tether_case_versions (
 id uuid primary key default gen_random_uuid(),
 case_id text not null,
 version text not null,
 payload jsonb not null,
 reviewed_by text not null,
 reviewed_at timestamptz not null,
 published_at timestamptz not null default now(),
 unique(case_id,version),
 check(length(reviewed_by)>=3),
 check(payload->>'id'=case_id and payload->>'version'=version)
);
alter table public.tether_case_versions enable row level security;
revoke all on public.tether_case_versions from public,anon,authenticated;
grant select,insert on public.tether_case_versions to service_role;
create trigger immutable_version before update on public.tether_case_versions for each row execute function tether_private.immutable_payload();
create index tether_case_versions_latest on public.tether_case_versions(case_id,published_at desc);
