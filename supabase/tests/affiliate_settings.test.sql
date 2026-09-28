begin;
select plan(7);

-- throwaway staff member of the seeded org (b1); owner is operator a002
insert into auth.users (id, instance_id, aud, role, email) values ('00000000-0000-0000-0000-0000000fa13e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff@triplink.test');
insert into public.org_members (org_id, user_id, role) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000fa13e', 'staff');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000fa13e","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$update public.trips set lead_fee_paise = 20000 where id = '00000000-0000-0000-0000-0000000000d1'$$, '42501', null, 'staff cannot set a lead fee');
select throws_ok($$update public.trips set booking_mode = 'enquiry' where id = '00000000-0000-0000-0000-0000000000d1'$$, '42501', null, 'staff cannot change booking mode');
select lives_ok($$update public.trips set creator_hooks = array['Sunrise at Tiger Falls'] where id = '00000000-0000-0000-0000-0000000000d1'$$, 'staff can edit the content kit');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$update public.trips set lead_fee_paise = 20000, lead_fee_monthly_cap = 50 where id = '00000000-0000-0000-0000-0000000000d1'$$, 'owner sets a lead fee');
select throws_ok($$update public.trips set booking_mode = 'redirect', redirect_url = null where id = '00000000-0000-0000-0000-0000000000d1'$$, '23514', null, 'redirect mode needs a URL');
select throws_ok($$update public.trips set booking_mode = 'redirect', redirect_url = 'http://example.com' where id = '00000000-0000-0000-0000-0000000000d1'$$, '23514', null, 'redirect URL must be https');
select lives_ok($$update public.trips set booking_mode = 'redirect', redirect_url = 'https://example.com/chakrata' where id = '00000000-0000-0000-0000-0000000000d1'$$, 'owner sets redirect mode with https URL');

select * from finish();
rollback;
