-- =====================================================================
-- Verified Kitchen — sensor history for the Environment page
-- Migration: 20261105000000_sensor_series.sql
--
--   1. sensor_reading_series(): min / avg / max per time bucket, so charts
--      never download raw readings (2,880 per day at one every 30 s).
--   2. Stores the environmental safe ranges explicitly in the active
--      scoring config. They are the values the edge service already uses
--      as defaults, now written down so the dashboard can show them and
--      every score is traceable to exact numbers.
-- =====================================================================

create or replace function public.sensor_reading_series(
  p_kitchen uuid,
  p_from    timestamptz,
  p_to      timestamptz,
  p_bucket  interval default interval '5 minutes')
returns table (
  bucket        timestamptz,
  samples       bigint,
  ambient_avg   numeric, ambient_min  numeric, ambient_max  numeric,
  humidity_avg  numeric, humidity_min numeric, humidity_max numeric,
  fridge_avg    numeric, fridge_min   numeric, fridge_max   numeric,
  pressure_avg  numeric)
language plpgsql
stable
security invoker          -- Row Level Security decides which readings are visible
set search_path = ''
as $$
declare
  v_tz   text;
  v_from timestamptz;
begin
  if p_bucket < interval '30 seconds' then
    raise exception 'bucket must be at least 30 seconds' using errcode = 'invalid_parameter_value';
  end if;
  if p_to <= p_from or p_to - p_from > interval '31 days' then
    raise exception 'range must be positive and at most 31 days' using errcode = 'invalid_parameter_value';
  end if;
  if extract(epoch from p_to - p_from) / extract(epoch from p_bucket) > 2000 then
    raise exception 'too many buckets; use a larger bucket' using errcode = 'invalid_parameter_value';
  end if;

  select k.timezone into v_tz from public.kitchens k where k.id = p_kitchen;
  if v_tz is null then
    return;
  end if;
  v_from := date_bin(p_bucket, p_from at time zone v_tz, timestamp '2000-01-01') at time zone v_tz;

  return query
  select (date_bin(p_bucket, r.device_ts at time zone v_tz, timestamp '2000-01-01') at time zone v_tz),
         count(*),
         round(avg(r.ambient_temp_c)::numeric, 2), round(min(r.ambient_temp_c)::numeric, 2), round(max(r.ambient_temp_c)::numeric, 2),
         round(avg(r.humidity_pct)::numeric, 1),   round(min(r.humidity_pct)::numeric, 1),   round(max(r.humidity_pct)::numeric, 1),
         round(avg(r.fridge_temp_c)::numeric, 2),  round(min(r.fridge_temp_c)::numeric, 2),  round(max(r.fridge_temp_c)::numeric, 2),
         round(avg(r.pressure_hpa)::numeric, 1)
    from public.sensor_readings r
   where r.kitchen_id = p_kitchen
     and r.device_ts >= v_from
     and r.device_ts <  p_to
   group by 1
   order by 1;
end;
$$;

revoke execute on function public.sensor_reading_series(uuid, timestamptz, timestamptz, interval) from public, anon;
grant  execute on function public.sensor_reading_series(uuid, timestamptz, timestamptz, interval) to authenticated, service_role;

-- Explicit environmental safe ranges for the provisional config (identical to
-- the edge service defaults, so existing scores are unaffected).
update public.scoring_configs
   set thresholds = thresholds || jsonb_build_object(
         'environment', jsonb_build_object(
           'fridge_temp_c',  jsonb_build_object('min', 0,  'max', 5,  'tolerance', 3),
           'ambient_temp_c', jsonb_build_object('min', 16, 'max', 32, 'tolerance', 6),
           'humidity_pct',   jsonb_build_object('min', 30, 'max', 70, 'tolerance', 15)))
 where version = 'v0-provisional'
   and not (thresholds ? 'environment');
