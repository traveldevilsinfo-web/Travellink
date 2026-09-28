begin;
select plan(11);

-- fixtures (postgres): a click + a lead on trip d1 (org b1) from creator c1, then roll up today
insert into public.creator_links (id, creator_id, trip_id, code, label)
values ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'tstperf', 'Perf test');
insert into public.clicks (link_id, creator_id, trip_id, visitor_id) values
  ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', gen_random_uuid()),
  ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', gen_random_uuid());
select public.refresh_org_stats();
select public.refresh_creator_stats();
insert into auth.users (id, instance_id, aud, role, email) values ('00000000-0000-0000-0000-0000000fa15e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@triplink.test');

select ok((select sum(clicks) from public.org_daily_stats where link_id = '00000000-0000-0000-0000-00000000f201') = 2, 'org rollup counts clicks on the trip');
select is((select sum(clicks) from public.org_daily_stats where link_id = '00000000-0000-0000-0000-00000000f201'),
          (select sum(clicks) from public.creator_daily_stats where link_id = '00000000-0000-0000-0000-00000000f201'), 'operator and creator totals match');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","aal":"aal1"}', true);
select ok((select count(*) from public.org_daily_stats where link_id = '00000000-0000-0000-0000-00000000f201') >= 1, 'operator reads own org stats');
select is((select count(*)::int from public.clicks), 0, 'operator still cannot read raw clicks');
select ok((select count(*) from public.org_creator_links('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1') where code = 'tstperf') = 1, 'operator sees the creator''s links on own trips');
select lives_ok($$insert into public.collab_invites (id, org_id, trip_id, creator_id, commission_pct, message)
  values ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 18, 'Join our Chakrata trip')$$, 'manager invites a creator');
select throws_ok($$insert into public.collab_invites (org_id, trip_id, creator_id, commission_pct)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 2)$$, '42501', null, 'invite below the floor is refused');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000fa15e","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.org_daily_stats), 0, 'outsiders see no org stats');
select is((select count(*)::int from public.org_creator_links('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1')), 0, 'outsiders get no creator links');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a003","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$select public.respond_collab_invite('00000000-0000-0000-0000-00000000c101', true)$$, 'creator accepts the invite');
select is((select commission_pct from public.commission_overrides where trip_id = '00000000-0000-0000-0000-0000000000d1'
            and creator_id = '00000000-0000-0000-0000-0000000000c1' order by valid_from desc limit 1), 18.00, 'accepting creates the custom commission');

select * from finish();
rollback;
