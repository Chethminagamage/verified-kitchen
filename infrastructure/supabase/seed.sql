-- =====================================================================
-- Verified Kitchen — seed data for the single-workstation prototype
-- Run once, after the initial schema migration.
-- =====================================================================

insert into public.kitchens (code, name, location)
values ('kitchen-001', 'Verified Kitchen Test Workstation', 'Kandy, Sri Lanka')
on conflict (code) do nothing;

insert into public.devices (id, kitchen_id, type, name)
select d.id, k.id, d.type::public.device_type, d.name
  from public.kitchens k
 cross join (values
       ('vk-env-01', 'env_node', 'ESP32 environmental node (BME280 + DS18B20)'),
       ('vk-cam-01', 'camera',   'Workstation camera')
     ) as d(id, type, name)
 where k.code = 'kitchen-001'
on conflict (id) do nothing;

-- PROVISIONAL weights; environmental safe ranges made explicit (same values as
-- the edge service defaults and migration 20261105000000).
-- These are placeholders so the pipeline can run end to end. The real
-- weighting scheme and thresholds are defined and justified in the scoring
-- step and validated with the five controlled scenarios (RQ1).
insert into public.scoring_configs (version, w_personal, w_food_prep, w_environmental, thresholds, is_active, notes)
values ('v0-provisional', 0.400, 0.350, 0.250,
        '{"environment": {"fridge_temp_c":  {"min": 0,  "max": 5,  "tolerance": 3},
                          "ambient_temp_c": {"min": 16, "max": 32, "tolerance": 6},
                          "humidity_pct":   {"min": 30, "max": 70, "tolerance": 15}}}'::jsonb,
        true,
        'Placeholder for pipeline testing only. Replace with validated v1 before evaluation.')
on conflict (version) do nothing;
