-- M2 acceptance: operators can't self-publish or touch seat counters; anon can't see commission;
-- orgs are isolated; onboarding functions behave. Uses seed.sql rows.
begin;
select plan(15);

-- as the seeded operator owner (Travel Devils)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","aal":"aal1"}', true);

select throws_ok(
  $$insert into public.trips (org_id, slug, title, destination, duration_days, duration_nights, from_price_paise, cancellation_policy_id, status)
    select '00000000-0000-0000-0000-0000000000b1', 'sneaky', 'Sneaky', 'X', 2, 1, 100, id, 'published' from public.cancellation_policies limit 1$$,
  'P0001', null, 'operator cannot insert a published trip');

select lives_ok(
  $$insert into public.trips (id, org_id, slug, title, destination, duration_days, duration_nights, from_price_paise, cancellation_policy_id)
    select '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'draft-trip', 'Draft', 'X', 2, 1, 100, id from public.cancellation_policies limit 1$$,
  'operator can insert a draft trip');

select lives_ok($$update public.trips set status = 'pending_review' where id = '00000000-0000-0000-0000-0000000000d2'$$, 'operator can submit for review');
select throws_ok($$update public.trips set status = 'published' where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'P0001', null, 'operator cannot publish');
select throws_ok($$update public.departures set seats_booked = 5 where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'P0001', 'Seat counters are system-managed', 'operator cannot edit seat counters');
-- (seeded org is already active, so test a field it can't have yet)
select throws_ok($$update public.organizations set platform_fee_pct = 0 where id = '00000000-0000-0000-0000-0000000000b1'$$,
  'P0001', null, 'operator cannot change own platform fee');

-- onboarding functions
select isnt(public.create_organization('New Operator', 'new-operator', 'Pune'), null, 'create_organization returns id');
select is((select role::text from public.org_members m join public.organizations o on o.id = m.org_id
           where o.slug = 'new-operator' and m.user_id = '00000000-0000-0000-0000-00000000a002'), 'owner', 'caller becomes owner');
select throws_ok($$update public.organizations set status = 'active', kyc_status = 'approved' where slug = 'new-operator'$$,
  'P0001', null, 'owner cannot self-approve a pending org');
select lives_ok($$select public.accept_operator_agreement('00000000-0000-0000-0000-0000000000b1', 'v1')$$, 'owner accepts agreement');

-- another user (the traveler) cannot edit Travel Devils trips or accept for them
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a004","role":"authenticated","aal":"aal1"}', true);
update public.trips set title = 'pwned' where org_id = '00000000-0000-0000-0000-0000000000b1';
select throws_ok($$select public.accept_operator_agreement('00000000-0000-0000-0000-0000000000b1', 'v1')$$,
  '42501', null, 'non-owner cannot accept agreement');

select is((public.get_public_setting('commission')->>'min_creator_pct')::int, 8, 'commission floor readable');
select is(public.get_public_setting('tax'), null, 'tax settings not exposed');

-- anon
set local role anon;
select is((select count(*)::int from public.trip_commercials), 0, 'anon cannot see commission');

reset role;
select is((select count(*)::int from public.trips where title = 'pwned'), 0, 'non-member update touched no rows');

select * from finish();
rollback;
