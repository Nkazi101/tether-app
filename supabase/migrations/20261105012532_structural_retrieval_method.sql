-- Preserve cross-context proof for every later retrieval version, even if a producer omits its policy marker.
create or replace function tether_private.has_cross_context_reading(p_payload jsonb)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare
 date_text text;
 current_year integer;
 historical_end integer;
 p jsonb;
 historical jsonb;
 record jsonb;
 mappings jsonb;
 mapping jsonb;
 proof jsonb;
 actor_check jsonb;
 causal jsonb;
 driver jsonb;
 reference jsonb;
 person_name text;
 requires_proof boolean;
 mapped_count integer;
 paired jsonb;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' then return false; end if;
 if jsonb_typeof(p_payload->'sources')='array' then
  select s->>'publishedAt' into date_text from jsonb_array_elements(p_payload->'sources') s
  where s->>'kind'='reporting' limit 1;
 end if;
 date_text=coalesce(nullif(date_text,''),nullif(p_payload#>>'{sources,0,publishedAt}',''),p_payload->>'evidenceCutoff');
 if date_text is null or date_text !~ '^[0-9]{4}-' then return false; end if;
 begin
  current_year=extract(year from date_text::timestamptz at time zone 'UTC')::integer;
 exception when invalid_datetime_format or datetime_field_overflow then return false;
 end;

 if p_payload#>>'{narrativeLens,version}'='1' then
  if jsonb_typeof(p_payload->'currentFrame') is distinct from 'object'
   or jsonb_typeof(p_payload#>'{narrativeLens,parallels}') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_payload#>'{narrativeLens,parallels}')<1 then return false; end if;
  for p in select value from jsonb_array_elements(p_payload#>'{narrativeLens,parallels}') loop
   historical=null;
   if p->>'caseId'=p_payload#>>'{primary,id}' then historical=p_payload->'primary';
   elsif jsonb_typeof(p_payload->'alternatives')='array' then
    select a->'historicalCase' into historical from jsonb_array_elements(p_payload->'alternatives') a
    where a#>>'{historicalCase,id}'=p->>'caseId' limit 1;
   end if;
   record=historical->'narrativeRecord';
   if jsonb_typeof(record) is distinct from 'object' or jsonb_typeof(record->'endYear') is distinct from 'number' then return false; end if;
   if record->>'endYear' !~ '^-?[0-9]{1,6}$' then return false; end if;
   historical_end=(record->>'endYear')::integer;
   if current_year-historical_end<25 then return false; end if;

   mappings=p#>'{analogy,mapping}';
   if jsonb_typeof(mappings) is distinct from 'array' then return false; end if;
   if jsonb_array_length(mappings)<2 then return false; end if;
   if exists(select 1 from jsonb_array_elements(mappings) m where nullif(btrim(m->>'now'),'') is null or nullif(btrim(m->>'then'),'') is null) then return false; end if;
   select count(distinct tether_private.historical_actor_key(m->>'now')) into mapped_count from jsonb_array_elements(mappings) m;
   if mapped_count<2 then return false; end if;
   select count(distinct tether_private.historical_actor_key(m->>'then')) into mapped_count from jsonb_array_elements(mappings) m;
   if mapped_count<2 then return false; end if;

   -- Legacy casts have no entity-kind field. Catch obvious shared personal
   -- names without treating every enduring parliament or polity as a person.
   if jsonb_typeof(p_payload#>'{currentFrame,cast}')='array' and jsonb_typeof(record->'cast')='array' then
    for person_name in
     select c->>'actor' from jsonb_array_elements(p_payload#>'{currentFrame,cast}') c
     where coalesce(c->>'actor','') !~* '\m(government|states|kingdom|republic|party|democrats|republicans|congress|parliament|house|senate|bank|council|committee|company|corporation|group|team|staff|workers|researchers|authorities|audience|collective|establishment|factory|court|ministry|department|university|institute|assembly|united|national)\M'
      and regexp_replace(c->>'actor','^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Sir|President|Prime Minister|Professor)[[:space:]]+','','i') ~ '^[[:upper:]][[:alpha:]''’.-]+([[:space:]]+[[:upper:]][[:alpha:]''’.-]+){1,3}$'
    loop
     if exists(select 1 from jsonb_array_elements(record->'cast') h where tether_private.historical_actor_key(h->>'actor')=tether_private.historical_actor_key(person_name)) then return false; end if;
    end loop;
   end if;

   proof=p->'crossContext';
   requires_proof=case when p_payload#>>'{research,version}' ~ '^narrative-research-[0-9]+$' then split_part(p_payload#>>'{research,version}','-',3)::numeric>=11 else false end
    or p_payload#>>'{research,comparisonPolicy}'='cross-context-1'
    or (proof is not null and proof<>'null'::jsonb);
   if coalesce(requires_proof,false) then
    if jsonb_typeof(proof) is distinct from 'object' or proof->>'version' is distinct from 'cross-context-1' then return false; end if;
    if proof->'continuingEpisode' is distinct from 'false'::jsonb then return false; end if;
    if length(coalesce(proof->>'episodeSeparation',''))<15 then return false; end if;
    if jsonb_typeof(proof->'actorChecks') is distinct from 'array' or jsonb_typeof(proof->'sharedParticipants') is distinct from 'array' then return false; end if;
    if jsonb_array_length(proof->'actorChecks')<2 then return false; end if;
    if exists(select 1 from jsonb_array_elements(proof->'actorChecks') a where coalesce(a->>'relationship','') not in ('distinct','shared-public-institution')) then return false; end if;
    if exists(select 1 from jsonb_array_elements(proof->'sharedParticipants') a where a->>'kind'='person' and a->>'significance'='principal') then return false; end if;
    for mapping in select value from jsonb_array_elements(mappings) loop
     actor_check=null;
     select a into actor_check from jsonb_array_elements(proof->'actorChecks') a
     where tether_private.historical_actor_key(a->>'now')=tether_private.historical_actor_key(mapping->>'now')
      and tether_private.historical_actor_key(a->>'then')=tether_private.historical_actor_key(mapping->>'then') limit 1;
     if actor_check is null then return false; end if;
     if coalesce(actor_check->>'nowKind','') not in ('person','organization','collective','public-institution','polity')
      or coalesce(actor_check->>'thenKind','') not in ('person','organization','collective','public-institution','polity') then return false; end if;
     if actor_check->>'relationship'='shared-public-institution' and
      (actor_check->>'nowKind' not in ('public-institution','polity') or actor_check->>'thenKind' not in ('public-institution','polity')) then return false; end if;
     if actor_check->>'relationship'='distinct'
      and tether_private.historical_actor_key(actor_check->>'now')=tether_private.historical_actor_key(actor_check->>'then')
      and (actor_check->>'nowKind' in ('person','organization') or actor_check->>'thenKind' in ('person','organization')) then return false; end if;
    end loop;

    causal=p->'causalTest';
    if jsonb_typeof(causal) is distinct from 'object' then return false; end if;
    if jsonb_typeof(causal->'driverMappings') is distinct from 'array'
     or jsonb_typeof(causal->'nowLeverageFactIds') is distinct from 'array'
     or jsonb_typeof(causal->'thenLeverageFactIds') is distinct from 'array' then return false; end if;
    if jsonb_array_length(causal->'driverMappings')<1 or jsonb_array_length(causal->'nowLeverageFactIds')<1
     or jsonb_array_length(causal->'thenLeverageFactIds')<1 or length(coalesce(causal->>'mechanism',''))<15
     or length(coalesce(causal->>'counterfactual',''))<15 then return false; end if;
    for driver in select value from jsonb_array_elements(causal->'driverMappings') loop
     if jsonb_typeof(driver)<>'number' or driver::text !~ '^[0-9]{1,3}$' then return false; end if;
     if driver::text::integer>=jsonb_array_length(mappings) then return false; end if;
    end loop;
    if jsonb_typeof(p_payload#>'{currentFrame,facts}') is distinct from 'array' or jsonb_typeof(record->'facts') is distinct from 'array' then return false; end if;
    for reference in select value from jsonb_array_elements(causal->'nowLeverageFactIds') loop
     if jsonb_typeof(reference)<>'string' or not exists(select 1 from jsonb_array_elements(p_payload#>'{currentFrame,facts}') f where f->'id'=reference) then return false; end if;
    end loop;
    for reference in select value from jsonb_array_elements(causal->'thenLeverageFactIds') loop
     if jsonb_typeof(reference)<>'string' or not exists(select 1 from jsonb_array_elements(record->'facts') f where f->'id'=reference) then return false; end if;
    end loop;
   end if;
  end loop;
  return true;
 elsif p_payload#>>'{pairedStory,version}'='1' then
  paired=p_payload->'pairedStory';
  if jsonb_typeof(paired#>'{historical,endYear}') is distinct from 'number' or paired#>>'{historical,endYear}' !~ '^-?[0-9]{1,6}$' then return false; end if;
  if current_year-(paired#>>'{historical,endYear}')::integer<25 then return false; end if;
  if jsonb_typeof(paired#>'{current,actors}') is distinct from 'array' or jsonb_typeof(paired#>'{historical,actors}') is distinct from 'array' then return false; end if;
  if exists(select 1 from jsonb_array_elements(paired#>'{current,actors}') n cross join jsonb_array_elements(paired#>'{historical,actors}') h
   where n->>'kind'='person' and h->>'kind'='person' and nullif(tether_private.historical_actor_key(n->>'name'),'') is not null
    and tether_private.historical_actor_key(n->>'name')=tether_private.historical_actor_key(h->>'name')) then return false; end if;
  return true;
 end if;
 return false;
end; $$;
revoke all on function tether_private.has_cross_context_reading(jsonb) from public,anon,authenticated;
grant execute on function tether_private.has_cross_context_reading(jsonb) to service_role;

create or replace function public.tether_public_research_coverage()
returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('reportingStories',count(*),'publishedComparisons',count(*) filter(where s.has_aligned_pair),
 'awaitingCurrentMethod',count(*) filter(where coalesce(a.payload->'research'->>'version','')<>'narrative-research-12'),
 'openAfterCurrentMethod',count(*) filter(where not s.has_aligned_pair and a.payload->'research'->>'version'='narrative-research-12'),
 'queuedInvestigations',(select count(distinct j.payload->>'situationId') from public.tether_jobs j join public.tether_situations p on p.id::text=j.payload->>'situationId' where p.is_public and not p.is_walkthrough and j.owner_key like 'system:%' and j.kind='research' and j.status in ('queued','running')),
 'openCoverageGaps',(select count(*) from public.tether_research_gaps where status in ('open','scheduled')))
from public.tether_situations s join public.tether_analyses a on a.id=s.latest_analysis_id where s.is_public and not s.is_walkthrough;
$$;
revoke all on function public.tether_public_research_coverage() from public,anon,authenticated;
grant execute on function public.tether_public_research_coverage() to service_role;
