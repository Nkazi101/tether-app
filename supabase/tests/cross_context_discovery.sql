begin;
-- These are synthetic metadata fixtures for the database publication gate.
-- They do not claim historical facts or measure analogy accuracy.
do $$
declare
 payload jsonb=$json${
  "sources":[{"kind":"reporting","publishedAt":"2026-11-04T12:00:00Z"}],
  "evidenceCutoff":"2026-11-04T12:00:00Z",
  "research":{"version":"narrative-research-11","comparisonPolicy":"cross-context-1"},
  "currentFrame":{"cast":[{"actor":"Alex Rivera"},{"actor":"Current Team"}],"facts":[{"id":"n1"},{"id":"n2"}]},
  "primary":{"id":"qa:earlier-case","narrativeRecord":{"endYear":1991,"cast":[{"actor":"Jordan Hayes"},{"actor":"Earlier Team"}],"facts":[{"id":"h1"},{"id":"h2"}]}},
  "alternatives":[],"pairedStory":null,
  "narrativeLens":{"version":1,"parallels":[{
   "caseId":"qa:earlier-case",
   "analogy":{"mapping":[{"now":"Alex Rivera","then":"Jordan Hayes"},{"now":"Current Team","then":"Earlier Team"}]},
   "crossContext":{"version":"cross-context-1","actorChecks":[
    {"now":"Alex Rivera","then":"Jordan Hayes","nowKind":"person","thenKind":"person","relationship":"distinct","explanation":"Different named participants in different documented episodes."},
    {"now":"Current Team","then":"Earlier Team","nowKind":"organization","thenKind":"organization","relationship":"distinct","explanation":"Separate organisations in different documented episodes."}
   ],"continuingEpisode":false,"episodeSeparation":"The episodes involve separate decisions, people and immediate causal chains.","sharedParticipants":[]},
   "causalTest":{"driverMappings":[1],"nowLeverageFactIds":["n1"],"thenLeverageFactIds":["h1"],"mechanism":"The employer controls the input required for participation.","counterfactual":"Without that control the employer could not enforce the same exclusion."}
  }]}
 }$json$::jsonb;
 legacy jsonb;
 bad jsonb;
 paired jsonb;
 s public.tether_situations%rowtype;
 a public.tether_analyses%rowtype;
 original_payload jsonb;
 original_id uuid;
 probe uuid;
 private_before jsonb;
 private_after jsonb;
 coverage jsonb;
begin
 assert not has_function_privilege('anon','tether_private.has_cross_context_reading(jsonb)','EXECUTE'),'Guest cannot call private discoverability helper';
 assert not has_function_privilege('authenticated','tether_private.has_cross_context_reading(jsonb)','EXECUTE'),'Signed-in account cannot call private discoverability helper';
 assert not has_function_privilege('anon','tether_private.historical_actor_key(text)','EXECUTE'),'Name normalisation stays private';
 assert not has_function_privilege('anon','public.tether_public_research_coverage()','EXECUTE'),'Coverage remains API mediated';
 assert not has_function_privilege('authenticated','public.tether_public_research_coverage()','EXECUTE'),'Coverage aggregate is service-only';
 assert tether_private.has_cross_context_reading(payload),'Distinct cross-generational reading with explicit proof is eligible';
 bad=jsonb_set(payload,'{research}','{"version":"narrative-research-12"}'::jsonb);
 assert tether_private.has_cross_context_reading(bad),'Later methods retain valid explicit proof';
 assert not tether_private.has_cross_context_reading(bad#-'{narrativeLens,parallels,0,crossContext}'),'A later method cannot omit proof by omitting its policy marker';
 assert not tether_private.has_cross_context_reading(null),'Missing payload is ineligible';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels}','{}'::jsonb)),'Malformed metadata fails closed';

 legacy=jsonb_set(payload,'{research}','{"version":"narrative-research-10"}'::jsonb);
 legacy=legacy#-'{narrativeLens,parallels,0,crossContext}';
 legacy=legacy#-'{narrativeLens,parallels,0,causalTest}';
 assert tether_private.has_cross_context_reading(legacy),'A qualifying legacy reading remains accessible without pretending it has new proof';
 assert not tether_private.has_cross_context_reading(payload#-'{narrativeLens,parallels,0,crossContext}'),'Method 11 cannot omit identity proof';
 assert not tether_private.has_cross_context_reading(payload#-'{narrativeLens,parallels,0,causalTest}'),'Method 11 cannot omit causal drivers';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{primary,narrativeRecord,endYear}','2021'::jsonb)),'Five-year context cannot earn the discovery badge';
 assert not tether_private.has_cross_context_reading(jsonb_set(legacy,'{primary,narrativeRecord,endYear}','2002'::jsonb)),'Legacy 24-year gap is below the product boundary';
 assert tether_private.has_cross_context_reading(jsonb_set(legacy,'{primary,narrativeRecord,endYear}','2001'::jsonb)),'The 25-year product boundary is inclusive';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,crossContext,continuingEpisode}','true'::jsonb)),'A continuing episode is background, not independent recurrence';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,crossContext,actorChecks,0,relationship}','"same-person"'::jsonb)),'Same-person proof is rejected';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,crossContext,actorChecks,1,relationship}','"same-organization"'::jsonb)),'Organisational backstory is rejected';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,crossContext,actorChecks,0,relationship}','"unclear"'::jsonb)),'Unresolved principal identity is not a pass';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,crossContext,sharedParticipants}','[{"name":"Shared Person","kind":"person","significance":"principal","explanation":"A principal participant appears in both episodes."}]'::jsonb)),'Shared principal cannot hide outside the chosen mapping';
 bad=jsonb_set(legacy,'{currentFrame,cast,0,actor}','"Kim Kardashian"'::jsonb);
 bad=jsonb_set(bad,'{primary,narrativeRecord,cast,0,actor}','"Kim Kardashian"'::jsonb);
 assert not tether_private.has_cross_context_reading(bad),'Obvious same-person continuity is demoted even with an artificially old metadata date';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,causalTest,driverMappings}','[2]'::jsonb)),'A driver must refer to an actual mapping';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,causalTest,nowLeverageFactIds}','["missing"]'::jsonb)),'A causal driver needs a current fact reference';
 assert not tether_private.has_cross_context_reading(jsonb_set(payload,'{narrativeLens,parallels,0,causalTest,thenLeverageFactIds}','["missing"]'::jsonb)),'A causal driver needs a historical fact reference';

 -- An enduring public institution is not automatically the same personal actor.
 bad=jsonb_set(payload,'{narrativeLens,parallels,0,analogy,mapping,1}','{"now":"US Congress","then":"US Congress"}'::jsonb);
 bad=jsonb_set(bad,'{narrativeLens,parallels,0,crossContext,actorChecks,1}','{"now":"US Congress","then":"US Congress","nowKind":"public-institution","thenKind":"public-institution","relationship":"shared-public-institution","explanation":"The institution continues, but its leaders and the episode differ."}'::jsonb);
 bad=jsonb_set(bad,'{currentFrame,cast,1,actor}','"US Congress"'::jsonb);
 bad=jsonb_set(bad,'{primary,narrativeRecord,cast,1,actor}','"US Congress"'::jsonb);
 assert tether_private.has_cross_context_reading(bad),'Separate episodes involving a durable public institution may qualify';
 assert not tether_private.has_cross_context_reading(jsonb_set(bad,'{narrativeLens,parallels,0,crossContext,actorChecks,1,nowKind}','"organization"'::jsonb)),'Private organisations cannot use the enduring-public-institution exception';

 paired=jsonb_build_object('sources',payload->'sources','evidenceCutoff',payload->'evidenceCutoff','pairedStory',jsonb_build_object('version',1,
  'current',jsonb_build_object('actors',jsonb_build_array(jsonb_build_object('name','Alex Rivera','kind','person'))),
  'historical',jsonb_build_object('endYear',1991,'actors',jsonb_build_array(jsonb_build_object('name','Jordan Hayes','kind','person')))));
 assert tether_private.has_cross_context_reading(paired),'Older ordered readings retain a distinct, sufficiently distant case';
 assert not tether_private.has_cross_context_reading(jsonb_set(paired,'{pairedStory,historical,endYear}','2021'::jsonb)),'Ordered comparisons also require historical distance';
 assert not tether_private.has_cross_context_reading(jsonb_set(paired,'{pairedStory,historical,actors,0,name}','"Alex Rivera"'::jsonb)),'Ordered comparisons also reject the same principal person';

 select coalesce(jsonb_agg(jsonb_build_array(head.id,head.latest_analysis_id,head.has_aligned_pair) order by head.id),'[]'::jsonb) into private_before from public.tether_situations head where not head.is_public;
 select head.* into s from public.tether_situations head where head.is_public and not head.is_walkthrough and head.latest_analysis_id is not null and head.owner_key like 'system:%' limit 1;
 assert s.id is not null,'Need a public reporting head for the rollback-only trigger check';
 select existing.* into a from public.tether_analyses existing where existing.id=s.latest_analysis_id;
 original_id=a.id;original_payload=a.payload;
 probe=gen_random_uuid();
 insert into public.tether_analyses(id,situation_id,snapshot_id,previous_id,engine_version,state,payload)
 values(probe,s.id,a.snapshot_id,a.id,a.engine_version,a.state,payload||jsonb_build_object('id',probe,'situationId',s.id));
 update public.tether_situations head set latest_analysis_id=probe,has_aligned_pair=false where head.id=s.id;
 assert (select head.has_aligned_pair from public.tether_situations head where head.id=s.id),'Trigger promotes the valid cross-context reading';
 probe=gen_random_uuid();
 bad=jsonb_set(payload,'{primary,narrativeRecord,endYear}','2021'::jsonb);
 insert into public.tether_analyses(id,situation_id,snapshot_id,previous_id,engine_version,state,payload)
 values(probe,s.id,a.snapshot_id,a.id,a.engine_version,a.state,bad||jsonb_build_object('id',probe,'situationId',s.id));
 update public.tether_situations head set latest_analysis_id=probe,has_aligned_pair=true where head.id=s.id;
 assert not (select head.has_aligned_pair from public.tether_situations head where head.id=s.id),'Caller cannot promote near-present context';
 update public.tether_situations head set latest_analysis_id=head.latest_analysis_id where head.is_public and not head.is_walkthrough;
 select coalesce(jsonb_agg(jsonb_build_array(head.id,head.latest_analysis_id,head.has_aligned_pair) order by head.id),'[]'::jsonb) into private_after from public.tether_situations head where not head.is_public;
 assert private_after=private_before,'Public discoverability reindex preserves all private heads';
 assert (select existing.payload=original_payload from public.tether_analyses existing where existing.id=original_id),'Immutable original analysis is retained';
 coverage=public.tether_public_research_coverage();
 assert (coverage->>'awaitingCurrentMethod')::integer=(select count(*) from public.tether_situations t join public.tether_analyses x on x.id=t.latest_analysis_id where t.is_public and not t.is_walkthrough and coalesce(x.payload#>>'{research,version}','')<>'narrative-research-12'),'Coverage identifies the actual method 12 backlog';
 assert (coverage->>'openAfterCurrentMethod')::integer=(select count(*) from public.tether_situations t join public.tether_analyses x on x.id=t.latest_analysis_id where t.is_public and not t.is_walkthrough and not t.has_aligned_pair and x.payload#>>'{research,version}'='narrative-research-12'),'Coverage keeps completed open investigations separate';
end $$;
rollback;
