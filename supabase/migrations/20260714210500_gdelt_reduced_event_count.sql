alter table public.gdelt_event_index
  add column if not exists num_events integer;
