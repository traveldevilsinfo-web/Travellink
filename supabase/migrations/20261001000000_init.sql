-- =====================================================================
-- TripLink (working name) — Phase 1 schema
-- Supabase / Postgres 15+
-- Conventions:
--   * All money is BIGINT in paise (₹1 = 100). Never floats.
--   * All timestamps timestamptz (UTC). Trip dates are DATE in IST.
--   * RLS is ENABLED on every table. Default = deny.
--   * Money / ledger / webhook / audit tables have NO client write
--     policies — only the server (service_role) writes them.
--   * Public vs private split: sensitive columns (PAN, payout refs)
--     live in *_private tables that only owners/admins can read.
-- =====================================================================

create extension if not exists citext;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type public.admin_role        as enum ('super_admin','ops','finance','support');
create type public.org_role          as enum ('owner','manager','staff');
create type public.kyc_status        as enum ('not_started','submitted','in_review','approved','rejected');
create type public.account_status    as enum ('pending','active','suspended');
create type public.trip_status       as enum ('draft','pending_review','published','paused','rejected','archived');
create type public.trip_type         as enum ('group','experiential','package','creator_hosted');
create type public.departure_status  as enum ('open','sold_out','closed','cancelled','completed');
create type public.booking_status    as enum ('held','confirmed','paid_in_full','completed','cancelled','expired');
create type public.payment_kind      as enum ('deposit','balance','full');
create type public.payment_status    as enum ('created','authorized','captured','failed','refunded','partially_refunded');
create type public.refund_status     as enum ('pending','processed','failed');
create type public.transfer_status   as enum ('created','on_hold','released','settled','reversed','partially_reversed','failed');
create type public.commission_status as enum ('pending','confirmed','payable','in_payout','paid','reversed','on_hold');
create type public.payout_status     as enum ('draft','approved','processing','processed','failed','reversed','cancelled');
create type public.attribution_source as enum ('link','storefront','code','whatsapp','phone_match','manual');
create type public.lead_status       as enum ('new','contacted','payment_link_sent','converted','lost');
create type public.review_status     as enum ('pending','published','hidden');
create type public.creator_tier      as enum ('standard','pro','host');
create type public.gst_scheme        as enum ('gst5_no_itc','gst18_with_itc');
create type public.outbox_status     as enum ('pending','processing','done','failed');
create type public.ticket_status     as enum ('open','pending_user','pending_operator','resolved','closed');
create type public.ledger_account    as enum (
  'razorpay_clearing',          -- money sitting with Razorpay / platform nodal
  'operator_payable',           -- owed to operator (settled via Route transfer)
  'creator_payable',            -- owed to creator (settled via RazorpayX payout)
  'platform_revenue',           -- platform fee (excl. GST)
  'gst_output_payable',         -- 18% GST on platform service fee
  'gst_tcs_payable',            -- GST TCS (Sec 52) collected from operators
  'it_tds_ecom_payable',        -- Income-tax e-commerce TDS (old 194-O)
  'it_tds_commission_payable',  -- Income-tax TDS on creator commission (old 194H)
  'traveler_refund_payable',
  'pg_fees_expense'             -- Razorpay fees
);

-- ---------------------------------------------------------------------
-- UTIL
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.gen_code(p_prefix text, p_len int) returns text
language sql volatile as $$
  select p_prefix || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, p_len));
$$;

-- is the current DB caller a real end-user (vs service_role / migrations)?
create or replace function public.is_end_user() returns boolean
language sql stable as $$
  select current_user in ('authenticated','anon');
$$;

-- =====================================================================
-- IDENTITY
-- =====================================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  phone           text,
  email           citext,
  avatar_url      text,
  city            text,
  marketing_opt_in boolean not null default false,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.profiles (phone);
create index on public.profiles (email);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (new.id, new.email, new.phone, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.admin_users (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  role       public.admin_role not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- OPERATORS (organizations)
-- =====================================================================
create table public.organizations (
  id                 uuid primary key default gen_random_uuid(),
  slug               citext unique not null,
  name               text not null,
  legal_name         text,
  gstin              text,
  gst_scheme         public.gst_scheme not null default 'gst5_no_itc',
  state_code         text,                      -- for GST place of supply
  description        text,
  logo_url           text,
  support_phone      text,                      -- shown ONLY after booking
  support_email      text,
  city               text,
  status             public.account_status not null default 'pending',
  kyc_status         public.kyc_status not null default 'not_started',
  platform_fee_pct   numeric(5,2) not null default 5.00 check (platform_fee_pct between 0 and 30),
  rating_avg         numeric(3,2) not null default 0,
  rating_count       int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_org_updated before update on public.organizations
  for each row execute function public.set_updated_at();

-- sensitive org data: owners/managers + admins only
create table public.organization_private (
  org_id                 uuid primary key references public.organizations(id) on delete cascade,
  pan_encrypted          text,       -- AES-256-GCM ciphertext (app-level), never plaintext
  pan_last4              text,
  razorpay_account_id    text unique,  -- Route linked account (acc_xxx)
  bank_last4             text,
  settlement_policy      jsonb not null default
    '{"tranches":[{"pct":50,"release":"days_before_start","days":7},{"pct":50,"release":"days_after_end","days":2}]}'::jsonb,
  pg_fee_bearer          text not null default 'operator' check (pg_fee_bearer in ('operator','platform')),
  agreement_version      text,
  agreement_accepted_at  timestamptz,
  updated_at             timestamptz not null default now()
);

create table public.org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.org_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on public.org_members (user_id);

-- =====================================================================
-- CREATORS
-- =====================================================================
create table public.creators (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique not null references public.profiles(id) on delete cascade,
  handle              citext unique not null check (handle ~ '^[a-z0-9_.]{3,30}$'),
  display_name        text not null,
  bio                 text,
  avatar_url          text,
  cover_url           text,
  instagram_handle    citext,
  instagram_followers int,
  instagram_verified  boolean not null default false,
  youtube_url         text,
  languages           text[] not null default '{}',
  home_city           text,
  tier                public.creator_tier not null default 'standard',
  status              public.account_status not null default 'pending',
  referral_code       citext unique not null default public.gen_code('', 6), -- checkout code e.g. RIYA10
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_creators_updated before update on public.creators
  for each row execute function public.set_updated_at();

create table public.creator_private (
  creator_id                uuid primary key references public.creators(id) on delete cascade,
  pan_encrypted             text,
  pan_last4                 text,
  pan_name                  text,
  kyc_status                public.kyc_status not null default 'not_started',
  gstin                     text,          -- only if creator is GST-registered
  razorpayx_contact_id      text,
  razorpayx_fund_account_id text,
  payout_method             text check (payout_method in ('upi','bank')),
  payout_last4              text,          -- masked UPI/bank for display
  agreement_version         text,
  agreement_accepted_at     timestamptz,
  updated_at                timestamptz not null default now()
);

-- =====================================================================
-- HELPER AUTHZ FUNCTIONS (security definer, fixed search_path)
-- =====================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';      -- MFA required
$$;

create or replace function public.has_admin_role(r public.admin_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a
                  where a.user_id = auth.uid() and (a.role = r or a.role = 'super_admin'))
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_members m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.is_org_manager(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_members m
                  where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner','manager'));
$$;

create or replace function public.my_creator_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.creators c where c.user_id = auth.uid();
$$;

create or replace function public.is_active_creator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.creators c where c.user_id = auth.uid() and c.status = 'active');
$$;

-- =====================================================================
-- CATALOG
-- =====================================================================
create table public.cancellation_policies (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid references public.organizations(id) on delete cascade, -- null = system policy
  name                     text not null,
  -- ordered DESC by min_days_before, e.g. [{"min_days_before":30,"refund_pct":90},{"min_days_before":15,"refund_pct":50},{"min_days_before":0,"refund_pct":0}]
  rules                    jsonb not null,
  deposit_non_refundable   boolean not null default true,
  zero_refund_within_days  int not null,    -- inside this window refund = 0 → commission can be confirmed
  is_system                boolean not null default false,
  created_at               timestamptz not null default now()
);

create table public.trips (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete restrict,
  slug               citext unique not null,
  title              text not null,
  summary            text,
  description_md     text,
  trip_type          public.trip_type not null default 'group',
  destination        text not null,
  state              text,
  country            text not null default 'IN',
  start_city         text,
  duration_days      int not null check (duration_days between 1 and 60),
  duration_nights    int not null check (duration_nights between 0 and 60),
  difficulty         text check (difficulty in ('easy','moderate','hard')),
  min_age            int,
  max_group_size     int,
  from_price_paise   bigint not null check (from_price_paise > 0),  -- display only; real price = departure options
  inclusions         text[] not null default '{}',
  exclusions         text[] not null default '{}',
  highlights         text[] not null default '{}',
  things_to_carry    text[] not null default '{}',
  tags               text[] not null default '{}',
  cover_image_path   text,
  cancellation_policy_id uuid not null references public.cancellation_policies(id),
  hosted_by_creator_id   uuid references public.creators(id),
  status             public.trip_status not null default 'draft',
  review_notes       text,               -- admin feedback on rejection
  published_at       timestamptz,
  search             tsvector generated always as (
      setweight(to_tsvector('simple'::regconfig, coalesce(title,'')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(destination,'') || ' ' || coalesce(state,'')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(summary,'')), 'B')
  ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.trips (org_id);
create index on public.trips (status);
create index trips_search_idx on public.trips using gin (search);
create index trips_title_trgm on public.trips using gin (title gin_trgm_ops);
create trigger trg_trips_updated before update on public.trips
  for each row execute function public.set_updated_at();

-- commercials split out so the public never sees rates; creators + org + admin can
create table public.trip_commercials (
  trip_id              uuid primary key references public.trips(id) on delete cascade,
  creator_commission_pct numeric(5,2) not null check (creator_commission_pct between 5 and 40),
  host_commission_pct    numeric(5,2) check (host_commission_pct between 5 and 50),  -- creator-hosted trips
  updated_at           timestamptz not null default now()
);

create or replace function public.trip_org(p_trip uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select t.org_id from public.trips t where t.id = p_trip;
$$;

create or replace function public.trip_is_public(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t join public.organizations o on o.id = t.org_id
                  where t.id = p_trip and t.status = 'published' and o.status = 'active');
$$;

create table public.trip_itinerary_days (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  day_number  int not null check (day_number >= 1),
  title       text not null,
  description text,
  meals       text[] not null default '{}',
  stay        text,
  unique (trip_id, day_number)
);

create table public.trip_media (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  storage_path text not null,          -- public-media/orgs/{org_id}/trips/{trip_id}/...
  kind         text not null default 'image' check (kind in ('image','video')),
  alt          text,
  sort_order   int not null default 0
);
create index on public.trip_media (trip_id, sort_order);

create table public.trip_pickup_points (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  city             text not null,
  point            text not null,
  time_note        text,
  extra_price_paise bigint not null default 0 check (extra_price_paise >= 0)
);

create table public.departures (
  id                     uuid primary key default gen_random_uuid(),
  trip_id                uuid not null references public.trips(id) on delete cascade,
  start_date             date not null,
  end_date               date not null,
  capacity               int not null check (capacity > 0),
  seats_booked           int not null default 0 check (seats_booked >= 0),
  seats_held             int not null default 0 check (seats_held >= 0),
  deposit_per_person_paise bigint not null default 0 check (deposit_per_person_paise >= 0), -- 0 = full payment only
  balance_due_days_before int not null default 15,
  booking_cutoff_days    int not null default 2,
  status                 public.departure_status not null default 'open',
  hosted_by_creator_id   uuid references public.creators(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (end_date >= start_date),
  check (seats_booked + seats_held <= capacity)
);
create index on public.departures (trip_id, start_date);
create index on public.departures (start_date) where status = 'open';
create trigger trg_departures_updated before update on public.departures
  for each row execute function public.set_updated_at();

create or replace function public.departure_trip(p_dep uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select d.trip_id from public.departures d where d.id = p_dep;
$$;

create table public.departure_price_options (
  id            uuid primary key default gen_random_uuid(),
  departure_id  uuid not null references public.departures(id) on delete cascade,
  label         text not null,                 -- "Triple sharing", "Double sharing"
  price_paise   bigint not null check (price_paise > 0),  -- per person, EXCLUDING GST
  is_default    boolean not null default false,
  sort_order    int not null default 0
);
create index on public.departure_price_options (departure_id);

-- per-creator commission deal (e.g. hosts, top creators)
create table public.commission_overrides (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  creator_id     uuid not null references public.creators(id) on delete cascade,
  commission_pct numeric(5,2) not null check (commission_pct between 5 and 50),
  valid_from     date not null default current_date,
  valid_to       date,
  created_at     timestamptz not null default now(),
  unique (trip_id, creator_id, valid_from)
);

-- =====================================================================
-- ATTRIBUTION
-- =====================================================================
create table public.creator_links (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.creators(id) on delete cascade,
  trip_id     uuid references public.trips(id) on delete cascade,   -- null = storefront link
  code        citext unique not null default lower(public.gen_code('', 7)),
  label       text,               -- "Reel 12 Oct", "YT description"
  channel     text,               -- instagram | youtube | whatsapp | other
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.creator_links (creator_id);

create table public.clicks (
  id          bigint generated always as identity primary key,
  link_id     uuid references public.creator_links(id) on delete set null,
  creator_id  uuid not null references public.creators(id) on delete cascade,
  trip_id     uuid references public.trips(id) on delete set null,
  visitor_id  uuid not null,
  ip_hash     text,          -- sha256(ip + daily salt) — never raw IP
  ua_hash     text,
  referrer    text,
  is_bot      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.clicks (creator_id, created_at desc);
create index on public.clicks (visitor_id, created_at desc);

create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid references public.creators(id) on delete set null,
  link_id      uuid references public.creator_links(id) on delete set null,
  trip_id      uuid references public.trips(id) on delete set null,
  departure_id uuid references public.departures(id) on delete set null,
  name         text,
  phone        text not null,        -- E.164
  email        citext,
  message      text,
  source       public.attribution_source not null,
  status       public.lead_status not null default 'new',
  visitor_id   uuid,
  booking_id   uuid,                 -- set on conversion
  assigned_admin uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.leads (phone, created_at desc);
create index on public.leads (status);
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- rolled-up stats creators can read (raw clicks/leads are admin-only)
create table public.creator_daily_stats (
  creator_id   uuid not null references public.creators(id) on delete cascade,
  day          date not null,
  link_id      uuid references public.creator_links(id) on delete cascade,
  clicks       int not null default 0,
  unique_visitors int not null default 0,
  leads        int not null default 0,
  bookings     int not null default 0,
  gmv_paise    bigint not null default 0,
  commission_paise bigint not null default 0,
  primary key (creator_id, day, link_id)
);

-- =====================================================================
-- BOOKINGS & PAYMENTS
-- =====================================================================
create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            citext unique not null,
  description     text,
  discount_type   text not null check (discount_type in ('flat','percent')),
  discount_value  bigint not null check (discount_value > 0),  -- paise if flat, basis points if percent
  max_discount_paise bigint,
  min_order_paise bigint not null default 0,
  funded_by       text not null default 'platform' check (funded_by in ('platform','operator')),
  org_id          uuid references public.organizations(id),
  trip_id         uuid references public.trips(id),
  max_redemptions int,
  redemptions     int not null default 0,
  valid_from      timestamptz not null default now(),
  valid_to        timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  booking_ref           text unique not null default public.gen_code('TL', 8),
  trip_id               uuid not null references public.trips(id),
  departure_id          uuid not null references public.departures(id),
  org_id                uuid not null references public.organizations(id),
  traveler_user_id      uuid not null references public.profiles(id),
  status                public.booking_status not null default 'held',
  price_option_id       uuid references public.departure_price_options(id),
  pickup_point_id       uuid references public.trip_pickup_points(id),
  travelers_count       int not null check (travelers_count between 1 and 20),
  -- pricing snapshot (all paise)
  unit_price_paise      bigint not null,
  subtotal_paise        bigint not null,        -- unit * count + pickup extras (excl GST)
  discount_paise        bigint not null default 0,
  taxable_paise         bigint not null,        -- subtotal - discount
  gst_rate_pct          numeric(5,2) not null,  -- 5 or 18 per operator scheme
  gst_paise             bigint not null,
  tcs_overseas_paise    bigint not null default 0,  -- Income-tax TCS on overseas packages (Phase 1: domestic only → 0)
  total_paise           bigint not null,        -- taxable + gst + tcs
  deposit_paise         bigint not null default 0,
  amount_paid_paise     bigint not null default 0,
  amount_refunded_paise bigint not null default 0,
  balance_due_date      date,
  hold_expires_at       timestamptz,
  coupon_id             uuid references public.coupons(id),
  -- contact snapshot
  contact_name          text not null,
  contact_phone         text not null,
  contact_email         citext not null,
  special_requests      text,
  -- attribution snapshot (locked at creation)
  attributed_creator_id uuid references public.creators(id),
  attribution_link_id   uuid references public.creator_links(id),
  attribution_source    public.attribution_source,
  attribution_visitor_id uuid,
  lead_id               uuid references public.leads(id),
  creator_commission_pct numeric(5,2),
  platform_fee_pct      numeric(5,2) not null,
  cancellation_policy_snapshot jsonb not null,
  -- lifecycle
  confirmed_at          timestamptz,
  cancelled_at          timestamptz,
  cancelled_by          text check (cancelled_by in ('traveler','operator','admin','system')),
  cancel_reason         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (total_paise = taxable_paise + gst_paise + tcs_overseas_paise),
  check (amount_paid_paise >= 0 and amount_refunded_paise <= amount_paid_paise)
);
create index on public.bookings (traveler_user_id, created_at desc);
create index on public.bookings (org_id, created_at desc);
create index on public.bookings (departure_id);
create index on public.bookings (attributed_creator_id);
create index on public.bookings (status) where status in ('held','confirmed');
create index on public.bookings (contact_phone);
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.leads add constraint leads_booking_fk
  foreign key (booking_id) references public.bookings(id) on delete set null;

create table public.booking_travelers (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings(id) on delete cascade,
  full_name         text not null,
  age               int check (age between 0 and 120),
  gender            text,
  phone             text,
  emergency_contact text,
  is_lead           boolean not null default false
);
create index on public.booking_travelers (booking_id);

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id),
  kind                public.payment_kind not null,
  amount_paise        bigint not null check (amount_paise > 0),
  razorpay_order_id   text unique not null,
  razorpay_payment_id text unique,
  status              public.payment_status not null default 'created',
  method              text,
  fee_paise           bigint,              -- Razorpay fee incl GST, from payment entity
  captured_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.payments (booking_id);
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

create table public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments(id),
  booking_id         uuid not null references public.bookings(id),
  amount_paise       bigint not null check (amount_paise > 0),
  razorpay_refund_id text unique,
  status             public.refund_status not null default 'pending',
  reason             text,
  initiated_by       uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  processed_at       timestamptz
);
create index on public.refunds (booking_id);

-- Razorpay Route transfers to operator linked accounts (tranches with on_hold)
create table public.transfers (
  id                   uuid primary key default gen_random_uuid(),
  payment_id           uuid not null references public.payments(id),
  booking_id           uuid not null references public.bookings(id),
  org_id               uuid not null references public.organizations(id),
  tranche_no           int not null default 1,
  amount_paise         bigint not null check (amount_paise > 0),
  reversed_paise       bigint not null default 0,
  razorpay_transfer_id text unique,
  on_hold_until        date,
  status               public.transfer_status not null default 'created',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.transfers (org_id, status);
create index on public.transfers (booking_id);
create trigger trg_transfers_updated before update on public.transfers
  for each row execute function public.set_updated_at();

-- =====================================================================
-- COMMISSIONS & PAYOUTS
-- =====================================================================
create table public.payouts (
  id                   uuid primary key default gen_random_uuid(),
  creator_id           uuid not null references public.creators(id),
  period_start         date not null,
  period_end           date not null,
  fy                   text not null,                 -- '2026-27'
  gross_paise          bigint not null,
  tds_paise            bigint not null default 0,
  net_paise            bigint not null,
  status               public.payout_status not null default 'draft',
  razorpayx_payout_id  text unique,
  utr                  text,
  failure_reason       text,
  created_by           uuid references public.profiles(id),
  approved_by          uuid references public.profiles(id),  -- maker-checker: must differ from created_by
  processed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (net_paise = gross_paise - tds_paise),
  check (approved_by is null or approved_by <> created_by)
);
create index on public.payouts (creator_id, created_at desc);
create trigger trg_payouts_updated before update on public.payouts
  for each row execute function public.set_updated_at();

create table public.commissions (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid unique not null references public.bookings(id),
  creator_id         uuid not null references public.creators(id),
  -- denormalized so creators never need to read bookings (no traveler PII)
  booking_ref        text not null,
  trip_title         text not null,
  departure_start    date not null,
  travelers_count    int not null,
  base_paise         bigint not null,    -- commissionable amount = taxable_paise (excl GST)
  pct                numeric(5,2) not null,
  amount_paise       bigint not null check (amount_paise >= 0),
  status             public.commission_status not null default 'pending',
  hold_reason        text,               -- fraud / self-referral review
  confirmable_at     timestamptz not null,  -- start - zero_refund_within_days
  payable_at         timestamptz not null,  -- end_date + dispute window
  confirmed_at       timestamptz,
  payout_id          uuid references public.payouts(id),
  reversed_reason    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.commissions (creator_id, status);
create index on public.commissions (status, confirmable_at);
create trigger trg_commissions_updated before update on public.commissions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- LEDGER (double-entry, append-only)
-- =====================================================================
create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,       -- payment_captured | refund | commission_reversed | payout | transfer_released ...
  booking_id  uuid references public.bookings(id),
  ref_type    text,
  ref_id      uuid,
  memo        text,
  created_at  timestamptz not null default now()
);
create index on public.journal_entries (booking_id);

create table public.ledger_lines (
  id           bigint generated always as identity primary key,
  journal_id   uuid not null references public.journal_entries(id),
  account      public.ledger_account not null,
  party_type   text check (party_type in ('org','creator','traveler','platform')),
  party_id     uuid,
  debit_paise  bigint not null default 0 check (debit_paise >= 0),
  credit_paise bigint not null default 0 check (credit_paise >= 0),
  check ((debit_paise = 0) <> (credit_paise = 0))
);
create index on public.ledger_lines (journal_id);
create index on public.ledger_lines (account, party_id);

create or replace function public.check_journal_balanced() returns trigger
language plpgsql as $$
declare v_diff bigint;
begin
  select coalesce(sum(debit_paise),0) - coalesce(sum(credit_paise),0)
    into v_diff from public.ledger_lines where journal_id = new.journal_id;
  if v_diff <> 0 then
    raise exception 'Journal % not balanced (diff % paise)', new.journal_id, v_diff;
  end if;
  return null;
end $$;

create constraint trigger trg_ledger_balanced
  after insert on public.ledger_lines
  deferrable initially deferred
  for each row execute function public.check_journal_balanced();

create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin raise exception '% is append-only', tg_table_name; end $$;

create trigger trg_journal_append_only before update or delete on public.journal_entries
  for each row execute function public.forbid_mutation();
create trigger trg_ledger_append_only before update or delete on public.ledger_lines
  for each row execute function public.forbid_mutation();

-- post a balanced journal atomically. p_lines: [{"account":"...","party_type":"org","party_id":"...","debit":123}|{"credit":123}]
create or replace function public.post_journal(p_kind text, p_booking uuid, p_ref_type text, p_ref_id uuid, p_memo text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.journal_entries(kind, booking_id, ref_type, ref_id, memo)
  values (p_kind, p_booking, p_ref_type, p_ref_id, p_memo) returning id into v_id;

  insert into public.ledger_lines(journal_id, account, party_type, party_id, debit_paise, credit_paise)
  select v_id,
         (l->>'account')::public.ledger_account,
         l->>'party_type',
         nullif(l->>'party_id','')::uuid,
         coalesce((l->>'debit')::bigint, 0),
         coalesce((l->>'credit')::bigint, 0)
    from jsonb_array_elements(p_lines) l;
  return v_id;
end $$;
revoke execute on function public.post_journal(text,uuid,text,uuid,text,jsonb) from public, anon, authenticated;

-- =====================================================================
-- REVIEWS, WISHLIST, SUPPORT
-- =====================================================================
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid unique not null references public.bookings(id),
  trip_id     uuid not null references public.trips(id),
  org_id      uuid not null references public.organizations(id),
  user_id     uuid not null references public.profiles(id),
  rating      int not null check (rating between 1 and 5),
  title       text,
  body        text check (char_length(body) <= 3000),
  photo_paths text[] not null default '{}',
  operator_reply text,
  status      public.review_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.reviews (trip_id) where status = 'published';
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.wishlists (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  trip_id    uuid not null references public.trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id),
  booking_id  uuid references public.bookings(id),
  org_id      uuid references public.organizations(id),
  subject     text not null,
  category    text,          -- booking | refund | payout | trip_issue | other
  status      public.ticket_status not null default 'open',
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_tickets_updated before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  body        text not null,
  is_internal boolean not null default false,   -- staff-only notes
  created_at  timestamptz not null default now()
);
create index on public.ticket_messages (ticket_id, created_at);

create table public.kyc_documents (
  id           uuid primary key default gen_random_uuid(),
  owner_type   text not null check (owner_type in ('org','creator')),
  owner_id     uuid not null,
  doc_type     text not null,     -- pan | gst_certificate | cancelled_cheque | incorporation | aadhaar_masked
  storage_path text not null,     -- kyc bucket
  status       public.kyc_status not null default 'submitted',
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);
create index on public.kyc_documents (owner_type, owner_id);

-- =====================================================================
-- PLATFORM INFRA
-- =====================================================================
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  channel     text not null check (channel in ('email','whatsapp','sms','in_app')),
  template    text not null,
  payload     jsonb not null default '{}',
  status      text not null default 'queued' check (status in ('queued','sent','failed','read')),
  provider_id text,
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.outbox_events (
  id              bigint generated always as identity primary key,
  topic           text not null,      -- booking.confirmed | payment.captured | commission.reversed ...
  payload         jsonb not null,
  status          public.outbox_status not null default 'pending',
  attempts        int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  created_at      timestamptz not null default now()
);
create index on public.outbox_events (status, next_attempt_at);

create table public.webhook_events (
  id           text primary key,          -- provider event id (x-razorpay-event-id) → idempotency
  provider     text not null,             -- razorpay | razorpayx | whatsapp
  event_type   text not null,
  payload      jsonb not null,
  status       text not null default 'received' check (status in ('received','processed','failed','ignored')),
  error        text,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

create table public.audit_logs (
  id            bigint generated always as identity primary key,
  actor_user_id uuid,
  actor_db_role text not null default current_user,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  ip            inet,
  created_at    timestamptz not null default now()
);
create index on public.audit_logs (entity_type, entity_id);
create index on public.audit_logs (actor_user_id, created_at desc);
create trigger trg_audit_append_only before update or delete on public.audit_logs
  for each row execute function public.forbid_mutation();

create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  purpose     text not null,       -- terms | privacy | marketing_whatsapp | creator_agreement | operator_agreement
  granted     boolean not null,
  version     text not null,
  created_at  timestamptz not null default now()
);
create index on public.consents (user_id, purpose);

create table public.data_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id),
  kind        text not null check (kind in ('export','delete','correct')),
  status      text not null default 'open' check (status in ('open','in_progress','done','rejected')),
  notes       text,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- AUDIT TRIGGERS
-- =====================================================================
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_before jsonb; v_after jsonb; v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old) - 'pan_encrypted'; v_id := old.id;
  elsif tg_op = 'INSERT' then
    v_after := to_jsonb(new) - 'pan_encrypted';  v_id := new.id;
  else
    v_before := to_jsonb(old) - 'pan_encrypted';
    v_after  := to_jsonb(new) - 'pan_encrypted'; v_id := new.id;
  end if;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_before, v_after);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['organizations','org_members','creators','trips',
                           'departures','bookings','payments','refunds','transfers','commissions',
                           'payouts','coupons','kyc_documents']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$I
                    for each row execute function public.audit_row()', t);
  end loop;
end $$;
-- tables without uuid "id" column get a dedicated audit (keyed differently)
create or replace function public.audit_row_keyed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_row->>'user_id', v_row->>'trip_id')::uuid,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger trg_audit_admin_users after insert or update or delete on public.admin_users
  for each row execute function public.audit_row_keyed();
create trigger trg_audit_trip_commercials after insert or update or delete on public.trip_commercials
  for each row execute function public.audit_row_keyed();

-- =====================================================================
-- GUARD TRIGGERS (stop end-users changing privileged columns)
-- =====================================================================
create or replace function public.guard_trips() returns trigger
language plpgsql as $$
begin
  if public.is_end_user() and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.status not in ('draft','pending_review') then
        raise exception 'New trips must be draft or pending_review';
      end if;
      new.published_at := null;
    else
      if new.org_id is distinct from old.org_id then raise exception 'org_id is immutable'; end if;
      if new.status is distinct from old.status then
        -- operators may: draft<->pending_review, published->paused, paused->published (if previously approved), any->archived
        if not (
             (old.status in ('draft','rejected') and new.status = 'pending_review')
          or (old.status = 'pending_review' and new.status = 'draft')
          or (old.status = 'published' and new.status = 'paused')
          or (old.status = 'paused' and new.status = 'published' and old.published_at is not null)
          or (new.status = 'archived')
        ) then
          raise exception 'Trip status change % -> % not allowed', old.status, new.status;
        end if;
      end if;
      new.published_at := old.published_at;
      new.review_notes := old.review_notes;
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_trips before insert or update on public.trips
  for each row execute function public.guard_trips();

create or replace function public.guard_organizations() returns trigger
language plpgsql as $$
begin
  if public.is_end_user() and not public.is_admin() then
    if new.status is distinct from old.status
       or new.kyc_status is distinct from old.kyc_status
       or new.platform_fee_pct is distinct from old.platform_fee_pct
       or new.rating_avg is distinct from old.rating_avg
       or new.rating_count is distinct from old.rating_count
       or new.slug is distinct from old.slug then
      raise exception 'Not allowed to change protected organization fields';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_orgs before update on public.organizations
  for each row execute function public.guard_organizations();

create or replace function public.guard_creators() returns trigger
language plpgsql as $$
begin
  if public.is_end_user() and not public.is_admin() then
    if new.status is distinct from old.status
       or new.tier is distinct from old.tier
       or new.instagram_verified is distinct from old.instagram_verified
       or new.referral_code is distinct from old.referral_code
       or new.user_id is distinct from old.user_id then
      raise exception 'Not allowed to change protected creator fields';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_creators before update on public.creators
  for each row execute function public.guard_creators();

-- =====================================================================
-- INVENTORY FUNCTIONS (server-only; atomic, no overselling)
-- =====================================================================
create or replace function public.hold_seats(p_departure uuid, p_qty int) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.departures d
     set seats_held = d.seats_held + p_qty
   where d.id = p_departure
     and d.status = 'open'
     and d.start_date - d.booking_cutoff_days >= (now() at time zone 'Asia/Kolkata')::date
     and d.capacity - d.seats_booked - d.seats_held >= p_qty;
  return found;
end $$;

create or replace function public.confirm_seats(p_departure uuid, p_qty int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.departures d
     set seats_held   = greatest(d.seats_held - p_qty, 0),
         seats_booked = d.seats_booked + p_qty,
         status = case when d.seats_booked + p_qty >= d.capacity then 'sold_out'::public.departure_status else d.status end
   where d.id = p_departure;
end $$;

create or replace function public.release_held_seats(p_departure uuid, p_qty int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.departures set seats_held = greatest(seats_held - p_qty, 0) where id = p_departure;
end $$;

create or replace function public.release_booked_seats(p_departure uuid, p_qty int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.departures d
     set seats_booked = greatest(d.seats_booked - p_qty, 0),
         status = case when d.status = 'sold_out' then 'open'::public.departure_status else d.status end
   where d.id = p_departure;
end $$;

-- expire unpaid holds (pg_cron every minute)
create or replace function public.expire_holds() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in
    select id, departure_id, travelers_count from public.bookings
     where status = 'held' and hold_expires_at < now()
     for update skip locked
  loop
    update public.bookings set status = 'expired' where id = r.id;
    perform public.release_held_seats(r.departure_id, r.travelers_count);
    n := n + 1;
  end loop;
  return n;
end $$;

-- move commissions / bookings / departures forward in time (pg_cron daily)
create or replace function public.advance_lifecycle() returns void
language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  update public.departures set status = 'completed'
   where end_date < v_today and status in ('open','sold_out','closed');

  update public.bookings b set status = 'completed'
    from public.departures d
   where d.id = b.departure_id and b.status = 'paid_in_full' and d.end_date < v_today;

  update public.commissions c set status = 'confirmed', confirmed_at = now()
   where c.status = 'pending' and c.confirmable_at <= now()
     and exists (select 1 from public.bookings b where b.id = c.booking_id
                  and b.status in ('confirmed','paid_in_full','completed'));

  update public.commissions c set status = 'payable'
   where c.status = 'confirmed' and c.payable_at <= now()
     and exists (select 1 from public.bookings b where b.id = c.booking_id and b.status = 'completed');
end $$;

-- rollup creator stats for today (pg_cron every 15 min)
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
    select creator_id, link_id, 0, 0, count(*), 0, 0, 0
      from public.leads where created_at >= v_from and created_at < v_to and creator_id is not null and link_id is not null
     group by creator_id, link_id
    union all
    select b.attributed_creator_id, b.attribution_link_id, 0, 0, 0, count(*), sum(b.taxable_paise), coalesce(sum(c.amount_paise),0)
      from public.bookings b left join public.commissions c on c.booking_id = b.id
     where b.confirmed_at >= v_from and b.confirmed_at < v_to
       and b.attributed_creator_id is not null and b.attribution_link_id is not null
     group by b.attributed_creator_id, b.attribution_link_id
  ) x
  group by x.creator_id, x.link_id
  on conflict (creator_id, day, link_id) do update set
    clicks = excluded.clicks, unique_visitors = excluded.unique_visitors, leads = excluded.leads,
    bookings = excluded.bookings, gmv_paise = excluded.gmv_paise, commission_paise = excluded.commission_paise;
end $$;

-- recompute operator rating when a review is published/hidden
create or replace function public.refresh_org_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.organizations o set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r where r.org_id = o.id and r.status = 'published'), 0),
    rating_count = (select count(*) from public.reviews r where r.org_id = o.id and r.status = 'published')
  where o.id = coalesce(new.org_id, old.org_id);
  return null;
end $$;
create trigger trg_reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_org_rating();

-- lock down server-only functions
revoke execute on function public.hold_seats(uuid,int)           from public, anon, authenticated;
revoke execute on function public.confirm_seats(uuid,int)        from public, anon, authenticated;
revoke execute on function public.release_held_seats(uuid,int)   from public, anon, authenticated;
revoke execute on function public.release_booked_seats(uuid,int) from public, anon, authenticated;
revoke execute on function public.expire_holds()                 from public, anon, authenticated;
revoke execute on function public.advance_lifecycle()            from public, anon, authenticated;
revoke execute on function public.refresh_creator_stats(date)    from public, anon, authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy profiles_self_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- admin_users: admins read; writes server-only
create policy admin_users_read on public.admin_users for select to authenticated
  using ((select public.has_admin_role('super_admin')));

-- organizations
create policy orgs_public_read on public.organizations for select to anon, authenticated
  using (status = 'active' or (select public.is_org_member(id)) or (select public.is_admin()));
create policy orgs_manager_update on public.organizations for update to authenticated
  using ((select public.is_org_manager(id)) or (select public.is_admin()))
  with check ((select public.is_org_manager(id)) or (select public.is_admin()));
-- org creation = server action (creates org + owner membership in one transaction)

create policy org_private_read on public.organization_private for select to authenticated
  using ((select public.is_org_manager(org_id)) or (select public.has_admin_role('finance')) or (select public.has_admin_role('ops')));

create policy org_members_read on public.org_members for select to authenticated
  using ((select public.is_org_member(org_id)) or (select public.is_admin()));

-- creators
create policy creators_public_read on public.creators for select to anon, authenticated
  using (status = 'active' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy creators_self_update on public.creators for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy creator_private_read on public.creator_private for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.has_admin_role('finance')) or (select public.has_admin_role('ops')));

-- cancellation policies
create policy cp_read on public.cancellation_policies for select to anon, authenticated using (true);
create policy cp_org_write on public.cancellation_policies for insert to authenticated
  with check (org_id is not null and (select public.is_org_manager(org_id)));

-- trips
create policy trips_read on public.trips for select to anon, authenticated
  using ((status = 'published' and (select public.trip_is_public(id)))
         or (select public.is_org_member(org_id)) or (select public.is_admin()));
create policy trips_org_insert on public.trips for insert to authenticated
  with check ((select public.is_org_member(org_id)));
create policy trips_org_update on public.trips for update to authenticated
  using ((select public.is_org_member(org_id)) or (select public.is_admin()))
  with check ((select public.is_org_member(org_id)) or (select public.is_admin()));
create policy trips_admin_delete on public.trips for delete to authenticated
  using ((select public.is_admin()));

-- trip commercials: org, active creators, admins
create policy tc_read on public.trip_commercials for select to authenticated
  using ((select public.is_org_member(public.trip_org(trip_id)))
         or ((select public.is_active_creator()) and (select public.trip_is_public(trip_id)))
         or (select public.is_admin()));
create policy tc_org_write on public.trip_commercials for insert to authenticated
  with check ((select public.is_org_manager(public.trip_org(trip_id))));
create policy tc_org_update on public.trip_commercials for update to authenticated
  using ((select public.is_org_manager(public.trip_org(trip_id))))
  with check ((select public.is_org_manager(public.trip_org(trip_id))));

-- trip children (itinerary, media, pickups): public read if trip public, org members manage
do $$
declare t text;
begin
  foreach t in array array['trip_itinerary_days','trip_media','trip_pickup_points']
  loop
    execute format($f$
      create policy %1$s_read on public.%1$I for select to anon, authenticated
        using ((select public.trip_is_public(trip_id)) or (select public.is_org_member(public.trip_org(trip_id))) or (select public.is_admin()));
      create policy %1$s_write on public.%1$I for all to authenticated
        using ((select public.is_org_member(public.trip_org(trip_id))))
        with check ((select public.is_org_member(public.trip_org(trip_id))));
    $f$, t);
  end loop;
end $$;

-- departures
create policy dep_read on public.departures for select to anon, authenticated
  using ((select public.trip_is_public(trip_id)) or (select public.is_org_member(public.trip_org(trip_id))) or (select public.is_admin()));
create policy dep_org_insert on public.departures for insert to authenticated
  with check ((select public.is_org_member(public.trip_org(trip_id))) and seats_booked = 0 and seats_held = 0);
create policy dep_org_update on public.departures for update to authenticated
  using ((select public.is_org_member(public.trip_org(trip_id))))
  with check ((select public.is_org_member(public.trip_org(trip_id))));
-- NOTE: seat counters must only change via hold/confirm/release functions. Enforce with guard below.

create or replace function public.guard_departures() returns trigger
language plpgsql as $$
begin
  if public.is_end_user() and not public.is_admin() then
    if new.seats_booked is distinct from old.seats_booked or new.seats_held is distinct from old.seats_held then
      raise exception 'Seat counters are system-managed';
    end if;
    if new.capacity < old.seats_booked + old.seats_held then
      raise exception 'Capacity cannot go below seats already sold/held';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' and old.seats_booked > 0 then
      raise exception 'Departures with bookings must be cancelled via support (refund flow)';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_departures before update on public.departures
  for each row execute function public.guard_departures();

create policy dpo_read on public.departure_price_options for select to anon, authenticated
  using ((select public.trip_is_public(public.departure_trip(departure_id)))
         or (select public.is_org_member(public.trip_org(public.departure_trip(departure_id))))
         or (select public.is_admin()));
create policy dpo_write on public.departure_price_options for all to authenticated
  using ((select public.is_org_member(public.trip_org(public.departure_trip(departure_id)))))
  with check ((select public.is_org_member(public.trip_org(public.departure_trip(departure_id)))));

create policy co_read on public.commission_overrides for select to authenticated
  using (creator_id = (select public.my_creator_id())
         or (select public.is_org_manager(public.trip_org(trip_id))) or (select public.is_admin()));
create policy co_write on public.commission_overrides for all to authenticated
  using ((select public.is_org_manager(public.trip_org(trip_id))))
  with check ((select public.is_org_manager(public.trip_org(trip_id))));

-- creator links: creators manage own
create policy links_own on public.creator_links for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.is_admin()));
create policy links_own_insert on public.creator_links for insert to authenticated
  with check (creator_id = (select public.my_creator_id()) and (select public.is_active_creator()));
create policy links_own_update on public.creator_links for update to authenticated
  using (creator_id = (select public.my_creator_id()))
  with check (creator_id = (select public.my_creator_id()));

-- clicks / leads: admin read only (server writes)
create policy clicks_admin on public.clicks for select to authenticated using ((select public.is_admin()));
create policy leads_admin on public.leads for select to authenticated using ((select public.is_admin()));
create policy leads_admin_update on public.leads for update to authenticated
  using ((select public.has_admin_role('ops'))) with check ((select public.has_admin_role('ops')));

create policy stats_own on public.creator_daily_stats for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.is_admin()));

-- coupons: admin only (validated server-side)
create policy coupons_admin on public.coupons for select to authenticated using ((select public.is_admin()));

-- bookings: traveler own, org own, admin. NO client writes.
create policy bookings_read on public.bookings for select to authenticated
  using (traveler_user_id = (select auth.uid())
         or (select public.is_org_member(org_id))
         or (select public.is_admin()));

create policy bt_read on public.booking_travelers for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                  and (b.traveler_user_id = (select auth.uid()) or public.is_org_member(b.org_id)))
         or (select public.is_admin()));

create policy payments_read on public.payments for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                  and (b.traveler_user_id = (select auth.uid()) or public.is_org_member(b.org_id)))
         or (select public.is_admin()));
create policy refunds_read on public.refunds for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                  and (b.traveler_user_id = (select auth.uid()) or public.is_org_member(b.org_id)))
         or (select public.is_admin()));
create policy transfers_read on public.transfers for select to authenticated
  using ((select public.is_org_manager(org_id)) or (select public.has_admin_role('finance')));

-- commissions / payouts: creator own
create policy comm_read on public.commissions for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.is_admin()));
create policy payouts_read on public.payouts for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.has_admin_role('finance')));

-- ledger: finance only
create policy journal_read on public.journal_entries for select to authenticated using ((select public.has_admin_role('finance')));
create policy ledger_read  on public.ledger_lines   for select to authenticated using ((select public.has_admin_role('finance')));

-- reviews
create policy reviews_read on public.reviews for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid())
         or (select public.is_org_member(org_id)) or (select public.is_admin()));
create policy reviews_insert on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
              and exists (select 1 from public.bookings b where b.id = booking_id
                           and b.traveler_user_id = (select auth.uid())
                           and b.status = 'completed'
                           and b.trip_id = reviews.trip_id and b.org_id = reviews.org_id));
create policy reviews_update_own on public.reviews for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'pending');
-- operator replies + moderation go through server actions

-- wishlists
create policy wishlist_own on public.wishlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- support
create policy tickets_read on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()) or (org_id is not null and (select public.is_org_member(org_id)))
         or (select public.has_admin_role('support')));
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');
create policy tm_read on public.ticket_messages for select to authenticated
  using ((select public.has_admin_role('support'))
         or (not is_internal and exists (select 1 from public.support_tickets t where t.id = ticket_id
              and (t.user_id = (select auth.uid()) or (t.org_id is not null and public.is_org_member(t.org_id))))));
create policy tm_insert on public.ticket_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and not is_internal
              and exists (select 1 from public.support_tickets t where t.id = ticket_id
                   and (t.user_id = (select auth.uid()) or (t.org_id is not null and public.is_org_member(t.org_id)))));

-- kyc docs: owner read/insert, admin all (review via server)
create policy kyc_read on public.kyc_documents for select to authenticated
  using ((owner_type = 'creator' and owner_id = (select public.my_creator_id()))
         or (owner_type = 'org' and (select public.is_org_manager(owner_id)))
         or (select public.has_admin_role('ops')));
create policy kyc_insert on public.kyc_documents for insert to authenticated
  with check (status = 'submitted' and (
              (owner_type = 'creator' and owner_id = (select public.my_creator_id()))
           or (owner_type = 'org' and (select public.is_org_manager(owner_id)))));

-- notifications, consents, data requests: own
create policy notif_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy consents_own on public.consents for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy consents_insert on public.consents for insert to authenticated with check (user_id = (select auth.uid()));
create policy dr_own on public.data_requests for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy dr_insert on public.data_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'open');

-- infra: admin read only
create policy outbox_admin  on public.outbox_events  for select to authenticated using ((select public.is_admin()));
create policy webhook_admin on public.webhook_events for select to authenticated using ((select public.is_admin()));
create policy audit_admin   on public.audit_logs     for select to authenticated using ((select public.has_admin_role('super_admin')));
create policy settings_admin on public.app_settings  for select to authenticated using ((select public.is_admin()));

-- =====================================================================
-- STORAGE
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true,  10485760, array['image/jpeg','image/png','image/webp','image/avif','video/mp4']),
  ('kyc',          'kyc',          false,  5242880, array['image/jpeg','image/png','application/pdf']),
  ('documents',    'documents',    false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- public-media paths: orgs/{org_id}/...  |  users/{user_id}/...
create policy media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (
      ((storage.foldername(name))[1] = 'orgs'  and public.is_org_member(((storage.foldername(name))[2])::uuid))
   or ((storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = (select auth.uid())::text)));
create policy media_modify on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (
      ((storage.foldername(name))[1] = 'orgs'  and public.is_org_member(((storage.foldername(name))[2])::uuid))
   or ((storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = (select auth.uid())::text)));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (
      ((storage.foldername(name))[1] = 'orgs'  and public.is_org_member(((storage.foldername(name))[2])::uuid))
   or ((storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = (select auth.uid())::text)));

-- kyc paths: creators/{user_id}/...  |  orgs/{org_id}/...   (write-once, no update/delete for users)
create policy kyc_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (
      ((storage.foldername(name))[1] = 'creators' and (storage.foldername(name))[2] = (select auth.uid())::text)
   or ((storage.foldername(name))[1] = 'orgs'     and public.is_org_manager(((storage.foldername(name))[2])::uuid))));
create policy kyc_obj_read on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and (
      ((storage.foldername(name))[1] = 'creators' and (storage.foldername(name))[2] = (select auth.uid())::text)
   or ((storage.foldername(name))[1] = 'orgs'     and public.is_org_manager(((storage.foldername(name))[2])::uuid))
   or public.has_admin_role('ops')));
-- 'documents' bucket (invoices, statements): no client policies → server issues short-lived signed URLs

-- =====================================================================
-- SEED
-- =====================================================================
insert into public.cancellation_policies (name, rules, deposit_non_refundable, zero_refund_within_days, is_system) values
 ('Flexible', '[{"min_days_before":30,"refund_pct":90},{"min_days_before":15,"refund_pct":50},{"min_days_before":0,"refund_pct":0}]', true, 15, true),
 ('Moderate', '[{"min_days_before":45,"refund_pct":75},{"min_days_before":21,"refund_pct":50},{"min_days_before":0,"refund_pct":0}]', true, 21, true),
 ('Strict',   '[{"min_days_before":60,"refund_pct":50},{"min_days_before":0,"refund_pct":0}]', true, 60, true);

insert into public.app_settings (key, value) values
 ('commission', '{"min_creator_pct":8,"default_platform_fee_pct":5,"attribution_window_days":90,"payable_after_end_days":3,"min_payout_paise":10000}'),
 ('checkout',   '{"hold_minutes":15,"max_travelers":20,"domestic_only":true}'),
 ('tax',        '{"fee_gst_pct":18,"gst_tcs_pct":0.5,"it_tds_ecom_pct":0.1,"it_tds_commission_pct":2,"it_tds_commission_fy_threshold_paise":2000000,"overseas_tcs_pct":2,"VERIFY_WITH_CA":true}'),
 ('payouts',    '{"schedule":"monthly","day_of_month":5,"maker_checker":true}');

-- =====================================================================
-- CRON (enable pg_cron in Dashboard → Database → Extensions first, then run)
-- =====================================================================
-- select cron.schedule('expire-holds',        '* * * * *',    $$select public.expire_holds()$$);
-- select cron.schedule('refresh-stats',       '*/15 * * * *', $$select public.refresh_creator_stats()$$);
-- select cron.schedule('advance-lifecycle',   '30 18 * * *',  $$select public.advance_lifecycle()$$);  -- 00:00 IST
