-- =====================================================================
-- UI PREVIEW: example hygiene ratings for the DEMO kitchens only.
--
-- Purpose: see every hygiene state of the consumer app before the real
-- kitchen has enough monitoring for a verified grade.
--
--   Kandy Kottu House  -> A, verified, monitored live
--   Lakeside Burgers   -> B, verified
--   Hill Country Pizza -> C, verified (hygiene alert)
--   Green Bowl         -> monitoring incomplete, grade limited to B
--   Hill Capital Hoppers -> rating pending (monitoring just started)
--
-- The real kitchen (kitchen-001) is NOT touched: it only ever shows what the
-- edge service measures. Demo kitchens have no devices, so the edge service
-- never overwrites these rows.
--
-- Safe to re-run (refreshes the preview to "now"). Run after
-- demo/marketplace_demo.sql in the Supabase SQL Editor.
--
-- REMOVE the preview again with:
--   delete from public.public_ratings where kitchen_id in (select id from public.kitchens where code like 'demo-%');
--   delete from public.hygiene_scores where details ->> 'preview' = 'true';
-- =====================================================================

-- 1. Public ratings (what the app shows on cards and the kitchen page)
insert into public.public_ratings
  (kitchen_id, status, rating, grade, personal_score, food_prep_score, environmental_score,
   coverage, monitored_hours, expected_hours, last_score_at, computed_at, config_version, details)
select k.id, p.status, p.rating, p.grade, p.personal, p.food_prep, p.environmental,
       p.coverage, p.monitored, p.expected,
       case when p.live then now() - interval '1 minute' else now() - interval '3 hours' end,
       now(), 'v1-live', jsonb_build_object('preview', true)
  from public.kitchens k
  join (values
    ('demo-kottu',   'verified',   91.4, 'A', 94.0, 88.0, 92.0, 0.96, 94.0,  98.0, true),
    ('demo-burger',  'verified',   67.8, 'B', 72.0, 61.0, 70.0, 0.88, 80.0,  91.0, false),
    ('demo-pizza',   'verified',   41.2, 'C', 38.0, 45.0, 40.0, 0.91, 70.0,  77.0, false),
    ('demo-healthy', 'incomplete', 86.0, 'B', 90.0, null, 82.0, 0.62, 52.0,  84.0, false),
    ('demo-hoppers', 'pending',    null, null, null, null, null, 0.30,  3.5,  11.5, false)
  ) as p(code, status, rating, grade, personal, food_prep, environmental, coverage, monitored, expected, live)
    on p.code = k.code
on conflict (kitchen_id) do update
   set status = excluded.status, rating = excluded.rating, grade = excluded.grade,
       personal_score = excluded.personal_score, food_prep_score = excluded.food_prep_score,
       environmental_score = excluded.environmental_score, coverage = excluded.coverage,
       monitored_hours = excluded.monitored_hours, expected_hours = excluded.expected_hours,
       last_score_at = excluded.last_score_at, computed_at = excluded.computed_at,
       config_version = excluded.config_version, details = excluded.details;

-- 2. A 7-day trend (one score per day at noon, Sri Lanka time) for the graded kitchens
delete from public.hygiene_scores where details ->> 'preview' = 'true';

insert into public.hygiene_scores
  (kitchen_id, computed_at, window_start, window_end, overall_score,
   personal_score, food_prep_score, environmental_score, config_id, details)
select k.id, t, t - interval '5 minutes', t,
       least(100, greatest(0, p.base + p.wave * sin(d))),
       least(100, greatest(0, p.base + 3 + p.wave * sin(d + 1))),
       case when p.code = 'demo-healthy' then null else least(100, greatest(0, p.base - 4 + p.wave * cos(d))) end,
       least(100, greatest(0, p.base + 1 + p.wave * cos(d + 2))),
       (select id from public.scoring_configs where is_active),
       jsonb_build_object('preview', true)
  from public.kitchens k
  join (values
    ('demo-kottu',   90.0, 4.0),
    ('demo-burger',  68.0, 7.0),
    ('demo-pizza',   45.0, 9.0),
    ('demo-healthy', 85.0, 5.0)
  ) as p(code, base, wave) on p.code = k.code
  cross join generate_series(0, 6) as d
  cross join lateral (
    select ((date_trunc('day', now() at time zone 'Asia/Colombo') - make_interval(days => d) + interval '12 hours')
              at time zone 'Asia/Colombo') as t
  ) as day
 where t < now();
