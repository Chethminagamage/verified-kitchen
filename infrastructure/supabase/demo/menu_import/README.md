# Menu and photo import

Loads demo kitchens, their menus and photos into Supabase in one go — the
"onboarding team" route. Real kitchens manage their own menus in the operator
console.

| File | What it holds |
|---|---|
| `kitchens.csv` | One row per demo kitchen (codes start with `demo-`; real listings are never changed here) |
| `menu.csv` | One row per dish; `kitchen_code` may also be a real kitchen such as `kitchen-001` |
| `images/` | Your photos, named as in the spreadsheets (not committed to git) |

## Photos

Kitchens normally add their own photos in the operator console (**Menu** page).
The import only changes a photo when its row names a file; an empty
`image_file` / `banner_file` leaves the current photo as it is.

To bulk-load photos instead, save each photo under the name in the spreadsheet, for example
`images/dishes/demo-kottu/egg-kottu.jpg` or `images/banners/demo-kottu.jpg`.
Any size or shape is fine: the script crops from the centre and resizes
(dishes 800 × 800, banners 1600 × 900) before uploading.

Use photos you took yourself, free-licence photos (Unsplash, Pexels) or
generated images — never photos copied from delivery apps or restaurant sites.

## Run

From the repository root (uv downloads Pillow for this run only):

```bash
# 1. Preview: checks the spreadsheets and shows what would change
uv run --with pillow python infrastructure/supabase/demo/menu_import/import_menu.py

# 2. Import
uv run --with pillow python infrastructure/supabase/demo/menu_import/import_menu.py --apply
```

Run it again whenever you add or change photos or dishes: existing kitchens and
dishes are updated (never duplicated), only new or changed photos are uploaded,
and nothing is deleted. Dishes without a photo keep their emoji. The photos
still missing are listed in `photos_needed.txt`.

Credentials come from `apps/web-dashboard/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`
and `SUPABASE_SECRET_KEY`). The secret key is never printed and must never be
put in the app.
