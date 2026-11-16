-- =====================================================================
-- Customer features: saved addresses, favourite kitchens, and the
-- customer's name on each order (for the kitchen's Orders page).
--
-- Privacy: addresses and favourites are visible only to their owner.
-- Kitchens never read customer profiles; an order carries a snapshot of
-- exactly what the kitchen needs (name, phone, delivery address).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Saved delivery addresses
-- ---------------------------------------------------------------------
create table public.customer_addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label        text not null check (length(trim(label)) between 1 and 30),
  address_line text not null check (length(trim(address_line)) between 5 and 300),
  instructions text check (length(instructions) <= 200),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index customer_addresses_customer_idx on public.customer_addresses (customer_id, created_at);
-- At most one default address per customer.
create unique index customer_addresses_one_default_idx on public.customer_addresses (customer_id) where is_default;

alter table public.customer_addresses enable row level security;
create policy customer_addresses_owner_select on public.customer_addresses
  for select to authenticated using (customer_id = (select auth.uid()));
create policy customer_addresses_owner_insert on public.customer_addresses
  for insert to authenticated with check (customer_id = (select auth.uid()));
create policy customer_addresses_owner_update on public.customer_addresses
  for update to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy customer_addresses_owner_delete on public.customer_addresses
  for delete to authenticated using (customer_id = (select auth.uid()));
revoke all on public.customer_addresses from anon;

-- A sensible limit, so the table cannot be abused for storage.
create or replace function public.customer_addresses_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.customer_addresses where customer_id = new.customer_id) >= 10 then
    raise exception 'you can save up to 10 addresses' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger customer_addresses_limit_trg
  before insert on public.customer_addresses
  for each row execute function public.customer_addresses_limit();

-- Make one address the default (clears the previous default atomically).
create or replace function public.set_default_address(p_address uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.customer_addresses set is_default = false
   where customer_id = auth.uid() and is_default and id <> p_address;
  update public.customer_addresses set is_default = true
   where customer_id = auth.uid() and id = p_address;
  if not found then
    raise exception 'address not found' using errcode = 'no_data_found';
  end if;
end;
$$;
revoke execute on function public.set_default_address(uuid) from public, anon;
grant execute on function public.set_default_address(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Favourite kitchens
-- ---------------------------------------------------------------------
create table public.favourite_kitchens (
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kitchen_id  uuid not null references public.kitchens (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (customer_id, kitchen_id)
);
alter table public.favourite_kitchens enable row level security;
create policy favourite_kitchens_owner_select on public.favourite_kitchens
  for select to authenticated using (customer_id = (select auth.uid()));
create policy favourite_kitchens_owner_insert on public.favourite_kitchens
  for insert to authenticated
  with check (customer_id = (select auth.uid()) and public.is_public_kitchen(kitchen_id));
create policy favourite_kitchens_owner_delete on public.favourite_kitchens
  for delete to authenticated using (customer_id = (select auth.uid()));
revoke all on public.favourite_kitchens from anon;
revoke update on public.favourite_kitchens from authenticated;

-- ---------------------------------------------------------------------
-- 3. Customer name on orders (snapshot for the kitchen)
-- ---------------------------------------------------------------------
alter table public.orders add column customer_name text check (length(customer_name) <= 100);

create or replace function public.orders_customer_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name into new.customer_name from public.profiles p where p.id = new.customer_id;
  return new;
end;
$$;
create trigger orders_customer_name_trg
  before insert on public.orders
  for each row execute function public.orders_customer_name();
