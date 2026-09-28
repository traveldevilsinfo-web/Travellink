begin;
select plan(5);

-- ARCHITECTURE §18: every public table has RLS on.
select is(
  (select count(*)::int from pg_class where relkind = 'r' and relrowsecurity = false and relnamespace = 'public'::regnamespace),
  0, 'every public table has RLS enabled');

set local role anon;
select is((select count(*)::int from public.trips where slug = 'chakrata-weekend'), 1, 'anon sees published trip');
select is((select count(*)::int from public.trip_commercials), 0, 'anon cannot read commission rates');
select is((select count(*)::int from public.creator_private), 0, 'anon cannot read creator_private');
select throws_ok('insert into public.journal_entries(kind, memo) values (''x'', ''x'')', '42501', null, 'anon cannot write the ledger');

select * from finish();
rollback;
