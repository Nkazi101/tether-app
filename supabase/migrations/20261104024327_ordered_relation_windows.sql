alter table public.tether_illumination drop constraint if exists tether_illumination_alignment_version_check;
alter table public.tether_illumination add constraint tether_illumination_alignment_version_check
check (alignment_version in ('ordered-relations-1','ordered-relations-2'));
