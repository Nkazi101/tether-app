create unique index if not exists historical_events_title_year_source_uidx
  on public.historical_events (title, year_label, source);
