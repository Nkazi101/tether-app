-- Background discovery cannot spend the request allowance reserved for readers.
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
  if not tether_private.reserve(case when p_owner like 'system:%' then 'requests:background' else 'requests:global' end,p_global_limit) or
     not tether_private.reserve('requests:ip:'||p_ip,p_ip_limit) or
     not tether_private.reserve('requests:owner:'||p_owner,p_user_limit) then
    raise exception 'Daily request allowance reached. Please try again tomorrow.' using errcode='P0001';
  end if;
  insert into public.tether_jobs(kind,idempotency_key,owner_key,owner_user_id,payload)
    values(p_kind,p_key,p_owner,p_user,p_payload) returning * into job;
  return to_jsonb(job);
end; $$;

