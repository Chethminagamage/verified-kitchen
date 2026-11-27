#!/usr/bin/env python3
"""Bulk-load kitchens, menus and photos into Supabase (the onboarding-team route).

Reads two spreadsheets and a photo folder next to this file:

  kitchens.csv   one row per demo kitchen (codes must start with "demo-")
  menu.csv       one row per dish (any existing kitchen code, e.g. demo-kottu or kitchen-001)
  images/        photos named as in the spreadsheets, e.g. images/dishes/demo-kottu/egg-kottu.jpg

What it does, safely and repeatably:
  * Validates everything first and stops on any mistake (nothing half-written).
  * Creates or updates kitchens (matched by code) and dishes (matched by kitchen + dish name),
    so running it again updates instead of duplicating. Nothing is ever deleted.
  * Resizes photos before upload (dishes 800 x 800, banners 1600 x 900, JPEG), because
    Supabase's on-the-fly image resizing is a paid feature. Uploads only new or changed photos.
  * A dish or kitchen without a photo keeps its emoji; add the photo later and run again.
  * Previews by default. Nothing is written without --apply.

Usage (from the repository root; uv fetches Pillow for this run only):
  uv run --with pillow python infrastructure/supabase/demo/menu_import/import_menu.py
  uv run --with pillow python infrastructure/supabase/demo/menu_import/import_menu.py --apply

Credentials: SUPABASE_URL and SUPABASE_SECRET_KEY from the environment, or read from
apps/web-dashboard/.env.local. The secret key is never printed. Run this on your own
computer only; never ship the secret key in an app.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
IMAGES = HERE / "images"
BUCKET = "kitchen-media"
DISH_SIZE = (800, 800)
BANNER_SIZE = (1600, 900)
JPEG_QUALITY = 82
# Part of every photo's fingerprint: change it to force all photos to be re-processed.
PROCESSING_VERSION = "v1"

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class ImportProblem(Exception):
    """A problem the person running the import must fix."""


# --------------------------------------------------------------------------- spreadsheets
@dataclass
class KitchenRow:
    code: str
    name: str
    location: str
    cuisine: str
    description: str
    emoji: str
    delivery_fee_lkr: float
    prep_minutes: int
    opens_at: str
    closes_at: str
    banner_file: str | None


@dataclass
class DishRow:
    kitchen_code: str
    category: str
    name: str
    description: str | None
    price_lkr: float
    emoji: str
    image_file: str | None
    available: bool
    sort_order: int


@dataclass
class Problems:
    items: list[str] = field(default_factory=list)

    def add(self, where: str, message: str) -> None:
        self.items.append(f"{where}: {message}")


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise ImportProblem(f"{path.name} not found next to the script")
    with path.open(newline="", encoding="utf-8-sig") as f:
        return [{k.strip(): (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def _number(value: str, where: str, problems: Problems, *, low: float, high: float) -> float:
    try:
        n = float(value)
    except ValueError:
        problems.add(where, f"'{value}' is not a number")
        return 0
    if not low <= n <= high:
        problems.add(where, f"{value} must be between {low:g} and {high:g}")
    return n


def read_kitchens(problems: Problems) -> list[KitchenRow]:
    rows, seen = [], set()
    for i, r in enumerate(_read_csv(HERE / "kitchens.csv"), start=2):
        where = f"kitchens.csv line {i}"
        code = r.get("code", "")
        if not code.startswith("demo-"):
            problems.add(where, f"code '{code}' must start with 'demo-' (real kitchens are managed in the consoles)")
        if code in seen:
            problems.add(where, f"code '{code}' appears twice")
        seen.add(code)
        for col in ("name", "cuisine", "emoji", "opens_at", "closes_at"):
            if not r.get(col):
                problems.add(where, f"'{col}' is empty")
        if len(r.get("description", "")) > 500:
            problems.add(where, "description is longer than 500 characters")
        if len(r.get("emoji", "")) > 8:
            problems.add(where, "emoji is too long")
        for col in ("opens_at", "closes_at"):
            if r.get(col) and not TIME_RE.match(r[col]):
                problems.add(where, f"{col} '{r[col]}' must look like 09:30")
        rows.append(
            KitchenRow(
                code=code,
                name=r.get("name", ""),
                location=r.get("location", ""),
                cuisine=r.get("cuisine", ""),
                description=r.get("description", ""),
                emoji=r.get("emoji", ""),
                delivery_fee_lkr=_number(r.get("delivery_fee_lkr", ""), where, problems, low=0, high=5000),
                prep_minutes=int(_number(r.get("prep_minutes", ""), where, problems, low=5, high=180)),
                opens_at=r.get("opens_at", ""),
                closes_at=r.get("closes_at", ""),
                banner_file=r.get("banner_file") or None,
            )
        )
    return rows


def read_menu(problems: Problems) -> list[DishRow]:
    rows: list[DishRow] = []
    seen: set[tuple[str, str]] = set()
    order: dict[str, int] = {}
    for i, r in enumerate(_read_csv(HERE / "menu.csv"), start=2):
        where = f"menu.csv line {i}"
        code, name = r.get("kitchen_code", ""), r.get("name", "")
        if not code or not name:
            problems.add(where, "kitchen_code and name are required")
        if (code, name.lower()) in seen:
            problems.add(where, f"'{name}' appears twice for {code}")
        seen.add((code, name.lower()))
        if len(name) > 80:
            problems.add(where, "name is longer than 80 characters")
        if len(r.get("category", "")) > 40:
            problems.add(where, "category is longer than 40 characters")
        if len(r.get("description", "")) > 300:
            problems.add(where, "description is longer than 300 characters")
        if len(r.get("emoji", "")) > 8:
            problems.add(where, "emoji is too long")
        available = r.get("available", "yes").lower()
        if available not in ("yes", "no"):
            problems.add(where, "available must be yes or no")
        order[code] = order.get(code, 0) + 1
        rows.append(
            DishRow(
                kitchen_code=code,
                category=r.get("category", "") or "Menu",
                name=name,
                description=r.get("description") or None,
                price_lkr=_number(r.get("price_lkr", ""), where, problems, low=1, high=99999),
                emoji=r.get("emoji", "") or "🍽️",
                image_file=r.get("image_file") or None,
                available=available != "no",
                sort_order=order[code],
            )
        )
    return rows


# --------------------------------------------------------------------------- photos
def photo_fingerprint(source: Path, size: tuple[int, int]) -> str:
    """Stable id of a photo + how it is processed; a changed photo gets a new file name."""
    h = hashlib.sha256(source.read_bytes())
    h.update(f"{PROCESSING_VERSION}-{size[0]}x{size[1]}-q{JPEG_QUALITY}".encode())
    return h.hexdigest()[:12]


def process_photo(source: Path, size: tuple[int, int]) -> bytes:
    """Fix phone rotation, crop to the target shape from the centre, resize and compress."""
    from PIL import Image, ImageOps  # imported here so a preview works even without Pillow

    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        out = io.BytesIO()
        img.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        return out.getvalue()


# --------------------------------------------------------------------------- Supabase
class Supabase:
    def __init__(self, url: str, key: str) -> None:
        self.url = url.rstrip("/")
        self._key = key

    def _call(self, method: str, path: str, *, body: bytes | None = None, headers: dict[str, str] | None = None):
        req = urllib.request.Request(f"{self.url}{path}", data=body, method=method)
        req.add_header("apikey", self._key)
        req.add_header("Authorization", f"Bearer {self._key}")
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                raw = res.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:400]
            raise ImportProblem(f"{method} {path.split('?')[0]} failed ({e.code}): {detail}") from None
        except urllib.error.URLError as e:
            raise ImportProblem(f"cannot reach Supabase: {e.reason}") from None
        return json.loads(raw) if raw else None

    def select(self, table: str, query: str):
        return self._call("GET", f"/rest/v1/{table}?{query}")

    def insert(self, table: str, rows: list[dict], *, on_conflict: str | None = None):
        q = f"?on_conflict={on_conflict}" if on_conflict else ""
        prefer = "return=representation" + (",resolution=merge-duplicates" if on_conflict else "")
        return self._call(
            "POST",
            f"/rest/v1/{table}{q}",
            body=json.dumps(rows).encode(),
            headers={"Content-Type": "application/json", "Prefer": prefer},
        )

    def update(self, table: str, match: str, values: dict):
        return self._call(
            "PATCH",
            f"/rest/v1/{table}?{match}",
            body=json.dumps(values).encode(),
            headers={"Content-Type": "application/json", "Prefer": "return=minimal"},
        )

    def upload(self, path: str, data: bytes) -> None:
        self._call(
            "POST",
            f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(path)}",
            body=data,
            headers={
                "Content-Type": "image/jpeg",
                # Every changed photo gets a new name, so it can be cached for a year.
                "cache-control": "max-age=31536000",
                "x-upsert": "true",
            },
        )

    def remove(self, paths: list[str]) -> None:
        if paths:
            self._call(
                "DELETE",
                f"/storage/v1/object/{BUCKET}",
                body=json.dumps({"prefixes": paths}).encode(),
                headers={"Content-Type": "application/json"},
            )


def load_credentials() -> tuple[str, str]:
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SECRET_KEY")
    env_file = REPO / "apps" / "web-dashboard" / ".env.local"
    if (not url or not key) and env_file.exists():
        for line in env_file.read_text().splitlines():
            name, _, value = line.partition("=")
            value = value.strip().strip('"').strip("'")
            if name.strip() == "NEXT_PUBLIC_SUPABASE_URL" and not url:
                url = value
            elif name.strip() == "SUPABASE_SECRET_KEY" and not key:
                key = value
    if not url or not key:
        raise ImportProblem("set SUPABASE_URL and SUPABASE_SECRET_KEY (or add them to apps/web-dashboard/.env.local)")
    return url, key


# --------------------------------------------------------------------------- the import
def _photo(file: str | None, size: tuple[int, int], missing: list[str]) -> Path | None:
    if not file:
        return None
    path = IMAGES / file
    if path.is_file():
        return path
    missing.append(f"images/{file}")
    return None


def run(apply: bool) -> int:
    problems = Problems()
    kitchens = read_kitchens(problems)
    dishes = read_menu(problems)
    if problems.items:
        print("Fix these before importing:\n  " + "\n  ".join(problems.items))
        return 1

    db = Supabase(*load_credentials())
    codes = sorted({k.code for k in kitchens} | {d.kitchen_code for d in dishes})
    existing = {
        k["code"]: k
        for k in db.select("kitchens", f"select=id,code,name,banner_path&code=in.({','.join(codes)})")
    }
    unknown = sorted({d.kitchen_code for d in dishes} - {k.code for k in kitchens} - set(existing))
    if unknown:
        print(f"menu.csv uses kitchen codes that do not exist: {', '.join(unknown)}")
        return 1

    missing: list[str] = []
    by_kitchen: dict[str, list[DishRow]] = {}
    for d in dishes:
        by_kitchen.setdefault(d.kitchen_code, []).append(d)
    listing = {k.code: k for k in kitchens}
    now = datetime.now(UTC).isoformat()
    totals = {"kitchens_new": 0, "dishes_new": 0, "dishes_updated": 0, "photos_uploaded": 0}

    print(("APPLYING" if apply else "PREVIEW (nothing is written; add --apply to import)") + "\n")
    for code in codes:
        row = listing.get(code)
        current = existing.get(code)
        current_items = (
            {i["name"].lower(): i for i in db.select("menu_items", f"select=id,name,image_path&kitchen_id=eq.{current['id']}")}
            if current
            else {}
        )
        items = by_kitchen.get(code, [])
        new_items = [d for d in items if d.name.lower() not in current_items]
        dish_photos = {d.name.lower(): _photo(d.image_file, DISH_SIZE, missing) for d in items}
        banner = _photo(row.banner_file, BANNER_SIZE, missing) if row else None

        label = "new kitchen" if not current else ("listing updated" if row else "menu only (listing untouched)")
        # Rows without a file name leave the photo as it is (e.g. uploaded in the operator console).
        named = [d for d in items if d.image_file]
        have = sum(1 for d in named if dish_photos[d.name.lower()])
        photos = f"photos {have}/{len(named)} from folder" if named else "photos kept"
        banner_note = ("banner from folder" if banner else "banner file missing") if row and row.banner_file else "banner kept"
        print(
            f"  {code:<15} {label:<30} dishes: {len(new_items)} new, {len(items) - len(new_items)} updated"
            f" · {photos}" + (f" · {banner_note}" if row else "")
        )
        totals["dishes_new"] += len(new_items)
        totals["dishes_updated"] += len(items) - len(new_items)
        if not current:
            totals["kitchens_new"] += 1
        if not apply:
            continue

        # 1. The kitchen listing (demo kitchens only; real listings are never touched here).
        if row:
            values = {
                "name": row.name,
                "location": row.location or None,
                "cuisine": row.cuisine,
                "description": row.description or None,
                "emoji": row.emoji,
                "delivery_fee_lkr": row.delivery_fee_lkr,
                "prep_minutes": row.prep_minutes,
                "opens_at": row.opens_at,
                "closes_at": row.closes_at,
            }
            if current:
                db.update("kitchens", f"id=eq.{current['id']}", values)
            else:
                current = db.insert("kitchens", [{"code": code, "is_public": True, "published_at": now, **values}])[0]
                current["banner_path"] = None
        kitchen_id = current["id"]

        # 2. Dishes, matched by kitchen + name (one request per kitchen).
        if items:
            saved = db.insert(
                "menu_items",
                [
                    {
                        "kitchen_id": kitchen_id,
                        "name": d.name,
                        "description": d.description,
                        "category": d.category,
                        "price_lkr": d.price_lkr,
                        "emoji": d.emoji,
                        "is_available": d.available,
                        "sort_order": d.sort_order,
                    }
                    for d in items
                ],
                on_conflict="kitchen_id,name",
            )
            ids = {s["name"].lower(): s["id"] for s in saved}

            # 3. Dish photos: only new or changed ones are uploaded; the old file is removed.
            for d in items:
                source = dish_photos[d.name.lower()]
                if not source:
                    continue
                item_id = ids[d.name.lower()]
                path = f"{kitchen_id}/dishes/{item_id}-{photo_fingerprint(source, DISH_SIZE)}.jpg"
                old = current_items.get(d.name.lower(), {}).get("image_path")
                if old == path:
                    continue
                db.upload(path, process_photo(source, DISH_SIZE))
                db.update("menu_items", f"id=eq.{item_id}", {"image_path": path})
                if old:
                    db.remove([old])
                totals["photos_uploaded"] += 1

        # 4. Banner.
        if banner:
            path = f"{kitchen_id}/banner-{photo_fingerprint(banner, BANNER_SIZE)}.jpg"
            old = current.get("banner_path")
            if old != path:
                db.upload(path, process_photo(banner, BANNER_SIZE))
                db.update("kitchens", f"id=eq.{kitchen_id}", {"banner_path": path})
                if old:
                    db.remove([old])
                totals["photos_uploaded"] += 1

    print(
        f"\n{'Done' if apply else 'Would import'}: {totals['kitchens_new']} new kitchens, "
        f"{totals['dishes_new']} new dishes, {totals['dishes_updated']} updated dishes"
        + (f", {totals['photos_uploaded']} photos uploaded" if apply else "")
    )
    needed = HERE / "photos_needed.txt"
    if missing:
        needed.write_text("\n".join(missing) + "\n")
        print(f"{len(missing)} photos not found yet (emoji is shown instead). The list is in {needed.relative_to(REPO)}")
    elif needed.exists():
        needed.unlink()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write to Supabase (default: preview only)")
    args = parser.parse_args()
    try:
        return run(args.apply)
    except ImportProblem as e:
        print(f"Stopped: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
