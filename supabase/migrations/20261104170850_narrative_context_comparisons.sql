-- Distinguish a complete ordered-episode map from a checked, bounded contextual
-- comparison. Both are discoverable, and retain their actual method in feedback.
create or replace function tether_private.sync_aligned_pair()
returns trigger language plpgsql set search_path='' as $$
begin
 new.has_aligned_pair := exists(select 1 from public.tether_analyses a where a.id=new.latest_analysis_id and a.situation_id=new.id
  and (a.payload->'pairedStory'->>'version'='1' or (a.payload->'narrativeLens'->>'version'='1' and jsonb_array_length(a.payload->'narrativeLens'->'parallels')>0)));
 return new;
end; $$;
revoke all on function tether_private.sync_aligned_pair() from public,anon,authenticated;
grant execute on function tether_private.sync_aligned_pair() to service_role;
alter table public.tether_illumination drop constraint tether_illumination_alignment_version_check;
alter table public.tether_illumination add constraint tether_illumination_alignment_version_check check(alignment_version in ('ordered-relations-1','ordered-relations-2','narrative-context-1'));
create or replace function public.tether_public_research_coverage()
returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('reportingStories',count(*),'publishedComparisons',count(*) filter(where s.has_aligned_pair),
 'awaitingCurrentMethod',count(*) filter(where coalesce(a.payload->'research'->>'version','')<>'narrative-research-9'),
 'openAfterCurrentMethod',count(*) filter(where not s.has_aligned_pair and a.payload->'research'->>'version'='narrative-research-9'),
 'queuedInvestigations',(select count(distinct j.payload->>'situationId') from public.tether_jobs j join public.tether_situations p on p.id::text=j.payload->>'situationId' where p.is_public and not p.is_walkthrough and j.owner_key like 'system:%' and j.kind='research' and j.status in ('queued','running')),
 'openCoverageGaps',(select count(*) from public.tether_research_gaps where status in ('open','scheduled')))
from public.tether_situations s join public.tether_analyses a on a.id=s.latest_analysis_id where s.is_public and not s.is_walkthrough;
$$;
revoke all on function public.tether_public_research_coverage() from public,anon,authenticated;
grant execute on function public.tether_public_research_coverage() to service_role;
