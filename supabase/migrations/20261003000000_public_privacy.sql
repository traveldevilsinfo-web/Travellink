-- M3: the public site reads organizations/creators as anon. RLS filters ROWS; these grants hide COLUMNS.
--  * Operator contacts stay hidden until booking (ARCHITECTURE §1, §8.6 operator bypass).
--  * platform_fee_pct is commercial.
--  * Referral codes must not be discoverable (§8.6 code poaching).

revoke select on public.organizations from anon, authenticated;
grant select (id, slug, name, legal_name, gstin, gst_scheme, state_code, description, logo_url, city,
              status, kyc_status, rating_avg, rating_count, created_at, updated_at)
  on public.organizations to anon, authenticated;

revoke select on public.creators from anon, authenticated;
grant select (id, handle, display_name, bio, avatar_url, cover_url, instagram_handle, instagram_followers,
              instagram_verified, youtube_url, languages, home_city, tier, status, created_at, updated_at)
  on public.creators to anon, authenticated;
-- authenticated also needs user_id (requireCreator filters on it); anon never does.
grant select (user_id) on public.creators to authenticated;

-- Contacts for the org's own team and admins. (M5+: also travelers with a confirmed booking.)
create or replace function public.get_org_contacts(p_org uuid)
returns table (support_phone text, support_email text)
language sql stable security definer set search_path = '' as $$
  select o.support_phone, o.support_email::text from public.organizations o
   where o.id = p_org and (public.is_org_member(p_org) or public.is_admin());
$$;
revoke all on function public.get_org_contacts(uuid) from public, anon;
grant execute on function public.get_org_contacts(uuid) to authenticated;

create or replace function public.my_referral_code()
returns text
language sql stable security definer set search_path = '' as $$
  select c.referral_code::text from public.creators c where c.user_id = auth.uid();
$$;
revoke all on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated;
