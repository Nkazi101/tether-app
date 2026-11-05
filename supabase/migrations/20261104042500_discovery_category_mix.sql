-- A bounded browse entry point: the most recent public story in each category.
-- Chronological pagination remains separate so no stories are skipped by mixing.
create or replace function public.tether_discovery_readings()
returns table (id uuid, latest_analysis_id uuid)
language sql stable security invoker
set search_path = ''
as $$
  select story.id, story.latest_analysis_id
  from (values
    ('entertainment',1),('technology',2),('science',3),('culture',4),
    ('business',5),('sports',6),('lifestyle',7),('environment',8),
    ('health',9),('world',10),('politics',11),('general',12)
  ) as category(topic, position)
  cross join lateral (
    select s.id, s.latest_analysis_id
    from public.tether_situations s
    where s.is_public and not s.is_walkthrough
      and s.latest_analysis_id is not null and s.topic = category.topic
      and s.reported_at >= now() - interval '7 days'
    order by s.reported_at desc, s.id desc
    limit 1
  ) story
  order by category.position;
$$;
revoke all on function public.tether_discovery_readings() from public, anon, authenticated;
grant execute on function public.tether_discovery_readings() to service_role;
