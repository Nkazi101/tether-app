-- Upgrade automatic public investigations without consuming every queue slot
-- with requests for retired methods. User-owned requests and live leases remain.
create function public.tether_supersede_public_research(p_situations uuid[],p_method text,p_before timestamptz)
returns jsonb language sql set search_path='' as $$
 with retired as (
  update public.tether_jobs j set status='failed',error_message='Superseded by a newer automated public research method; published versions retained.',updated_at=now()
  from public.tether_situations s
  where s.id=any(p_situations) and s.is_public and not s.is_walkthrough and s.owner_key like 'system:%'
   and j.owner_key=s.owner_key and j.owner_user_id is null and j.kind='research' and j.status='queued'
   and j.payload->>'situationId'=s.id::text and j.created_at<p_before
   and coalesce(j.payload->>'method','')<>p_method and position(p_method in j.idempotency_key)=0
  returning j.id
 ) select coalesce(jsonb_agg(id),'[]'::jsonb) from retired;
$$;
revoke all on function public.tether_supersede_public_research(uuid[],text,timestamptz) from public,anon,authenticated;
grant execute on function public.tether_supersede_public_research(uuid[],text,timestamptz) to service_role;
