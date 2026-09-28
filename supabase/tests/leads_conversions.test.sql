begin;
select plan(16);

-- fixtures (postgres): trip d1 with a ₹200 lead fee and 10% commission, a link for creator c1, a non-member user
update public.trips set lead_fee_paise = 20000, lead_fee_monthly_cap = null where id = '00000000-0000-0000-0000-0000000000d1';
update public.trip_commercials set creator_commission_pct = 10 where trip_id = '00000000-0000-0000-0000-0000000000d1';
insert into public.creator_links (id, creator_id, trip_id, code, label)
values ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'tstlead', 'Lead test');
insert into auth.users (id, instance_id, aud, role, email) values ('00000000-0000-0000-0000-0000000fa14e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@triplink.test');
update public.profiles set phone = '+919876500009' where id = '00000000-0000-0000-0000-00000000a003';

create temp table _l as
select * from public.capture_lead('00000000-0000-0000-0000-0000000000d1', null, 'Test Traveler', '+919876500001', 2, 'hi',
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000f101', gen_random_uuid());
grant select on _l to public;
select is((select lead_fee_paise from _l), 20000::bigint, 'attributed lead snapshots the lead fee');
select is((select c.status::text from public.commissions c join _l on c.lead_id = _l.lead_id where c.kind = 'lead'), 'pending', 'pending lead-fee commission created');
select is((select duplicate from public.capture_lead('00000000-0000-0000-0000-0000000000d1', null, 'Again', '+919876500001', 1, null,
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000f101', null)), true, 'same phone within 30 days is a duplicate');
select is((select lead_fee_paise from public.capture_lead('00000000-0000-0000-0000-0000000000d1', null, 'Me', '+919876500009', 1, null,
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000f101', null)), 0::bigint, 'creator''s own number earns no fee');

set local role anon;
select throws_ok($$select public.capture_lead('00000000-0000-0000-0000-0000000000d1', null, 'x', '+919876500002', 1, null, null, null, null)$$, '42501', null, 'anon cannot capture leads directly');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a003","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.capture_lead('00000000-0000-0000-0000-0000000000d1', null, 'x', '+919876500003', 1, null, null, null, null)$$, '42501', null, 'creators cannot capture leads directly');
select is((select count(*)::int from public.leads), 0, 'creator never sees traveler leads');
select is((select count(*)::int from public.commissions where kind = 'lead'), 1, 'creator sees own lead-fee commission');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000fa14e","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.mark_lead_booked((select lead_id from _l), 'TD-1', 2, 2000000, '00000000-0000-0000-0000-0000000000e1')$$, '42501', null, 'non-members cannot mark bookings');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","aal":"aal1"}', true);
select ok((select count(*) from public.leads where name = 'Test Traveler') = 1, 'operator sees leads for own trips');
select lives_ok($$select public.mark_lead_booked((select lead_id from _l), 'TD-1', 2, 2000000, '00000000-0000-0000-0000-0000000000e1')$$, 'operator marks the lead booked');
select throws_ok($$select public.mark_lead_booked((select lead_id from _l), 'TD-2', 2, 2000000, '00000000-0000-0000-0000-0000000000e1')$$, '22023', null, 'cannot book the same lead twice');
select throws_ok($$select public.set_lead_status((select lead_id from _l), 'contacted')$$, '22023', null, 'booked leads stay booked');

select is((select count(*)::int from public.commissions where creator_id = '00000000-0000-0000-0000-0000000000c1'), 0, 'operators never read another creator''s commissions');

reset role;
select is((select c.amount_paise from public.commissions c join public.conversions v on v.id = c.conversion_id where v.booking_ref = 'TD-1'), 200000::bigint, '10% booking commission from the DB rate');
select is((select c.status::text from public.commissions c join _l on c.lead_id = _l.lead_id), 'reversed', 'lead fee reversed once booked');

select * from finish();
rollback;
