begin;
do $$
declare
 s public.tether_situations%rowtype;
 a public.tether_analyses%rowtype;
 probe uuid;
 -- Synthetic metadata fixture for discoverability, not a historical truth test.
 fixture jsonb=$json${
  "sources":[{"kind":"reporting","publishedAt":"2026-11-04T12:00:00Z"}],
  "evidenceCutoff":"2026-11-04T12:00:00Z",
  "research":{"version":"narrative-research-10"},
  "currentFrame":{"version":1,"cast":[],"facts":[]},
  "primary":{"id":"qa","narrativeRecord":{"endYear":1991,"cast":[],"facts":[]}},
  "alternatives":[],
  "narrativeLens":{"version":1,"parallels":[{"caseId":"qa","analogy":{"mapping":[
   {"now":"Current workers","then":"Earlier workers"},
   {"now":"Current employer","then":"Earlier employer"}
  ]}}]}
 }$json$::jsonb;
begin
 assert (select catalog.relrowsecurity from pg_class catalog where catalog.oid='public.tether_illumination'::regclass),'Feedback requires RLS';
 assert not has_table_privilege('anon','public.tether_illumination','SELECT,INSERT,UPDATE,DELETE'),'Feedback must remain private';
 assert not has_function_privilege('anon','public.tether_public_research_coverage()','EXECUTE'),'Service aggregate must not expose jobs';
 assert not has_function_privilege('authenticated','public.tether_public_research_coverage()','EXECUTE'),'Coverage remains API-mediated';
 assert (select pg_get_constraintdef(catalog.oid) like '%narrative-context-1%' from pg_constraint catalog where catalog.conname='tether_illumination_alignment_version_check'),'Context feedback method missing';
 select head.* into s from public.tether_situations head where head.is_public and not head.is_walkthrough and head.owner_key like 'system:%' limit 1;
 assert s.id is not null,'Need a reporting head for rollback-only publication check';
 select existing.* into a from public.tether_analyses existing where existing.id=s.latest_analysis_id;
 -- The trigger derives discoverability from the actual reading, not a caller boolean.
 probe=gen_random_uuid();
 insert into public.tether_analyses(id,situation_id,snapshot_id,previous_id,engine_version,state,payload) values(probe,s.id,a.snapshot_id,a.id,a.engine_version,a.state,(a.payload-'pairedStory')||fixture||jsonb_build_object('id',probe));
 a.id=probe;
 update public.tether_situations head set latest_analysis_id=a.id,has_aligned_pair=false where head.id=s.id;
 assert (select head.has_aligned_pair from public.tether_situations head where head.id=s.id),'Qualifying distant legacy readings remain discoverable';
 probe=gen_random_uuid();
 insert into public.tether_analyses(id,situation_id,snapshot_id,previous_id,engine_version,state,payload) values(probe,s.id,a.snapshot_id,a.id,a.engine_version,a.state,(a.payload-'pairedStory'-'narrativeLens')||jsonb_build_object('id',probe));
 a.id=probe;
 update public.tether_situations head set latest_analysis_id=a.id,has_aligned_pair=true where head.id=s.id;
 assert not (select head.has_aligned_pair from public.tether_situations head where head.id=s.id),'A caller cannot mark an absent reading as published';
end $$;
rollback;
