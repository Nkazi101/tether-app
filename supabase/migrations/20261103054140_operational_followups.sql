-- Link source versions to their situation so deleting private work does not
-- leave unowned copies of submitted text. Retained jobs must not block deletion.
alter table public.tether_jobs drop constraint if exists tether_jobs_result_id_fkey;
alter table public.tether_jobs add constraint tether_jobs_result_id_fkey foreign key(result_id) references public.tether_analyses(id) on delete set null;
alter table public.tether_sources add column if not exists situation_id uuid references public.tether_situations(id) on delete cascade;
drop trigger if exists immutable_version on public.tether_sources;
alter table public.tether_sources drop constraint if exists tether_sources_content_hash_key;
update public.tether_sources s set situation_id=(
 select a.situation_id from public.tether_analyses a cross join lateral jsonb_array_elements(a.payload->'sources') src
 where encode(extensions.digest(src::text,'sha256'),'hex')=s.content_hash limit 1
) where situation_id is null;
create unique index if not exists tether_sources_situation_hash on public.tether_sources(situation_id,content_hash);
insert into public.tether_sources(content_hash,payload,situation_id)
 select distinct encode(extensions.digest(src::text,'sha256'),'hex'),src,a.situation_id
 from public.tether_analyses a cross join lateral jsonb_array_elements(a.payload->'sources') src on conflict do nothing;
alter table public.tether_sources alter column situation_id set not null;
create trigger immutable_version before update on public.tether_sources for each row execute function tether_private.immutable_payload();

create or replace function public.tether_publish(p_job uuid,p_lease uuid,p_situation jsonb,p_snapshot jsonb,p_analysis jsonb,p_observation jsonb default null)
returns uuid language plpgsql set search_path = '' as $$
declare job public.tether_jobs; sid uuid; previous uuid; src jsonb;
begin
  select * into job from public.tether_jobs where id=p_job for update;
  if not found or job.status<>'running' or job.lease_token is distinct from p_lease or job.lease_expires_at<now() then
    raise exception 'Job lease expired' using errcode='40001';
  end if;
  sid=(p_analysis->>'situationId')::uuid;
  insert into public.tether_situations(id,identity_key,owner_key,owner_user_id,title,is_public,is_walkthrough)
    values(sid,p_situation->>'identityKey',job.owner_key,job.owner_user_id,p_analysis->>'title',coalesce((p_situation->>'isPublic')::boolean,false),(p_analysis->>'inputMode')='walkthrough')
    on conflict(id) do nothing;
  select latest_analysis_id into previous from public.tether_situations where id=sid and owner_key=job.owner_key for update;
  if not found then raise exception 'Situation ownership mismatch' using errcode='42501'; end if;
  if previous is distinct from nullif(p_analysis->>'previousId','')::uuid then raise exception 'Situation changed during analysis' using errcode='40001'; end if;
  for src in select * from jsonb_array_elements(p_analysis->'sources') loop
    insert into public.tether_sources(content_hash,payload,situation_id) values(encode(extensions.digest(src::text,'sha256'),'hex'),src,sid) on conflict do nothing;
  end loop;
  insert into public.tether_snapshots(id,situation_id,fingerprint,evidence_cutoff,payload)
    values((p_analysis->>'snapshotId')::uuid,sid,p_snapshot->>'fingerprint',(p_analysis->>'evidenceCutoff')::timestamptz,p_snapshot);
  insert into public.tether_analyses(id,situation_id,snapshot_id,previous_id,engine_version,state,payload)
    values((p_analysis->>'id')::uuid,sid,(p_analysis->>'snapshotId')::uuid,previous,p_analysis->>'engineVersion',p_analysis->>'state',p_analysis);
  if p_observation is not null then
    insert into public.tether_observations(id,situation_id,user_id,indicator_id,direction,payload,observed_at)
      values((p_observation->>'id')::uuid,sid,job.owner_user_id,p_observation->>'indicatorId',p_observation->>'direction',p_observation,(p_observation->>'observedAt')::timestamptz);
  end if;
  update public.tether_situations set latest_analysis_id=(p_analysis->>'id')::uuid,title=p_analysis->>'title',updated_at=now() where id=sid;
  update public.tether_jobs set status='succeeded',result_id=(p_analysis->>'id')::uuid,lease_expires_at=null,error_message=null,updated_at=now() where id=p_job;
  return (p_analysis->>'id')::uuid;
end; $$;
create or replace function public.tether_claim_job(p_lease_seconds integer default 180)
returns jsonb language plpgsql set search_path = '' as $$
declare job public.tether_jobs;
begin
  update public.tether_jobs set status='failed',error_message='The worker could not complete this request after bounded retries.',updated_at=now()
    where status='running' and lease_expires_at<now() and attempts>=max_attempts;
  select * into job from public.tether_jobs where
    (status='queued' and available_at<=now() or status='running' and lease_expires_at<now()) and attempts<max_attempts
    order by (case when owner_key like 'system:%' then 1 else 0 end),available_at,created_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.tether_jobs set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),
    lease_expires_at=now()+make_interval(secs=>least(600,greatest(30,p_lease_seconds))),updated_at=now()
    where id=job.id returning * into job;
  return to_jsonb(job);
end; $$;

create or replace function public.tether_claim_situation(p_id uuid,p_guest text,p_user uuid)
returns boolean language plpgsql set search_path = '' as $$
begin
  update public.tether_situations set owner_key='user:'||p_user::text,owner_user_id=p_user where id=p_id and owner_key=p_guest and not is_public;
  if not found then return false; end if;
  update public.tether_jobs set owner_key='user:'||p_user::text,owner_user_id=p_user
   where owner_key=p_guest and (result_id in (select id from public.tether_analyses where situation_id=p_id) or payload->>'situationId'=p_id::text);
  return true;
end; $$;

revoke all on function public.tether_claim_situation(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.tether_claim_situation(uuid,text,uuid) to service_role;
