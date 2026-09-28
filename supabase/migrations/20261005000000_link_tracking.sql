-- Phase 1: public storefront lists the trips a creator links to, without exposing creator_links.
create or replace function public.storefront_trip_ids(p_handle text)
returns table (trip_id uuid)
language sql stable security definer set search_path = '' as $$
  select distinct l.trip_id
    from public.creator_links l
    join public.creators c on c.id = l.creator_id
   where lower(c.handle::text) = lower(p_handle) and c.status = 'active' and l.is_active and l.trip_id is not null
     and public.trip_is_public(l.trip_id);
$$;
revoke all on function public.storefront_trip_ids(text) from public;
grant execute on function public.storefront_trip_ids(text) to anon, authenticated;
