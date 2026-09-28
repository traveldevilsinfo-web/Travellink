-- Phase 2 (ARCHITECTURE §20.2, UI brief F4/F6/A5): Instagram reels per link, storefront curation,
-- waitlist promotion + audited admin override.

-- ---------- reels: written only by the server from Instagram (connect, picker refresh, daily cron) ----------
create table public.creator_reels (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.creators(id) on delete cascade,
  ig_media_id   text not null,
  media_type    text,
  permalink     text check (permalink is null or permalink ~ '^https://(www\.)?instagram\.com/'),
  thumbnail_url text check (thumbnail_url is null or thumbnail_url ~ '^https://'),
  caption       text,
  posted_at     timestamptz,
  views         int check (views >= 0),
  likes         int check (likes >= 0),
  comments      int check (comments >= 0),
  synced_at     timestamptz not null default now(),
  unique (creator_id, ig_media_id),
  unique (creator_id, id)
);
create index on public.creator_reels (creator_id, posted_at desc);
alter table public.creator_reels enable row level security;
create policy reels_own_read on public.creator_reels for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.is_admin()));
revoke insert, update, delete on public.creator_reels from anon, authenticated;

-- a link may point at one of the creator's own reels (composite FK = can't borrow someone else's reel)
alter table public.creator_links
  add column reel_id uuid,
  add constraint creator_links_reel_fk foreign key (creator_id, reel_id)
    references public.creator_reels (creator_id, id) on delete set null (reel_id);
create index on public.creator_links (reel_id) where reel_id is not null;

-- ---------- storefront curation ----------
create or replace function public.creator_is_active(p_creator uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.creators c where c.id = p_creator and c.status = 'active');
$$;

create table public.storefront_collections (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 40),
  position   int not null default 0,
  created_at timestamptz not null default now(),
  unique (creator_id, id)
);
create table public.storefront_items (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.creators(id) on delete cascade,
  collection_id uuid,                                    -- null = the main "Trips" list
  trip_id       uuid not null references public.trips(id) on delete cascade,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  foreign key (creator_id, collection_id) references public.storefront_collections (creator_id, id) on delete cascade,
  unique nulls not distinct (creator_id, collection_id, trip_id)
);
create index on public.storefront_items (creator_id, collection_id, position);

alter table public.storefront_collections enable row level security;
alter table public.storefront_items enable row level security;

create policy sfc_read on public.storefront_collections for select to anon, authenticated
  using ((select public.creator_is_active(creator_id)) or creator_id = (select public.my_creator_id()));
create policy sfc_write on public.storefront_collections for all to authenticated
  using (creator_id = (select public.my_creator_id()))
  with check (creator_id = (select public.my_creator_id()) and (select public.is_active_creator()));

create policy sfi_read on public.storefront_items for select to anon, authenticated
  using (((select public.creator_is_active(creator_id)) and public.trip_is_public(trip_id))
         or creator_id = (select public.my_creator_id()));
create policy sfi_write on public.storefront_items for all to authenticated
  using (creator_id = (select public.my_creator_id()))
  with check (creator_id = (select public.my_creator_id()) and (select public.is_active_creator())
              and public.trip_is_public(trip_id));

-- Replace one list (main or a collection) in one statement: add, remove and reorder together.
-- security invoker: RLS above still decides what the caller may write.
create or replace function public.set_storefront_list(p_collection uuid, p_trip_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_creator uuid := public.my_creator_id();
begin
  if v_creator is null or not public.is_active_creator() then
    raise exception 'not an active creator' using errcode = '42501';
  end if;
  if coalesce(array_length(p_trip_ids, 1), 0) > 60 then
    raise exception 'a list holds at most 60 trips' using errcode = '22023';
  end if;
  delete from public.storefront_items where creator_id = v_creator and collection_id is not distinct from p_collection;
  insert into public.storefront_items (creator_id, collection_id, trip_id, position)
  select v_creator, p_collection, t.id, t.ord::int from unnest(p_trip_ids) with ordinality as t(id, ord);
end $$;
revoke all on function public.set_storefront_list(uuid, uuid[]) from public;
grant execute on function public.set_storefront_list(uuid, uuid[]) to authenticated;

-- Public Reels tab: reels a creator has linked to public trips (creator_links / creator_reels stay private).
create or replace function public.storefront_reels(p_creator uuid)
returns table (reel_id uuid, permalink text, thumbnail_url text, posted_at timestamptz, trip_id uuid)
language sql stable security definer set search_path = '' as $$
  select distinct on (r.id) r.id, r.permalink, r.thumbnail_url, r.posted_at, l.trip_id
    from public.creator_links l
    join public.creator_reels r on r.id = l.reel_id
   where l.creator_id = p_creator and l.is_active and l.trip_id is not null
     and public.creator_is_active(p_creator) and public.trip_is_public(l.trip_id)
   order by r.id, l.created_at desc
   limit 48;
$$;
revoke all on function public.storefront_reels(uuid) from public;
grant execute on function public.storefront_reels(uuid) to anon, authenticated;

-- storefront_items now drives the public list; the Phase 1 helper is gone.
drop function public.storefront_trip_ids(text);

-- backfill: every trip a creator already links to goes on their main list, oldest link first
insert into public.storefront_items (creator_id, collection_id, trip_id, position)
select creator_id, null, trip_id, row_number() over (partition by creator_id order by first_at)::int
  from (select creator_id, trip_id, min(created_at) first_at from public.creator_links
         where trip_id is not null and is_active group by creator_id, trip_id) x
on conflict do nothing;

-- ---------- waitlist ----------
-- Reason for the last status change; the creators audit trigger records it with before/after.
alter table public.creators add column status_note text check (char_length(status_note) <= 300);

-- Daily cron: activate waitlisted creators whose (server-synced) followers now meet the minimum.
create or replace function public.promote_waitlist() returns int
language plpgsql security definer set search_path = '' as $$
declare v_min int; v_n int;
begin
  select coalesce((value->>'min_followers')::int, 1000) into v_min from public.app_settings where key = 'creator';
  update public.creators c
     set status = 'active', status_note = 'auto: followers reached the minimum'
    from public.creator_social_accounts a
   where a.creator_id = c.id and c.status = 'waitlist' and a.followers_count >= coalesce(v_min, 1000);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.promote_waitlist() from public, anon, authenticated;
grant execute on function public.promote_waitlist() to service_role;
