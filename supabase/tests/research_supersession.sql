begin;
do $$
declare s public.tether_situations%rowtype; old_id uuid=gen_random_uuid(); current_id uuid=gen_random_uuid(); private_id uuid=gen_random_uuid(); live_id uuid=gen_random_uuid(); key_id uuid=gen_random_uuid();
begin
 assert not has_function_privilege('anon','public.tether_supersede_public_research(uuid[],text,timestamptz)','EXECUTE'),'Guest cannot retire work';
 assert not has_function_privilege('authenticated','public.tether_supersede_public_research(uuid[],text,timestamptz)','EXECUTE'),'Signed-in users cannot retire work';
 select * into s from public.tether_situations where is_public and not is_walkthrough and owner_key like 'system:%' limit 1;
 insert into public.tether_jobs(id,kind,idempotency_key,owner_key,payload,status) values
 (old_id,'research','qa-old:'||old_id,s.owner_key,jsonb_build_object('situationId',s.id,'method','old-method'),'queued'),
 (current_id,'research','qa-current:'||current_id,s.owner_key,jsonb_build_object('situationId',s.id,'method','narrative-research-10'),'queued'),
 (private_id,'research','qa-private:'||private_id,'guest:private-supersession-test',jsonb_build_object('situationId',s.id,'method','old-method'),'queued'),
 (key_id,'research','qa:narrative-research-10:'||key_id,s.owner_key,jsonb_build_object('situationId',s.id),'queued');
 insert into public.tether_jobs(id,kind,idempotency_key,owner_key,payload,status,lease_token,lease_expires_at,attempts) values
 (live_id,'research','qa-live:'||live_id,s.owner_key,jsonb_build_object('situationId',s.id,'method','old-method'),'running',gen_random_uuid(),now()+interval '3 minutes',1);
 perform public.tether_supersede_public_research(array[s.id],'narrative-research-10',now()+interval '1 minute');
 assert (select status='failed' from public.tether_jobs where id=old_id),'Obsolete automated request retired';
 assert (select status='queued' from public.tether_jobs where id=current_id),'Current method request preserved';
 assert (select status='queued' from public.tether_jobs where id=key_id),'Method in the idempotency key remains recognised';
 assert (select status='queued' from public.tether_jobs where id=private_id),'Private reader request preserved';
 assert (select status='running' from public.tether_jobs where id=live_id),'Live lease preserved';
end $$;
rollback;
