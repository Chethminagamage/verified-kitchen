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
update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222';
select pg_temp.check(
  (select role = 'operator' from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'operators cannot promote themselves (update silently affects no rows)');
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
  (select fridge_avg = 4 from public.sensor_reading_series((select id from public.kitchens),
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

\echo 'ALL DATABASE ASSERTIONS PASSED'
