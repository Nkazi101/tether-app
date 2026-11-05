-- Capacity waits preserve the current public analysis and do not consume failure retries.
create or replace function public.tether_defer_job(p_id uuid, p_lease uuid, p_available timestamptz)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_available <= now() or p_available > now()+interval '2 days' then
    raise exception 'Invalid research deferral';
  end if;
  update public.tether_jobs
    set status='queued', available_at=p_available, lease_token=null, lease_expires_at=null,
        attempts=greatest(0,attempts-1), error_message='Waiting for the next daily research allowance.', updated_at=now()
    where id=p_id and status='running' and lease_token=p_lease and lease_expires_at>=now();
  return found;
end; $$;
revoke all on function public.tether_defer_job(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.tether_defer_job(uuid,uuid,timestamptz) to service_role;

create or replace function public.tether_public_research_coverage()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'reportingStories', count(*),
    'publishedComparisons', count(*) filter(where s.has_aligned_pair),
    'awaitingCurrentMethod', count(*) filter(where not s.has_aligned_pair and coalesce(a.payload->'research'->>'version','')<>'episode-research-7'),
    'openAfterCurrentMethod', count(*) filter(where not s.has_aligned_pair and a.payload->'research'->>'version'='episode-research-7'),
    'queuedInvestigations', (select count(distinct j.payload->>'situationId') from public.tether_jobs j join public.tether_situations p on p.id::text=j.payload->>'situationId' where p.is_public and not p.is_walkthrough and j.kind='research' and j.status in ('queued','running'))
  )
  from public.tether_situations s join public.tether_analyses a on a.id=s.latest_analysis_id
  where s.is_public and not s.is_walkthrough;
$$;
revoke all on function public.tether_public_research_coverage() from public,anon,authenticated;
grant execute on function public.tether_public_research_coverage() to service_role;
