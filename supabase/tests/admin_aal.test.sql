-- ARCHITECTURE §8.1/§18: admin access needs MFA (aal2). Uses the seeded super_admin.
begin;
select plan(4);

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated","aal":"aal1"}', true);
select is(public.is_admin(), false, 'admin without MFA is not admin');
select is((select count(*)::int from public.admin_users), 0, 'admin without MFA cannot read admin_users');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated","aal":"aal2"}', true);
select is(public.is_admin(), true, 'admin with MFA is admin');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a004","role":"authenticated","aal":"aal2"}', true);
select is(public.is_admin(), false, 'traveler with MFA is not admin');

select * from finish();
rollback;
