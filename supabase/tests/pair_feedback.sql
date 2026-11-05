begin;
do $$ begin
  assert (select relrowsecurity from pg_class where oid='public.tether_illumination'::regclass), 'Feedback requires RLS';
  assert not has_table_privilege('anon','public.tether_illumination','SELECT,INSERT,UPDATE,DELETE'), 'Guest Data API access must be revoked';
  assert not has_table_privilege('authenticated','public.tether_illumination','SELECT,INSERT,UPDATE,DELETE'), 'Signed-in Data API access must be revoked';
  assert has_table_privilege('service_role','public.tether_illumination','SELECT,INSERT,UPDATE,DELETE'), 'API service access missing';
end $$;
rollback;
