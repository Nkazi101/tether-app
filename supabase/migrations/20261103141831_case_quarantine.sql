-- Bad imported/generated records must not poison the rest of the archive.
create table public.tether_case_quarantine(
 case_version_id uuid primary key references public.tether_case_versions(id) on delete cascade,
 reason text not null,
 recorded_at timestamptz not null default now()
);
alter table public.tether_case_quarantine enable row level security;
revoke all on public.tether_case_quarantine from public,anon,authenticated;
grant all on public.tether_case_quarantine to service_role;
alter table public.tether_case_versions add constraint tether_case_wrapped_identity check(coalesce(
 payload->'historicalCase'->>'id'=case_id and payload->'historicalCase'->>'version'=version,false));
create or replace function public.tether_case_page(p_offset integer default 0,p_limit integer default 200,p_terms text default null)
returns jsonb language sql set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'payload',r.payload)),'[]'::jsonb) from (
 select c.id,c.payload from public.tether_case_versions c
 where not exists(select 1 from public.tether_case_quarantine q where q.case_version_id=c.id)
 and (p_terms is null or c.search_tsv @@ to_tsquery('english'::regconfig,p_terms))
 order by (case when p_terms is not null then ts_rank(c.search_tsv,to_tsquery('english'::regconfig,p_terms)) else 0 end) desc,c.published_at desc,c.id
 offset greatest(0,least(10000,p_offset)) limit greatest(1,least(200,p_limit))
 ) r;
$$;
revoke all on function public.tether_case_page(integer,integer,text) from public,anon,authenticated;
grant execute on function public.tether_case_page(integer,integer,text) to service_role;
