-- =====================================================================
-- Hygiene alerts for customers.
--
--   1. A kitchen they use changes grade            (grade_changed)
--   2. ...while they have an order in progress     (order_hygiene_changed)
--   3. A kitchen they use changes verification     (verification_changed)
--   4. A weekly summary of their favourites        (weekly_summary)
--
-- "A kitchen they use" = a favourite, or ordered from in the last 30 days.
--
-- Built only on the PUBLIC rating (grade and verification status): never on
-- individual violations, staff or camera data, the same rule as the app.
-- Every alert lands in the customer's inbox (customer_notifications); a
-- database webhook then sends it to their phone (Edge Function + Firebase
-- Cloud Messaging). The inbox works even where push does not (iPhone).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The customer's choices (defaults: everything on)
-- ---------------------------------------------------------------------
create table public.notification_settings (
  user_id         uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  hygiene_alerts  boolean not null default true,   -- alerts 1-3
  weekly_summary  boolean not null default true,   -- alert 4
  updated_at      timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
create policy notification_settings_own_select on public.notification_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy notification_settings_own_insert on public.notification_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy notification_settings_own_update on public.notification_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.notification_settings from anon;

-- ---------------------------------------------------------------------
-- 2. Phones to push to (one Firebase token per app install)
-- ---------------------------------------------------------------------
create table public.push_tokens (
  token       text primary key check (length(token) between 20 and 4096),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  platform    text not null check (platform in ('android', 'ios')),
  updated_at  timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy push_tokens_own_select on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_tokens from anon;
revoke insert, update, delete on public.push_tokens from authenticated;

-- A token belongs to whoever signed in on that phone last (a shared phone
-- must not keep notifying the previous person), so registering moves it.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

-- Called on sign-out. Only the owner can remove their token.
create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. The inbox
-- ---------------------------------------------------------------------
create type public.notification_kind as enum
  ('grade_changed', 'order_hygiene_changed', 'verification_changed', 'weekly_summary');

create table public.customer_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        public.notification_kind not null,
  title       text not null check (length(title) between 1 and 120),
  body        text not null check (length(body) between 1 and 400),
  kitchen_id  uuid references public.kitchens (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete cascade,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  pushed_at   timestamptz            -- set by the push sender
);
create index customer_notifications_user_idx on public.customer_notifications (user_id, created_at desc);
alter table public.customer_notifications enable row level security;
create policy customer_notifications_own_select on public.customer_notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy customer_notifications_own_update on public.customer_notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.customer_notifications from anon;
revoke insert, delete, update on public.customer_notifications from authenticated;
grant update (read_at) on public.customer_notifications to authenticated;   -- "mark as read" only

-- Mark everything read in one call.
create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.customer_notifications set read_at = now()
   where user_id = auth.uid() and read_at is null;
$$;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

alter publication supabase_realtime add table public.customer_notifications;

-- ---------------------------------------------------------------------
-- 4. Detecting a change worth telling (at most one alert per kitchen per day)
-- ---------------------------------------------------------------------
create table public.rating_alert_log (
  kitchen_id  uuid not null references public.kitchens (id) on delete cascade,
  alert_day   date not null,
  primary key (kitchen_id, alert_day)
);
alter table public.rating_alert_log enable row level security;   -- no policies: internal only
revoke all on public.rating_alert_log from anon, authenticated;

-- A = 1 ... D = 4 (smaller is better).
create or replace function public.grade_rank(p_grade text)
returns integer
language sql
immutable
set search_path = ''
as $$ select array_position(array['A', 'B', 'C', 'D'], p_grade) $$;

/*
 * The message for one rating change, or null when it is not worth telling.
 * Pure (no table access), so the wording is unit-tested in the assertions.
 * p_active_order: the reader has an order in progress at this kitchen
 * (p_order_status = its status).
 */
create or replace function public.rating_change_message(
  p_kitchen text,
  p_old_status text, p_old_grade text,
  p_new_status text, p_new_grade text,
  p_active_order boolean default false,
  p_order_status public.order_status default null
)
returns table (kind public.notification_kind, title text, body text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_worse boolean;
begin
  -- 1-2. The grade letter changed.
  if p_old_grade is not null and p_new_grade is not null and p_old_grade <> p_new_grade then
    v_worse := public.grade_rank(p_new_grade) > public.grade_rank(p_old_grade);
    if p_active_order and v_worse then
      return query select 'order_hygiene_changed'::public.notification_kind,
        format('Hygiene change at %s', p_kitchen),
        format('Since you ordered, %s''s hygiene grade dropped from %s to %s.', p_kitchen, p_old_grade, p_new_grade)
          || case when p_order_status = 'placed'
                  then ' You can still cancel until the kitchen accepts your order.' else '' end;
    elsif v_worse then
      return query select 'grade_changed'::public.notification_kind,
        format('Hygiene grade dropped: %s', p_kitchen),
        format('%s went from grade %s to %s over the past week.', p_kitchen, p_old_grade, p_new_grade);
    else
      return query select 'grade_changed'::public.notification_kind,
        format('Hygiene improved: %s', p_kitchen),
        format('%s is now grade %s (was %s).', p_kitchen, p_new_grade, p_old_grade);
    end if;
    return;
  end if;

  -- 3. How reliable the grade is changed.
  if p_new_status is distinct from p_old_status or (p_old_grade is null) <> (p_new_grade is null) then
    if p_new_status = 'verified' and p_new_grade is not null then
      return query select 'verification_changed'::public.notification_kind,
        format('%s is now Verified', p_kitchen),
        format('%s is monitored through most of its opening hours. Hygiene grade %s.', p_kitchen, p_new_grade);
    elsif p_old_status = 'verified' and p_new_status = 'incomplete' then
      return query select
        case when p_active_order then 'order_hygiene_changed' else 'verification_changed' end::public.notification_kind,
        format('%s is no longer fully monitored', p_kitchen),
        case when p_new_grade is null
             then format('%s does not have enough monitoring for a grade right now.', p_kitchen)
             else format('%s''s grade is limited to %s until monitoring is back.', p_kitchen, p_new_grade) end;
    elsif p_old_grade is not null and p_new_grade is null then
      return query select 'verification_changed'::public.notification_kind,
        format('%s has no hygiene grade right now', p_kitchen),
        format('%s does not have enough monitoring for a grade at the moment.', p_kitchen);
    elsif p_old_grade is null and p_new_grade is not null then
      return query select 'verification_changed'::public.notification_kind,
        format('%s now has a hygiene grade', p_kitchen),
        format('%s is rated grade %s after enough monitoring.', p_kitchen, p_new_grade);
    end if;
  end if;
end;
$$;

-- Runs after the scoring service updates a public rating.
create or replace function public.notify_rating_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kitchen public.kitchens%rowtype;
  v_day date;
begin
  if new.status = old.status and new.grade is not distinct from old.grade then
    return new;  -- the usual case: the score moved within the same grade
  end if;
  select * into v_kitchen from public.kitchens where id = new.kitchen_id;
  if not found or not v_kitchen.is_public then
    return new;
  end if;
  if not exists (select 1 from public.rating_change_message(v_kitchen.name, old.status, old.grade, new.status, new.grade)) then
    return new;
  end if;

  -- At most one alert per kitchen per day, so a rating on a grade boundary cannot spam.
  v_day := (now() at time zone v_kitchen.timezone)::date;
  insert into public.rating_alert_log (kitchen_id, alert_day) values (new.kitchen_id, v_day)
  on conflict do nothing;
  if not found then
    return new;
  end if;

  insert into public.customer_notifications (user_id, kind, title, body, kitchen_id, order_id)
  select a.user_id, m.kind, m.title, m.body, new.kitchen_id, a.active_order_id
    from (
      select u.user_id,
             (select o.id from public.orders o
               where o.customer_id = u.user_id and o.kitchen_id = new.kitchen_id
                 and o.status in ('placed', 'accepted', 'preparing', 'on_the_way')
               order by o.placed_at desc limit 1) as active_order_id
        from (
          select f.customer_id as user_id from public.favourite_kitchens f where f.kitchen_id = new.kitchen_id
          union
          -- Orders of deleted accounts are kept without a customer (anonymised): skip them.
          select o.customer_id from public.orders o
           where o.kitchen_id = new.kitchen_id and o.customer_id is not null
             and o.placed_at > now() - interval '30 days'
        ) u
        left join public.notification_settings s on s.user_id = u.user_id
       where coalesce(s.hygiene_alerts, true)
    ) a
    left join public.orders ao on ao.id = a.active_order_id
    cross join lateral public.rating_change_message(
      v_kitchen.name, old.status, old.grade, new.status, new.grade,
      a.active_order_id is not null, ao.status) m;
  return new;
end;
$$;

create trigger public_ratings_notify_change
  after update on public.public_ratings
  for each row execute function public.notify_rating_change();

-- ---------------------------------------------------------------------
-- 5. Weekly summary of favourites (Sunday evening)
-- ---------------------------------------------------------------------
create or replace function public.send_weekly_hygiene_summary()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.customer_notifications (user_id, kind, title, body)
  select f.customer_id, 'weekly_summary', 'Your weekly hygiene summary',
         'Your favourites this week: ' || string_agg(label, ', ' order by sort_key) || '.'
    from (
      select f.customer_id,
             format('%s %s', count(*),
               case when r.grade is not null then 'at ' || r.grade
                    when r.status = 'pending' then 'pending'
                    when r.status = 'incomplete' then 'without enough monitoring'
                    else 'not verified' end) as label,
             coalesce(public.grade_rank(r.grade), case r.status when 'pending' then 5 when 'incomplete' then 6 else 7 end) as sort_key
        from public.favourite_kitchens f
        join public.kitchens k on k.id = f.kitchen_id and k.is_public
        left join public.public_ratings r on r.kitchen_id = f.kitchen_id
        left join public.notification_settings s on s.user_id = f.customer_id
       where coalesce(s.weekly_summary, true)
       group by f.customer_id, r.grade, r.status
    ) f
   group by f.customer_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.send_weekly_hygiene_summary() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    -- Sundays 13:00 UTC = 18:30 in Sri Lanka.
    perform cron.schedule('weekly-hygiene-summary', '0 13 * * 0', 'select public.send_weekly_hygiene_summary()');
  else
    raise notice 'pg_cron not available: run "select public.send_weekly_hygiene_summary();" weekly yourself';
  end if;
end;
$$;
