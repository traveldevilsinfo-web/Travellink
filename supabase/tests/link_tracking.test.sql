begin;
select plan(4);

insert into public.creator_links (id, creator_id, trip_id, code, label)
values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'tsttrk1', 'Reel test');

set local role anon;
select is((select count(*)::int from public.storefront_trip_ids('riya.travels')), 1, 'anon sees storefront trip ids');
select is((select count(*)::int from public.storefront_trip_ids('nobody')), 0, 'unknown handle returns nothing');
select is((select count(*)::int from public.creator_links), 0, 'anon still cannot read creator_links');
select throws_ok($$insert into public.clicks (creator_id, visitor_id) values ('00000000-0000-0000-0000-0000000000c1', gen_random_uuid())$$, '42501', null, 'anon cannot write clicks');

select * from finish();
rollback;
