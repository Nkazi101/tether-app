begin;
do $$ declare task uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); result boolean; begin
 assert not has_table_privilege('anon','public.tether_research_gaps','SELECT');
 assert not has_table_privilege('authenticated','public.tether_canon_checks','SELECT');
 assert not has_function_privilege('authenticated','public.tether_public_source_flags()','EXECUTE');
 assert not has_function_privilege('anon','public.tether_complete_canon_check(uuid,uuid,uuid,text,text,jsonb)','EXECUTE');
 assert (select relrowsecurity from pg_class where oid='public.tether_research_gaps'::regclass);
 assert (select relrowsecurity from pg_class where oid='public.tether_canon_checks'::regclass);
 insert into public.tether_canon_checks(id,run_key,case_id,case_version,status,reason) values(task,'qa-canon-'||task,'qa-case','1','queued','Synthetic source-check fixture.');
 insert into public.tether_jobs(id,kind,idempotency_key,owner_key,payload,status,attempts,lease_token,lease_expires_at)
 values(job,'research','qa-canon-'||job,'system:canon',jsonb_build_object('canonCheck','qa-canon-'||task),'running',1,lease,now()+interval '5 minutes');
 result:=public.tether_complete_canon_check(job,gen_random_uuid(),task,'parked','Foreign lease cannot change a check.');assert not result;
 result:=public.tether_complete_canon_check(job,lease,task,'parked','Source access was insufficient; no factual verdict.');assert result;
 assert (select status='parked' from public.tether_canon_checks where id=task);
 result:=public.tether_complete_canon_check(job,lease,task,'passed','A completed task cannot publish again.','{}');assert not result;
 assert not public.tether_record_research_gap(gen_random_uuid(),repeat('a',64),'no-structural-match','{}');
 task:=gen_random_uuid();
 insert into public.tether_canon_checks(id,run_key,case_id,case_version,status,reason) values(task,'qa-canon-'||task,'qa-case','1','queued','Synthetic successful check fixture.');
 update public.tether_jobs set payload=jsonb_build_object('canonCheck','qa-canon-'||task) where id=job;
 result:=public.tether_complete_canon_check(job,lease,task,'passed','A synthetic checked version is appended atomically.',jsonb_build_object('historicalCase',jsonb_build_object('id','qa-case','version','qa-checked'),'reviewer','QA fixture','reviewedAt',now()));assert result;
 assert exists(select 1 from public.tether_case_versions where case_id='qa-case' and version='qa-checked');
end $$;
rollback;
