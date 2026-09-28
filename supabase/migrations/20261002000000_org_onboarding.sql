-- M2: operator self-serve onboarding + admin KYC review.

-- Org + owner membership + private row in one transaction (ARCHITECTURE §6.9).
-- security definer because organizations/org_members/organization_private have no client insert policies.
create or replace function public.create_organization(p_name text, p_slug text, p_city text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if length(trim(p_name)) not between 2 and 120 then raise exception 'invalid name' using errcode = '22023'; end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 60 then raise exception 'invalid slug' using errcode = '22023'; end if;
  -- ponytail: flat cap against spam orgs; revisit if an owner legitimately runs more brands.
  if (select count(*) from public.org_members where user_id = v_uid and role = 'owner') >= 3 then
    raise exception 'org limit reached' using errcode = '54000';
  end if;

  insert into public.organizations (name, slug, city) values (trim(p_name), p_slug, nullif(trim(p_city), ''))
  returning id into v_org;
  insert into public.org_members (org_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.organization_private (org_id) values (v_org);
  return v_org;
end $$;

revoke all on function public.create_organization(text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;

-- Owner accepts the operator agreement: stamps organization_private + records consent.
create or replace function public.accept_operator_agreement(p_org uuid, p_version text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = v_uid and role = 'owner') then
    raise exception 'only the owner can accept the agreement' using errcode = '42501';
  end if;
  if p_version !~ '^v[0-9]+(\.[0-9]+)?$' then raise exception 'invalid version' using errcode = '22023'; end if;

  update public.organization_private
     set agreement_version = p_version, agreement_accepted_at = now(), updated_at = now()
   where org_id = p_org;
  insert into public.consents (user_id, purpose, granted, version) values (v_uid, 'operator_agreement', true, p_version);
end $$;

revoke all on function public.accept_operator_agreement(uuid, text) from public, anon;
grant execute on function public.accept_operator_agreement(uuid, text) to authenticated;

-- Ops admins (aal2) review KYC documents. Audited by trg_audit_kyc_documents.
create policy kyc_admin_update on public.kyc_documents for update to authenticated
  using ((select public.has_admin_role('ops')))
  with check ((select public.has_admin_role('ops')));

-- Non-secret settings operators/creators need (commission floor, checkout limits). app_settings itself stays admin-only.
create or replace function public.get_public_setting(p_key text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.app_settings where key = p_key and p_key in ('commission', 'checkout');
$$;

revoke all on function public.get_public_setting(text) from public, anon;
grant execute on function public.get_public_setting(text) to authenticated;
