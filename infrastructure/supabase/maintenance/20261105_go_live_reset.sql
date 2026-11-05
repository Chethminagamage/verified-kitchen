-- =====================================================================
-- One-off maintenance (2026-11-05): GO-LIVE RESET
--
-- Removes all remaining simulated / test data so the system holds only
-- real data from the ESP32 node (first real reading 2026-11-05 14:38:31 UTC).
--
--   * AI detections: all are from the simulator (model_version 'simulator-v1');
--     no camera has ever sent data.
--   * Hygiene scores computed before the real node came online, and their
--     hourly roll-ups.
--   * Violations that occurred before the real node came online (simulated).
--   * Audit records of those simulated violations. The audit chain is then
--     re-linked over the remaining REAL records (original payloads and
--     timestamps kept; only chain_seq / prev_hash / event_hash recomputed),
--     so verify_audit_chain() passes from GENESIS.
--   * The camera device's simulated "last seen" (no camera is installed yet).
--
-- Deleting audit records requires lifting their tamper protection. This is
-- done ONLY inside this transaction, ONLY for pre-go-live test data, and the
-- protection is restored before commit.
--
-- Safety: every assumption is checked first; if anything differs, it raises
-- and NOTHING is changed. Run in the Supabase SQL Editor.
-- =====================================================================

begin;

do $$
declare
  c_cutoff     constant timestamptz := '2026-11-05 14:38:00+00';  -- real node online
  v_kitchen    uuid;
  v_count      bigint;
  v_prev       text := 'GENESIS';
  v_seq        bigint := 0;
  r            record;
  v_del_audit  bigint;
  v_del_viol   bigint;
  v_del_ai     bigint;
  v_del_score  bigint;
  v_del_hourly bigint;
begin
  select id into strict v_kitchen from public.kitchens where code = 'kitchen-001';

  -- Block the edge service from appending audit records while the chain is rebuilt.
  perform pg_advisory_xact_lock(hashtext(v_kitchen::text));

  -- ---- Safety checks --------------------------------------------------------
  select count(*) into v_count from public.ai_detections where model_version <> 'simulator-v1';
  if v_count > 0 then
    raise exception '% AI detection(s) are not from the simulator: a real camera has sent data — nothing changed', v_count;
  end if;

  select count(*) into v_count from public.sensor_readings where device_ts < c_cutoff;
  if v_count > 0 then
    raise exception '% sensor reading(s) predate the real node: run 20261105_remove_simulated_sensor_data.sql first — nothing changed', v_count;
  end if;

  select count(*) into v_count from public.violations where occurred_at >= c_cutoff and source <> 'sensor';
  if v_count > 0 then
    raise exception '% non-sensor violation(s) after go-live: unexpected — nothing changed', v_count;
  end if;

  select count(*) into v_count from public.hygiene_scores_hourly where bucket >= c_cutoff;
  if v_count > 0 then
    raise exception '% hourly roll-up(s) cover real data: unexpected — nothing changed', v_count;
  end if;

  -- ---- Remove simulated data -----------------------------------------------
  alter table public.audit_records disable trigger audit_records_protect_trg;

  delete from public.audit_records a
   where a.kitchen_id = v_kitchen
     and (a.violation_id in (select v.id from public.violations v where v.occurred_at < c_cutoff)
          or (a.violation_id is null and a.created_at < c_cutoff));
  get diagnostics v_del_audit = row_count;

  delete from public.violations where occurred_at < c_cutoff;
  get diagnostics v_del_viol = row_count;

  delete from public.ai_detections where model_version = 'simulator-v1';
  get diagnostics v_del_ai = row_count;

  delete from public.hygiene_scores where computed_at < c_cutoff;
  get diagnostics v_del_score = row_count;

  delete from public.hygiene_scores_hourly where bucket < c_cutoff;
  get diagnostics v_del_hourly = row_count;

  -- ---- Re-link the audit chain over the remaining real records --------------
  -- Shift sequence numbers out of the way first (unique per kitchen).
  update public.audit_records set chain_seq = -chain_seq where kitchen_id = v_kitchen;
  for r in
    select id, event_type, event_payload, created_at
      from public.audit_records
     where kitchen_id = v_kitchen
     order by chain_seq desc   -- negated: original order
  loop
    v_seq := v_seq + 1;
    update public.audit_records
       set chain_seq  = v_seq,
           prev_hash  = v_prev,
           event_hash = public.audit_hash(v_prev, v_kitchen, r.event_type, r.created_at, r.event_payload)
     where id = r.id
    returning event_hash into v_prev;
  end loop;

  alter table public.audit_records enable trigger audit_records_protect_trg;

  -- ---- The camera has never existed: clear its simulated heartbeat -----------
  update public.devices
     set last_seen_at = null, last_status = null
   where kitchen_id = v_kitchen and type = 'camera';

  -- ---- Final checks --------------------------------------------------------
  if exists (select 1 from public.verify_audit_chain(v_kitchen) where not ok) then
    raise exception 'audit chain does not verify after rebuild — nothing changed';
  end if;

  raise notice 'removed: % audit records, % violations, % AI detections, % scores, % hourly roll-ups; audit chain re-linked over % real record(s)',
    v_del_audit, v_del_viol, v_del_ai, v_del_score, v_del_hourly, v_seq;
end;
$$;

-- What remains (all real):
select (select count(*) from public.sensor_readings)                              as sensor_readings,
       (select min(device_ts) from public.sensor_readings)                        as first_reading,
       (select count(*) from public.hygiene_scores)                               as scores,
       (select count(*) from public.violations)                                   as violations,
       (select count(*) from public.audit_records)                                as audit_records,
       (select bool_and(ok) from public.verify_audit_chain(
          (select id from public.kitchens where code = 'kitchen-001')))           as audit_chain_ok,
       (select count(*) from public.ai_detections)                                as ai_detections;

commit;
