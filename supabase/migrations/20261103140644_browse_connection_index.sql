-- Ready connections are a separate browse view, not a change to news dates.
alter table public.tether_situations add column has_parallel boolean not null default false;
update public.tether_situations s set has_parallel=(nullif(a.payload->'primary','null'::jsonb) is not null) from public.tether_analyses a where a.id=s.latest_analysis_id;
create index tether_situations_connections on public.tether_situations(reported_at desc,id desc) where is_public and not is_walkthrough and has_parallel;
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
  update public.tether_situations set has_parallel=(nullif(p_analysis->'primary','null'::jsonb) is not null),latest_analysis_id=(p_analysis->>'id')::uuid,title=p_analysis->>'title',topic=coalesce(p_analysis->>'topic','general'),reported_at=coalesce((p_analysis->'sources'->0->>'publishedAt')::timestamptz,reported_at),updated_at=now() where id=sid;
  update public.tether_jobs set status='succeeded',result_id=(p_analysis->>'id')::uuid,lease_expires_at=null,error_message=null,updated_at=now() where id=p_job;
  return (p_analysis->>'id')::uuid;
end; $$;

