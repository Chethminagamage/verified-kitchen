-- =====================================================================
-- Kitchen media: a banner per kitchen and a photo per dish.
--
-- Files live in Supabase Storage (free plan), in one public bucket:
--   kitchen-media/<kitchen id>/banner-<timestamp>.jpg
--   kitchen-media/<kitchen id>/dishes/<menu item id>-<timestamp>.jpg
--
-- * The database stores the object PATH, not a full URL, so the project URL
--   can change without touching data. Apps build the public URL.
-- * Each upload gets a new file name (timestamp), so a replaced photo is never
--   served stale from a cache.
-- * Anyone may view the files (menus are public in the app). Only the
--   kitchen's own staff (operator) or an admin may upload, replace or delete,
--   and only inside that kitchen's folder.
-- * Images are resized before upload (800 x 800 dishes, 1600 x 900 banners):
--   Supabase's on-the-fly image transformation is a paid feature.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Where each image is
-- ---------------------------------------------------------------------
alter table public.kitchens
  add column banner_path text
    constraint kitchens_banner_path_in_own_folder
    check (banner_path is null or (banner_path like id::text || '/%' and length(banner_path) <= 300));

alter table public.menu_items
  add column image_path text
    constraint menu_items_image_path_in_own_folder
    check (image_path is null or (image_path like kitchen_id::text || '/%' and length(image_path) <= 300));

comment on column public.kitchens.banner_path is
  'Path of the banner in the kitchen-media bucket (<kitchen id>/banner-<ts>.jpg); null = no banner.';
comment on column public.menu_items.image_path is
  'Path of the dish photo in the kitchen-media bucket (<kitchen id>/dishes/<item id>-<ts>.jpg); null = emoji only.';

-- ---------------------------------------------------------------------
-- 2. The bucket: public to read, small files, images only
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kitchen-media', 'kitchen-media', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 3. Who may change files: the kitchen's operator or an admin, and only
--    inside that kitchen's folder. A folder name that is not a kitchen id
--    is simply refused (never an error).
-- ---------------------------------------------------------------------
create or replace function public.can_manage_kitchen_media(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kitchen uuid;
begin
  begin
    v_kitchen := split_part(p_object_name, '/', 1)::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.has_kitchen_access(v_kitchen)
     and public.current_user_role() in ('operator', 'admin');
end;
$$;

revoke execute on function public.can_manage_kitchen_media(text) from public, anon;
grant execute on function public.can_manage_kitchen_media(text) to authenticated;

-- Reading needs no policy: a public bucket serves files by URL to everyone.
drop policy if exists kitchen_media_insert on storage.objects;
drop policy if exists kitchen_media_update on storage.objects;
drop policy if exists kitchen_media_delete on storage.objects;

create policy kitchen_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kitchen-media' and public.can_manage_kitchen_media(name));

create policy kitchen_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'kitchen-media' and public.can_manage_kitchen_media(name))
  with check (bucket_id = 'kitchen-media' and public.can_manage_kitchen_media(name));

create policy kitchen_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'kitchen-media' and public.can_manage_kitchen_media(name));

-- ---------------------------------------------------------------------
-- 4. The app's kitchen list also returns the banner (new column at the end,
--    so the view keeps its columns and grants).
-- ---------------------------------------------------------------------
create or replace view public.marketplace_kitchens as
select k.id,
       k.name,
       k.location,
       k.cuisine,
       k.description,
       k.emoji,
       k.delivery_fee_lkr,
       k.prep_minutes,
       k.opens_at,
       k.closes_at,
       k.timezone,
       public.is_open_at(k.opens_at, k.closes_at, k.timezone, now()) as is_open,
       coalesce(r.status, 'not_monitored')                          as rating_status,
       r.rating,
       r.grade,
       r.personal_score,
       r.food_prep_score,
       r.environmental_score,
       r.coverage,
       r.computed_at                                                as rating_updated_at,
       r.last_score_at,
       coalesce(r.last_score_at > now() - interval '10 minutes', false) as monitored_now,
       k.banner_path
  from public.kitchens k
  left join public.public_ratings r on r.kitchen_id = k.id
 where k.is_public;
