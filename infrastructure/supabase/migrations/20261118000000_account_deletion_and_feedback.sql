-- =====================================================================
-- Customer self-service: delete my account, and order feedback.
--
-- * delete_my_account(): a customer can erase their account. Their login,
--   profile, saved addresses, favourites and feedback are deleted; their
--   past orders stay for the kitchen's records but no longer point to them
--   (customer_id becomes NULL and the name is removed).
-- * order_feedback: after delivery, the customer may rate the order and/or
--   report a problem. It is private: only the customer and that kitchen's
--   staff can read it. It is never shown publicly and does not change the
--   hygiene grade (the grade comes only from verified evidence).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Orders survive a deleted customer
-- ---------------------------------------------------------------------
alter table public.orders alter column customer_id drop not null;
alter table public.orders drop constraint orders_customer_id_fkey;
alter table public.orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------
-- 2. Order feedback (private)
-- ---------------------------------------------------------------------
create table public.order_feedback (
  order_id     uuid primary key references public.orders (id) on delete cascade,
  customer_id  uuid references public.profiles (id) on delete set null,
  kitchen_id   uuid not null references public.kitchens (id) on delete cascade,
  rating       smallint check (rating between 1 and 5),
  problem      text check (problem in ('late', 'cold', 'wrong_items', 'missing_items', 'hygiene_concern', 'other')),
  comment      text check (length(comment) <= 500),
  created_at   timestamptz not null default now(),
  check (rating is not null or problem is not null)
);
create index order_feedback_kitchen_idx on public.order_feedback (kitchen_id, created_at desc);
alter table public.order_feedback enable row level security;

create policy order_feedback_select on public.order_feedback
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.has_kitchen_access(kitchen_id));
revoke all on public.order_feedback from anon;
revoke insert, update, delete on public.order_feedback from authenticated;

-- Submit feedback for one of your own delivered orders (once).
create or replace function public.submit_order_feedback(
  p_order   uuid,
  p_rating  smallint default null,
  p_problem text default null,
  p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order and customer_id = auth.uid();
  if not found then
    raise exception 'order not found' using errcode = 'no_data_found';
  end if;
  if v_order.status <> 'delivered' then
    raise exception 'you can give feedback once the order is delivered' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.order_feedback where order_id = p_order) then
    raise exception 'you have already given feedback for this order' using errcode = 'check_violation';
  end if;
  insert into public.order_feedback (order_id, customer_id, kitchen_id, rating, problem, comment)
  values (p_order, auth.uid(), v_order.kitchen_id, p_rating, p_problem, nullif(trim(p_comment), ''));
end;
$$;
revoke execute on function public.submit_order_feedback(uuid, smallint, text, text) from public, anon;
grant execute on function public.submit_order_feedback(uuid, smallint, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Delete my account (customers only; staff accounts are managed by an admin)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if public.current_user_role() is distinct from 'customer' then
    raise exception 'staff accounts are removed by an administrator' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.orders
              where customer_id = v_uid and status not in ('delivered', 'cancelled')) then
    raise exception 'you have an order in progress; delete your account after it is delivered or cancelled'
      using errcode = 'check_violation';
  end if;

  -- Past orders stay for the kitchen, without the customer's identity.
  update public.orders set customer_name = null where customer_id = v_uid;
  -- Removing the login cascades to the profile, addresses and favourites;
  -- orders and feedback stay for the kitchen with customer_id set to NULL.
  delete from auth.users where id = v_uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
