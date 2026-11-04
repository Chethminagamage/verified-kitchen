-- =====================================================================
-- Verified Kitchen — violation workflow + automatic audit trail
-- Migration: 20261104010000_violation_workflow_and_audit.sql
--
--   1. Violation status may only move forward:
--        active -> acknowledged -> resolved   (or active -> resolved)
--      Who acted and when is set by the database, never trusted from the client.
--   2. Every new violation and every status change is written to the
--      audit hash chain by a trigger, so no writer can skip the audit.
--   3. Website users may only edit a kitchen's name and location
--      (not its code, which is used in MQTT topics, nor its public visibility).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Workflow rules
-- ---------------------------------------------------------------------
create or replace function public.violations_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (   (old.status = 'active'       and new.status in ('acknowledged', 'resolved'))
            or (old.status = 'acknowledged' and new.status = 'resolved')) then
      raise exception 'invalid violation status change: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    if new.status = 'acknowledged' then
      new.acknowledged_by := auth.uid();
      new.acknowledged_at := now();
    else -- resolved
      new.resolved_at := now();
      if old.status = 'active' then          -- resolved without a separate acknowledgement
        new.acknowledged_by := auth.uid();
        new.acknowledged_at := now();
      end if;
    end if;
  else
    -- The workflow columns change only together with a status change.
    new.acknowledged_by := old.acknowledged_by;
    new.acknowledged_at := old.acknowledged_at;
    new.resolved_at     := old.resolved_at;
  end if;
  return new;
end;
$$;

create trigger violations_workflow_trg
  before update on public.violations
  for each row execute function public.violations_workflow();

-- ---------------------------------------------------------------------
-- 2. Automatic audit records
--    security definer: operators have no INSERT right on audit_records,
--    but their status changes must still be recorded.
-- ---------------------------------------------------------------------
create or replace function public.violations_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_records (kitchen_id, violation_id, event_type, event_payload)
    values (
      new.kitchen_id, new.id, 'violation_created',
      jsonb_build_object(
        'violation_id',  new.id,
        'occurred_at',   new.occurred_at,
        'pillar',        new.pillar,
        'source',        new.source,
        'indicator',     new.indicator,
        'title',         new.title,
        'severity',      new.severity,
        'status',        new.status,
        'score_impact',  new.score_impact,
        'ai_confidence', new.ai_confidence,
        'sensor_value',  new.sensor_value,
        'sensor_unit',   new.sensor_unit,
        'detection_id',  new.detection_id,
        'reading_id',    new.reading_id));
  elsif new.status is distinct from old.status then
    insert into public.audit_records (kitchen_id, violation_id, event_type, event_payload)
    values (
      new.kitchen_id, new.id, 'violation_status_changed',
      jsonb_build_object(
        'violation_id', new.id,
        'from',         old.status,
        'to',           new.status,
        'changed_by',   auth.uid(),
        'changed_at',   now()));
  end if;
  return null;
end;
$$;

create trigger violations_audit_trg
  after insert or update of status on public.violations
  for each row execute function public.violations_audit();

-- ---------------------------------------------------------------------
-- 3. Kitchen profile: only name and location are editable from the website
-- ---------------------------------------------------------------------
revoke update on public.kitchens from authenticated;
grant update (name, location) on public.kitchens to authenticated;
