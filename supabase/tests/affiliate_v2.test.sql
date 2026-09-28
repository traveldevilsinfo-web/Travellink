begin;
select plan(7);

-- seed a social account for the seeded creator (as service role / postgres)
insert into public.creator_social_accounts (creator_id, provider_user_id, username, followers_count, token_encrypted)
values ('00000000-0000-0000-0000-0000000000c1', 'ig_123', 'riya.travels', 12400, 'v1:secret');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a003","role":"authenticated","aal":"aal1"}', true);
select is((select followers_count from public.creator_social_accounts), 12400, 'creator reads own follower count');
select throws_ok($$select token_encrypted from public.creator_social_accounts$$, '42501', null, 'creator cannot read own token');
select throws_ok($$update public.creator_social_accounts set followers_count = 999999$$, '42501', null, 'creator cannot fake followers');
select throws_ok($$insert into public.creator_social_snapshots values ('00000000-0000-0000-0000-0000000000c1', current_date, 99999, 1, 1)$$, '42501', null, 'creator cannot write snapshots');
select is((public.get_public_setting('creator')->>'min_followers')::int, 1000, 'follower gate readable');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a004","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.creator_social_accounts), 0, 'other users see no social accounts');

set local role anon;
select throws_ok($$select username from public.creator_social_accounts$$, '42501', null, 'anon cannot read social accounts');

select * from finish();
rollback;
