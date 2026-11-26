-- =====================================================================
-- Platform administration (the /admin site of the web app).
--
-- Admins onboard kitchens: create the kitchen (hidden from the app),
-- register its devices, give its staff access, then publish it once the
-- go-live checklist passes. They also manage staff accounts.
--
-- Security model
--   * Every admin change goes through a SECURITY DEFINER function below,
--     which (1) checks that the caller is an active admin, (2) validates the
--     input, and (3) writes an entry to admin_audit_log in the same
--     transaction. Admins get no extra direct table rights.
--   * Kitchens are never deleted (their evidence and audit chain must stay);
--     they are hidden instead. Devices with recorded evidence cannot be
--     removed for the same reason.
--   * A disabled account loses all data access at once: current_user_role()
--     and has_kitchen_access() ignore it. The web server additionally bans the
--     login in Supabase Auth, so it cannot sign in again.
--   * Customer (mobile app) accounts can never be turned into staff: staff
--     always get their own account through an invitation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New kitchens start hidden; publishing is an admin decision
-- ---------------------------------------------------------------------
alter table public.kitchens
  alter column is_public set default false,
  add column published_at timestamptz;

update public.kitchens set published_at = created_at where is_public;

-- ---------------------------------------------------------------------
-- 2. Disabled accounts
-- ---------------------------------------------------------------------
alter table public.profiles add column disabled_at timestamptz;

create or replace function public.current_user_role()
returns public.user_role
language sql stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.disabled_at is null;
$$;

create or replace function public.has_kitchen_access(p_kitchen uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p
                  where p.id = auth.uid() and p.role = 'admin' and p.disabled_at is null)
      or exists (select 1 from public.user_kitchens uk
                   join public.profiles p on p.id = uk.user_id
                  where uk.user_id = auth.uid() and uk.kitchen_id = p_kitchen and p.disabled_at is null);
$$;

-- Users edit only their own name and phone. Role and disabled state change
-- only through the admin functions below.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 3. Admin activity log (who changed what, append-only)
-- ---------------------------------------------------------------------
create table public.admin_audit_log (
  id            bigint generated always as identity primary key,
  actor_id      uuid references public.profiles (id) on delete set null,
  actor_email   text,                 -- snapshot: stays readable if the account goes
  action        text not null,        -- e.g. 'kitchen.created', 'account.disabled'
  target_type   text not null check (target_type in ('kitchen', 'device', 'account')),
  target_id     text not null,
  target_label  text,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id, created_at desc);

alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_select on public.admin_audit_log
  for select to authenticated using (public.current_user_role() = 'admin');
revoke all on public.admin_audit_log from anon;
revoke insert, update, delete, truncate on public.admin_audit_log from authenticated;

-- ---------------------------------------------------------------------
-- 4. Internal helpers (not callable through the API)
-- ---------------------------------------------------------------------
create or replace function public.admin_require()
returns uuid
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'admin' then
    raise exception 'administrator access required' using errcode = 'insufficient_privilege';
  end if;
  return auth.uid();
end;
$$;

create or replace function public.admin_log(
  p_action text, p_target_type text, p_target_id text, p_target_label text, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, target_label, details)
  values (auth.uid(), (select u.email::text from auth.users u where u.id = auth.uid()),
          p_action, p_target_type, p_target_id, p_target_label, coalesce(p_details, '{}'::jsonb));
$$;

-- Validates the listing fields shared by create and update.
create or replace function public.admin_check_listing(
  p_name text, p_location text, p_timezone text, p_cuisine text, p_description text,
  p_emoji text, p_delivery_fee_lkr numeric, p_prep_minutes integer, p_opens_at time, p_closes_at time)
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if p_name is null or length(p_name) not between 2 and 80 then
    raise exception 'the kitchen name must be 2 to 80 characters' using errcode = 'check_violation';
  end if;
  if length(p_location) > 120 then
    raise exception 'the location is too long' using errcode = 'check_violation';
  end if;
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'unknown time zone' using errcode = 'check_violation';
  end if;
  if length(p_cuisine) > 60 then
    raise exception 'the cuisine is too long' using errcode = 'check_violation';
  end if;
  if length(p_description) > 500 then
    raise exception 'the description is too long (500 characters at most)' using errcode = 'check_violation';
  end if;
  if length(p_emoji) > 8 then
    raise exception 'use a single emoji' using errcode = 'check_violation';
  end if;
  if p_delivery_fee_lkr is null or p_delivery_fee_lkr not between 0 and 5000 then
    raise exception 'the delivery fee must be between 0 and 5000 LKR' using errcode = 'check_violation';
  end if;
  if p_prep_minutes is null or p_prep_minutes not between 5 and 180 then
    raise exception 'the preparation time must be between 5 and 180 minutes' using errcode = 'check_violation';
  end if;
  if p_opens_at is null or p_closes_at is null then
    raise exception 'set the opening hours' using errcode = 'check_violation';
  end if;
end;
$$;

-- Published kitchens that would be left without an active operator if
-- p_user stopped being one (for p_kitchen only, or for all their kitchens).
create or replace function public.admin_kitchens_losing_last_operator(p_user uuid, p_kitchen uuid default null)
returns text
language sql stable
security definer
set search_path = ''
as $$
  select string_agg(k.name, ', ' order by k.name)
    from public.kitchens k
    join public.user_kitchens mine on mine.kitchen_id = k.id and mine.user_id = p_user
   where k.is_public
     and (p_kitchen is null or k.id = p_kitchen)
     and not exists (select 1 from public.user_kitchens uk
                       join public.profiles p on p.id = uk.user_id
                      where uk.kitchen_id = k.id and uk.user_id <> p_user
                        and p.role = 'operator' and p.disabled_at is null);
$$;

-- ---------------------------------------------------------------------
-- 5. Kitchens
-- ---------------------------------------------------------------------
create or replace function public.admin_create_kitchen(
  p_name text, p_location text, p_timezone text, p_cuisine text, p_description text,
  p_emoji text, p_delivery_fee_lkr numeric, p_prep_minutes integer, p_opens_at time, p_closes_at time)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
  v_code text;
  v_id   uuid;
begin
  perform public.admin_require();
  perform public.admin_check_listing(v_name, nullif(trim(p_location), ''), p_timezone, nullif(trim(p_cuisine), ''),
                                     nullif(trim(p_description), ''), nullif(trim(p_emoji), ''),
                                     p_delivery_fee_lkr, p_prep_minutes, p_opens_at, p_closes_at);
  if exists (select 1 from public.kitchens where lower(name) = lower(v_name)) then
    raise exception 'a kitchen with this name already exists' using errcode = 'unique_violation';
  end if;

  -- Codes are permanent: devices publish to MQTT topics vk/<code>/... .
  perform pg_advisory_xact_lock(hashtext('vk.kitchen_code'));
  select 'kitchen-' || lpad((coalesce(max(substring(code from '^kitchen-([0-9]+)$')::integer), 0) + 1)::text, 3, '0')
    into v_code from public.kitchens;

  insert into public.kitchens (code, name, location, timezone, cuisine, description, emoji,
                               delivery_fee_lkr, prep_minutes, opens_at, closes_at, is_public)
  values (v_code, v_name, nullif(trim(p_location), ''), p_timezone, nullif(trim(p_cuisine), ''),
          nullif(trim(p_description), ''), nullif(trim(p_emoji), ''),
          p_delivery_fee_lkr, p_prep_minutes, p_opens_at, p_closes_at, false)
  returning id into v_id;

  perform public.admin_log('kitchen.created', 'kitchen', v_id::text, v_name, jsonb_build_object('code', v_code));
  return v_id;
end;
$$;

create or replace function public.admin_update_kitchen(
  p_kitchen uuid, p_name text, p_location text, p_timezone text, p_cuisine text, p_description text,
  p_emoji text, p_delivery_fee_lkr numeric, p_prep_minutes integer, p_opens_at time, p_closes_at time)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old     public.kitchens%rowtype;
  v_new     public.kitchens%rowtype;
  v_name    text := trim(p_name);
  v_changes jsonb;
begin
  perform public.admin_require();
  select * into v_old from public.kitchens where id = p_kitchen for update;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;
  perform public.admin_check_listing(v_name, nullif(trim(p_location), ''), p_timezone, nullif(trim(p_cuisine), ''),
                                     nullif(trim(p_description), ''), nullif(trim(p_emoji), ''),
                                     p_delivery_fee_lkr, p_prep_minutes, p_opens_at, p_closes_at);
  if exists (select 1 from public.kitchens where lower(name) = lower(v_name) and id <> p_kitchen) then
    raise exception 'a kitchen with this name already exists' using errcode = 'unique_violation';
  end if;
  if v_old.is_public and (nullif(trim(p_cuisine), '') is null or nullif(trim(p_description), '') is null) then
    raise exception 'a live kitchen needs a cuisine and a description' using errcode = 'check_violation';
  end if;

  update public.kitchens
     set name = v_name, location = nullif(trim(p_location), ''), timezone = p_timezone,
         cuisine = nullif(trim(p_cuisine), ''), description = nullif(trim(p_description), ''),
         emoji = nullif(trim(p_emoji), ''), delivery_fee_lkr = p_delivery_fee_lkr,
         prep_minutes = p_prep_minutes, opens_at = p_opens_at, closes_at = p_closes_at
   where id = p_kitchen
  returning * into v_new;

  select jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value))
    into v_changes
    from jsonb_each(to_jsonb(v_new)) n
    join jsonb_each(to_jsonb(v_old)) o using (key)
   where n.value is distinct from o.value;

  if v_changes is not null then
    perform public.admin_log('kitchen.updated', 'kitchen', p_kitchen::text, v_name, v_changes);
  end if;
end;
$$;

-- The go-live checklist. Blocking items must pass before a kitchen is published.
create or replace function public.kitchen_readiness(p_kitchen uuid)
returns table (item text, label text, ok boolean, blocking boolean, detail text)
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_kitchen public.kitchens%rowtype;
  v_ops     integer;
  v_env     integer;
  v_cam     integer;
  v_silent  integer;
  v_menu    integer;
begin
  perform public.admin_require();
  select * into v_kitchen from public.kitchens where id = p_kitchen;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;

  select count(*) into v_ops
    from public.user_kitchens uk join public.profiles p on p.id = uk.user_id
   where uk.kitchen_id = p_kitchen and p.role = 'operator' and p.disabled_at is null;
  select count(*) filter (where d.type = 'env_node'),
         count(*) filter (where d.type = 'camera'),
         count(*) filter (where d.last_seen_at is null or d.last_seen_at < now() - interval '15 minutes')
    into v_env, v_cam, v_silent
    from public.devices d where d.kitchen_id = p_kitchen;
  select count(*) into v_menu from public.menu_items m where m.kitchen_id = p_kitchen and m.is_available;

  return query values
    ('listing', 'Listing details',
     coalesce(trim(v_kitchen.cuisine), '') <> '' and coalesce(trim(v_kitchen.description), '') <> '', true,
     'Cuisine and description are shown to customers.'),
    ('operator', 'Kitchen operator', v_ops > 0, true,
     case when v_ops > 0 then v_ops || ' active operator(s)' else 'Invite at least one operator to run the kitchen.' end),
    ('env_node', 'Environmental sensor', v_env > 0, true,
     case when v_env > 0 then v_env || ' registered' else 'Register the ESP32 sensor node.' end),
    ('camera', 'Hygiene camera', v_cam > 0, true,
     case when v_cam > 0 then v_cam || ' registered' else 'Register the AI camera.' end),
    ('menu', 'Menu', v_menu > 0, true,
     case when v_menu > 0 then v_menu || ' item(s) available' else 'Add at least one available menu item.' end),
    ('reporting', 'Devices reporting', v_env + v_cam > 0 and v_silent = 0, false,
     case when v_env + v_cam = 0 then 'No devices yet.'
          when v_silent = 0 then 'All devices reported in the last 15 minutes.'
          else v_silent || ' device(s) silent for over 15 minutes. The kitchen can go live, but its rating will stay pending until monitoring runs.' end);
end;
$$;

create or replace function public.admin_set_kitchen_published(p_kitchen uuid, p_published boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kitchen public.kitchens%rowtype;
  v_missing text;
begin
  perform public.admin_require();
  select * into v_kitchen from public.kitchens where id = p_kitchen for update;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;
  if v_kitchen.is_public = p_published then
    return;
  end if;

  if p_published then
    select string_agg(r.label, ', ') into v_missing
      from public.kitchen_readiness(p_kitchen) r where r.blocking and not r.ok;
    if v_missing is not null then
      raise exception 'not ready to go live: %', v_missing using errcode = 'check_violation';
    end if;
  end if;

  update public.kitchens
     set is_public = p_published,
         published_at = case when p_published then now() end
   where id = p_kitchen;
  perform public.admin_log(case when p_published then 'kitchen.published' else 'kitchen.hidden' end,
                           'kitchen', p_kitchen::text, v_kitchen.name);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Devices
-- ---------------------------------------------------------------------
create or replace function public.admin_register_device(p_kitchen uuid, p_type public.device_type, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text := trim(p_name);
  v_kitchen public.kitchens%rowtype;
  v_prefix  text := case p_type when 'env_node' then 'vk-env-' else 'vk-cam-' end;
  v_id      text;
begin
  perform public.admin_require();
  select * into v_kitchen from public.kitchens where id = p_kitchen;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;
  if v_name is null or length(v_name) not between 2 and 80 then
    raise exception 'the device name must be 2 to 80 characters' using errcode = 'check_violation';
  end if;

  -- IDs are permanent: they are the MQTT login and part of the topic.
  perform pg_advisory_xact_lock(hashtext('vk.device_id'));
  select v_prefix || lpad((coalesce(max(substring(id from '^' || v_prefix || '([0-9]+)$')::integer), 0) + 1)::text, 2, '0')
    into v_id from public.devices;

  insert into public.devices (id, kitchen_id, type, name) values (v_id, p_kitchen, p_type, v_name);
  perform public.admin_log('device.registered', 'device', v_id, v_name,
                           jsonb_build_object('kitchen', v_kitchen.code, 'type', p_type));
  return v_id;
end;
$$;

create or replace function public.admin_rename_device(p_device text, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
  v_old  text;
begin
  perform public.admin_require();
  if v_name is null or length(v_name) not between 2 and 80 then
    raise exception 'the device name must be 2 to 80 characters' using errcode = 'check_violation';
  end if;
  select name into v_old from public.devices where id = p_device for update;
  if not found then
    raise exception 'device not found' using errcode = 'no_data_found';
  end if;
  update public.devices set name = v_name where id = p_device;
  perform public.admin_log('device.renamed', 'device', p_device, v_name, jsonb_build_object('from', v_old));
end;
$$;

create or replace function public.admin_remove_device(p_device text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device  public.devices%rowtype;
  v_kitchen public.kitchens%rowtype;
begin
  perform public.admin_require();
  select * into v_device from public.devices where id = p_device for update;
  if not found then
    raise exception 'device not found' using errcode = 'no_data_found';
  end if;
  select * into v_kitchen from public.kitchens where id = v_device.kitchen_id;
  if v_kitchen.is_public and not exists (
       select 1 from public.devices where kitchen_id = v_device.kitchen_id and type = v_device.type and id <> p_device) then
    raise exception 'a live kitchen needs this device; hide the kitchen first or register a replacement'
      using errcode = 'check_violation';
  end if;

  begin
    delete from public.devices where id = p_device;
  exception when foreign_key_violation then
    raise exception 'this device has recorded evidence, which must be kept; it cannot be removed'
      using errcode = 'check_violation';
  end;
  perform public.admin_log('device.removed', 'device', p_device, v_device.name,
                           jsonb_build_object('kitchen', v_kitchen.code));
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Staff accounts
--    Logins are created and banned by the web server through Supabase Auth
--    (secret key, server only); roles and kitchen access are set here.
-- ---------------------------------------------------------------------
create or replace function public.admin_list_accounts(p_user uuid default null)
returns table (
  user_id uuid, email text, full_name text, role public.user_role, disabled_at timestamptz,
  invited_at timestamptz, email_confirmed_at timestamptz, last_sign_in_at timestamptz,
  created_at timestamptz, kitchens jsonb)
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select p.id, u.email::text, p.full_name, p.role, p.disabled_at,
         u.invited_at, u.email_confirmed_at, u.last_sign_in_at, p.created_at,
         coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'code', k.code, 'name', k.name) order by k.code)
                     from public.user_kitchens uk join public.kitchens k on k.id = uk.kitchen_id
                    where uk.user_id = p.id), '[]'::jsonb)
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.role in ('operator', 'phi', 'admin')
     and (p_user is null or p.id = p_user)
   order by p.role, lower(coalesce(p.full_name, u.email::text));
end;
$$;

-- Finishes an invitation: the web server has just created the login (which
-- starts as a customer, like every new account). Only such a brand-new,
-- never-used account can become staff here.
create or replace function public.admin_onboard_staff(
  p_user uuid, p_role public.user_role, p_kitchen uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_user    auth.users%rowtype;
  v_kitchen public.kitchens%rowtype;
begin
  perform public.admin_require();
  if p_role not in ('operator', 'phi', 'admin') then
    raise exception 'choose a staff role' using errcode = 'check_violation';
  end if;
  select * into v_profile from public.profiles where id = p_user for update;
  select * into v_user from auth.users where id = p_user;
  if v_profile.id is null or v_user.id is null then
    raise exception 'account not found' using errcode = 'no_data_found';
  end if;
  if v_profile.role <> 'customer' or v_user.last_sign_in_at is not null or v_user.email_confirmed_at is not null
     or v_user.created_at < now() - interval '15 minutes'
     or exists (select 1 from public.orders where customer_id = p_user) then
    raise exception 'only a newly invited account can be set up as staff' using errcode = 'check_violation';
  end if;
  if p_role <> 'admin' then
    select * into v_kitchen from public.kitchens where id = p_kitchen;
    if not found then
      raise exception 'choose the kitchen this person works for' using errcode = 'check_violation';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user;
  if p_role <> 'admin' then
    insert into public.user_kitchens (user_id, kitchen_id) values (p_user, p_kitchen) on conflict do nothing;
  end if;
  perform public.admin_log('account.invited', 'account', p_user::text, v_user.email::text,
                           jsonb_build_object('role', p_role, 'kitchen', v_kitchen.code));
end;
$$;

create or replace function public.admin_set_staff_role(p_user uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_left    text;
begin
  perform public.admin_require();
  if p_user = auth.uid() then
    raise exception 'you cannot change your own role' using errcode = 'insufficient_privilege';
  end if;
  if p_role not in ('operator', 'phi', 'admin') then
    raise exception 'choose a staff role' using errcode = 'check_violation';
  end if;
  select * into v_profile from public.profiles where id = p_user for update;
  if not found or v_profile.role not in ('operator', 'phi', 'admin') then
    raise exception 'staff account not found' using errcode = 'no_data_found';
  end if;
  if v_profile.role = p_role then
    return;
  end if;
  if v_profile.role = 'operator' and v_profile.disabled_at is null then
    v_left := public.admin_kitchens_losing_last_operator(p_user);
    if v_left is not null then
      raise exception 'live kitchen(s) would have no operator: %; add another operator first', v_left
        using errcode = 'check_violation';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user;
  perform public.admin_log('account.role_changed', 'account', p_user::text,
                           (select u.email::text from auth.users u where u.id = p_user),
                           jsonb_build_object('from', v_profile.role, 'to', p_role));
end;
$$;

create or replace function public.admin_link_staff(p_user uuid, p_kitchen uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role    public.user_role;
  v_kitchen public.kitchens%rowtype;
begin
  perform public.admin_require();
  select role into v_role from public.profiles where id = p_user;
  if v_role is null or v_role not in ('operator', 'phi') then
    raise exception 'only operators and inspectors are given kitchen access (administrators see every kitchen)'
      using errcode = 'check_violation';
  end if;
  select * into v_kitchen from public.kitchens where id = p_kitchen;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;
  insert into public.user_kitchens (user_id, kitchen_id) values (p_user, p_kitchen) on conflict do nothing;
  if found then
    perform public.admin_log('account.kitchen_added', 'account', p_user::text,
                             (select u.email::text from auth.users u where u.id = p_user),
                             jsonb_build_object('kitchen', v_kitchen.code));
  end if;
end;
$$;

create or replace function public.admin_unlink_staff(p_user uuid, p_kitchen uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kitchen public.kitchens%rowtype;
  v_role    public.user_role;
begin
  perform public.admin_require();
  select * into v_kitchen from public.kitchens where id = p_kitchen;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;
  select role into v_role from public.profiles where id = p_user;
  if v_role = 'operator' and public.admin_kitchens_losing_last_operator(p_user, p_kitchen) is not null then
    raise exception 'a live kitchen needs at least one operator; add another operator or hide the kitchen first'
      using errcode = 'check_violation';
  end if;
  delete from public.user_kitchens where user_id = p_user and kitchen_id = p_kitchen;
  if found then
    perform public.admin_log('account.kitchen_removed', 'account', p_user::text,
                             (select u.email::text from auth.users u where u.id = p_user),
                             jsonb_build_object('kitchen', v_kitchen.code));
  end if;
end;
$$;

create or replace function public.admin_set_account_disabled(p_user uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_left    text;
begin
  perform public.admin_require();
  if p_user = auth.uid() then
    raise exception 'you cannot disable your own account' using errcode = 'insufficient_privilege';
  end if;
  select * into v_profile from public.profiles where id = p_user for update;
  if not found or v_profile.role not in ('operator', 'phi', 'admin') then
    raise exception 'staff account not found' using errcode = 'no_data_found';
  end if;
  if (v_profile.disabled_at is not null) = p_disabled then
    return;
  end if;
  if p_disabled and v_profile.role = 'operator' then
    v_left := public.admin_kitchens_losing_last_operator(p_user);
    if v_left is not null then
      raise exception 'live kitchen(s) would have no operator: %; add another operator first', v_left
        using errcode = 'check_violation';
    end if;
  end if;

  update public.profiles set disabled_at = case when p_disabled then now() end where id = p_user;
  perform public.admin_log(case when p_disabled then 'account.disabled' else 'account.enabled' end,
                           'account', p_user::text, (select u.email::text from auth.users u where u.id = p_user));
end;
$$;

-- Records actions the web server takes in Supabase Auth (it holds the
-- secret key), so they appear in the same activity log.
create or replace function public.admin_note_account_event(p_user uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  if p_action not in ('account.setup_link_issued', 'account.reset_link_issued', 'account.login_ban_failed') then
    raise exception 'unknown account event' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and role in ('operator', 'phi', 'admin')) then
    raise exception 'staff account not found' using errcode = 'no_data_found';
  end if;
  perform public.admin_log(p_action, 'account', p_user::text,
                           (select u.email::text from auth.users u where u.id = p_user));
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Privileges: helpers are internal; the admin API is for signed-in
--    users (each function checks for an active admin itself).
-- ---------------------------------------------------------------------
revoke execute on function public.admin_require() from public, anon, authenticated;
revoke execute on function public.admin_log(text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.admin_check_listing(text, text, text, text, text, text, numeric, integer, time, time)
  from public, anon, authenticated;
revoke execute on function public.admin_kitchens_losing_last_operator(uuid, uuid) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_create_kitchen(text, text, text, text, text, text, numeric, integer, time, time)',
    'public.admin_update_kitchen(uuid, text, text, text, text, text, text, numeric, integer, time, time)',
    'public.kitchen_readiness(uuid)',
    'public.admin_set_kitchen_published(uuid, boolean)',
    'public.admin_register_device(uuid, public.device_type, text)',
    'public.admin_rename_device(text, text)',
    'public.admin_remove_device(text)',
    'public.admin_list_accounts(uuid)',
    'public.admin_onboard_staff(uuid, public.user_role, uuid)',
    'public.admin_set_staff_role(uuid, public.user_role)',
    'public.admin_link_staff(uuid, uuid)',
    'public.admin_unlink_staff(uuid, uuid)',
    'public.admin_set_account_disabled(uuid, boolean)',
    'public.admin_note_account_event(uuid, text)']
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
