"""Camera process (`edge-service vision`): video -> YOLO -> 5-second PPE evidence over MQTT.

Privacy by design: frames exist only in memory. Nothing in this package writes
images or video to disk, and no face recognition is performed. Only aggregated
results (e.g. "gloves: compliant, 0.86 confidence, 23 of 25 frames") leave the
process, as MQTT messages to the edge service.

Modules:
  ppe.py        pure: model classes -> indicators, per-frame decision, 5-s window aggregation
  roi.py        pure: worker-region crop
  capture.py    camera reader thread (webcam / RTSP / file), newest frame only, auto-reconnect
  detector.py   YOLO (CoreML on Apple Silicon) wrapper
  publisher.py  MQTT client: detections + retained status + last will
  service.py    the sampling loop that ties them together
"""
