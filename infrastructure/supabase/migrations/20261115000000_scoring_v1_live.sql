-- =====================================================================
-- Scoring config v1-live: the live-score engine rules, written out in full
--
-- Every rule is stored explicitly (not left to code defaults), so a stored
-- score stays explainable even if the code's defaults change later.
--
--   * Pillar weights: equal (1/3 each) until expert (AHP) weights exist.
--   * Item weights within a pillar: rank-order-centroid weights over
--     food-safety risk tiers (FDA Food Code 2022): gloves > hairnet = mask,
--     food-contact surface > spills = waste, refrigerator > air temp = humidity.
--   * Refrigerator scored by time at temperature; kitchen air by the median.
--   * Breach evidence from the camera needs confidence >= 0.6 (compliance 0.5).
--   * Caps (non-compensatory): refrigerator >= 8 C for 15 min -> score <= 74
--     (not grade A). Gloves cap is defined but inactive until the PPE model
--     is validated on the site's own camera (ai_validated).
--   * Grades: Sri Lanka PHI (H-800) bands A >= 75, B >= 50, C >= 25, else D.
--   * Window: 5 minutes.
--
-- Activates v1-live; earlier configs stay for traceability of older scores.
-- =====================================================================

insert into public.scoring_configs (version, w_personal, w_food_prep, w_environmental, thresholds, is_active, notes)
values (
  'v1-live', 0.333, 0.333, 0.334,
  $json${
  "min_confidence": 0.5,
  "min_confidence_noncompliant": 0.6,
  "min_samples": 3,
  "indicator_fail_below": 0.5,
  "ai_persistence_s": 30.0,
  "sensor_persistence_s": 120.0,
  "environment": {
    "fridge_temp_c": {
      "min": 0.0,
      "max": 5.0,
      "tolerance": 3.0
    },
    "ambient_temp_c": {
      "min": 16.0,
      "max": 32.0,
      "tolerance": 6.0
    },
    "humidity_pct": {
      "min": 30.0,
      "max": 70.0,
      "tolerance": 15.0
    }
  },
  "ai_severity": {
    "gloves": "high",
    "hairnet": "medium",
    "mask": "medium",
    "clean_surface": "medium",
    "dirty_surface": "medium",
    "food_spill": "medium",
    "food_waste": "low"
  },
  "window_s": 300.0,
  "item_weights": {
    "gloves": 0.611,
    "hairnet": 0.1945,
    "mask": 0.1945,
    "surface": 0.611,
    "food_spill": 0.1945,
    "food_waste": 0.1945,
    "fridge_temp_c": 0.611,
    "ambient_temp_c": 0.1945,
    "humidity_pct": 0.1945
  },
  "sensor_aggregation": {
    "fridge_temp_c": "time_weighted",
    "ambient_temp_c": "median",
    "humidity_pct": "median"
  },
  "caps": [
    {
      "key": "fridge_temp_c",
      "min_severity": "critical",
      "after_s": 900.0,
      "cap": 74.0,
      "reason": "Refrigerator at or above 8 °C for 15 min",
      "enabled": true
    },
    {
      "key": "gloves",
      "min_severity": "high",
      "after_s": 120.0,
      "cap": 74.0,
      "reason": "Gloves not worn for 2 min",
      "enabled": true
    }
  ],
  "ai_validated": {
    "hairnet": false,
    "mask": false,
    "gloves": false,
    "clean_surface": false,
    "dirty_surface": false,
    "food_spill": false,
    "food_waste": false
  },
  "grade_bands": {
    "A": 75.0,
    "B": 50.0,
    "C": 25.0
  }
}$json$::jsonb,
  false,
  'Live-score engine: equal pillar weights until AHP; risk-tier item weights (ROC); '
  'refrigerator time-at-temperature; median air sensors; critical caps; H-800 grade bands; 5-min window.'
)
on conflict (version) do nothing;

-- Exactly one active config (unique partial index): switch in one transaction.
update public.scoring_configs set is_active = false where is_active and version <> 'v1-live';
update public.scoring_configs set is_active = true  where version = 'v1-live';
