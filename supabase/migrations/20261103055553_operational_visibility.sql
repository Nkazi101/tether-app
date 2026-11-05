-- Durable heartbeats make a stopped worker visible across process restarts.
create table public.tether_runtime (
 instance_id text primary key,
 kind text not null check(kind in ('worker','scheduler')),
 seen_at timestamptz not null default now()
);
alter table public.tether_runtime enable row level security;
revoke all on public.tether_runtime from public,anon,authenticated;
grant all on public.tether_runtime to service_role;
create index tether_runtime_recent on public.tether_runtime(kind,seen_at desc);
create or replace function public.tether_heartbeat(p_instance text,p_kind text)
returns void language plpgsql set search_path = '' as $$
begin
 insert into public.tether_runtime(instance_id,kind) values(p_instance,p_kind)
 on conflict(instance_id) do update set seen_at=now();
 delete from public.tether_runtime where seen_at<now()-interval '1 day';
end; $$;
revoke all on function public.tether_heartbeat(text,text) from public,anon,authenticated;
grant execute on function public.tether_heartbeat(text,text) to service_role;
