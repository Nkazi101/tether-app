-- All fixtures, temporary grants and quota reservations roll back. This test
-- never changes a real account or publishes a lasting comparison.
begin;
create or replace function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %',message; end if; end $$;
create temp table fixtures(user_id uuid,job_id uuid,situation_id uuid,snapshot_id uuid,analysis_id uuid,lease uuid);
insert into fixtures values(gen_random_uuid(),null,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into auth.users(id,email,raw_user_meta_data) select user_id,'tether-transaction-test@example.invalid','{}'::jsonb from fixtures;
select pg_temp.assert(not has_column_privilege('authenticated','public.profiles','role','UPDATE'),'role update grant removed');
select pg_temp.assert(not has_column_privilege('authenticated','public.profiles','role','INSERT'),'role insert grant removed');
select pg_temp.assert(has_column_privilege('authenticated','public.profiles','display_name','UPDATE'),'ordinary profile editing retained');
select pg_temp.assert(not has_table_privilege('anon','public.tether_analyses','SELECT'),'anonymous Data API cannot enumerate private analyses');
select pg_temp.assert(not has_function_privilege('authenticated','public.tether_claim_job(integer)','EXECUTE'),'clients cannot claim worker jobs');
select pg_temp.assert(not has_schema_privilege('authenticated','tether_private','USAGE'),'private security functions are not exposed');

-- Defense in depth: even if a future migration accidentally regrants the
-- column, the trigger rejects authorization changes under a genuine SQL role.
grant update(role),insert(role,email) on public.profiles to authenticated;
select set_config('request.jwt.claims',json_build_object('sub',user_id,'role','authenticated')::text,true) from fixtures;
grant select on fixtures to authenticated;
set local role authenticated;
do $$ begin
  begin update public.profiles set role='admin' where id=(select user_id from fixtures); raise exception 'role update was allowed';
  exception when insufficient_privilege then null; end;
  update public.profiles set display_name='An ordinary reader' where id=(select user_id from fixtures);
end $$;
reset role;
select pg_temp.assert((select role='user' and display_name='An ordinary reader' from public.profiles where id=(select user_id from fixtures)),'profile edit succeeds without role escalation');
delete from public.profiles where id=(select user_id from fixtures);
set local role authenticated;
do $$ begin
  begin insert into public.profiles(id,role) select user_id,'admin' from fixtures; raise exception 'role insertion was allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ declare job jsonb; same_job jsonb; units_before bigint; published uuid; payload jsonb; begin
  job=public.tether_enqueue('analysis','transaction-test','test:'||(select user_id::text from fixtures),(select user_id from fixtures),'{}','transaction-test',1,1000000,1000000);
  same_job=public.tether_enqueue('analysis','transaction-test','test:'||(select user_id::text from fixtures),(select user_id from fixtures),'{}','transaction-test',1,1000000,1000000);
  perform pg_temp.assert(job->>'id'=same_job->>'id','enqueue idempotency');
  select units into units_before from public.tether_usage where scope_key='requests:global' and day=(now() at time zone 'utc')::date;
  begin
    perform public.tether_enqueue('analysis','second-request','test:'||(select user_id::text from fixtures),(select user_id from fixtures),'{}','transaction-test',1,1000000,1000000);
    raise exception 'quota did not reject';
  exception when sqlstate 'P0001' then if sqlerrm='quota did not reject' then raise; end if; end;
  perform pg_temp.assert((select units=units_before from public.tether_usage where scope_key='requests:global' and day=(now() at time zone 'utc')::date),'failed quota reservation rolls back all counters');
  update fixtures set job_id=(job->>'id')::uuid;
  update public.tether_jobs set status='running',lease_token=(select lease from fixtures),lease_expires_at=now()-interval '1 second',attempts=1 where id=(select job_id from fixtures);
  payload=jsonb_build_object('id',(select analysis_id from fixtures),'situationId',(select situation_id from fixtures),'snapshotId',(select snapshot_id from fixtures),'previousId',null,'title','Transactional test','inputMode','text','engineVersion','test','state','partial','sources',jsonb_build_array(jsonb_build_object('id','private-test-source','title','Private synthetic test material','summary','This text must be removed with the test account.')),'evidenceCutoff',now());
  begin
    perform public.tether_publish((select job_id from fixtures),(select lease from fixtures),jsonb_build_object('identityKey','test:'||(select user_id::text from fixtures)),'{"fingerprint":"test"}',payload);
    raise exception 'expired lease published';
  exception when serialization_failure then null; end;
  perform pg_temp.assert(not exists(select 1 from public.tether_situations where id=(select situation_id from fixtures)),'expired lease leaves no partial publication');
  update public.tether_jobs set lease_expires_at=now()+interval '3 minutes' where id=(select job_id from fixtures);
  published=public.tether_publish((select job_id from fixtures),(select lease from fixtures),jsonb_build_object('identityKey','test:'||(select user_id::text from fixtures)),'{"fingerprint":"test"}',payload);
  perform pg_temp.assert(published=(select analysis_id from fixtures),'publication succeeds with a valid lease');
  perform pg_temp.assert((select status='succeeded' and result_id=published from public.tether_jobs where id=(select job_id from fixtures)),'job completion and published pointer commit together');
  begin update public.tether_analyses set payload='{}' where id=published; raise exception 'analysis version mutated'; exception when insufficient_privilege then null; end;
end $$;

select pg_temp.assert(exists(select 1 from public.tether_sources where situation_id=(select situation_id from fixtures)),'private sources are scoped to their situation');
delete from auth.users where id=(select user_id from fixtures);
select pg_temp.assert(not exists(select 1 from public.tether_situations where id=(select situation_id from fixtures)),'account deletion removes private situations');
select pg_temp.assert(not exists(select 1 from public.tether_sources where situation_id=(select situation_id from fixtures)),'account deletion removes submitted source text');
select pg_temp.assert(not exists(select 1 from public.tether_jobs where id=(select job_id from fixtures)),'account deletion removes job input');
select 'Authorization, private access, quotas, idempotency, leases, atomic publication and immutability passed. All fixtures rolled back.' as result;
rollback;
