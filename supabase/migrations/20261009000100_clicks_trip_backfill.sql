-- Fix: /r logged clicks without trip_id until Phase 5 (resolveLink never returned it), so operator stats
-- missed them. Fill from the link, then rebuild both rollups for the affected days.
update public.clicks c set trip_id = l.trip_id
  from public.creator_links l
 where l.id = c.link_id and c.trip_id is null and l.trip_id is not null;

do $$
declare d date;
begin
  for d in select distinct (created_at at time zone 'Asia/Kolkata')::date from public.clicks loop
    perform public.refresh_creator_stats(d);
    perform public.refresh_org_stats(d);
  end loop;
end $$;
