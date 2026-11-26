-- =====================================================================
-- Verified Kitchen — time-bucketed score series for dashboard charts
-- Migration: 20261104020000_score_series.sql
--
-- Live scoring writes one row every ~10 s (8,640 a day), more than a browser
-- should download and more than the API returns in one request (1,000 rows).
-- Charts therefore ask the database for averages per bucket instead.
-- =====================================================================

-- Kitchens get a time zone so buckets (hours, days) follow local time.
alter table public.kitchens
  add column timezone text not null default 'Asia/Colombo'
  check (now() at time zone timezone is not null);  -- rejects unknown zone names

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
security invoker          -- Row Level Security still decides which rows are visible
set search_path = ''
as $$
declare
  v_tz text;
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
    return;  -- unknown kitchen, or not visible to this user
  end if;

  return query
  select
    -- Bin in kitchen-local wall-clock time so hourly / daily buckets align locally.
    (date_bin(p_bucket, h.computed_at at time zone v_tz, timestamp '2000-01-01') at time zone v_tz) as bucket,
    round(avg(h.overall_score), 1),
    round(avg(h.personal_score), 1),
    round(avg(h.food_prep_score), 1),
    round(avg(h.environmental_score), 1),
    count(*)
  from public.hygiene_scores h
  where h.kitchen_id = p_kitchen
    and h.computed_at >= p_from
    and h.computed_at <  p_to
  group by 1
  order by 1;
end;
$$;

revoke execute on function public.hygiene_score_series(uuid, timestamptz, timestamptz, interval) from public, anon;
grant  execute on function public.hygiene_score_series(uuid, timestamptz, timestamptz, interval) to authenticated, service_role;
