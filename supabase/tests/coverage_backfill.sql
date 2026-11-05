begin;
do $$ declare j uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); result boolean; begin
  assert not has_function_privilege('anon','public.tether_defer_job(uuid,uuid,timestamptz,jsonb)','EXECUTE');
  assert not has_function_privilege('authenticated','public.tether_public_research_coverage()','EXECUTE');
  insert into public.tether_jobs(id,kind,idempotency_key,owner_key,payload,status,attempts,lease_token,lease_expires_at)
    values(j,'research','test-defer-'||j,'system:backfill-test','{}','running',1,lease,now()+interval '5 minutes');
  result:=public.tether_defer_job(j,gen_random_uuid(),now()+interval '1 day');assert not result,'Foreign lease must not defer a job';
  result:=public.tether_defer_job(j,lease,now()+interval '1 day','{"currentEpisode":{"id":"checkpoint-fixture"}}');assert result,'Valid capacity deferral failed';
  assert (select status='queued' and attempts=0 and lease_token is null and available_at>now() from public.tether_jobs where id=j),'Deferral consumed a failure retry or retained a lease';
  assert (select payload->'currentCheckpoint'->'currentEpisode'->>'id'='checkpoint-fixture' from public.tether_jobs where id=j),'The checkpoint was lost';
  result:=public.tether_defer_job(j,lease,now()+interval '1 day');assert not result,'A released lease must not mutate the job';
  assert (public.tether_public_research_coverage()->>'reportingStories')::int=(select count(*) from public.tether_situations where is_public and not is_walkthrough),'Coverage includes private or example data';
end $$;
rollback;
