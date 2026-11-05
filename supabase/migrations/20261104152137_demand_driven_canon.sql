create table public.tether_research_gaps (
 id uuid primary key default gen_random_uuid(),
 analysis_id uuid not null unique references public.tether_analyses(id) on delete cascade,
 situation_id uuid not null references public.tether_situations(id) on delete cascade,
 method text not null, cluster_key text not null, reason text not null,
 sketch jsonb not null check(jsonb_typeof(sketch)='object'),
 status text not null default 'open' check(status in ('open','scheduled','filled','parked')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tether_research_gaps_open on public.tether_research_gaps(cluster_key,created_at desc) where status in ('open','scheduled');
alter table public.tether_research_gaps enable row level security;
revoke all on public.tether_research_gaps from public,anon,authenticated;
grant all on public.tether_research_gaps to service_role;

create table public.tether_canon_checks (
 id uuid primary key default gen_random_uuid(), run_key text not null unique,
 case_id text not null, case_version text not null,
 status text not null check(status in ('queued','passed','parked')),
 reason text not null, created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.tether_canon_checks enable row level security;
revoke all on public.tether_canon_checks from public,anon,authenticated;
grant all on public.tether_canon_checks to service_role;

create or replace function public.tether_record_research_gap(p_analysis uuid,p_cluster text,p_reason text,p_sketch jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare s public.tether_situations; a public.tether_analyses;
begin
 select * into a from public.tether_analyses where id=p_analysis;
 if not found then return false; end if;
 select * into s from public.tether_situations where id=a.situation_id;
 if not s.is_public or s.is_walkthrough or s.owner_key not like 'system:%' or s.latest_analysis_id<>a.id
    or a.payload->'pairedStory' is not null and a.payload->'pairedStory'<>'null'::jsonb
    or a.payload->'research'->>'eventApplicability' is distinct from 'eligible'
    or p_reason not in ('no-structural-match','representation','claims','network') then return false; end if;
 if jsonb_typeof(p_sketch)<>'object' or octet_length(p_sketch::text)>12000 or length(p_cluster)<>64 then raise exception 'Invalid research gap'; end if;
 insert into public.tether_research_gaps(analysis_id,situation_id,method,cluster_key,reason,sketch)
 values(a.id,s.id,coalesce(a.payload->'research'->>'version','unknown'),p_cluster,p_reason,p_sketch)
 on conflict(analysis_id) do nothing;
 return found;
end; $$;
revoke all on function public.tether_record_research_gap(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.tether_record_research_gap(uuid,text,text,jsonb) to service_role;

create or replace function public.tether_public_research_coverage()
returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'reportingStories',count(*),'publishedComparisons',count(*) filter(where s.has_aligned_pair),
 'awaitingCurrentMethod',count(*) filter(where not s.has_aligned_pair and coalesce(a.payload->'research'->>'version','')<>'episode-research-8'),
 'openAfterCurrentMethod',count(*) filter(where not s.has_aligned_pair and a.payload->'research'->>'version'='episode-research-8'),
 'queuedInvestigations',(select count(distinct j.payload->>'situationId') from public.tether_jobs j join public.tether_situations p on p.id::text=j.payload->>'situationId' where p.is_public and not p.is_walkthrough and j.owner_key like 'system:%' and j.kind='research' and j.status in ('queued','running')),
 'openCoverageGaps',(select count(*) from public.tether_research_gaps where status in ('open','scheduled'))
) from public.tether_situations s join public.tether_analyses a on a.id=s.latest_analysis_id where s.is_public and not s.is_walkthrough;
$$;
revoke all on function public.tether_public_research_coverage() from public,anon,authenticated;
grant execute on function public.tether_public_research_coverage() to service_role;

create function public.tether_public_source_flags() returns table(case_id text,case_version text)
language sql stable security invoker set search_path='' as $$
 select distinct f.case_id,f.case_version from public.tether_illumination f
 join public.tether_analyses a on a.id=f.analysis_id join public.tether_situations s on s.id=a.situation_id
 where s.is_public and not s.is_walkthrough and f.reason='source-issue' and f.verdict='unhelpful';
$$;
revoke all on function public.tether_public_source_flags() from public,anon,authenticated;
grant execute on function public.tether_public_source_flags() to service_role;

create function public.tether_complete_canon_check(p_job uuid,p_lease uuid,p_check uuid,p_status text,p_reason text,p_publication jsonb default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare t public.tether_canon_checks;
begin
 perform 1 from public.tether_jobs j where j.id=p_job and j.status='running' and j.owner_key='system:canon'
  and j.lease_token=p_lease and j.lease_expires_at>=now() for update;
 if not found then return false; end if;
 select c.* into t from public.tether_canon_checks c join public.tether_jobs j on j.id=p_job
  where c.id=p_check and c.run_key=j.payload->>'canonCheck' and c.status='queued' for update of c;
 if not found then return false; end if;
 if p_status not in ('passed','parked') or length(p_reason) not between 15 and 1000 then raise exception 'Invalid canon-check result'; end if;
 if p_status='passed' then
  if p_publication is null or p_publication->'historicalCase'->>'id' is distinct from t.case_id
   or coalesce(p_publication->'historicalCase'->>'version','')='' then raise exception 'Invalid checked publication'; end if;
  insert into public.tether_case_versions(case_id,version,payload,reviewed_by,reviewed_at)
   values(t.case_id,p_publication->'historicalCase'->>'version',p_publication,p_publication->>'reviewer',(p_publication->>'reviewedAt')::timestamptz)
   on conflict(case_id,version) do nothing;
 elsif p_publication is not null then raise exception 'A parked check cannot publish'; end if;
 update public.tether_canon_checks set status=p_status,reason=p_reason,completed_at=now() where id=t.id;
 return true;
end; $$;
revoke all on function public.tether_complete_canon_check(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.tether_complete_canon_check(uuid,uuid,uuid,text,text,jsonb) to service_role;
