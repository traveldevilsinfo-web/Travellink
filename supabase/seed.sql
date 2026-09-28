-- Local dev seed only (supabase db reset). Never run against staging/prod.
-- Dev logins (email + password "devpassword123"): admin@triplink.test, operator@triplink.test, creator@triplink.test, traveler@triplink.test
-- Admin still needs TOTP enrolment (aal2) before is_admin() is true.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now(),
       '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000a001'::uuid, 'admin@triplink.test',    'Dev Admin'),
  ('00000000-0000-0000-0000-00000000a002'::uuid, 'operator@triplink.test', 'Dev Operator'),
  ('00000000-0000-0000-0000-00000000a003'::uuid, 'creator@triplink.test',  'Riya Dev'),
  ('00000000-0000-0000-0000-00000000a004'::uuid, 'traveler@triplink.test', 'Dev Traveler')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email), now(), now(), now()
from auth.users where email like '%@triplink.test';

insert into public.admin_users (user_id, role) values ('00000000-0000-0000-0000-00000000a001', 'super_admin');

insert into public.organizations (id, slug, name, legal_name, gst_scheme, state_code, city, status, kyc_status)
values ('00000000-0000-0000-0000-0000000000b1', 'travel-devils', 'Travel Devils', 'Travel Devils Pvt Ltd', 'gst5_no_itc', '07', 'Delhi', 'active', 'approved');
insert into public.organization_private (org_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.org_members (org_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000a002', 'owner');

insert into public.creators (id, user_id, handle, display_name, instagram_handle, status, referral_code)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a003', 'riya.travels', 'Riya', 'riya.travels', 'active', 'RIYA10');
insert into public.creator_private (creator_id) values ('00000000-0000-0000-0000-0000000000c1');

insert into public.trips (id, org_id, slug, title, summary, destination, state, start_city, duration_days, duration_nights,
                          difficulty, from_price_paise, inclusions, exclusions, cancellation_policy_id, status, published_at)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'chakrata-weekend',
       'Chakrata Weekend Escape', 'Tiger Falls, Lakhamandal and camping under the stars.', 'Chakrata', 'Uttarakhand', 'Delhi',
       3, 2, 'easy', 1000000, '{Stay,Meals,Transport}', '{"Personal expenses"}', p.id, 'published', now()
from public.cancellation_policies p where p.name = 'Flexible' and p.is_system;

insert into public.trip_commercials (trip_id, creator_commission_pct) values ('00000000-0000-0000-0000-0000000000d1', 10);

insert into public.trip_itinerary_days (trip_id, day_number, title) values
  ('00000000-0000-0000-0000-0000000000d1', 1, 'Delhi → Chakrata'),
  ('00000000-0000-0000-0000-0000000000d1', 2, 'Tiger Falls trek'),
  ('00000000-0000-0000-0000-0000000000d1', 3, 'Lakhamandal → Delhi');

insert into public.departures (id, trip_id, start_date, end_date, capacity, deposit_per_person_paise)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1',
        current_date + 30, current_date + 32, 20, 300000);

insert into public.departure_price_options (departure_id, label, price_paise, is_default, sort_order) values
  ('00000000-0000-0000-0000-0000000000e1', 'Triple sharing', 1000000, true, 0),
  ('00000000-0000-0000-0000-0000000000e1', 'Double sharing', 1200000, false, 1);
