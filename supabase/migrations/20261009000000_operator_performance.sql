-- Phase 5 (ARCHITECTURE §20.5/§20.6): operator-side rollup, creator links view for operators,
-- collab invites with custom commission.

-- ---------- org_daily_stats: trip × creator × link, attributed by the event's own trip ----------
-- (creator_daily_stats groups by link; a last-click cookie can carry a link for another trip, so operators
--  get their own rollup keyed on the trip the click/lead/booking actually happened on.)
create table public.org_daily_stats (
  org_id           uuid not null references public.organizations(id) on delete cascade,
  day              date not null,
  trip_id          uuid not null references public.trips(id) on delete cascade,
  creator_id       uuid not null references public.creators(id) on delete cascade,
  link_id          uuid references public.creator_links(id) on delete cascade,
  clicks           int not null default 0,
  unique_visitors  int not null default 0,
  leads            int not null default 0,
  bookings         int not null default 0,
  gmv_paise        bigint not null default 0,
  commission_paise bigint not null default 0,
  unique nulls not distinct (org_id, day, trip_id, creator_id, link_id)
);
create index on public.org_daily_stats (org_id, day);
alter table public.org_daily_stats enable row level security;
create policy ods_org_read on public.org_daily_stats for select to authenticated
  using ((select public.is_org_member(org_id)) or (select public.is_admin()));
revoke insert, update, delete on public.org_daily_stats from anon, authenticated;

create or replace function public.refresh_org_stats(p_day date default (now() at time zone 'Asia/Kolkata')::date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_from timestamptz := (p_day::timestamp at time zone 'Asia/Kolkata');
        v_to   timestamptz := ((p_day + 1)::timestamp at time zone 'Asia/Kolkata');
begin
  delete from public.org_daily_stats where day = p_day;
  insert into public.org_daily_stats (org_id, day, trip_id, creator_id, link_id, clicks, unique_visitors, leads, bookings, gmv_paise, commission_paise)
  select t.org_id, p_day, x.trip_id, x.creator_id, x.link_id,
         sum(x.clicks)::int, sum(x.uv)::int, sum(x.leads)::int, sum(x.bookings)::int, sum(x.gmv), sum(x.comm)
  from (
    select c.trip_id, c.creator_id, c.link_id, count(*) clicks, count(distinct c.visitor_id) uv, 0 leads, 0 bookings, 0::bigint gmv, 0::bigint comm
      from public.clicks c where c.created_at >= v_from and c.created_at < v_to and not c.is_bot and c.trip_id is not null
     group by 1, 2, 3
    union all
    select l.trip_id, l.creator_id, l.link_id, 0, 0, count(*), 0, 0, coalesce(sum(cm.amount_paise) filter (where cm.status <> 'reversed'), 0)
      from public.leads l left join public.commissions cm on cm.lead_id = l.id
     where l.created_at >= v_from and l.created_at < v_to and l.creator_id is not null and l.trip_id is not null
     group by 1, 2, 3
    union all
    select v.trip_id, v.creator_id, v.link_id, 0, 0, 0, count(*), sum(v.amount_paise), coalesce(sum(cm.amount_paise) filter (where cm.status <> 'reversed'), 0)
      from public.conversions v left join public.commissions cm on cm.conversion_id = v.id
     where v.created_at >= v_from and v.created_at < v_to and v.status <> 'cancelled' and v.creator_id is not null
     group by 1, 2, 3
    union all
    select b.trip_id, b.attributed_creator_id, b.attribution_link_id, 0, 0, 0, count(*), sum(b.taxable_paise), coalesce(sum(cm.amount_paise), 0)
      from public.bookings b left join public.commissions cm on cm.booking_id = b.id
     where b.confirmed_at >= v_from and b.confirmed_at < v_to and b.attributed_creator_id is not null
     group by 1, 2, 3
  ) x join public.trips t on t.id = x.trip_id
  group by t.org_id, x.trip_id, x.creator_id, x.link_id;
end $$;
revoke execute on function public.refresh_org_stats(date) from public, anon, authenticated;

-- Both rollups every 15 min for today, plus the previous 20 minutes' day so events just before midnight IST
-- are never stranded (the Phase 1 schedule only refreshed "today").
select cron.schedule('refresh-stats', '*/15 * * * *', $$
  select public.refresh_creator_stats();
  select public.refresh_creator_stats(((now() - interval '20 minutes') at time zone 'Asia/Kolkata')::date);
  select public.refresh_org_stats();
  select public.refresh_org_stats(((now() - interval '20 minutes') at time zone 'Asia/Kolkata')::date);
$$);

-- backfill every day that has events (dev data; cheap at launch volumes)
do $$
declare d date;
begin
  for d in select distinct (created_at at time zone 'Asia/Kolkata')::date from public.clicks
           union select distinct (created_at at time zone 'Asia/Kolkata')::date from public.leads
           union select distinct (created_at at time zone 'Asia/Kolkata')::date from public.conversions
  loop
    perform public.refresh_creator_stats(d);
    perform public.refresh_org_stats(d);
  end loop;
end $$;

-- ---------- a creator's links + reels on this org's trips (creator_links / creator_reels stay private) ----------
create or replace function public.org_creator_links(p_org uuid, p_creator uuid)
returns table (link_id uuid, code text, label text, trip_id uuid, trip_title text, created_at timestamptz,
               reel_permalink text, reel_thumbnail_url text, reel_views int)
language sql stable security definer set search_path = '' as $$
  select l.id, l.code::text, l.label, t.id, t.title, l.created_at, r.permalink, r.thumbnail_url, r.views
    from public.creator_links l
    join public.trips t on t.id = l.trip_id and t.org_id = p_org
    left join public.creator_reels r on r.id = l.reel_id
   where l.creator_id = p_creator and l.is_active and public.is_org_member(p_org)
   order by l.created_at desc;
$$;
revoke all on function public.org_creator_links(uuid, uuid) from public, anon;
grant execute on function public.org_creator_links(uuid, uuid) to authenticated;

-- ---------- collab invites ----------
create table public.collab_invites (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  trip_id        uuid not null references public.trips(id) on delete cascade,
  creator_id     uuid not null references public.creators(id) on delete cascade,
  commission_pct numeric(5,2) check (commission_pct between 5 and 50),   -- null = the trip's standard rate
  message        text check (char_length(message) <= 500),
  status         text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_by     uuid references public.profiles(id) default auth.uid(),
  responded_at   timestamptz,
  created_at     timestamptz not null default now()
);
create unique index collab_invites_one_open on public.collab_invites (trip_id, creator_id) where status = 'pending';
create index on public.collab_invites (creator_id, created_at desc);
alter table public.collab_invites enable row level security;
create policy ci_read on public.collab_invites for select to authenticated
  using ((select public.is_org_member(org_id)) or creator_id = (select public.my_creator_id()) or (select public.is_admin()));
-- managers invite for their own org's public trips, to active creators, at or above the commission floor
create policy ci_insert on public.collab_invites for insert to authenticated
  with check ((select public.is_org_manager(org_id)) and public.trip_org(trip_id) = org_id
              and public.trip_is_public(trip_id) and public.creator_is_active(creator_id) and status = 'pending'
              and (commission_pct is null or commission_pct >= coalesce(
                    ((select value from public.app_settings where key = 'commission') ->> 'min_creator_pct')::numeric, 8)));
revoke update, delete on public.collab_invites from anon, authenticated;

-- in-app notification for the invited creator
create or replace function public.notify_collab_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, channel, template, payload)
  select c.user_id, 'in_app', 'collab_invite',
         jsonb_build_object('invite_id', new.id, 'trip_id', new.trip_id, 'org_id', new.org_id, 'commission_pct', new.commission_pct)
    from public.creators c where c.id = new.creator_id;
  return new;
end $$;
create trigger trg_collab_invite_notify after insert on public.collab_invites
  for each row execute function public.notify_collab_invite();

-- creator accepts/declines; accepting a custom rate creates the commission override (valid from today)
create or replace function public.respond_collab_invite(p_invite uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select * into v from public.collab_invites where id = p_invite and creator_id = public.my_creator_id() for update;
  if not found then raise exception 'invite not found' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'This invite was already answered' using errcode = '22023'; end if;
  update public.collab_invites set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = p_invite;
  if p_accept and v.commission_pct is not null then
    insert into public.commission_overrides (trip_id, creator_id, commission_pct, valid_from)
    values (v.trip_id, v.creator_id, v.commission_pct, (now() at time zone 'Asia/Kolkata')::date)
    on conflict (trip_id, creator_id, valid_from) do update set commission_pct = excluded.commission_pct, valid_to = null;
  end if;
end $$;
revoke all on function public.respond_collab_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_collab_invite(uuid, boolean) to authenticated;
