"""Label Studio project -> YOLO dataset for the food-prep model.

Split (by blocks of consecutive frames, never by random frame):
  test  = every frame of the held-out recording(s) (default R01_E02), plus every
          7th block of BLOCK consecutive frames of the other recordings
  val   = another block in every 7
  train = the rest, minus the frame on each side of a test / val block (a 2-s
          neighbour is nearly the same picture and would leak into training)

Blocks spread through each recording are needed because dirty boards and food waste
occur in only part of the footage (one "last 15 %" would hold none of them).

Images are symlinked (the footage is not copied and never leaves ~/vk-data).

  uv run --project services/edge-service --extra vision \
      python ml/foodprep/build_dataset.py --project 1 --out ~/vk-data/datasets/foodprep_r01
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import re
import shutil
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

CLASSES = ["clean_surface", "dirty_surface", "food_waste"]  # order = YOLO class ids
FRAME_NAME = re.compile(r"^(?P<video>.+)_t(?P<t>\d+(\.\d+)?)\.jpg$")
DATA_ROOT = Path("~/vk-data").expanduser()


def session(base: str, login_file: Path) -> urllib.request.OpenerDirector:
    creds = dict(line.strip().split("=", 1) for line in login_file.read_text().splitlines() if "=" in line)
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    page = opener.open(f"{base}/user/login/").read().decode()
    token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page)
    if token is None:
        raise SystemExit("Label Studio login page not recognised")
    form = {"csrfmiddlewaretoken": token.group(1), "email": creds["email"], "password": creds["password"]}
    opener.open(
        urllib.request.Request(
            f"{base}/user/login/",
            data=urllib.parse.urlencode(form).encode(),
            headers={"Referer": f"{base}/user/login/"},
        )
    )
    if not any(c.name == "sessionid" for c in jar):
        raise SystemExit("Label Studio login failed (check ~/vk-data/label-studio-login.txt)")
    return opener


def image_path(task: dict) -> Path:
    url = task["data"]["image"]  # /data/local-files/?d=frames/pool/R01_E01_t0001.0.jpg
    rel = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["d"][0]
    return DATA_ROOT / rel


def final_annotation(task: dict) -> dict | None:
    done = [a for a in task.get("annotations", []) if not a.get("was_cancelled")]
    return max(done, key=lambda a: a.get("updated_at") or a.get("created_at") or "") if done else None


def yolo_lines(annotation: dict) -> list[str]:
    lines = []
    for r in annotation.get("result", []):
        if r.get("type") != "rectanglelabels":
            continue
        v = r["value"]
        label = v["rectanglelabels"][0]
        if label not in CLASSES:
            continue
        w, h = v["width"] / 100, v["height"] / 100
        cx, cy = v["x"] / 100 + w / 2, v["y"] / 100 + h / 2
        clamp = lambda x: min(1.0, max(0.0, x))  # noqa: E731
        lines.append(f"{CLASSES.index(label)} {clamp(cx):.6f} {clamp(cy):.6f} {clamp(w):.6f} {clamp(h):.6f}")
    return lines


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default="http://127.0.0.1:8091")
    ap.add_argument("--project", type=int, default=1)
    ap.add_argument("--login", type=Path, default=DATA_ROOT / "label-studio-login.txt")
    ap.add_argument("--out", type=Path, default=DATA_ROOT / "datasets" / "foodprep_r01")
    ap.add_argument("--test-videos", nargs="+", default=["R01_E02"])
    ap.add_argument("--block", type=int, default=8, help="consecutive frames per block")
    args = ap.parse_args()

    opener = session(args.base, args.login)
    tasks = json.loads(opener.open(f"{args.base}/api/projects/{args.project}/export?exportType=JSON").read())

    labelled: list[tuple[Path, list[str]]] = []
    for task in tasks:
        ann = final_annotation(task)
        if ann is not None:
            labelled.append((image_path(task), yolo_lines(ann)))
    if not labelled:
        raise SystemExit("no submitted annotations yet")

    # Order each recording's frames in time and cut them into blocks.
    by_video: dict[str, list[tuple[float, Path, list[str]]]] = defaultdict(list)
    for img, lines in labelled:
        m = FRAME_NAME.match(img.name)
        if m is None:
            raise SystemExit(f"unexpected frame name: {img.name}")
        by_video[m["video"]].append((float(m["t"]), img, lines))
    assigned: list[tuple[str, Path, list[str]]] = []
    dropped = 0
    for video, frames in sorted(by_video.items()):
        frames.sort()
        if video in args.test_videos:
            assigned += [("test", img, lines) for _, img, lines in frames]
            continue
        splits = [{3: "test", 6: "val"}.get((i // args.block) % 7, "train") for i in range(len(frames))]
        for i, (_, img, lines) in enumerate(frames):
            near_held_out = any(
                0 <= j < len(frames) and splits[j] != "train" for j in (i - 1, i + 1)
            )
            if splits[i] == "train" and near_held_out:
                dropped += 1  # buffer frame: not used at all
                continue
            assigned.append((splits[i], img, lines))

    out = args.out.expanduser()
    if out.exists():
        shutil.rmtree(out)
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for split, img, lines in assigned:
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)
        (out / "images" / split / img.name).symlink_to(img)
        (out / "labels" / split / (img.stem + ".txt")).write_text("\n".join(lines) + ("\n" if lines else ""))
        counts[split]["images"] += 1
        counts[split]["empty"] += not lines
        for line in lines:
            counts[split][CLASSES[int(line.split()[0])]] += 1

    (out / "data.yaml").write_text(
        f"path: {out}\ntrain: images/train\nval: images/val\ntest: images/test\n"
        f"names:\n" + "".join(f"  {i}: {c}\n" for i, c in enumerate(CLASSES))
    )
    print(f"dataset -> {out}  ({dropped} buffer frames left out)")
    for split in ("train", "val", "test"):
        c = counts[split]
        boxes = ", ".join(f"{k} {c[k]}" for k in CLASSES)
        print(f"  {split:5}: {c['images']:4} images ({c['empty']} with no boxes) | {boxes}")


if __name__ == "__main__":
    main()
