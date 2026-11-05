create unique index if not exists curations_owner_subject_event_pair_uidx
  on public.curations (owner_subject, modern_event, historical_event);
