-- Preserve existing votes while allowing separate responses to each displayed case.
alter table public.tether_illumination drop constraint tether_illumination_pkey;
alter table public.tether_illumination add primary key (analysis_id,owner_key,case_id);
comment on table public.tether_illumination is 'Private usefulness feedback per analysis version and historical case. Automated checks and votes do not establish historical accuracy. explanation_seen is client-reported exposure.';
