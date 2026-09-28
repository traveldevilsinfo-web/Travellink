-- M4 (ARCHITECTURE §20): Instagram-gated creators, per-trip booking modes, lead fees, click ids.

-- ---------- creators: waitlist state ----------
alter type public.account_status add value if not exists 'waitlist';

insert into public.app_settings (key, value)
values ('creator', '{"min_followers":1000,"lead_qualification_days":7,"lead_dedupe_days":30}')
on conflict (key) do nothing;

create or replace function public.get_public_setting(p_key text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.app_settings where key = p_key and p_key in ('commission', 'checkout', 'creator');
$$;

-- ---------- Instagram account per creator (private) ----------
create table public.creator_social_accounts (
  creator_id          uuid primary key references public.creators(id) on delete cascade,
  provider            text not null default 'instagram' check (provider = 'instagram'),
  provider_user_id    text not null unique,
  username            citext not null,
  account_type        text,                       -- BUSINESS | MEDIA_CREATOR
  profile_picture_url text,
  followers_count     int not null check (followers_count >= 0),
  media_count         int,
  token_encrypted     text,                       -- AES-GCM via lib/security/crypto.ts; never readable by clients
  token_expires_at    timestamptz,
  last_synced_at      timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_social_updated before update on public.creator_social_accounts
  for each row execute function public.set_updated_at();
alter table public.creator_social_accounts enable row level security;
create policy social_own_read on public.creator_social_accounts for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.is_admin()));
-- column grants: the token columns are server-only even for the owner
revoke all on public.creator_social_accounts from anon, authenticated;
grant select (creator_id, provider, username, account_type, profile_picture_url, followers_count, media_count, last_synced_at)
  on public.creator_social_accounts to authenticated;
-- writes: server only (Instagram OAuth callback + daily sync use the service role; data comes from Meta, never the client)

create table public.creator_social_snapshots (
  creator_id      uuid not null references public.creators(id) on delete cascade,
  day             date not null,
  followers_count int not null,
  avg_reel_views  int,
  engagement_rate numeric(5,2),
  primary key (creator_id, day)
);
alter table public.creator_social_snapshots enable row level security;
create policy snap_own_read on public.creator_social_snapshots for select to authenticated
  using (creator_id = (select public.my_creator_id()) or (select public.is_admin()));
revoke insert, update, delete on public.creator_social_snapshots from anon, authenticated;

-- ---------- trips: booking mode + lead fee ----------
create type public.booking_mode as enum ('platform', 'redirect', 'enquiry');
alter table public.trips
  add column booking_mode public.booking_mode not null default 'platform',
  add column redirect_url text check (redirect_url is null or redirect_url ~ '^https://[^\s]+$'),
  add column lead_fee_paise bigint not null default 0 check (lead_fee_paise >= 0 and lead_fee_paise <= 100000),
  add column lead_fee_monthly_cap int check (lead_fee_monthly_cap is null or lead_fee_monthly_cap between 1 and 10000),
  add constraint trips_redirect_needs_url check (booking_mode <> 'redirect' or redirect_url is not null);

-- ---------- clicks: public click id passed to operator sites / postbacks ----------
alter table public.clicks add column click_id text unique default public.gen_code('TLC-', 8);

-- ---------- leads: qualification + lead fee snapshot ----------
alter table public.leads
  add column qualified_at timestamptz,
  add column qualification_method text check (qualification_method in ('otp','whatsapp_reply','admin')),
  add column lead_fee_paise bigint not null default 0 check (lead_fee_paise >= 0),
  add column fee_status text not null default 'none' check (fee_status in ('none','pending','confirmed','rejected','paid'));
