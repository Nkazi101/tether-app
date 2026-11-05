alter table public.curations
  add column if not exists owner_subject text;

alter table public.curations
  add column if not exists owner_provider text not null default 'supabase';

alter table public.curations
  add column if not exists owner_email text;

alter table public.curations
  add column if not exists owner_display_name text;

update public.curations
set
  owner_subject = coalesce(owner_subject, 'supabase:' || user_id::text),
  owner_provider = coalesce(owner_provider, 'supabase')
where user_id is not null;

alter table public.curations
  alter column user_id drop not null;

alter table public.curations
  alter column owner_subject set not null;

alter table public.curations
  drop constraint if exists curations_owner_provider_check;

alter table public.curations
  add constraint curations_owner_provider_check
  check (owner_provider in ('supabase', 'firebase'));

alter table public.curations
  drop constraint if exists curations_owner_identity_check;

alter table public.curations
  add constraint curations_owner_identity_check
  check (
    owner_subject <> ''
    and (
      (owner_provider = 'supabase' and user_id is not null and owner_subject = 'supabase:' || user_id::text)
      or (owner_provider = 'firebase' and user_id is null)
    )
  );

drop index if exists curations_user_id_created_at_idx;

create index if not exists curations_user_id_created_at_idx
  on public.curations (user_id, created_at desc)
  where user_id is not null;

create index if not exists curations_owner_subject_created_at_idx
  on public.curations (owner_subject, created_at desc);

drop policy if exists "curations_select_own" on public.curations;
create policy "curations_select_own"
  on public.curations
  for select
  using (
    (user_id is not null and auth.uid() = user_id)
    or owner_subject = 'supabase:' || auth.uid()::text
  );

drop policy if exists "curations_insert_own" on public.curations;
create policy "curations_insert_own"
  on public.curations
  for insert
  with check (
    owner_provider = 'supabase'
    and user_id is not null
    and auth.uid() = user_id
    and owner_subject = 'supabase:' || auth.uid()::text
  );

drop policy if exists "curations_update_own" on public.curations;
create policy "curations_update_own"
  on public.curations
  for update
  using (
    user_id is not null
    and auth.uid() = user_id
    and owner_subject = 'supabase:' || auth.uid()::text
  )
  with check (
    owner_provider = 'supabase'
    and user_id is not null
    and auth.uid() = user_id
    and owner_subject = 'supabase:' || auth.uid()::text
  );

drop policy if exists "curations_delete_own" on public.curations;
create policy "curations_delete_own"
  on public.curations
  for delete
  using (
    user_id is not null
    and auth.uid() = user_id
    and owner_subject = 'supabase:' || auth.uid()::text
  );
