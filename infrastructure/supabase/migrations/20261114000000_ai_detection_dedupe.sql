-- =====================================================================
-- Real camera evidence: idempotent AI detections
--
-- The camera process publishes one aggregated result per indicator per
-- window over MQTT with QoS 1 ("at least once"). A redelivered window must
-- not create a second row, exactly like sensor_readings' unique
-- (device_id, device_ts). The edge service inserts with
-- ON CONFLICT (device_id, indicator, detected_at) DO NOTHING.
--
-- detected_at is the window end, so one camera produces at most one row per
-- indicator per window.
-- =====================================================================

-- Safety: refuse if duplicates already exist (nothing is deleted silently).
do $$
begin
  if exists (
    select 1 from public.ai_detections
    group by device_id, indicator, detected_at
    having count(*) > 1
  ) then
    raise exception 'ai_detections already contains duplicate (device_id, indicator, detected_at) rows; resolve them first';
  end if;
end
$$;

alter table public.ai_detections
  add constraint ai_detections_device_indicator_ts_key unique (device_id, indicator, detected_at);

comment on constraint ai_detections_device_indicator_ts_key on public.ai_detections is
  'One result per camera, indicator and window end: MQTT QoS 1 redeliveries are ignored by the edge service.';
