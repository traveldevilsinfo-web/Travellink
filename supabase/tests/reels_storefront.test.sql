begin;
select plan(12);

-- fixtures as postgres: a reel for the seeded creator (c1 = riya, user a003), linked to published trip d1
insert into public.creator_reels (id, creator_id, ig_media_id, permalink)
values ('00000000-0000-0000-0000-00000000fe01', '00000000-0000-0000-0000-0000000000c1', 'tst_media_1', 'https://www.instagram.com/reel/TST1/');
insert into public.creator_links (creator_id, trip_id, code, label, reel_id)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'tstreel', 'Reel test', '00000000-0000-0000-0000-00000000fe01');
-- a waitlisted creator on a throwaway user
insert into auth.users (id, instance_id, aud, role, email) values ('00000000-0000-0000-0000-0000000fa12e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wait@triplink.test');
insert into public.creators (id, user_id, handle, display_name, status) values ('00000000-0000-0000-0000-0000000fc12e', '00000000-0000-0000-0000-0000000fa12e', 'tst_waiter', 'Waiter', 'waitlist');
insert into public.creator_social_accounts (creator_id, provider_user_id, username, followers_count) values ('00000000-0000-0000-0000-0000000fc12e', 'ig_tst_wait', 'tst_waiter', 5000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a003","role":"authenticated","aal":"aal1"}', true);
select ok((select count(*) from public.creator_reels where ig_media_id = 'tst_media_1') = 1, 'creator reads own reels');
select throws_ok($$insert into public.creator_reels (creator_id, ig_media_id) values ('00000000-0000-0000-0000-0000000000c1', 'fake')$$, '42501', null, 'creator cannot write reels');
select lives_ok($$select public.set_storefront_list(null, array['00000000-0000-0000-0000-0000000000d1']::uuid[])$$, 'creator sets main storefront list');
select is((select count(*)::int from public.storefront_items where collection_id is null and creator_id = '00000000-0000-0000-0000-0000000000c1'), 1, 'list saved');
select lives_ok($$insert into public.storefront_collections (id, creator_id, title) values ('00000000-0000-0000-0000-00000000fc01', '00000000-0000-0000-0000-0000000000c1', 'Monsoon treks')$$, 'creator creates a collection');
select throws_ok($$insert into public.storefront_items (creator_id, trip_id) values ('00000000-0000-0000-0000-0000000fc12e', '00000000-0000-0000-0000-0000000000d1')$$, '42501', null, 'cannot write another creator''s storefront');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000fa12e","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.set_storefront_list(null, array['00000000-0000-0000-0000-0000000000d1']::uuid[])$$, '42501', null, 'waitlisted creator cannot curate');
select throws_ok($$update public.creators set status = 'active' where id = '00000000-0000-0000-0000-0000000fc12e'$$, 'P0001', null, 'waitlisted creator cannot self-activate');

set local role anon;
select ok((select count(*) from public.storefront_items where creator_id = '00000000-0000-0000-0000-0000000000c1') >= 1, 'anon reads a public storefront');
select ok((select count(*) from public.storefront_reels('00000000-0000-0000-0000-0000000000c1') where permalink = 'https://www.instagram.com/reel/TST1/') = 1, 'reel shows on the public Reels tab');
select throws_ok($$select public.promote_waitlist()$$, '42501', null, 'anon cannot run promotion');

reset role;
select public.promote_waitlist();
select is((select status::text from public.creators where id = '00000000-0000-0000-0000-0000000fc12e'), 'active', 'cron promotes a waitlisted creator over the minimum');

select * from finish();
rollback;
