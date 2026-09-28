-- Phase 3 (ARCHITECTURE §20.3/§20.4/§20.6): operator affiliate settings + creator content kit.

-- ---------- content kit: operator-written hooks and a brief for creators ----------
alter table public.trips
  add column creator_hooks text[] not null default '{}'
    check (cardinality(creator_hooks) <= 10),
  add column creator_brief text check (char_length(creator_brief) <= 1500);

-- ---------- commercial fields: owners/managers only (staff may edit content, not money) ----------
-- trip_commercials already has manager-only write policies; these columns live on trips, whose update
-- policy admits any org member, so a trigger enforces the role.
create or replace function public.guard_trip_commercial_fields() returns trigger
language plpgsql as $$
begin
  if public.is_end_user() and not public.is_admin() and not public.is_org_manager(new.org_id) and (
       new.booking_mode is distinct from old.booking_mode
    or new.redirect_url is distinct from old.redirect_url
    or new.lead_fee_paise is distinct from old.lead_fee_paise
    or new.lead_fee_monthly_cap is distinct from old.lead_fee_monthly_cap) then
    raise exception 'Only owners and managers can change booking mode or lead fees' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_guard_trip_commercial before update on public.trips
  for each row execute function public.guard_trip_commercial_fields();
