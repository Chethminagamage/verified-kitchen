-- =====================================================================
-- Consumer marketplace: customer accounts, kitchen listings with a public
-- hygiene rating, menus and orders (mobile app).
--
-- Security model
--   * Every app sign-up is a CUSTOMER. Operators/PHIs/admins are promoted by
--     an admin; nobody can change their own role.
--   * Customers never read operational data (live scores, violations,
--     devices, evidence). They read: the marketplace views (safe kitchen info
--     + the public 7-day rating), menus, and only their own orders.
--   * Orders cannot be written directly. place_order() validates everything
--     on the server: prices come from the database, never from the phone.
--     Status changes go through functions with fixed transitions.
--   * The public rating is computed by the edge service (the only place that
--     scores) and stored in public_ratings.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Customer accounts
-- ---------------------------------------------------------------------
alter table public.profiles
  alter column role set default 'customer',
  add column phone text check (phone ~ '^\+?[0-9 ]{9,16}$');

-- New sign-ups: name and phone from the sign-up form (validated); role is
-- always the default ('customer'), whatever the client sends.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 100),
    case when v_phone ~ '^\+?[0-9 ]{9,16}$' then v_phone end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Users may edit their own name and phone; only an admin (or the database
-- owner, e.g. the SQL editor) may change a role.
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'profile id cannot change' using errcode = 'insufficient_privilege';
  end if;
  if new.role is distinct from old.role
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'only an admin can change roles' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------
-- 2. Kitchen listing details (shown in the app)
-- ---------------------------------------------------------------------
alter table public.kitchens
  add column cuisine          text,
  add column description      text check (length(description) <= 500),
  add column emoji            text check (length(emoji) <= 8),
  add column delivery_fee_lkr numeric(8,2) not null default 250 check (delivery_fee_lkr >= 0),
  add column prep_minutes     integer not null default 30 check (prep_minutes between 5 and 180),
  add column opens_at         time not null default '08:00',
  add column closes_at        time not null default '22:00';

-- Operators maintain their own listing (in addition to name and location).
grant update (cuisine, description, emoji, delivery_fee_lkr, prep_minutes, opens_at, closes_at)
  on public.kitchens to authenticated;

-- Open at a given moment, in the kitchen's own time zone. Pure (no table
-- access), so it can be used inside views for any caller.
-- opens = closes means open all day; closes < opens means open overnight.
create or replace function public.is_open_at(
  p_opens time, p_closes time, p_timezone text, p_at timestamptz)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_opens = p_closes then true
    when p_opens < p_closes then (p_at at time zone p_timezone)::time >= p_opens
                             and (p_at at time zone p_timezone)::time <  p_closes
    else (p_at at time zone p_timezone)::time >= p_opens
      or (p_at at time zone p_timezone)::time <  p_closes
  end;
$$;

-- ---------------------------------------------------------------------
-- 3. Public hygiene rating (written by the edge service only)
--    Stable 7-day rating for consumers, never the live 5-minute score.
-- ---------------------------------------------------------------------
create table public.public_ratings (
  kitchen_id          uuid primary key references public.kitchens (id) on delete cascade,
  status              text not null check (status in ('verified', 'incomplete', 'pending')),
  rating              numeric(5,2) check (rating between 0 and 100),
  grade               text check (grade in ('A', 'B', 'C', 'D')),
  personal_score      numeric(5,2) check (personal_score between 0 and 100),
  food_prep_score     numeric(5,2) check (food_prep_score between 0 and 100),
  environmental_score numeric(5,2) check (environmental_score between 0 and 100),
  coverage            numeric(5,4) not null check (coverage between 0 and 1),
  monitored_hours     numeric(7,2) not null default 0,
  expected_hours      numeric(7,2) not null default 0,
  last_score_at       timestamptz,
  computed_at         timestamptz not null default now(),
  config_version      text not null,
  details             jsonb not null default '{}'::jsonb,
  -- A grade is only published together with a rating.
  check (grade is null or rating is not null)
);
alter table public.public_ratings enable row level security;
create policy public_ratings_select on public.public_ratings
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
revoke insert, update, delete on public.public_ratings from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Menus
-- ---------------------------------------------------------------------
create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  kitchen_id    uuid not null references public.kitchens (id) on delete cascade,
  name          text not null check (length(name) between 1 and 80),
  description   text check (length(description) <= 300),
  category      text check (length(category) <= 40),
  price_lkr     numeric(10,2) not null check (price_lkr > 0 and price_lkr < 100000),
  emoji         text check (length(emoji) <= 8),
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (kitchen_id, name)
);
create index menu_items_kitchen_idx on public.menu_items (kitchen_id, sort_order);
alter table public.menu_items enable row level security;

-- Customers cannot read the kitchens table, so "is this kitchen listed?" is
-- answered by a definer function that reveals nothing else.
create or replace function public.is_public_kitchen(p_kitchen uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.kitchens k where k.id = p_kitchen and k.is_public);
$$;

create policy menu_items_select on public.menu_items
  for select to authenticated
  using (public.is_public_kitchen(kitchen_id) or public.has_kitchen_access(kitchen_id));
create policy menu_items_manage_insert on public.menu_items
  for insert to authenticated
  with check (public.has_kitchen_access(kitchen_id) and public.current_user_role() in ('operator', 'admin'));
create policy menu_items_manage_update on public.menu_items
  for update to authenticated
  using (public.has_kitchen_access(kitchen_id) and public.current_user_role() in ('operator', 'admin'))
  with check (public.has_kitchen_access(kitchen_id) and public.current_user_role() in ('operator', 'admin'));
create policy menu_items_manage_delete on public.menu_items
  for delete to authenticated
  using (public.has_kitchen_access(kitchen_id) and public.current_user_role() in ('operator', 'admin'));
revoke all on public.menu_items from anon;

-- ---------------------------------------------------------------------
-- 5. Orders (cash on delivery)
-- ---------------------------------------------------------------------
create type public.order_status as enum
  ('placed', 'accepted', 'preparing', 'on_the_way', 'delivered', 'cancelled');

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.profiles (id) on delete restrict,
  kitchen_id        uuid not null references public.kitchens (id) on delete restrict,
  status            public.order_status not null default 'placed',
  delivery_address  text not null check (length(delivery_address) between 5 and 300),
  contact_phone     text not null check (contact_phone ~ '^\+?[0-9 ]{9,16}$'),
  note              text check (length(note) <= 300),
  payment_method    text not null default 'cash' check (payment_method = 'cash'),
  subtotal_lkr      numeric(10,2) not null default 0 check (subtotal_lkr >= 0),
  delivery_fee_lkr  numeric(8,2) not null check (delivery_fee_lkr >= 0),
  total_lkr         numeric(10,2) not null default 0 check (total_lkr >= 0),
  -- What the customer saw when ordering (the public rating changes over time).
  hygiene_grade_at_order  text check (hygiene_grade_at_order in ('A', 'B', 'C', 'D')),
  hygiene_status_at_order text not null default 'not_monitored',
  placed_at         timestamptz not null default now(),
  accepted_at       timestamptz,
  preparing_at      timestamptz,
  on_the_way_at     timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  cancelled_by      text check (cancelled_by in ('customer', 'kitchen')),
  updated_at        timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id, placed_at desc);
create index orders_kitchen_idx on public.orders (kitchen_id, placed_at desc);

create table public.order_items (
  order_id        uuid not null references public.orders (id) on delete cascade,
  menu_item_id    uuid references public.menu_items (id) on delete set null,
  name            text not null,             -- snapshot: the menu may change later
  unit_price_lkr  numeric(10,2) not null check (unit_price_lkr > 0),
  quantity        integer not null check (quantity between 1 and 20),
  line_total_lkr  numeric(10,2) generated always as (unit_price_lkr * quantity) stored,
  primary key (order_id, name)
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy orders_select on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.has_kitchen_access(kitchen_id));
create policy order_items_select on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id
                    and (o.customer_id = (select auth.uid()) or public.has_kitchen_access(o.kitchen_id))));

-- No direct writes: only the functions below change orders.
revoke all on public.orders, public.order_items from anon;
revoke insert, update, delete on public.orders, public.order_items from authenticated;

-- Place an order. Returns the order id.
--   p_items: [{"menu_item_id": "<uuid>", "quantity": 2}, ...]
create or replace function public.place_order(
  p_kitchen          uuid,
  p_items            jsonb,
  p_delivery_address text,
  p_contact_phone    text,
  p_note             text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_kitchen public.kitchens%rowtype;
  v_rating  public.public_ratings%rowtype;
  v_order   uuid;
  v_wanted  integer;
  v_found   integer;
  v_address text := trim(p_delivery_address);
  v_phone   text := trim(p_contact_phone);
  v_note    text := nullif(trim(p_note), '');
begin
  if v_uid is null then
    raise exception 'sign in to place an order' using errcode = 'insufficient_privilege';
  end if;
  if public.current_user_role() is distinct from 'customer' then
    raise exception 'only customer accounts can place orders' using errcode = 'insufficient_privilege';
  end if;

  select * into v_kitchen from public.kitchens where id = p_kitchen and is_public;
  if not found then
    raise exception 'kitchen not found' using errcode = 'no_data_found';
  end if;
  if not public.is_open_at(v_kitchen.opens_at, v_kitchen.closes_at, v_kitchen.timezone, now()) then
    raise exception 'this kitchen is closed now' using errcode = 'check_violation';
  end if;

  if v_address is null or length(v_address) not between 5 and 300 then
    raise exception 'enter a delivery address' using errcode = 'check_violation';
  end if;
  if v_phone is null or v_phone !~ '^\+?[0-9 ]{9,16}$' then
    raise exception 'enter a valid phone number' using errcode = 'check_violation';
  end if;
  if length(v_note) > 300 then
    raise exception 'the note is too long' using errcode = 'check_violation';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 30
     or exists (select 1 from jsonb_array_elements(p_items) e
                 where jsonb_typeof(e) <> 'object'
                    or coalesce(e ->> 'menu_item_id', '') !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
                    or coalesce(e ->> 'quantity', '') !~ '^[0-9]{1,2}$') then
    raise exception 'the cart is not valid' using errcode = 'check_violation';
  end if;

  -- Same item twice in the request: quantities are added up.
  create temporary table if not exists pg_temp.order_request (menu_item_id uuid primary key, quantity integer) on commit drop;
  truncate pg_temp.order_request;
  insert into pg_temp.order_request
  select (e ->> 'menu_item_id')::uuid, sum((e ->> 'quantity')::integer)
    from jsonb_array_elements(p_items) e
   group by 1;

  if exists (select 1 from pg_temp.order_request where quantity not between 1 and 20) then
    raise exception 'quantities must be between 1 and 20' using errcode = 'check_violation';
  end if;

  select count(*) into v_wanted from pg_temp.order_request;
  select count(*) into v_found
    from pg_temp.order_request r
    join public.menu_items m on m.id = r.menu_item_id and m.kitchen_id = p_kitchen and m.is_available;
  if v_found <> v_wanted then
    raise exception 'an item is no longer available; refresh the menu' using errcode = 'check_violation';
  end if;

  select * into v_rating from public.public_ratings where kitchen_id = p_kitchen;

  insert into public.orders (customer_id, kitchen_id, delivery_address, contact_phone, note,
                             delivery_fee_lkr, hygiene_grade_at_order, hygiene_status_at_order)
  values (v_uid, p_kitchen, v_address, v_phone, v_note, v_kitchen.delivery_fee_lkr,
          v_rating.grade, coalesce(v_rating.status, 'not_monitored'))
  returning id into v_order;

  insert into public.order_items (order_id, menu_item_id, name, unit_price_lkr, quantity)
  select v_order, m.id, m.name, m.price_lkr, r.quantity
    from pg_temp.order_request r
    join public.menu_items m on m.id = r.menu_item_id;

  update public.orders o
     set subtotal_lkr = s.subtotal,
         total_lkr    = s.subtotal + o.delivery_fee_lkr
    from (select sum(line_total_lkr) as subtotal from public.order_items where order_id = v_order) s
   where o.id = v_order;

  return v_order;
end;
$$;

-- Customer: cancel own order while the kitchen has not accepted it yet.
create or replace function public.cancel_order(p_order uuid)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  update public.orders
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer', updated_at = now()
   where id = p_order and customer_id = auth.uid() and status = 'placed'
  returning status into v_status;
  if not found then
    raise exception 'this order can no longer be cancelled' using errcode = 'check_violation';
  end if;
  return v_status;
end;
$$;

-- Kitchen (operator/admin of that kitchen): move an order forward.
--   placed -> accepted | cancelled; accepted -> preparing | cancelled;
--   preparing -> on_the_way; on_the_way -> delivered.
create or replace function public.update_order_status(p_order uuid, p_status public.order_status)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found
     or not public.has_kitchen_access(v_order.kitchen_id)
     or public.current_user_role() not in ('operator', 'admin') then
    raise exception 'order not found' using errcode = 'insufficient_privilege';
  end if;

  if not ((v_order.status, p_status) in (
      ('placed'::public.order_status,    'accepted'::public.order_status),
      ('placed',     'cancelled'),
      ('accepted',   'preparing'),
      ('accepted',   'cancelled'),
      ('preparing',  'on_the_way'),
      ('on_the_way', 'delivered'))) then
    raise exception 'cannot change an order from % to %', v_order.status, p_status using errcode = 'check_violation';
  end if;

  update public.orders
     set status        = p_status,
         accepted_at   = case when p_status = 'accepted'   then now() else accepted_at end,
         preparing_at  = case when p_status = 'preparing'  then now() else preparing_at end,
         on_the_way_at = case when p_status = 'on_the_way' then now() else on_the_way_at end,
         delivered_at  = case when p_status = 'delivered'  then now() else delivered_at end,
         cancelled_at  = case when p_status = 'cancelled'  then now() else cancelled_at end,
         cancelled_by  = case when p_status = 'cancelled'  then 'kitchen' else cancelled_by end,
         updated_at    = now()
   where id = p_order;
  return p_status;
end;
$$;

revoke execute on function public.place_order(uuid, jsonb, text, text, text) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

-- ---------------------------------------------------------------------
-- 6. What the app reads (signed-in users only)
--    Views run with the owner's rights, so customers see exactly these
--    columns of public kitchens and nothing else.
-- ---------------------------------------------------------------------
create view public.marketplace_kitchens as
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
       coalesce(r.last_score_at > now() - interval '10 minutes', false) as monitored_now
  from public.kitchens k
  left join public.public_ratings r on r.kitchen_id = k.id
 where k.is_public;

-- Daily hygiene averages of the last 7 days (trend chart), public kitchens only.
create view public.marketplace_rating_history as
select h.kitchen_id,
       (h.computed_at at time zone k.timezone)::date as day,
       round(avg(h.overall_score), 1)                as overall_score,
       round(avg(h.personal_score), 1)               as personal_score,
       round(avg(h.food_prep_score), 1)              as food_prep_score,
       round(avg(h.environmental_score), 1)          as environmental_score,
       count(*)                                      as samples
  from public.hygiene_scores h
  join public.kitchens k on k.id = h.kitchen_id and k.is_public
 where h.computed_at > now() - interval '7 days'
 group by h.kitchen_id, (h.computed_at at time zone k.timezone)::date;

revoke all on public.marketplace_kitchens, public.marketplace_rating_history from anon;
grant select on public.marketplace_kitchens, public.marketplace_rating_history to authenticated;

-- ---------------------------------------------------------------------
-- 7. Live order status in the app and on the kitchen's Orders page
--    (Realtime applies the RLS policies above).
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;
