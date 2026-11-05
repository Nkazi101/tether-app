-- Browse ordering belongs to the event's reporting date, independent of research completion.
alter table public.tether_situations add column topic text not null default 'general';
alter table public.tether_situations add column reported_at timestamptz not null default now();
update public.tether_situations s set reported_at=coalesce((a.payload->'sources'->0->>'publishedAt')::timestamptz,s.updated_at)
 from public.tether_analyses a where a.id=s.latest_analysis_id;
create index tether_situations_browse on public.tether_situations(reported_at desc,id desc) where is_public and not is_walkthrough;
create index tether_situations_topic_browse on public.tether_situations(topic,reported_at desc,id desc) where is_public and not is_walkthrough;
alter table public.tether_jobs drop constraint tether_jobs_kind_check;
alter table public.tether_jobs add constraint tether_jobs_kind_check check(kind in ('analysis','observation','ingest','research'));
create or replace function public.tether_feed_counts()
returns jsonb language sql set search_path = '' as $$
 select coalesce(jsonb_object_agg(topic,n),'{}'::jsonb) from (
 select topic,count(*) n from public.tether_situations where is_public and not is_walkthrough and reported_at>now()-interval '7 days' group by topic) counts;
$$;
revoke all on function public.tether_feed_counts() from public,anon,authenticated;
grant execute on function public.tether_feed_counts() to service_role;
alter table public.tether_case_versions add column search_tsv tsvector generated always as
 (to_tsvector('english'::regconfig,coalesce(payload->'historicalCase'->>'title','')||' '||coalesce(payload->'historicalCase'->>'initialState',''))) stored;
create index tether_case_versions_search on public.tether_case_versions using gin(search_tsv);

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
  if p_observation is not null then
    insert into public.tether_reading(user_id,situation_id,following,saved_analysis_id)
      values(job.owner_user_id,sid,true,(p_analysis->>'id')::uuid)
      on conflict(user_id,situation_id) do update set following=true,updated_at=now();
  end if;
  update public.tether_situations set latest_analysis_id=(p_analysis->>'id')::uuid,title=p_analysis->>'title',topic=coalesce(p_analysis->>'topic','general'),reported_at=coalesce((p_analysis->'sources'->0->>'publishedAt')::timestamptz,reported_at),updated_at=now() where id=sid;
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
    order by (case when owner_key not like 'system:%' then 0 when kind='research' then 2 else 1 end),available_at,created_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.tether_jobs set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),
    lease_expires_at=now()+make_interval(secs=>least(600,greatest(30,p_lease_seconds))),updated_at=now()
    where id=job.id returning * into job;
  return to_jsonb(job);
end; $$;

