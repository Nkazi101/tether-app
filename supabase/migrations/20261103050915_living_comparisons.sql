-- Authorization is not a user-editable profile attribute. Protect grants and
-- the write itself, including INSERT, so later broad grants cannot reopen it.
create schema if not exists tether_private;
revoke all on schema tether_private from public, anon, authenticated;
grant usage on schema tether_private to service_role;

create or replace function tether_private.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if (tg_op = 'INSERT' and new.role <> 'user') or
       (tg_op = 'UPDATE' and new.role is distinct from old.role) then
      raise exception 'Profile authorization cannot be changed by clients' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function tether_private.guard_profile_role() from public;
drop trigger if exists guard_profile_authorization on public.profiles;
create trigger guard_profile_authorization before insert or update on public.profiles
for each row execute function tether_private.guard_profile_role();
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url) on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- All archive/operational reads now pass through the bounded API. Old default
-- grants must not leave alternate GraphQL/Data API paths around those checks.
do $$ declare name text; begin
  foreach name in array array['analysis_runs','coverage_reports','curations','current_event_articles','current_event_mechanisms','current_events','daily_echoes','deep_dives','domains','event_types','gdelt_event_index','gdelt_historical_episodes','gdelt_historical_episode_memberships','gdelt_historical_episode_sources','gdelt_snapshots','historical_case_mechanisms','historical_case_sources','historical_cases','historical_events','mechanisms','page_snapshots','parallel_candidates','pipeline_runs','raw_articles','user_preferences'] loop
    if to_regclass('public.'||name) is not null then
      execute format('revoke all on public.%I from anon, authenticated',name);
      execute format('grant all on public.%I to service_role',name);
    end if;
  end loop;
end $$;
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.prosecdef or p.proname like 'search_%' or p.proname like 'match_%' or p.proname like 'count_%') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
  if to_regprocedure('public.handle_new_user()') is not null then
    alter function public.handle_new_user() set schema tether_private;
  end if;
end $$;

create table if not exists public.tether_situations (
  id uuid primary key default gen_random_uuid(), identity_key text not null unique,
  owner_key text not null, owner_user_id uuid references auth.users(id) on delete cascade,
  title text not null, is_public boolean not null default false,
  is_walkthrough boolean not null default false,
  latest_analysis_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tether_situations add column if not exists is_walkthrough boolean not null default false;
create table if not exists public.tether_sources (
  id uuid primary key default gen_random_uuid(), content_hash text not null unique,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'), created_at timestamptz not null default now()
);
create table if not exists public.tether_snapshots (
  id uuid primary key, situation_id uuid not null references public.tether_situations(id) on delete cascade,
  fingerprint text not null, evidence_cutoff timestamptz not null, payload jsonb not null,
  created_at timestamptz not null default now(), unique(situation_id, fingerprint)
);
create table if not exists public.tether_analyses (
  id uuid primary key, situation_id uuid not null references public.tether_situations(id) on delete cascade,
  snapshot_id uuid not null references public.tether_snapshots(id), previous_id uuid references public.tether_analyses(id),
  engine_version text not null, state text not null check(state in ('supported','partial','insufficient-evidence','needs-clarification')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'), created_at timestamptz not null default now()
);
create index if not exists tether_analyses_situation_time on public.tether_analyses(situation_id, created_at desc);
create index if not exists tether_situations_owner_time on public.tether_situations(owner_key, updated_at desc);
create index if not exists tether_situations_public_time on public.tether_situations(updated_at desc) where is_public;
create table if not exists public.tether_jobs (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('analysis','observation','ingest','refresh')),
  idempotency_key text not null, owner_key text not null, owner_user_id uuid references auth.users(id) on delete cascade,
  payload jsonb not null, status text not null default 'queued' check(status in ('queued','running','succeeded','failed')),
  attempts integer not null default 0, max_attempts integer not null default 3, lease_token uuid, lease_expires_at timestamptz,
  available_at timestamptz not null default now(), result_id uuid references public.tether_analyses(id),
  error_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_key, idempotency_key)
);
create index if not exists tether_jobs_pending on public.tether_jobs(available_at, created_at) where status in ('queued','running');
create index if not exists tether_jobs_owner on public.tether_jobs(owner_key, created_at desc);
create table if not exists public.tether_usage (
  scope_key text not null, day date not null default (now() at time zone 'utc')::date,
  units bigint not null default 0 check(units >= 0), primary key(scope_key, day)
);
create table if not exists public.tether_reading (
  user_id uuid not null references auth.users(id) on delete cascade,
  situation_id uuid not null references public.tether_situations(id) on delete cascade,
  saved_analysis_id uuid references public.tether_analyses(id), following boolean not null default false,
  last_read_id uuid references public.tether_analyses(id), updated_at timestamptz not null default now(),
  primary key(user_id, situation_id)
);
create index if not exists tether_reading_following on public.tether_reading(user_id, updated_at desc) where following;
create table if not exists public.tether_observations (
  id uuid primary key, situation_id uuid not null references public.tether_situations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, indicator_id text not null,
  direction text not null check(direction in ('strengthens','weakens','unclear','retracted')),
  payload jsonb not null, observed_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.tether_forecasts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  situation_id uuid not null references public.tether_situations(id) on delete cascade,
  question text not null, criteria text not null, resolution_source text not null, closes_at timestamptz not null,
  outcome smallint check(outcome in (0,1)), resolution_note text, resolved_at timestamptz,
  created_at timestamptz not null default now(), check(closes_at > created_at),
  check ((outcome is null and resolved_at is null) or (outcome is not null and resolved_at is not null))
);
create index if not exists tether_forecasts_owner on public.tether_forecasts(user_id, created_at desc);
create table if not exists public.tether_forecast_revisions (
  id uuid primary key default gen_random_uuid(), forecast_id uuid not null references public.tether_forecasts(id) on delete cascade,
  probability numeric not null check(probability between 0 and 1), rationale text not null, created_at timestamptz not null default now()
);
create index if not exists tether_forecast_revision_time on public.tether_forecast_revisions(forecast_id, created_at);

-- Exposed tables default to no direct client access. The API enforces both
-- anonymous session ownership and authenticated identity before service writes.
do $$ declare name text; begin
  foreach name in array array['tether_situations','tether_sources','tether_snapshots','tether_analyses','tether_jobs','tether_usage','tether_reading','tether_observations','tether_forecasts','tether_forecast_revisions'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from anon, authenticated', name);
    execute format('grant all on public.%I to service_role', name);
  end loop;
end $$;

create or replace function tether_private.immutable_payload()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Evidence and analysis versions are append-only' using errcode = '42501'; end;
$$;
revoke all on function tether_private.immutable_payload() from public;
do $$ declare name text; begin
  foreach name in array array['tether_sources','tether_snapshots','tether_analyses','tether_observations','tether_forecast_revisions'] loop
    execute format('drop trigger if exists immutable_version on public.%I',name);
    execute format('create trigger immutable_version before update on public.%I for each row execute function tether_private.immutable_payload()', name);
  end loop;
end $$;

create or replace function tether_private.reserve(p_key text, p_limit bigint, p_amount bigint default 1)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used bigint;
begin
  if p_amount < 1 or p_limit < 1 then return false; end if;
  insert into public.tether_usage(scope_key,units) values(p_key,0) on conflict do nothing;
  update public.tether_usage set units=units+p_amount
    where scope_key=p_key and day=(now() at time zone 'utc')::date and units+p_amount<=p_limit returning units into used;
  return found;
end; $$;

create or replace function public.tether_reserve_model(p_key text, p_limit bigint, p_amount bigint)
returns boolean language sql set search_path = '' as $$ select tether_private.reserve(p_key,p_limit,p_amount); $$;

create or replace function public.tether_enqueue(p_kind text,p_key text,p_owner text,p_user uuid,p_payload jsonb,p_ip text,p_user_limit integer,p_ip_limit integer,p_global_limit integer)
returns jsonb language plpgsql set search_path = '' as $$
declare job public.tether_jobs;
begin
  perform pg_advisory_xact_lock(hashtextextended('tether:enqueue',0));
  select * into job from public.tether_jobs where owner_key=p_owner and idempotency_key=p_key;
  if found then return to_jsonb(job); end if;
  if length(p_payload::text)>60000 then raise exception 'Input too large' using errcode='22001'; end if;
  if (select count(*) from public.tether_jobs where owner_key=p_owner and status in ('queued','running')) >= (case when p_owner like 'system:%' then 250 else 3 end) then
    raise exception 'Three requests are already in progress. Please wait.' using errcode='P0001';
  end if;
  if not tether_private.reserve('requests:global',p_global_limit) or
     not tether_private.reserve('requests:ip:'||p_ip,p_ip_limit) or
     not tether_private.reserve('requests:owner:'||p_owner,p_user_limit) then
    raise exception 'Daily request allowance reached. Please try again tomorrow.' using errcode='P0001';
  end if;
  insert into public.tether_jobs(kind,idempotency_key,owner_key,owner_user_id,payload)
    values(p_kind,p_key,p_owner,p_user,p_payload) returning * into job;
  return to_jsonb(job);
end; $$;

create or replace function public.tether_claim_job(p_lease_seconds integer default 180)
returns jsonb language plpgsql set search_path = '' as $$
declare job public.tether_jobs;
begin
  update public.tether_jobs set status='failed',error_message='The worker could not complete this request after bounded retries.',updated_at=now()
    where status='running' and lease_expires_at<now() and attempts>=max_attempts;
  select * into job from public.tether_jobs where
    (status='queued' and available_at<=now() or status='running' and lease_expires_at<now()) and attempts<max_attempts
    order by available_at,created_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.tether_jobs set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),
    lease_expires_at=now()+make_interval(secs=>least(600,greatest(30,p_lease_seconds))),updated_at=now()
    where id=job.id returning * into job;
  return to_jsonb(job);
end; $$;

create or replace function public.tether_renew_job(p_id uuid,p_lease uuid)
returns boolean language plpgsql set search_path = '' as $$
begin update public.tether_jobs set lease_expires_at=now()+interval '180 seconds',updated_at=now()
  where id=p_id and lease_token=p_lease and status='running' and lease_expires_at>now(); return found; end; $$;

create or replace function public.tether_fail_job(p_id uuid,p_lease uuid,p_error text,p_retry boolean default true)
returns boolean language plpgsql set search_path = '' as $$
begin update public.tether_jobs set status=case when p_retry and attempts<max_attempts then 'queued' else 'failed' end,
  available_at=now()+make_interval(secs=>least(120,power(2,attempts)::integer)),error_message=left(p_error,500),lease_expires_at=null,updated_at=now()
  where id=p_id and lease_token=p_lease and status='running'; return found; end; $$;

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
    insert into public.tether_sources(content_hash,payload) values(encode(extensions.digest(src::text,'sha256'),'hex'),src) on conflict do nothing;
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

create or replace function public.tether_finish_job(p_id uuid,p_lease uuid)
returns boolean language plpgsql set search_path = '' as $$
begin update public.tether_jobs set status='succeeded',lease_expires_at=null,updated_at=now() where id=p_id and lease_token=p_lease and status='running' and lease_expires_at>now(); return found; end; $$;

create or replace function public.tether_reuse_job(p_id uuid,p_lease uuid,p_result uuid)
returns boolean language plpgsql set search_path = '' as $$
begin update public.tether_jobs set status='succeeded',result_id=p_result,lease_expires_at=null,error_message=null,updated_at=now()
  where id=p_id and lease_token=p_lease and status='running' and lease_expires_at>now(); return found; end; $$;

-- Journal writes lock the question, so revisions cannot race resolution.
create or replace function public.tether_forecast_write(p_user uuid,p_situation uuid,p_forecast uuid,p_input jsonb,p_action text)
returns uuid language plpgsql set search_path = '' as $$
declare f public.tether_forecasts; fid uuid;
begin
  if p_action='create' then
    if (p_input->>'closesAt')::timestamptz<=now() then raise exception 'Choose a future closing date'; end if;
    insert into public.tether_forecasts(user_id,situation_id,question,criteria,resolution_source,closes_at)
      values(p_user,p_situation,p_input->>'question',p_input->>'criteria',p_input->>'resolutionSource',(p_input->>'closesAt')::timestamptz) returning id into fid;
  else
    select * into f from public.tether_forecasts where id=p_forecast and user_id=p_user for update;
    if not found then raise exception 'Forecast not found' using errcode='42501'; end if;
    if f.outcome is not null then raise exception 'A resolved forecast cannot be changed'; end if;
    fid=f.id;
    if p_action='resolve' then
      if f.closes_at>now() then raise exception 'Resolve after the closing date'; end if;
      update public.tether_forecasts set outcome=(p_input->>'outcome')::smallint,resolution_note=p_input->>'note',resolved_at=now() where id=fid;
      return fid;
    end if;
    if p_action<>'revise' or f.closes_at<=now() then raise exception 'Forecast is closed'; end if;
  end if;
  insert into public.tether_forecast_revisions(forecast_id,probability,rationale)
    values(fid,(p_input->>'probability')::numeric,p_input->>'rationale');
  return fid;
end; $$;

create or replace function public.tether_claim_situation(p_id uuid,p_guest text,p_user uuid)
returns boolean language plpgsql set search_path = '' as $$
begin
  update public.tether_situations set owner_key='user:'||p_user::text,owner_user_id=p_user
    where id=p_id and owner_key=p_guest and not is_public;
  return found;
end; $$;

create or replace function public.tether_recent_reporting()
returns jsonb language sql set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('situation',to_jsonb(s),'analysis',a.payload)),'[]'::jsonb)
  from (select * from public.tether_situations where is_public and owner_key='system:reporting' and updated_at>now()-interval '7 days' order by updated_at desc limit 100) s
  join public.tether_analyses a on a.id=s.latest_analysis_id;
$$;

create or replace function public.tether_reading_update(p_user uuid,p_situation uuid,p_patch jsonb)
returns void language sql set search_path = '' as $$
  insert into public.tether_reading(user_id,situation_id,following,saved_analysis_id,last_read_id)
    values(p_user,p_situation,coalesce((p_patch->>'following')::boolean,false),(p_patch->>'savedAnalysisId')::uuid,(p_patch->>'lastReadId')::uuid)
    on conflict(user_id,situation_id) do update set
      following=case when p_patch ? 'following' then (p_patch->>'following')::boolean else tether_reading.following end,
      saved_analysis_id=case when p_patch ? 'savedAnalysisId' then (p_patch->>'savedAnalysisId')::uuid else tether_reading.saved_analysis_id end,
      last_read_id=case when p_patch ? 'lastReadId' then (p_patch->>'lastReadId')::uuid else tether_reading.last_read_id end,
      updated_at=now();
$$;

revoke all on all functions in schema tether_private from public,anon,authenticated;
grant execute on all functions in schema tether_private to service_role;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'tether_%' loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
