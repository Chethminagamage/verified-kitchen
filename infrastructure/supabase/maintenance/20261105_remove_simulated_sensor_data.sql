-- =====================================================================
-- One-off maintenance (2026-11-05): remove simulated sensing data now
-- that the real ESP32 node (vk-env-01) is live.
--
-- How the rows are identified:
--   * Real ESP32 readings arrive through the MQTT edge service, which always
--     records the clock source: sensor_status ? 'time_source'.
--   * Simulator / backfill readings never have that field.
--   * The fake-device test run used seq >= 1000 before 2026-11-05.
--
-- What it does, in ONE transaction (all or nothing):
--   1. Deletes the simulated / fake sensor readings (expects exactly 4005).
--   2. Blanks humidity and pressure on the two corrupted real readings that
--      reported 0 % humidity (ids 5334, 5363).
--   3. Resolves the still-open simulated sensor violations so real alerts can
--      be raised. Violations and audit records are NOT deleted (tamper-evident
--      by design); the resolution itself is audited.
--
-- Run in the Supabase SQL Editor. If any count differs from what is expected,
-- it raises an error and NOTHING is changed.
-- =====================================================================

begin;

do $$
declare
  v_sim       bigint;
  v_deleted   bigint;
  v_fixed     bigint;
  v_resolved  bigint;
begin
  select count(*) into v_sim
    from public.sensor_readings r
   where not (r.sensor_status ? 'time_source')
      or (r.seq >= 1000 and r.received_at < '2026-11-05');
  if v_sim <> 4005 then
    raise exception 'expected 4005 simulated readings, found % — nothing changed', v_sim;
  end if;

  delete from public.sensor_readings r
   where not (r.sensor_status ? 'time_source')
      or (r.seq >= 1000 and r.received_at < '2026-11-05');
  get diagnostics v_deleted = row_count;

  update public.sensor_readings
     set humidity_pct = null,
         pressure_hpa = null,
         sensor_status = sensor_status || '{"humidity_check": "rejected: 0 % is physically impossible"}'
   where id in (5334, 5363) and humidity_pct = 0;
  get diagnostics v_fixed = row_count;
  if v_fixed <> 2 then
    raise exception 'expected 2 corrupted readings, found % — nothing changed', v_fixed;
  end if;

  update public.violations
     set status = 'resolved'
   where source = 'sensor'
     and status in ('active', 'acknowledged')
     and occurred_at < '2026-11-05 14:38:00+00';   -- before the real node came online
  get diagnostics v_resolved = row_count;

  raise notice 'deleted % simulated readings, blanked % corrupted values, resolved % simulated violations',
    v_deleted, v_fixed, v_resolved;
end;
$$;

-- Everything left is real ESP32 data:
select count(*)            as real_readings,
       min(device_ts)      as first_reading,
       max(device_ts)      as latest_reading,
       min(humidity_pct)   as min_humidity,
       min(fridge_temp_c)  as min_fridge
  from public.sensor_readings;

commit;
