-- An earned comparison must be discoverable even when newer legacy leads fill a page.
alter table public.tether_situations add column if not exists has_aligned_pair boolean not null default false;
update public.tether_situations s set has_aligned_pair=coalesce(a.payload->'pairedStory'->>'version'='1',false)
from public.tether_analyses a where a.id=s.latest_analysis_id;
create index if not exists tether_situations_aligned_browse on public.tether_situations(reported_at desc,id desc)
where is_public and not is_walkthrough and has_aligned_pair;

create or replace function tether_private.sync_aligned_pair()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.has_aligned_pair := exists(select 1 from public.tether_analyses a
    where a.id=new.latest_analysis_id and a.situation_id=new.id and a.payload->'pairedStory'->>'version'='1');
  return new;
end $$;
revoke all on function tether_private.sync_aligned_pair() from public,anon,authenticated;
grant execute on function tether_private.sync_aligned_pair() to service_role;
drop trigger if exists tether_sync_aligned_pair on public.tether_situations;
create trigger tether_sync_aligned_pair before insert or update of latest_analysis_id on public.tether_situations
for each row execute function tether_private.sync_aligned_pair();
