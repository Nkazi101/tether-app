-- Deferral also covers provider outages, not just the daily model allowance.
create or replace function public.tether_defer_job(p_id uuid, p_lease uuid, p_available timestamptz, p_checkpoint jsonb default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_available <= now() or p_available > now()+interval '2 days' then
    raise exception 'Invalid research deferral';
  end if;
  if p_checkpoint is not null and (jsonb_typeof(p_checkpoint)<>'object' or octet_length(p_checkpoint::text)>200000) then
    raise exception 'Invalid current episode checkpoint';
  end if;
  update public.tether_jobs
    set status='queued', available_at=p_available, lease_token=null, lease_expires_at=null,
        payload=case when p_checkpoint is null then payload else jsonb_set(payload,'{currentCheckpoint}',p_checkpoint) end,
        attempts=greatest(0,attempts-1), error_message='Research will retry; existing published readings are retained.', updated_at=now()
    where id=p_id and kind in ('research','analysis') and status='running' and lease_token=p_lease and lease_expires_at>=now();
  return found;
end; $$;
revoke all on function public.tether_defer_job(uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.tether_defer_job(uuid,uuid,timestamptz,jsonb) to service_role;
