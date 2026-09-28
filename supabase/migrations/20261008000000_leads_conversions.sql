-- Phase 4 (ARCHITECTURE §20.3/§20.4/§20.7): OTP-qualified leads with lead fees, operator-reported
-- conversions ("Mark booked"), and commissions generalised to booking | lead.

-- ---------- leads ----------
alter table public.leads add column travelers int check (travelers between 1 and 100);
create index on public.leads (trip_id, phone, created_at desc);

-- Operators see leads for their own trips, contacts included: they serve the lead (§20.6).
create policy leads_org_read on public.leads for select to authenticated
  using (trip_id is not null and (select public.is_org_member(public.trip_org(trip_id))));

-- ---------- conversions (bookings reported by the operator) ----------
create type public.conversion_source as enum ('dashboard', 'postback', 'pixel');
create type public.conversion_status as enum ('reported', 'confirmed', 'cancelled', 'disputed');

create table public.conversions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id),
  trip_id      uuid not null references public.trips(id),
  departure_id uuid references public.departures(id) on delete set null,
  travel_date  date not null,
  creator_id   uuid references public.creators(id),
  link_id      uuid references public.creator_links(id) on delete set null,
  click_id     text,
  lead_id      uuid unique references public.leads(id),
  booking_ref  text not null check (char_length(booking_ref) between 1 and 60),
  travelers    int not null check (travelers between 1 and 100),
  amount_paise bigint not null check (amount_paise > 0 and amount_paise <= 1000000000), -- ≤ ₹1 crore, before GST
  source       public.conversion_source not null,
  status       public.conversion_status not null default 'reported',
  reported_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, booking_ref)
);
create index on public.conversions (org_id, created_at desc);
create index on public.conversions (creator_id, created_at desc);
create trigger trg_conversions_updated before update on public.conversions
  for each row execute function public.set_updated_at();
create trigger trg_audit_conversions after insert or update or delete on public.conversions
  for each row execute function public.audit_row();
alter table public.conversions enable row level security;
create policy conv_org_read on public.conversions for select to authenticated
  using ((select public.is_org_member(org_id)) or (select public.is_admin()));
-- writes only through mark_lead_booked() (and the Phase 6 postback)
revoke insert, update, delete on public.conversions from anon, authenticated;

-- ---------- commissions: booking | lead ----------
create type public.commission_kind as enum ('booking', 'lead');
alter table public.commissions
  add column kind public.commission_kind not null default 'booking',
  add column source text not null default 'platform_booking' check (source in ('platform_booking', 'conversion', 'lead')),
  add column conversion_id uuid unique references public.conversions(id),
  add column lead_id uuid unique references public.leads(id),
  alter column booking_id drop not null,
  alter column booking_ref drop not null,
  alter column departure_start drop not null,
  add constraint commissions_one_source check (num_nonnulls(booking_id, conversion_id, lead_id) = 1),
  add constraint commissions_kind_matches check ((kind = 'lead') = (source = 'lead'));

-- ---------- capture a lead (server-only: called after the OTP is verified) ----------
create or replace function public.capture_lead(
  p_trip uuid, p_departure uuid, p_name text, p_phone text, p_travelers int, p_message text,
  p_creator uuid, p_link uuid, p_visitor uuid)
returns table (lead_id uuid, duplicate boolean, lead_fee_paise bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_trip record; v_cfg jsonb; v_existing uuid; v_lead uuid;
  v_creator uuid := p_creator; v_link uuid := p_link; v_dep uuid := p_departure;
  v_fee bigint := 0; v_fee_status text := 'none'; v_used int;
begin
  select t.id, t.title, t.lead_fee_paise, t.lead_fee_monthly_cap into v_trip
    from public.trips t where t.id = p_trip and public.trip_is_public(t.id);
  if not found then raise exception 'trip not available' using errcode = '22023'; end if;
  if p_phone !~ '^\+91[6-9][0-9]{9}$' then raise exception 'invalid phone' using errcode = '22023'; end if;
  if p_travelers not between 1 and 100 then raise exception 'invalid travelers' using errcode = '22023'; end if;
  if v_dep is not null and not exists (select 1 from public.departures d where d.id = v_dep and d.trip_id = p_trip) then v_dep := null; end if;
  -- attribution: active creators only, and the link must be theirs
  if v_creator is not null and not public.creator_is_active(v_creator) then v_creator := null; end if;
  if v_creator is null or not exists (select 1 from public.creator_links l where l.id = v_link and l.creator_id = v_creator) then v_link := null; end if;

  select value into v_cfg from public.app_settings where key = 'creator';
  select l.id into v_existing from public.leads l
   where l.trip_id = p_trip and l.phone = p_phone
     and l.created_at > now() - make_interval(days => coalesce((v_cfg->>'lead_dedupe_days')::int, 30))
   order by l.created_at desc limit 1;
  if v_existing is not null then
    return query select v_existing, true, 0::bigint;
    return;
  end if;

  -- lead fee: creator-attributed, fee on, not the creator's own number, under the monthly cap
  if v_creator is not null and v_trip.lead_fee_paise > 0 then
    v_fee := v_trip.lead_fee_paise; v_fee_status := 'pending';
    if exists (select 1 from public.creators c join public.profiles p on p.id = c.user_id where c.id = v_creator and p.phone = p_phone) then
      v_fee := 0; v_fee_status := 'rejected';
    elsif v_trip.lead_fee_monthly_cap is not null then
      select count(*) into v_used from public.leads l
       where l.trip_id = p_trip and l.fee_status in ('pending', 'confirmed', 'paid')
         and l.created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata');
      if v_used >= v_trip.lead_fee_monthly_cap then v_fee := 0; v_fee_status := 'none'; end if;
    end if;
  end if;

  insert into public.leads (creator_id, link_id, trip_id, departure_id, name, phone, message, travelers, source, visitor_id,
                            qualified_at, qualification_method, lead_fee_paise, fee_status)
  values (v_creator, v_link, p_trip, v_dep, left(p_name, 80), p_phone, left(p_message, 500), p_travelers,
          case when v_creator is null then 'manual' else 'link' end::public.attribution_source, p_visitor,
          now(), 'otp', v_fee, v_fee_status)
  returning id into v_lead;

  if v_fee > 0 then
    -- ponytail: payable_at is indicative; Phase 6 makes lead fees payable only after the operator's invoice is paid.
    insert into public.commissions (kind, source, lead_id, creator_id, trip_title, travelers_count, base_paise, pct, amount_paise,
                                    confirmable_at, payable_at)
    values ('lead', 'lead', v_lead, v_creator, v_trip.title, p_travelers, v_fee, 100, v_fee,
            now() + make_interval(days => coalesce((v_cfg->>'lead_qualification_days')::int, 7)),
            now() + make_interval(days => coalesce((v_cfg->>'lead_qualification_days')::int, 7) + 30));
  end if;
  return query select v_lead, false, v_fee;
end $$;
revoke all on function public.capture_lead(uuid, uuid, text, text, int, text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.capture_lead(uuid, uuid, text, text, int, text, uuid, uuid, uuid) to service_role;

-- ---------- operator: lead status + Mark booked ----------
create or replace function public.set_lead_status(p_lead uuid, p_status public.lead_status) returns void
language plpgsql security definer set search_path = '' as $$
declare v_trip uuid; v_status public.lead_status;
begin
  select l.trip_id, l.status into v_trip, v_status from public.leads l where l.id = p_lead;
  if v_trip is null or not public.is_org_member(public.trip_org(v_trip)) then
    raise exception 'lead not found' using errcode = '42501';
  end if;
  if v_status = 'converted' or p_status not in ('new', 'contacted', 'lost') then
    raise exception 'use Mark booked to convert; booked leads stay booked' using errcode = '22023';
  end if;
  update public.leads set status = p_status where id = p_lead;
end $$;
revoke all on function public.set_lead_status(uuid, public.lead_status) from public, anon;
grant execute on function public.set_lead_status(uuid, public.lead_status) to authenticated;

-- Operator reports a booking for a lead. The commission % comes from the DB (override, else the trip's rate),
-- never from the caller; the booking commission replaces any lead fee (§20.4).
create or replace function public.mark_lead_booked(p_lead uuid, p_booking_ref text, p_travelers int, p_amount_paise bigint, p_departure uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_lead record; v_trip record; v_dep uuid; v_date date; v_conv uuid; v_pct numeric; v_amount bigint;
begin
  select * into v_lead from public.leads where id = p_lead for update;
  if not found or v_lead.trip_id is null then raise exception 'lead not found' using errcode = '42501'; end if;
  select t.id, t.org_id, t.title into v_trip from public.trips t where t.id = v_lead.trip_id;
  if not public.is_org_member(v_trip.org_id) then raise exception 'lead not found' using errcode = '42501'; end if;
  if v_lead.status = 'converted' then raise exception 'This lead is already marked booked' using errcode = '22023'; end if;

  v_dep := coalesce(p_departure, v_lead.departure_id);
  select d.start_date into v_date from public.departures d where d.id = v_dep and d.trip_id = v_trip.id;
  if v_date is null then raise exception 'Pick the departure they booked' using errcode = '22023'; end if;

  insert into public.conversions (org_id, trip_id, departure_id, travel_date, creator_id, link_id, lead_id, booking_ref,
                                  travelers, amount_paise, source, reported_by)
  values (v_trip.org_id, v_trip.id, v_dep, v_date, v_lead.creator_id, v_lead.link_id, p_lead, trim(p_booking_ref),
          p_travelers, p_amount_paise, 'dashboard', auth.uid())
  returning id into v_conv;
  update public.leads set status = 'converted' where id = p_lead;

  if v_lead.creator_id is not null then
    update public.commissions set status = 'reversed', reversed_reason = 'Enquiry booked: booking commission applies instead'
     where lead_id = p_lead and status in ('pending', 'confirmed', 'on_hold');
    update public.leads set fee_status = 'rejected' where id = p_lead and fee_status in ('pending', 'confirmed');

    select coalesce(
      (select o.commission_pct from public.commission_overrides o
        where o.trip_id = v_trip.id and o.creator_id = v_lead.creator_id and o.valid_from <= v_date
          and (o.valid_to is null or o.valid_to >= v_date) order by o.valid_from desc limit 1),
      (select tc.creator_commission_pct from public.trip_commercials tc where tc.trip_id = v_trip.id), 0) into v_pct;
    v_amount := round(p_amount_paise * v_pct / 100);  -- half-up, same as lib/domain/money.ts pct()
    if v_amount > 0 then
      -- ponytail: payable_at is indicative; Phase 6 gates conversion commissions on the paid operator invoice.
      insert into public.commissions (kind, source, conversion_id, creator_id, booking_ref, trip_title, departure_start,
                                      travelers_count, base_paise, pct, amount_paise, confirmable_at, payable_at)
      values ('booking', 'conversion', v_conv, v_lead.creator_id, trim(p_booking_ref), v_trip.title, v_date,
              p_travelers, p_amount_paise, v_pct, v_amount,
              ((v_date + 1)::timestamp at time zone 'Asia/Kolkata'), ((v_date + 31)::timestamp at time zone 'Asia/Kolkata'));
    end if;
  end if;
  return v_conv;
end $$;
revoke all on function public.mark_lead_booked(uuid, text, int, bigint, uuid) from public, anon;
grant execute on function public.mark_lead_booked(uuid, text, int, bigint, uuid) to authenticated;

-- ---------- daily: lead fees confirm after the qualification window; reported bookings once travel starts ----------
create or replace function public.advance_affiliate_lifecycle() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.commissions c set status = 'confirmed', confirmed_at = now()
   where c.status = 'pending' and c.confirmable_at <= now()
     and (c.kind = 'lead'
          or exists (select 1 from public.conversions v where v.id = c.conversion_id and v.status in ('reported', 'confirmed')));
  update public.leads l set fee_status = 'confirmed'
    from public.commissions c where c.lead_id = l.id and c.status = 'confirmed' and l.fee_status = 'pending';
end $$;
revoke all on function public.advance_affiliate_lifecycle() from public, anon, authenticated;
select cron.schedule('affiliate-lifecycle', '45 18 * * *', $$select public.advance_affiliate_lifecycle()$$); -- 00:15 IST

-- ---------- stats: count reported bookings and lead fees too ----------
create or replace function public.refresh_creator_stats(p_day date default (now() at time zone 'Asia/Kolkata')::date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_from timestamptz := (p_day::timestamp at time zone 'Asia/Kolkata');
        v_to   timestamptz := ((p_day + 1)::timestamp at time zone 'Asia/Kolkata');
begin
  insert into public.creator_daily_stats (creator_id, day, link_id, clicks, unique_visitors, leads, bookings, gmv_paise, commission_paise)
  select x.creator_id, p_day, x.link_id,
         sum(x.clicks)::int, sum(x.uv)::int, sum(x.leads)::int, sum(x.bookings)::int, sum(x.gmv), sum(x.comm)
  from (
    select creator_id, link_id, count(*) clicks, count(distinct visitor_id) uv, 0 leads, 0 bookings, 0::bigint gmv, 0::bigint comm
      from public.clicks where created_at >= v_from and created_at < v_to and not is_bot and link_id is not null
     group by creator_id, link_id
    union all
    select l.creator_id, l.link_id, 0, 0, count(*), 0, 0, coalesce(sum(c.amount_paise) filter (where c.status <> 'reversed'), 0)
      from public.leads l left join public.commissions c on c.lead_id = l.id
     where l.created_at >= v_from and l.created_at < v_to and l.creator_id is not null and l.link_id is not null
     group by l.creator_id, l.link_id
    union all
    select b.attributed_creator_id, b.attribution_link_id, 0, 0, 0, count(*), sum(b.taxable_paise), coalesce(sum(c.amount_paise), 0)
      from public.bookings b left join public.commissions c on c.booking_id = b.id
     where b.confirmed_at >= v_from and b.confirmed_at < v_to
       and b.attributed_creator_id is not null and b.attribution_link_id is not null
     group by b.attributed_creator_id, b.attribution_link_id
    union all
    select v.creator_id, v.link_id, 0, 0, 0, count(*), sum(v.amount_paise), coalesce(sum(c.amount_paise) filter (where c.status <> 'reversed'), 0)
      from public.conversions v left join public.commissions c on c.conversion_id = v.id
     where v.created_at >= v_from and v.created_at < v_to and v.status <> 'cancelled'
       and v.creator_id is not null and v.link_id is not null
     group by v.creator_id, v.link_id
  ) x
  group by x.creator_id, x.link_id
  on conflict (creator_id, day, link_id) do update set
    clicks = excluded.clicks, unique_visitors = excluded.unique_visitors, leads = excluded.leads,
    bookings = excluded.bookings, gmv_paise = excluded.gmv_paise, commission_paise = excluded.commission_paise;
end $$;
revoke execute on function public.refresh_creator_stats(date) from public, anon, authenticated;
