-- =====================================================================
-- Operators set their kitchen's banner from the operator console.
-- The kitchens_update policy already limits updates to the kitchen's own
-- operators and admins; this adds the banner to the columns they may change
-- (alongside name, location and the listing details). The path itself must
-- stay inside the kitchen's own folder (check constraint from kitchen_media).
-- =====================================================================
grant update (banner_path) on public.kitchens to authenticated;
