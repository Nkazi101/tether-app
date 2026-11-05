begin;
do $$ begin
  assert not has_function_privilege('anon','public.tether_discovery_readings()','EXECUTE'), 'Discovery RPC must use the checked API';
  assert not has_function_privilege('authenticated','public.tether_discovery_readings()','EXECUTE'), 'Discovery RPC must use the checked API';
  assert has_function_privilege('service_role','public.tether_discovery_readings()','EXECUTE'), 'API service access missing';
  assert (select count(*) <= 12 from public.tether_discovery_readings()), 'Discovery must stay bounded';
  assert not exists (
    select 1 from public.tether_discovery_readings() d join public.tether_situations s using(id)
    where not s.is_public or s.is_walkthrough or s.reported_at < now()-interval '7 days' or d.latest_analysis_id is distinct from s.latest_analysis_id
  ), 'Private, example, stale or superseded stories leaked into discovery';
  assert not exists (
    select s.topic from public.tether_discovery_readings() d join public.tether_situations s using(id) group by s.topic having count(*)>1
  ), 'One category must not dominate the discovery mix';
  assert not exists (
    select 1 from public.tether_discovery_readings() d join public.tether_situations s using(id)
    join public.tether_situations newer on newer.topic=s.topic
    where newer.is_public and not newer.is_walkthrough and newer.latest_analysis_id is not null
      and (newer.reported_at,newer.id) > (s.reported_at,s.id)
  ), 'Discovery must use the latest eligible story in each category';
  assert (select count(*) from public.tether_discovery_readings()) = (
    select count(distinct topic) from public.tether_situations
    where is_public and not is_walkthrough and latest_analysis_id is not null and reported_at >= now()-interval '7 days'
      and topic in ('entertainment','technology','science','culture','business','sports','lifestyle','environment','health','world','politics','general')
  ), 'An available category was omitted';
end $$;
rollback;
