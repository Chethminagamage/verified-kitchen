"""Train, test and export the food-prep model (YOLO26n, Apple Silicon GPU via MPS).

  uv run --project services/edge-service --extra vision \
      python ml/foodprep/train.py --data ~/vk-data/datasets/foodprep_r01/data.yaml [--install]

* Trains from COCO-pretrained YOLO26n (transfer learning; small datasets need it).
* Reports precision / recall / mAP per class on the held-out TEST split, which the
  model never saw during training or model selection, and saves them as JSON.
* Exports CoreML (Neural Engine). `--install` copies it to the camera process
  (services/edge-service/models/foodprep_yolo26n.mlpackage), which loads it on start.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from ultralytics import YOLO

REPO = Path(__file__).resolve().parents[2]
INSTALL_TO = REPO / "services" / "edge-service" / "models" / "foodprep_yolo26n.mlpackage"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--model", default="yolo26n.pt")
    ap.add_argument("--epochs", type=int, default=100)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--project", type=Path, default=Path("~/vk-data/runs").expanduser())
    ap.add_argument("--name", default="foodprep_r01")
    ap.add_argument("--install", action="store_true", help="copy the CoreML model to the camera process")
    args = ap.parse_args()

    model = YOLO(args.model)
    model.train(
        data=str(args.data.expanduser()),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device="mps",
        project=str(args.project),
        name=args.name,
        exist_ok=True,
        patience=25,
        seed=0,
        deterministic=True,
        # The camera never moves: no vertical flips; mild colour / scale changes only.
        flipud=0.0,
        fliplr=0.5,
        degrees=0.0,
        mosaic=1.0,
        close_mosaic=10,
        plots=True,
    )
    run = args.project / args.name
    best = YOLO(str(run / "weights" / "best.pt"))

    metrics = best.val(data=str(args.data.expanduser()), split="test", imgsz=args.imgsz, device="mps", plots=True,
                       project=str(run), name="test", exist_ok=True)
    names = best.names
    per_class = {
        names[int(c)]: {
            "precision": round(float(metrics.box.p[i]), 3),
            "recall": round(float(metrics.box.r[i]), 3),
            "mAP50": round(float(metrics.box.ap50[i]), 3),
            "mAP50-95": round(float(metrics.box.ap[i]), 3),
        }
        for i, c in enumerate(metrics.box.ap_class_index)
    }
    summary = {
        "split": "test (held-out recording)",
        "mAP50": round(float(metrics.box.map50), 3),
        "mAP50-95": round(float(metrics.box.map), 3),
        "precision": round(float(metrics.box.mp), 3),
        "recall": round(float(metrics.box.mr), 3),
        "per_class": per_class,
    }
    (run / "test_metrics.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))

    exported = Path(best.export(format="coreml", imgsz=args.imgsz))
    final = exported.with_name("foodprep_yolo26n.mlpackage")
    if final.exists():
        shutil.rmtree(final)
    exported.rename(final)
    print(f"CoreML model: {final}")
    if args.install:
        if INSTALL_TO.exists():
            shutil.rmtree(INSTALL_TO)
        shutil.copytree(final, INSTALL_TO)
        print(f"installed -> {INSTALL_TO} (restart the camera process to load it)")


if __name__ == "__main__":
    main()
