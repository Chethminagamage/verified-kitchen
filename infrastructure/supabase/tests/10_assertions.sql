-- =====================================================================
-- Database assertions — run after all migrations + seed on a throwaway
-- Postgres (CI, or locally). Any failed check raises and stops the run.
--
--   psql -v ON_ERROR_STOP=1 -f tests/00_supabase_stub.sql
--   psql -v ON_ERROR_STOP=1 -f migrations/<each>.sql
--   psql -v ON_ERROR_STOP=1 -f seed.sql
--   psql -v ON_ERROR_STOP=1 -f tests/10_assertions.sql
-- =====================================================================
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned

create or replace function pg_temp.check(ok boolean, what text) returns void
language plpgsql as $$
begin
  if ok is not true then
    raise exception 'ASSERTION FAILED: %', what;
  end if;
  raise notice 'ok: %', what;
end;
$$;

-- Expects the statement to fail with an error (e.g. a permission or trigger refusal).
create or replace function pg_temp.check_fails(stmt text, what text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok: % (refused: %)', what, sqlerrm;
    return;
  end;
  raise exception 'ASSERTION FAILED: % (statement succeeded)', what;
end;
$$;

grant execute on all functions in schema pg_temp to public;

-- Fixtures: the operator works in kitchen-001; "other" has no kitchen.
insert into public.user_kitchens
select '22222222-2222-2222-2222-222222222222', id from public.kitchens where code = 'kitchen-001';

-- ---------------------------------------------------------------------
-- Evidence validation
-- ---------------------------------------------------------------------
insert into public.sensor_readings (kitchen_id, device_id, device_ts, fridge_temp_c)
select id, 'vk-env-01', '2026-11-04T10:00:00Z', 3.5 from public.kitchens;
insert into public.sensor_readings (kitchen_id, device_id, device_ts, fridge_temp_c)
select id, 'vk-env-01', '2026-11-04T10:00:00Z', 3.5 from public.kitchens
on conflict (device_id, device_ts) do nothing;
select pg_temp.check((select count(*) = 1 from public.sensor_readings), 'duplicate ESP32 re-send is ignored');
select pg_temp.check_fails(
  $$insert into public.sensor_readings (kitchen_id, device_id, device_ts, fridge_temp_c)
    select id, 'vk-env-01', now(), -127 from public.kitchens$$,
  'DS18B20 -127 °C sentinel is rejected');

-- ---------------------------------------------------------------------
-- Violation created by the edge service -> audited automatically
-- ---------------------------------------------------------------------
set role service_role;
insert into public.violations (kitchen_id, occurred_at, pillar, source, indicator, title, severity)
select id, now(), 'personal', 'ai', 'gloves', 'Gloves not detected', 'high' from public.kitchens;
reset role;
select pg_temp.check(
  (select count(*) = 1 from public.audit_records where event_type = 'violation_created'),
  'new violation writes an audit record');

-- ---------------------------------------------------------------------
-- Operator workflow (as the signed-in operator)
-- ---------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

update public.violations
   set status = 'acknowledged',
       acknowledged_by = '11111111-1111-1111-1111-111111111111',
       acknowledged_at = '2000-01-01';
select pg_temp.check(
  (select acknowledged_by = '22222222-2222-2222-2222-222222222222'
          and acknowledged_at > now() - interval '1 minute' from public.violations),
  'database records the real actor and time (spoofed values ignored)');

select pg_temp.check_fails($$update public.violations set status = 'active'$$,
  'status cannot move backwards');
select pg_temp.check_fails($$update public.violations set severity = 'low'$$,
  'operators cannot edit violation content');

update public.violations set status = 'resolved';
select pg_temp.check((select status = 'resolved' and resolved_at is not null from public.violations),
  'operator can resolve');

update public.kitchens set name = 'Renamed';
select pg_temp.check_fails($$update public.kitchens set code = 'hijacked'$$,
  'operators cannot change the kitchen code');
select pg_temp.check_fails($$update public.kitchens set is_public = false$$,
  'operators cannot change public visibility');
select pg_temp.check_fails($$insert into public.sensor_readings (kitchen_id, device_id, device_ts)
    select id, 'vk-env-01', now() from public.kitchens$$,
  'operators cannot write evidence');
select pg_temp.check_fails($$update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222'$$,
  'operators cannot promote themselves');
select pg_temp.check_fails($$select * from public.purge_old_evidence()$$,
  'operators cannot run the retention job');

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select count(*) = 0 from public.violations), 'users without the kitchen see nothing');
reset role;

-- ---------------------------------------------------------------------
-- Consumers (anon) see only the public views
-- ---------------------------------------------------------------------
set role anon;
select pg_temp.check_fails($$select 1 from public.violations limit 1$$, 'anon cannot read base tables');
select pg_temp.check((select count(*) = 1 from public.public_kitchen_scores), 'anon can read the public score view');
reset role;

-- ---------------------------------------------------------------------
-- Audit chain integrity and tamper detection
-- ---------------------------------------------------------------------
select pg_temp.check(
  (select count(*) = 3 and bool_and(ok) from public.verify_audit_chain((select id from public.kitchens))),
  'audit chain has 3 records and verifies');
select pg_temp.check_fails($$delete from public.audit_records$$, 'audit records cannot be deleted');

alter table public.audit_records disable trigger audit_records_protect_trg;
update public.audit_records set event_payload = '{"tampered": true}' where chain_seq = 2;
alter table public.audit_records enable trigger audit_records_protect_trg;
select pg_temp.check(
  (select reason = 'record content modified' from public.verify_audit_chain((select id from public.kitchens))
    where chain_seq = 2),
  'tampering with a record is detected');

-- ---------------------------------------------------------------------
-- Retention: charts identical before/after purge; linked evidence kept
-- ---------------------------------------------------------------------
insert into public.hygiene_scores (kitchen_id, computed_at, window_start, window_end,
  overall_score, personal_score, food_prep_score, environmental_score, config_id)
select k.id, t, t - interval '1 min', t,
       60 + (extract(epoch from t)::bigint % 4000) / 100.0,
       case when extract(hour from t at time zone 'Asia/Colombo') between 7 and 21
            then 50 + (extract(epoch from t)::bigint % 5000) / 100.0 end,
       70, 100, c.id
  from public.kitchens k, public.scoring_configs c,
       generate_series(date_trunc('minute', now()) - interval '10 days', now(), interval '5 min') t;
insert into public.ai_detections (kitchen_id, device_id, detected_at, pillar, indicator, compliant, confidence, model_version)
select k.id, 'vk-cam-01', t, 'personal', 'gloves', false, 0.9, 'test'
  from public.kitchens k, generate_series(now() - interval '10 days', now(), interval '1 hour') t;
set role service_role;
insert into public.violations (kitchen_id, occurred_at, pillar, source, indicator, title, severity, detection_id)
select id, now() - interval '9 days', 'personal', 'ai', 'gloves', 'Old incident', 'high',
       (select min(id) from public.ai_detections) from public.kitchens;
reset role;

create temp table before_h as
  select * from public.hygiene_score_series((select id from public.kitchens), now() - interval '10 days', now(), interval '1 hour');
create temp table before_d as
  select * from public.hygiene_score_series((select id from public.kitchens), now() - interval '10 days', now(), interval '1 day');
select pg_temp.check((select deleted_scores > 0 from public.purge_old_evidence()), 'purge removes old scores');
select pg_temp.check((select deleted_scores = 0 from public.purge_old_evidence()), 'purge is idempotent');
create temp table after_h as
  select * from public.hygiene_score_series((select id from public.kitchens), now() - interval '10 days', now(), interval '1 hour');
create temp table after_d as
  select * from public.hygiene_score_series((select id from public.kitchens), now() - interval '10 days', now(), interval '1 day');

select pg_temp.check(
  not exists ((table before_h except table after_h) union all (table after_h except table before_h)),
  'hourly chart identical after purge');
select pg_temp.check(
  not exists ((table before_d except table after_d) union all (table after_d except table before_d)),
  'daily chart identical after purge');
select pg_temp.check(
  exists (select 1 from public.ai_detections where id = (select detection_id from public.violations where title = 'Old incident')),
  'evidence linked to a violation survives the purge');
select pg_temp.check(
  (select count(*) = 1 from public.ai_detections where detected_at < now() - interval '8 days'),
  'other old evidence is purged');

-- ---------------------------------------------------------------------
-- Sensor history + explicit safe ranges (migration 20261105000000)
-- ---------------------------------------------------------------------
insert into public.sensor_readings (kitchen_id, device_id, device_ts, ambient_temp_c, humidity_pct, fridge_temp_c)
select k.id, 'vk-env-01', t, 27 + (extract(minute from t)::int % 3), 60, case when extract(minute from t)::int % 10 = 0 then null else 4 end
  from public.kitchens k, generate_series(date_trunc('hour', now()) - interval '2 hours', date_trunc('hour', now()) - interval '30 seconds', interval '30 seconds') t
on conflict (device_id, device_ts) do nothing;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check(
  (select count(*) = 24 and min(samples) = 10 and max(ambient_max) = 29 and min(ambient_min) = 27
     from public.sensor_reading_series((select id from public.kitchens),
                                        date_trunc('hour', now()) - interval '2 hours', date_trunc('hour', now()),
                                        interval '5 minutes')),
  'sensor series: 5-minute buckets with min / max');
select pg_temp.check(
  -- Buckets align to the kitchen's local hour (UTC+5:30), so a UTC hour can span two of them.
  (select count(*) >= 1 and bool_and(fridge_avg = 4) from public.sensor_reading_series((select id from public.kitchens),
     date_trunc('hour', now()) - interval '1 hour', date_trunc('hour', now()), interval '1 hour')),
  'sensor series: failed fridge readings (null) are ignored, not averaged as 0');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check(
  (select count(*) = 0 from public.sensor_reading_series((select id from public.kitchens), now() - interval '1 day', now())),
  'sensor series respects kitchen access');
reset role;
select pg_temp.check(
  (select (thresholds -> 'environment' -> 'fridge_temp_c' ->> 'max')::numeric = 5
     from public.scoring_configs where version = 'v0-provisional'),
  'environmental safe ranges stored in the active config');

-- ---------------------------------------------------------------------
-- Real camera evidence is idempotent (migration 20261114000000)
-- ---------------------------------------------------------------------
insert into public.ai_detections (kitchen_id, device_id, detected_at, pillar, indicator, compliant, confidence, model_version)
select id, 'vk-cam-01', '2026-11-14T10:00:05Z', 'personal', 'mask', true, 0.8, 'ppe@abc' from public.kitchens;
insert into public.ai_detections (kitchen_id, device_id, detected_at, pillar, indicator, compliant, confidence, model_version)
select id, 'vk-cam-01', '2026-11-14T10:00:05Z', 'personal', 'mask', true, 0.8, 'ppe@abc' from public.kitchens
on conflict (device_id, indicator, detected_at) do nothing;
select pg_temp.check(
  (select count(*) = 1 from public.ai_detections where detected_at = '2026-11-14T10:00:05Z' and indicator = 'mask'),
  'redelivered camera window (MQTT QoS 1) is ignored');
insert into public.ai_detections (kitchen_id, device_id, detected_at, pillar, indicator, compliant, confidence, model_version)
select id, 'vk-cam-01', '2026-11-14T10:00:05Z', 'personal', 'gloves', false, 0.7, 'ppe@abc' from public.kitchens
on conflict (device_id, indicator, detected_at) do nothing;
select pg_temp.check(
  (select count(*) = 2 from public.ai_detections where detected_at = '2026-11-14T10:00:05Z'),
  'other indicators of the same window are stored');

-- ---------------------------------------------------------------------
-- Scoring config v1-live (migration 20261115000000)
-- ---------------------------------------------------------------------
select pg_temp.check(
  (select count(*) = 1 from public.scoring_configs where is_active and version = 'v1-live'),
  'v1-live is the only active scoring config');
select pg_temp.check(
  (select (thresholds ->> 'window_s')::numeric = 300
          and (thresholds -> 'item_weights' ->> 'gloves')::numeric > (thresholds -> 'item_weights' ->> 'hairnet')::numeric
          and jsonb_array_length(thresholds -> 'caps') = 2
     from public.scoring_configs where version = 'v1-live'),
  'v1-live stores its rules explicitly (window, item weights, caps)');
select pg_temp.check(
  (select count(*) = 1 from public.scoring_configs where version = 'v0-provisional'),
  'earlier config kept for traceability of older scores');

-- ---------------------------------------------------------------------
-- Consumer marketplace (migrations 20261116000000 / 20261116010000)
-- ---------------------------------------------------------------------
reset role;
-- A new app sign-up: name and phone from the form; role is ALWAYS customer,
-- even if the client tries to send one.
insert into auth.users (id, email, raw_user_meta_data) values
  ('44444444-4444-4444-4444-444444444444', 'cust@test', '{"full_name": "Nimal Perera", "phone": "+94 77 123 4567", "role": "admin"}'),
  ('55555555-5555-5555-5555-555555555555', 'cust2@test', '{"full_name": "Kamala", "phone": "not a phone"}');
select pg_temp.check(
  (select role = 'customer' and full_name = 'Nimal Perera' and phone = '+94 77 123 4567'
     from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'sign-up creates a customer profile; a role sent by the client is ignored');
select pg_temp.check(
  (select role = 'customer' and phone is null from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  'an invalid phone from the sign-up form is not stored');

-- Kitchens for the tests: kitchen-001 open all day; a second, closed kitchen.
update public.kitchens set opens_at = '00:00', closes_at = '00:00', cuisine = 'Sri Lankan' where code = 'kitchen-001';
insert into public.kitchens (code, name, is_public, opens_at, closes_at)
values ('kitchen-closed', 'Closed Kitchen', true,
        ((now() + interval '2 hours') at time zone 'Asia/Colombo')::time,
        ((now() + interval '3 hours') at time zone 'Asia/Colombo')::time);
insert into public.menu_items (kitchen_id, name, price_lkr)
select id, 'Rice and curry', 650 from public.kitchens where code = 'kitchen-001';
insert into public.menu_items (kitchen_id, name, price_lkr)
select id, 'Kottu', 900 from public.kitchens where code = 'kitchen-001';
insert into public.menu_items (kitchen_id, name, price_lkr, is_available)
select id, 'Sold out dish', 500, false from public.kitchens where code = 'kitchen-001';
insert into public.menu_items (kitchen_id, name, price_lkr)
select id, 'Hoppers', 300 from public.kitchens where code = 'kitchen-closed';
insert into public.public_ratings (kitchen_id, status, rating, grade, coverage, config_version)
select id, 'verified', 88.5, 'A', 0.95, 'v1-live' from public.kitchens where code = 'kitchen-001';

set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.check_fails(
  $$update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444'$$,
  'a customer cannot make themselves admin');
update public.profiles set full_name = 'Nimal P.' where id = '44444444-4444-4444-4444-444444444444';
select pg_temp.check(
  (select full_name = 'Nimal P.' from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'a customer can edit their own name');
update public.profiles set full_name = 'hacked' where id = '22222222-2222-2222-2222-222222222222';
select pg_temp.check(
  (select count(*) = 1 from public.profiles),
  'a customer sees and edits only their own profile');

select pg_temp.check((select count(*) = 0 from public.kitchens), 'a customer cannot read the kitchens table');
select pg_temp.check((select count(*) = 0 from public.hygiene_scores), 'a customer cannot read live scores');
select pg_temp.check((select count(*) = 0 from public.violations), 'a customer cannot read violations');
select pg_temp.check((select count(*) = 0 from public.devices), 'a customer cannot read devices');
select pg_temp.check((select count(*) = 0 from public.public_ratings), 'a customer cannot read the ratings table directly');
select pg_temp.check(
  (select count(*) = 2 and bool_or(cuisine = 'Sri Lankan' and grade = 'A' and rating_status = 'verified' and is_open)
     from public.marketplace_kitchens),
  'a customer sees public kitchens with their public rating through the view');
select pg_temp.check(
  (select rating_status = 'not_monitored' and grade is null and not is_open
     from public.marketplace_kitchens where name = 'Closed Kitchen'),
  'a kitchen without monitoring is "not monitored", never given a grade');
select pg_temp.check((select count(*) = 4 from public.menu_items), 'a customer reads the menus of public kitchens');
select pg_temp.check_fails(
  $$insert into public.menu_items (kitchen_id, name, price_lkr) select id, 'Free food', 1 from public.marketplace_kitchens limit 1$$,
  'a customer cannot add menu items');

-- Ordering: the server sets the prices; the phone cannot.
select pg_temp.check_fails(
  $$insert into public.orders (customer_id, kitchen_id, delivery_address, contact_phone, delivery_fee_lkr)
    select '44444444-4444-4444-4444-444444444444', id, 'Kandy road 1', '0771234567', 0 from public.marketplace_kitchens limit 1$$,
  'orders cannot be inserted directly');
create temporary table cust_order on commit preserve rows as
select public.place_order(
  (select id from public.marketplace_kitchens where cuisine = 'Sri Lankan'),
  (select jsonb_agg(jsonb_build_object('menu_item_id', id, 'quantity', q, 'unit_price_lkr', 1))
     from (select id, case name when 'Rice and curry' then 2 else 1 end as q
             from public.menu_items where name in ('Rice and curry', 'Kottu')
           union all
           select id, 1 from public.menu_items where name = 'Kottu') x),
  '12 Peradeniya Road, Kandy', '+94 77 123 4567', 'No chilli') as id;
select pg_temp.check(
  (select status = 'placed' and subtotal_lkr = 2 * 650 + 2 * 900 and total_lkr = subtotal_lkr + 250
          and hygiene_grade_at_order = 'A' and hygiene_status_at_order = 'verified'
     from public.orders where id = (select id from cust_order)),
  'place_order uses menu prices, adds up a repeated item, adds the delivery fee and records the grade shown');
select pg_temp.check(
  (select count(*) = 2 and sum(line_total_lkr) = 3100 from public.order_items),
  'the customer sees their order lines');
select pg_temp.check_fails(
  $$select public.place_order((select id from public.marketplace_kitchens where name = 'Closed Kitchen'),
      (select jsonb_agg(jsonb_build_object('menu_item_id', id, 'quantity', 1)) from public.menu_items where name = 'Hoppers'),
      'Kandy road 1', '0771234567')$$,
  'ordering from a closed kitchen is refused');
select pg_temp.check_fails(
  $$select public.place_order((select id from public.marketplace_kitchens where cuisine = 'Sri Lankan'),
      (select jsonb_agg(jsonb_build_object('menu_item_id', id, 'quantity', 1)) from public.menu_items where name = 'Sold out dish'),
      'Kandy road 1', '0771234567')$$,
  'an unavailable item cannot be ordered');
select pg_temp.check_fails(
  $$select public.place_order((select id from public.marketplace_kitchens where cuisine = 'Sri Lankan'),
      (select jsonb_agg(jsonb_build_object('menu_item_id', id, 'quantity', 1)) from public.menu_items where name = 'Hoppers'),
      'Kandy road 1', '0771234567')$$,
  'an item of another kitchen cannot be ordered');
select pg_temp.check_fails(
  $$select public.place_order((select id from public.marketplace_kitchens where cuisine = 'Sri Lankan'),
      (select jsonb_agg(jsonb_build_object('menu_item_id', id, 'quantity', 50)) from public.menu_items where name = 'Kottu'),
      'Kandy road 1', '0771234567')$$,
  'an absurd quantity is refused');
select pg_temp.check_fails(
  $$select public.update_order_status((select id from cust_order), 'delivered')$$,
  'a customer cannot change an order''s status');

-- Another customer sees nothing of it.
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select pg_temp.check((select count(*) = 0 from public.orders) and (select count(*) = 0 from public.order_items),
  'a customer cannot see another customer''s order');
select pg_temp.check_fails($$select public.cancel_order((select id from cust_order))$$,
  'a customer cannot cancel another customer''s order');

-- The kitchen's operator works the order; transitions are enforced.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check((select count(*) = 1 from public.orders), 'the kitchen sees orders for its kitchen');
select pg_temp.check_fails($$select public.place_order((select id from public.kitchens where code = 'kitchen-001'), '[]', 'Kandy road 1', '0771234567')$$,
  'an operator account cannot place orders');
select pg_temp.check_fails($$select public.update_order_status((select id from cust_order), 'delivered')$$,
  'an order cannot skip steps');
select public.update_order_status((select id from cust_order), 'accepted');
select public.update_order_status((select id from cust_order), 'preparing');
select pg_temp.check(
  (select status = 'preparing' and accepted_at is not null and preparing_at is not null from public.orders),
  'the kitchen moves the order forward step by step, with timestamps');

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.check_fails($$select public.cancel_order((select id from cust_order))$$,
  'a customer cannot cancel once the kitchen has accepted');

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select count(*) = 0 from public.orders), 'an operator of no kitchen sees no orders');
select pg_temp.check_fails($$select public.update_order_status((select id from cust_order), 'on_the_way')$$,
  'an operator cannot touch another kitchen''s orders');

reset role;
set role anon;
select pg_temp.check_fails($$select count(*) from public.marketplace_kitchens$$, 'the marketplace requires an account');
select pg_temp.check_fails($$select count(*) from public.menu_items$$, 'menus require an account');
reset role;

-- ---------------------------------------------------------------------
-- Customer features (migration 20261117000000)
-- ---------------------------------------------------------------------
reset role;
insert into public.kitchens (code, name, is_public) values ('kitchen-private', 'Private Kitchen', false);
select pg_temp.check(
  (select customer_name = 'Nimal P.' from public.orders where id = (select id from cust_order)),
  'an order carries the customer''s name for the kitchen');

set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
insert into public.customer_addresses (label, address_line, is_default) values ('Home', '12 Peradeniya Road, Kandy', true);
insert into public.customer_addresses (label, address_line) values ('Work', 'Faculty of Science, University of Peradeniya');
select public.set_default_address((select id from public.customer_addresses where label = 'Work'));
select pg_temp.check(
  (select count(*) = 1 and bool_and(label = 'Work') from public.customer_addresses where is_default),
  'switching the default address keeps exactly one default');
select pg_temp.check_fails(
  $$insert into public.customer_addresses (customer_id, label, address_line)
    values ('55555555-5555-5555-5555-555555555555', 'Fake', 'Someone else''s address')$$,
  'a customer cannot add an address to another account');
select pg_temp.check_fails(
  $$insert into public.customer_addresses (label, address_line) values ('', 'x')$$,
  'an empty or too short address is refused');
insert into public.favourite_kitchens (kitchen_id) select id from public.marketplace_kitchens where cuisine = 'Sri Lankan';
select pg_temp.check((select count(*) = 1 from public.favourite_kitchens), 'a customer saves a favourite kitchen');
select pg_temp.check_fails(
  $$insert into public.favourite_kitchens (kitchen_id) select id from public.kitchens where false
    union all select '00000000-0000-0000-0000-000000000000'::uuid$$,
  'a favourite must be an existing kitchen');

set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select pg_temp.check(
  (select count(*) = 0 from public.customer_addresses) and (select count(*) = 0 from public.favourite_kitchens),
  'another customer sees none of these addresses or favourites');
update public.customer_addresses set address_line = 'hijacked address';
delete from public.customer_addresses;
reset role;
select pg_temp.check(
  (select count(*) = 2 and bool_and(address_line <> 'hijacked address') from public.customer_addresses),
  'another customer can neither change nor delete them');
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.check_fails(
  $$insert into public.favourite_kitchens (kitchen_id) values ((select id from public.kitchens where code = 'kitchen-private'))$$,
  'a kitchen that is not listed cannot be favourited');
reset role;

-- ---------------------------------------------------------------------
-- Account deletion and order feedback (migration 20261118000000)
-- ---------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.check_fails($$select public.submit_order_feedback((select id from cust_order), 5::smallint)$$,
  'feedback only after delivery');
select pg_temp.check_fails($$select public.delete_my_account()$$,
  'an account with an order in progress cannot be deleted yet');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.update_order_status((select id from cust_order), 'on_the_way');
select public.update_order_status((select id from cust_order), 'delivered');

set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select pg_temp.check_fails($$select public.submit_order_feedback((select id from cust_order), 1::smallint)$$,
  'a customer cannot give feedback on someone else''s order');

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.submit_order_feedback((select id from cust_order), 4::smallint, 'cold', 'Rice was cold');
select pg_temp.check_fails($$select public.submit_order_feedback((select id from cust_order), 5::smallint)$$,
  'feedback is given once per order');
select pg_temp.check_fails($$insert into public.order_feedback (order_id, kitchen_id, rating)
    select id, kitchen_id, 5 from public.orders$$,
  'feedback cannot be written directly');
select pg_temp.check((select count(*) = 1 from public.order_feedback), 'the customer sees their feedback');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check(
  (select rating = 4 and problem = 'cold' from public.order_feedback),
  'the kitchen sees feedback on its orders');
select pg_temp.check_fails($$select public.delete_my_account()$$,
  'staff accounts cannot delete themselves');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select count(*) = 0 from public.order_feedback), 'other staff do not see it');

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.delete_my_account();
reset role;
select pg_temp.check(
  not exists (select 1 from auth.users where id = '44444444-4444-4444-4444-444444444444')
  and not exists (select 1 from public.profiles where id = '44444444-4444-4444-4444-444444444444')
  and not exists (select 1 from public.customer_addresses)
  and not exists (select 1 from public.favourite_kitchens),
  'deleting the account removes the login, profile, addresses and favourites');
select pg_temp.check(
  (select customer_id is null and customer_name is null and status = 'delivered'
     from public.orders where id = (select id from cust_order))
  and (select customer_id is null from public.order_feedback),
  'past orders and feedback stay for the kitchen, without the customer''s identity');


-- ---------------------------------------------------------------------
-- Platform admin (migration 20261119000000)
--   1111 = admin, 2222 = operator of kitchen-001, 6666 = newly invited
-- ---------------------------------------------------------------------
reset role;
set request.jwt.claim.sub = '';
update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.check(
  (select column_default like 'false%' from information_schema.columns
    where table_schema = 'public' and table_name = 'kitchens' and column_name = 'is_public'),
  'new kitchens are hidden from the app by default');

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check_fails(
  $$select public.admin_create_kitchen('Sneaky', null, 'Asia/Colombo', null, null, null, 200, 30, '08:00', '22:00')$$,
  'an operator cannot use the admin functions');
select pg_temp.check_fails($$select public.admin_require()$$, 'internal admin helpers are not callable');
select pg_temp.check_fails(
  $$select public.admin_log('kitchen.created', 'kitchen', 'x', 'x', '{}')$$,
  'nobody can write the admin log directly');
select pg_temp.check((select count(*) = 0 from public.admin_audit_log), 'operators cannot read the admin log');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
create temporary table new_kitchen as
select public.admin_create_kitchen(' Lake View Kitchen ', 'Kandy', 'Asia/Colombo', null, null, '🍛',
                                   250, 25, '09:00', '21:00') as id;
select pg_temp.check(
  (select code = 'kitchen-002' and name = 'Lake View Kitchen' and not is_public and published_at is null
     from public.kitchens where id = (select id from new_kitchen)),
  'an admin creates a kitchen: next code, trimmed name, hidden');
select pg_temp.check_fails(
  $$select public.admin_create_kitchen('lake view kitchen', null, 'Asia/Colombo', null, null, null, 250, 25, '09:00', '21:00')$$,
  'kitchen names are unique (case-insensitive)');
select pg_temp.check_fails(
  $$select public.admin_create_kitchen('Mars Kitchen', null, 'Mars/Olympus', null, null, null, 250, 25, '09:00', '21:00')$$,
  'an unknown time zone is refused');
select pg_temp.check_fails(
  $$select public.admin_create_kitchen('Pricey', null, 'Asia/Colombo', null, null, null, 99999, 25, '09:00', '21:00')$$,
  'an unreasonable delivery fee is refused');

select pg_temp.check(
  (select count(*) filter (where blocking and not ok) = 5 from public.kitchen_readiness((select id from new_kitchen))),
  'a new kitchen fails every blocking go-live check');
select pg_temp.check_fails($$select public.admin_set_kitchen_published((select id from new_kitchen), true)$$,
  'a kitchen that is not ready cannot go live');

create temporary table new_devices as
select public.admin_register_device((select id from new_kitchen), 'env_node', 'Sensor node') as id
union all
select public.admin_register_device((select id from new_kitchen), 'camera', 'Prep counter camera');
select pg_temp.check(
  (select array_agg(id order by id) = array['vk-cam-02', 'vk-env-02'] from new_devices),
  'devices get the next free permanent ID');
select pg_temp.check_fails(
  $$select public.admin_register_device((select id from new_kitchen), 'camera', ' ')$$,
  'a device needs a name');

-- The web server creates the login (here: directly), then finishes the invitation.
reset role;
set request.jwt.claim.sub = '';
insert into auth.users (id, email, invited_at) values ('66666666-6666-6666-6666-666666666666', 'owner@test', now());
update auth.users set last_sign_in_at = now() where id = '55555555-5555-5555-5555-555555555555';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.admin_onboard_staff('66666666-6666-6666-6666-666666666666', 'operator', (select id from new_kitchen));
select pg_temp.check(
  (select role = 'operator' from public.profiles where id = '66666666-6666-6666-6666-666666666666')
  and exists (select 1 from public.user_kitchens
               where user_id = '66666666-6666-6666-6666-666666666666' and kitchen_id = (select id from new_kitchen)),
  'an invited account becomes an operator of its kitchen');
select pg_temp.check_fails(
  $$select public.admin_onboard_staff('55555555-5555-5555-5555-555555555555', 'operator', (select id from new_kitchen))$$,
  'an existing customer account cannot be turned into staff');
select pg_temp.check_fails(
  $$select public.admin_onboard_staff('66666666-6666-6666-6666-666666666666', 'admin')$$,
  'onboarding works only once');
select pg_temp.check(
  (select kitchens -> 0 ->> 'code' = 'kitchen-002' and email = 'owner@test'
     from public.admin_list_accounts('66666666-6666-6666-6666-666666666666')),
  'the account list shows email and kitchens');
select pg_temp.check(
  not exists (select 1 from public.admin_list_accounts() where role = 'customer'),
  'the account list never includes customers');

insert into public.menu_items (kitchen_id, name, price_lkr) select id, 'Lamprais', 1200 from new_kitchen;
select public.admin_update_kitchen((select id from new_kitchen), 'Lake View Kitchen', 'Kandy', 'Asia/Colombo',
  'Sri Lankan', 'Home-style rice and curry.', '🍛', 250, 25, '09:00', '21:00');
select pg_temp.check(
  (select count(*) filter (where blocking and not ok) = 0 from public.kitchen_readiness((select id from new_kitchen))),
  'with listing, operator, devices and menu every blocking check passes');
select pg_temp.check(
  (select not ok and not blocking from public.kitchen_readiness((select id from new_kitchen)) where item = 'reporting'),
  'silent devices are a warning, not a blocker');
select public.admin_set_kitchen_published((select id from new_kitchen), true);
select pg_temp.check(
  (select is_public and published_at is not null from public.kitchens where id = (select id from new_kitchen)),
  'a ready kitchen goes live');

select pg_temp.check_fails(
  $$select public.admin_set_account_disabled('66666666-6666-6666-6666-666666666666', true)$$,
  'the last operator of a live kitchen cannot be disabled');
select pg_temp.check_fails(
  $$select public.admin_unlink_staff('66666666-6666-6666-6666-666666666666', (select id from new_kitchen))$$,
  'the last operator of a live kitchen cannot be removed from it');
select pg_temp.check_fails(
  $$select public.admin_set_staff_role('66666666-6666-6666-6666-666666666666', 'phi')$$,
  'the last operator of a live kitchen cannot be moved to another role');
select pg_temp.check_fails($$select public.admin_remove_device('vk-cam-02')$$,
  'a live kitchen keeps its only camera');
select pg_temp.check_fails(
  $$select public.admin_update_kitchen((select id from new_kitchen), 'Lake View Kitchen', 'Kandy', 'Asia/Colombo',
      null, null, '🍛', 250, 25, '09:00', '21:00')$$,
  'a live kitchen keeps its cuisine and description');
select pg_temp.check_fails($$select public.admin_set_account_disabled('11111111-1111-1111-1111-111111111111', true)$$,
  'an admin cannot disable themselves');
select pg_temp.check_fails($$select public.admin_set_staff_role('11111111-1111-1111-1111-111111111111', 'operator')$$,
  'an admin cannot change their own role');

select public.admin_set_kitchen_published((select id from new_kitchen), false);
select public.admin_set_account_disabled('66666666-6666-6666-6666-666666666666', true);
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select pg_temp.check(
  public.current_user_role() is null and (select count(*) = 0 from public.kitchens),
  'a disabled account loses all data access immediately');
select pg_temp.check_fails(
  $$update public.profiles set disabled_at = null where id = '66666666-6666-6666-6666-666666666666'$$,
  'nobody can re-enable their own account');
select pg_temp.check_fails($$update public.profiles set role = 'admin' where id = '66666666-6666-6666-6666-666666666666'$$,
  'nobody can change their own role directly');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.admin_set_account_disabled('66666666-6666-6666-6666-666666666666', false);
select pg_temp.check(
  (select disabled_at is null from public.profiles where id = '66666666-6666-6666-6666-666666666666'),
  'an admin can re-enable an account');

set role service_role;
insert into public.sensor_readings (kitchen_id, device_id, device_ts, fridge_temp_c)
select id, 'vk-env-02', now(), 4 from public.kitchens where code = 'kitchen-002';
set role authenticated;
select pg_temp.check_fails($$select public.admin_remove_device('vk-env-02')$$,
  'a device with recorded evidence cannot be removed');
select public.admin_remove_device('vk-cam-02');
select pg_temp.check(not exists (select 1 from public.devices where id = 'vk-cam-02'),
  'an unused device of a hidden kitchen can be removed');

select pg_temp.check(
  (select array_agg(distinct action) @> array['kitchen.created', 'kitchen.updated', 'kitchen.published',
            'kitchen.hidden', 'device.registered', 'device.removed', 'account.invited',
            'account.disabled', 'account.enabled']
          and bool_and(actor_id = '11111111-1111-1111-1111-111111111111' and actor_email = 'admin@test')
     from public.admin_audit_log),
  'every admin change is in the activity log with the real actor');
select pg_temp.check(
  (select details -> 'cuisine' ->> 'to' = 'Sri Lankan' from public.admin_audit_log where action = 'kitchen.updated'),
  'the log records what changed');
reset role;
set request.jwt.claim.sub = '';

-- ---------------------------------------------------------------------
-- Kitchen media (banner and dish photos in Storage)
-- ---------------------------------------------------------------------
select pg_temp.check(
  (select public and file_size_limit = 2097152 and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
     from storage.buckets where id = 'kitchen-media'),
  'the kitchen-media bucket is public, images only, at most 2 MB per file');

select pg_temp.check_fails(
  $$update public.kitchens set banner_path = 'not-my-kitchen/banner.jpg' where code = 'kitchen-001'$$,
  'a banner path outside the kitchen''s own folder is rejected');
update public.kitchens set banner_path = id::text || '/banner-1.jpg' where code = 'kitchen-001';
select pg_temp.check(
  (select m.banner_path like '%/banner-1.jpg' from public.marketplace_kitchens m
     join public.kitchens k using (id) where k.code = 'kitchen-001'),
  'the app''s kitchen list includes the banner path');
select pg_temp.check_fails(
  $$insert into public.menu_items (kitchen_id, name, price_lkr, image_path)
    select id, 'Stray photo', 100, '00000000-0000-0000-0000-000000000000/dishes/x.jpg'
      from public.kitchens where code = 'kitchen-001'$$,
  'a dish photo path must be inside its own kitchen''s folder');

select pg_temp.check(
  (select role = 'operator' from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'fixture: the test operator is an operator');
-- Kitchen ids looked up here: signed-in users cannot read other kitchens.
select (select id::text from public.kitchens where code = 'kitchen-001') as k1,
       (select id::text from public.kitchens where code = 'kitchen-002') as k2 \gset
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check(public.can_manage_kitchen_media(:'k1' || '/dishes/a.jpg'),
  'an operator may manage photos in their own kitchen''s folder');
select pg_temp.check(not public.can_manage_kitchen_media(:'k2' || '/banner.jpg'),
  'an operator may not touch another kitchen''s photos');
select pg_temp.check(not public.can_manage_kitchen_media('../../etc/passwd'),
  'a folder that is not a kitchen id is refused, not an error');
insert into storage.objects (bucket_id, name) values ('kitchen-media', :'k1' || '/dishes/egg-kottu-1.jpg');
update public.kitchens set banner_path = :'k1' || '/banner-2.jpg' where id = :'k1'::uuid;
update public.kitchens set banner_path = :'k1' || '/banner-x.jpg' where id = :'k2'::uuid;
select pg_temp.check_fails(
  format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'kitchen-media', :'k2' || '/banner-2.jpg'),
  'storage refuses an upload into another kitchen''s folder');

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check(not public.can_manage_kitchen_media(:'k1' || '/banner.jpg'),
  'someone without the kitchen cannot manage its photos');
-- Row Level Security makes this delete match nothing (checked below).
delete from storage.objects where name like '%/dishes/egg-kottu-1.jpg';
reset role;
set request.jwt.claim.sub = '';
select pg_temp.check((select banner_path = :'k1' || '/banner-2.jpg' from public.kitchens where id = :'k1'::uuid),
  'an operator can set their own kitchen''s banner');
select pg_temp.check((select banner_path is null from public.kitchens where id = :'k2'::uuid),
  'an operator cannot set another kitchen''s banner');
select pg_temp.check((select count(*) = 1 from storage.objects where name like '%/dishes/egg-kottu-1.jpg'),
  'someone without the kitchen cannot delete its photos');

-- ---------------------------------------------------------------------
-- Hygiene alerts (public rating changes -> customer inbox)
-- ---------------------------------------------------------------------
select pg_temp.check(
  (select kind = 'grade_changed' and title = 'Hygiene grade dropped: Pizza Place'
          and body = 'Pizza Place went from grade B to C over the past week.'
     from public.rating_change_message('Pizza Place', 'verified', 'B', 'verified', 'C')),
  'alert wording: a grade drop');
select pg_temp.check(
  (select title = 'Hygiene improved: Pizza Place' from public.rating_change_message('Pizza Place', 'verified', 'C', 'verified', 'B')),
  'alert wording: improvements are announced too (fair to kitchens)');
select pg_temp.check(
  (select kind = 'order_hygiene_changed' and body like '%dropped from B to C. You can still cancel%'
     from public.rating_change_message('Pizza Place', 'verified', 'B', 'verified', 'C', true, 'placed')),
  'alert wording: during an order that can still be cancelled');
select pg_temp.check(
  (select body not like '%cancel%'
     from public.rating_change_message('Pizza Place', 'verified', 'B', 'verified', 'C', true, 'preparing')),
  'alert wording: no cancel advice once the kitchen has accepted');
select pg_temp.check(
  (select kind = 'verification_changed' and title = 'Pizza Place is now Verified'
     from public.rating_change_message('Pizza Place', 'incomplete', 'B', 'verified', 'B')),
  'alert wording: becoming verified');
select pg_temp.check(
  (select title = 'Pizza Place is no longer fully monitored' and body like '%limited to B%'
     from public.rating_change_message('Pizza Place', 'verified', 'B', 'incomplete', 'B')),
  'alert wording: losing full monitoring');
select pg_temp.check(
  not exists (select 1 from public.rating_change_message('Pizza Place', 'verified', 'B', 'verified', 'B')),
  'no alert when nothing a customer sees has changed');

-- Fixtures: "other" favourites kitchen-001; the rating starts at a verified B.
insert into public.favourite_kitchens (customer_id, kitchen_id)
values ('33333333-3333-3333-3333-333333333333', :'k1'::uuid);
insert into public.public_ratings (kitchen_id, status, rating, grade, coverage, config_version)
values (:'k1'::uuid, 'verified', 70, 'B', 0.9, 'v1-live')
on conflict (kitchen_id) do update set status = 'verified', rating = 70, grade = 'B', coverage = 0.9;
delete from public.rating_alert_log;
delete from public.customer_notifications;

update public.public_ratings set rating = 72 where kitchen_id = :'k1'::uuid;
select pg_temp.check((select count(*) = 0 from public.customer_notifications),
  'a score moving within the same grade alerts nobody');

update public.public_ratings set rating = 45, grade = 'C' where kitchen_id = :'k1'::uuid;
select pg_temp.check(
  (select count(*) = 1 and bool_and(user_id = '33333333-3333-3333-3333-333333333333' and kind = 'grade_changed'
                                    and kitchen_id = :'k1'::uuid)
     from public.customer_notifications),
  'a grade drop reaches the customer who favourited the kitchen');
select pg_temp.check(
  (select body !~* '(violation|glove|hairnet|camera|staff|temperature)' from public.customer_notifications),
  'alerts contain only the public grade, never monitoring details');

update public.public_ratings set rating = 20, grade = 'D' where kitchen_id = :'k1'::uuid;
select pg_temp.check((select count(*) = 1 from public.customer_notifications),
  'at most one alert per kitchen per day');

delete from public.rating_alert_log;
insert into public.notification_settings (user_id, hygiene_alerts)
values ('33333333-3333-3333-3333-333333333333', false);
update public.public_ratings set rating = 80, grade = 'A' where kitchen_id = :'k1'::uuid;
select pg_temp.check((select count(*) = 1 from public.customer_notifications),
  'a customer who turned hygiene alerts off is not alerted');
update public.notification_settings set hygiene_alerts = true
 where user_id = '33333333-3333-3333-3333-333333333333';

-- The customer reads their own inbox and may only mark items read.
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select count(*) = 1 from public.customer_notifications), 'a customer sees their own alerts');
select public.mark_all_notifications_read();
select pg_temp.check((select bool_and(read_at is not null) from public.customer_notifications),
  'a customer can mark their alerts read');
select pg_temp.check_fails($$update public.customer_notifications set title = 'changed'$$,
  'a customer cannot rewrite an alert');
select pg_temp.check_fails($$insert into public.customer_notifications (user_id, kind, title, body)
    values ('33333333-3333-3333-3333-333333333333', 'grade_changed', 'x', 'y')$$,
  'a customer cannot create alerts');
select public.register_push_token('token-of-a-shared-phone-0001', 'android');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check((select count(*) = 0 from public.customer_notifications), 'nobody else can read a customer''s alerts');
select public.register_push_token('token-of-a-shared-phone-0001', 'android');
select public.unregister_push_token('token-of-a-shared-phone-0001');
reset role;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) = 0 from public.push_tokens where token = 'token-of-a-shared-phone-0001'),
  'a phone''s token moves to whoever signed in last, and is removed on sign-out');

select pg_temp.check((select public.send_weekly_hygiene_summary() = 1), 'the weekly summary goes to customers with favourites');
select pg_temp.check(
  (select body = 'Your favourites this week: 1 at A.' from public.customer_notifications where kind = 'weekly_summary'),
  'the weekly summary counts favourites by grade');

\echo 'ALL DATABASE ASSERTIONS PASSED'
