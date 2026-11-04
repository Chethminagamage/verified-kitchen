-- =====================================================================
-- Verified Kitchen — evidence retention
-- Migration: 20261104030000_evidence_retention.sql
--
-- Keeps the database small without losing results:
--   * Scores older than the retention period (default 7 days) are rolled
--     up into hourly sums/counts, then deleted. Charts read both tables and
--     show identical averages before and after the purge.
--   * Raw sensor readings and AI detections older than the period are
--     deleted, EXCEPT those a violation points to (each incident keeps its proof).
--   * Violations and audit records are never deleted.
--   * Runs hourly via pg_cron when available.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Hourly roll-up of hygiene scores (sums + counts, so any bucket size
--    can be re-averaged exactly). `bucket` is the start of the kitchen-local hour.
-- ---------------------------------------------------------------------
create table public.hygiene_scores_hourly (
  kitchen_id         uuid not null references public.kitchens (id) on delete cascade,
  bucket             timestamptz not null,
  samples            integer not null check (samples > 0),
  overall_sum        numeric not null,
  personal_sum       numeric not null default 0,
  personal_n         integer not null default 0,
  food_prep_sum      numeric not null default 0,
  food_prep_n        integer not null default 0,
  environmental_sum  numeric not null default 0,
  environmental_n    integer not null default 0,
  primary key (kitchen_id, bucket)
);

alter table public.hygiene_scores_hourly enable row level security;

create policy hygiene_scores_hourly_select on public.hygiene_scores_hourly
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
-- No write policies: only the purge job (security definer) writes here.

-- ---------------------------------------------------------------------
-- 2. Roll up + purge
-- ---------------------------------------------------------------------
create or replace function public.purge_old_evidence(p_keep interval default interval '7 days')
returns table (rolled_up_rows bigint, deleted_scores bigint, deleted_readings bigint, deleted_detections bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz;
begin
  if p_keep < interval '1 day' then
    raise exception 'retention must be at least 1 day' using errcode = 'invalid_parameter_value';
  end if;
  v_cutoff := date_trunc('hour', now() - p_keep);

  -- Sums are additive, so a kitchen-local hour split across two runs merges correctly.
  insert into public.hygiene_scores_hourly as t (
    kitchen_id, bucket, samples, overall_sum,
    personal_sum, personal_n, food_prep_sum, food_prep_n, environmental_sum, environmental_n)
  select h.kitchen_id,
         date_trunc('hour', h.computed_at at time zone k.timezone) at time zone k.timezone,
         count(*),
         sum(h.overall_score),
         coalesce(sum(h.personal_score), 0),      count(h.personal_score),
         coalesce(sum(h.food_prep_score), 0),     count(h.food_prep_score),
         coalesce(sum(h.environmental_score), 0), count(h.environmental_score)
    from public.hygiene_scores h
    join public.kitchens k on k.id = h.kitchen_id
   where h.computed_at < v_cutoff
   group by 1, 2
  on conflict (kitchen_id, bucket) do update set
    samples           = t.samples           + excluded.samples,
    overall_sum       = t.overall_sum       + excluded.overall_sum,
    personal_sum      = t.personal_sum      + excluded.personal_sum,
    personal_n        = t.personal_n        + excluded.personal_n,
    food_prep_sum     = t.food_prep_sum     + excluded.food_prep_sum,
    food_prep_n       = t.food_prep_n       + excluded.food_prep_n,
    environmental_sum = t.environmental_sum + excluded.environmental_sum,
    environmental_n   = t.environmental_n   + excluded.environmental_n;
  get diagnostics rolled_up_rows = row_count;

  delete from public.hygiene_scores h where h.computed_at < v_cutoff;
  get diagnostics deleted_scores = row_count;

  delete from public.sensor_readings r
   where r.device_ts < v_cutoff
     and not exists (select 1 from public.violations v where v.reading_id = r.id);
  get diagnostics deleted_readings = row_count;

  delete from public.ai_detections d
   where d.detected_at < v_cutoff
     and not exists (select 1 from public.violations v where v.detection_id = d.id);
  get diagnostics deleted_detections = row_count;

  return next;
end;
$$;

revoke execute on function public.purge_old_evidence(interval) from public, anon, authenticated;
grant  execute on function public.purge_old_evidence(interval) to service_role;

-- ---------------------------------------------------------------------
-- 3. Chart series now reads raw scores AND hourly roll-ups
--    Buckets are always complete: the range start is widened to its bucket start.
-- ---------------------------------------------------------------------
create or replace function public.hygiene_score_series(
  p_kitchen uuid,
  p_from    timestamptz,
  p_to      timestamptz,
  p_bucket  interval default interval '1 hour')
returns table (
  bucket              timestamptz,
  overall_score       numeric,
  personal_score      numeric,
  food_prep_score     numeric,
  environmental_score numeric,
  samples             bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz   text;
  v_from timestamptz;
begin
  if p_bucket < interval '1 minute' then
    raise exception 'bucket must be at least 1 minute' using errcode = 'invalid_parameter_value';
  end if;
  if p_to <= p_from or p_to - p_from > interval '400 days' then
    raise exception 'range must be positive and at most 400 days' using errcode = 'invalid_parameter_value';
  end if;
  if extract(epoch from p_to - p_from) / extract(epoch from p_bucket) > 2000 then
    raise exception 'too many buckets; use a larger bucket' using errcode = 'invalid_parameter_value';
  end if;

  select k.timezone into v_tz from public.kitchens k where k.id = p_kitchen;
  if v_tz is null then
    return;
  end if;

  -- Start at the beginning of the first bucket, so every bucket is complete
  -- (and averages are identical whether the period is raw or rolled up).
  v_from := date_bin(p_bucket, p_from at time zone v_tz, timestamp '2000-01-01') at time zone v_tz;

  return query
  with points as (
    select h.computed_at as t, 1::bigint as n,
           h.overall_score as o_sum, 1 as o_n,
           coalesce(h.personal_score, 0)      as p_sum, (h.personal_score is not null)::int      as p_n,
           coalesce(h.food_prep_score, 0)     as f_sum, (h.food_prep_score is not null)::int     as f_n,
           coalesce(h.environmental_score, 0) as e_sum, (h.environmental_score is not null)::int as e_n
      from public.hygiene_scores h
     where h.kitchen_id = p_kitchen and h.computed_at >= v_from and h.computed_at < p_to
    union all
    select r.bucket, r.samples::bigint,
           r.overall_sum, r.samples,
           r.personal_sum, r.personal_n,
           r.food_prep_sum, r.food_prep_n,
           r.environmental_sum, r.environmental_n
      from public.hygiene_scores_hourly r
     where r.kitchen_id = p_kitchen and r.bucket >= v_from and r.bucket < p_to
  )
  select (date_bin(p_bucket, pt.t at time zone v_tz, timestamp '2000-01-01') at time zone v_tz),
         round(sum(pt.o_sum) / nullif(sum(pt.o_n), 0), 1),
         round(sum(pt.p_sum) / nullif(sum(pt.p_n), 0), 1),
         round(sum(pt.f_sum) / nullif(sum(pt.f_n), 0), 1),
         round(sum(pt.e_sum) / nullif(sum(pt.e_n), 0), 1),
         sum(pt.n)::bigint
    from points pt
   group by 1
   order by 1;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Schedule hourly (Supabase provides pg_cron; plain Postgres may not)
-- ---------------------------------------------------------------------
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule(
      'vk-purge-old-evidence',
      '17 * * * *',
      $cron$select public.purge_old_evidence()$cron$);
  else
    raise notice 'pg_cron not available: run "select public.purge_old_evidence();" on a schedule yourself';
  end if;
end;
$do$;
