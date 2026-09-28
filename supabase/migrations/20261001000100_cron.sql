-- Schedules the pure-DB jobs that the init migration left commented out (ARCHITECTURE §10).
-- cron.schedule upserts by job name, so re-running is safe.
create extension if not exists pg_cron;

select cron.schedule('expire-holds',      '* * * * *',    $$select public.expire_holds()$$);
select cron.schedule('refresh-stats',     '*/15 * * * *', $$select public.refresh_creator_stats()$$);
select cron.schedule('advance-lifecycle', '30 18 * * *',  $$select public.advance_lifecycle()$$);  -- 00:00 IST
