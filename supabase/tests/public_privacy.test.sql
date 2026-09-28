begin;
select plan(8);

set local role anon;
select is((select count(*)::int from public.organizations where slug = 'travel-devils'), 1, 'anon sees active org row');
select throws_ok($$select support_phone from public.organizations$$, '42501', null, 'anon cannot read operator phone');
select throws_ok($$select referral_code from public.creators$$, '42501', null, 'anon cannot read referral codes');
select throws_ok($$select user_id from public.creators$$, '42501', null, 'anon cannot read creator user_id');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a004","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select support_email from public.organizations$$, '42501', null, 'traveler cannot read operator email');
select is((select count(*)::int from public.get_org_contacts('00000000-0000-0000-0000-0000000000b1')), 0, 'non-member gets no contacts');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.get_org_contacts('00000000-0000-0000-0000-0000000000b1')), 1, 'org member gets contacts');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a003","role":"authenticated","aal":"aal1"}', true);
select is(public.my_referral_code(), 'RIYA10', 'creator reads own referral code');

select * from finish();
rollback;
