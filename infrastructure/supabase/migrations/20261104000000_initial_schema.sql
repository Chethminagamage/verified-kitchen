-- =====================================================================
-- Verified Kitchen — initial schema
-- Migration: 20261104000000_initial_schema.sql
--
-- Design rules (from the project architecture):
--   * AI and IoT produce EVIDENCE (ai_detections, sensor_readings).
--   * The Python edge service owns SCORING (hygiene_scores, violations).
--   * PostgreSQL owns operational data; audit_records is a hash chain whose
--     hashes are later anchored on Hyperledger Fabric.
--   * Only the edge service (service-role key) writes evidence, scores and
--     audit records. Website users read; operators may only acknowledge /
--     resolve violations and edit their kitchen profile.
--   * Consumers (mobile app, no login) can read ONLY two public views.
--   * No raw video or images are stored anywhere in this schema.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------
create type public.user_role          as enum ('operator', 'phi', 'admin');
create type public.hygiene_pillar     as enum ('personal', 'food_prep', 'environmental');
create type public.evidence_source    as enum ('ai', 'sensor', 'system');
create type public.violation_severity as enum ('low', 'medium', 'high', 'critical');
create type public.violation_status   as enum ('active', 'acknowledged', 'resolved');
create type public.audit_status       as enum ('pending', 'verified', 'failed');
create type public.device_type        as enum ('env_node', 'camera');

-- ---------------------------------------------------------------------
-- 2. Kitchens, users and access
-- ---------------------------------------------------------------------
create table public.kitchens (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,              -- e.g. 'kitchen-001' (used in MQTT topics)
  name        text not null,
  location    text,
  is_public   boolean not null default true,     -- shown in the consumer app
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'operator',
  created_at  timestamptz not null default now()
);

create table public.user_kitchens (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kitchen_id  uuid not null references public.kitchens (id) on delete cascade,
  primary key (user_id, kitchen_id)
);

-- ---------------------------------------------------------------------
-- 3. Devices (ESP32 environmental node, camera)
-- ---------------------------------------------------------------------
create table public.devices (
  id            text primary key,                -- e.g. 'vk-env-01', 'vk-cam-01'
  kitchen_id    uuid not null references public.kitchens (id) on delete cascade,
  type          public.device_type not null,
  name          text not null,
  last_seen_at  timestamptz,
  last_status   jsonb,                           -- latest health payload (sensor OK flags, rssi, uptime)
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Evidence: environmental sensor readings (one row per ESP32 message)
-- ---------------------------------------------------------------------
create table public.sensor_readings (
  id              bigint generated always as identity primary key,
  kitchen_id      uuid not null references public.kitchens (id) on delete cascade,
  device_id       text not null references public.devices (id),
  device_ts       timestamptz not null,          -- timestamp from the ESP32 RTC (UTC)
  received_at     timestamptz not null default now(),
  seq             bigint,                        -- ESP32 message counter
  ambient_temp_c  real check (ambient_temp_c between -40 and 85),   -- BME280 range
  humidity_pct    real check (humidity_pct between 0 and 100),
  pressure_hpa    real check (pressure_hpa between 300 and 1100),
  fridge_temp_c   real check (fridge_temp_c between -55 and 125),   -- DS18B20 range
  rssi            smallint,
  sensor_status   jsonb,
  unique (device_id, device_ts)                  -- re-sent offline buffers are ignored, not duplicated
);
create index sensor_readings_kitchen_ts_idx on public.sensor_readings (kitchen_id, device_ts desc);

-- ---------------------------------------------------------------------
-- 5. Evidence: AI detection metadata (no frames / images stored)
--    The vision service should write one row per indicator per
--    aggregation window (e.g. every few seconds), not one row per frame.
-- ---------------------------------------------------------------------
create table public.ai_detections (
  id             bigint generated always as identity primary key,
  kitchen_id     uuid not null references public.kitchens (id) on delete cascade,
  device_id      text references public.devices (id),
  detected_at    timestamptz not null,
  pillar         public.hygiene_pillar not null check (pillar in ('personal', 'food_prep')),
  indicator      text not null check (indicator in (
                   'hairnet', 'mask', 'gloves',
                   'clean_surface', 'dirty_surface', 'food_spill', 'food_waste')),
  compliant      boolean not null,
  confidence     real not null check (confidence between 0 and 1),
  model_version  text not null,
  inference_ms   real,
  metadata       jsonb not null default '{}'::jsonb,   -- e.g. frames counted, bbox counts
  created_at     timestamptz not null default now()
);
create index ai_detections_kitchen_ts_idx on public.ai_detections (kitchen_id, detected_at desc);

-- ---------------------------------------------------------------------
-- 6. Scoring configuration (versioned, so every score is traceable to
--    the weights / thresholds that produced it — evidence for RQ1)
-- ---------------------------------------------------------------------
create table public.scoring_configs (
  id               bigint generated always as identity primary key,
  version          text not null unique,
  w_personal       numeric(4,3) not null check (w_personal between 0 and 1),
  w_food_prep      numeric(4,3) not null check (w_food_prep between 0 and 1),
  w_environmental  numeric(4,3) not null check (w_environmental between 0 and 1),
  thresholds       jsonb not null default '{}'::jsonb,
  is_active        boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  check (w_personal + w_food_prep + w_environmental = 1)
);
create unique index scoring_configs_one_active_idx on public.scoring_configs (is_active) where is_active;

-- ---------------------------------------------------------------------
-- 7. Scores: one row per scoring window, with all three pillars
--    (a pillar is NULL when its evidence was unavailable in that window)
-- ---------------------------------------------------------------------
create table public.hygiene_scores (
  id                   bigint generated always as identity primary key,
  kitchen_id           uuid not null references public.kitchens (id) on delete cascade,
  computed_at          timestamptz not null default now(),
  window_start         timestamptz not null,
  window_end           timestamptz not null,
  overall_score        numeric(5,2) not null check (overall_score between 0 and 100),
  personal_score       numeric(5,2) check (personal_score between 0 and 100),
  food_prep_score      numeric(5,2) check (food_prep_score between 0 and 100),
  environmental_score  numeric(5,2) check (environmental_score between 0 and 100),
  config_id            bigint not null references public.scoring_configs (id),
  details              jsonb not null default '{}'::jsonb,   -- per-indicator breakdown (explainability)
  check (window_end >= window_start)
);
create index hygiene_scores_kitchen_ts_idx on public.hygiene_scores (kitchen_id, computed_at desc);

-- ---------------------------------------------------------------------
-- 8. Violations (generated by the edge service from AI / sensor evidence)
-- ---------------------------------------------------------------------
create table public.violations (
  id               uuid primary key default gen_random_uuid(),
  kitchen_id       uuid not null references public.kitchens (id) on delete cascade,
  occurred_at      timestamptz not null,
  pillar           public.hygiene_pillar not null,
  source           public.evidence_source not null,
  indicator        text not null,
  title            text not null,
  description      text,
  severity         public.violation_severity not null,
  status           public.violation_status not null default 'active',
  score_impact     numeric(5,2),
  ai_confidence    real check (ai_confidence between 0 and 1),
  sensor_value     real,
  sensor_unit      text,
  detection_id     bigint references public.ai_detections (id) on delete set null,
  reading_id       bigint references public.sensor_readings (id) on delete set null,
  acknowledged_by  uuid references public.profiles (id),
  acknowledged_at  timestamptz,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index violations_kitchen_ts_idx on public.violations (kitchen_id, occurred_at desc);
create index violations_status_idx on public.violations (kitchen_id, status);

-- ---------------------------------------------------------------------
-- 9. Audit records: tamper-evident hash chain (per kitchen)
--    event_hash = SHA-256(prev_hash | kitchen_id | event_type | created_at | payload)
--    Hyperledger Fabric later stores event_hash -> fabric_tx_id / block.
-- ---------------------------------------------------------------------
create table public.audit_records (
  id             bigint generated always as identity primary key,
  kitchen_id     uuid not null references public.kitchens (id) on delete restrict,
  chain_seq      bigint not null,                -- 1, 2, 3 ... per kitchen (set by trigger)
  violation_id   uuid references public.violations (id) on delete restrict,
  event_type     text not null,                  -- e.g. 'violation_created', 'daily_score_summary'
  event_payload  jsonb not null,
  prev_hash      text not null,
  event_hash     text not null,
  created_at     timestamptz not null default now(),
  status         public.audit_status not null default 'pending',   -- 'verified' = anchored on Fabric
  fabric_tx_id   text,
  fabric_block   bigint,
  anchored_at    timestamptz,
  unique (kitchen_id, chain_seq),
  unique (event_hash)
);
create index audit_records_status_idx on public.audit_records (status) where status = 'pending';

create or replace function public.audit_hash(
  p_prev text, p_kitchen uuid, p_type text, p_created timestamptz, p_payload jsonb)
returns text
language sql stable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      p_prev || '|' || p_kitchen::text || '|' || p_type || '|' ||
      to_char(p_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' ||
      p_payload::text,
      'sha256'),
    'hex');
$$;

-- Assigns chain_seq / prev_hash / event_hash on insert. Clients cannot set them.
create or replace function public.audit_records_chain()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prev_hash text;
  v_prev_seq  bigint;
begin
  -- serialise inserts per kitchen; a race still fails loudly on unique(kitchen_id, chain_seq)
  perform pg_advisory_xact_lock(hashtext(new.kitchen_id::text));

  select a.event_hash, a.chain_seq
    into v_prev_hash, v_prev_seq
    from public.audit_records a
   where a.kitchen_id = new.kitchen_id
   order by a.chain_seq desc
   limit 1;

  new.created_at   := now();
  new.chain_seq    := coalesce(v_prev_seq, 0) + 1;
  new.prev_hash    := coalesce(v_prev_hash, 'GENESIS');
  new.event_hash   := public.audit_hash(new.prev_hash, new.kitchen_id, new.event_type,
                                        new.created_at, new.event_payload);
  new.status       := 'pending';
  new.fabric_tx_id := null;
  new.fabric_block := null;
  new.anchored_at  := null;
  return new;
end;
$$;

create trigger audit_records_chain_trg
  before insert on public.audit_records
  for each row execute function public.audit_records_chain();

-- Content is immutable; only the Fabric anchoring fields may change. No deletes.
create or replace function public.audit_records_protect()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'audit records cannot be deleted';
  end if;
  if new.kitchen_id    is distinct from old.kitchen_id
  or new.chain_seq     is distinct from old.chain_seq
  or new.violation_id  is distinct from old.violation_id
  or new.event_type    is distinct from old.event_type
  or new.event_payload is distinct from old.event_payload
  or new.prev_hash     is distinct from old.prev_hash
  or new.event_hash    is distinct from old.event_hash
  or new.created_at    is distinct from old.created_at then
    raise exception 'audit record content is immutable (only Fabric anchoring fields may change)';
  end if;
  return new;
end;
$$;

create trigger audit_records_protect_trg
  before update or delete on public.audit_records
  for each row execute function public.audit_records_protect();

-- Recomputes the chain and reports every broken link (used in tamper tests).
create or replace function public.verify_audit_chain(p_kitchen uuid)
returns table (chain_seq bigint, audit_id bigint, ok boolean, reason text)
language plpgsql stable
set search_path = ''
as $$
declare
  r              record;
  v_prev_hash    text   := 'GENESIS';
  v_expected_seq bigint := 1;
begin
  for r in
    select a.* from public.audit_records a
     where a.kitchen_id = p_kitchen
     order by a.chain_seq
  loop
    chain_seq := r.chain_seq;
    audit_id  := r.id;
    if r.chain_seq <> v_expected_seq then
      ok := false; reason := 'gap in chain (record missing or reordered)';
    elsif r.prev_hash <> v_prev_hash then
      ok := false; reason := 'prev_hash does not match previous record';
    elsif r.event_hash <> public.audit_hash(r.prev_hash, r.kitchen_id, r.event_type,
                                            r.created_at, r.event_payload) then
      ok := false; reason := 'record content modified';
    else
      ok := true; reason := null;
    end if;
    return next;
    v_prev_hash    := r.event_hash;
    v_expected_seq := r.chain_seq + 1;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Profiles are created automatically for new auth users
--     (admin creates users in Supabase Auth; default role = operator)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- back-fill profiles for users that already exist (e.g. your test login)
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 11. Row Level Security helpers
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.has_kitchen_access(p_kitchen uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p
                  where p.id = auth.uid() and p.role = 'admin')
      or exists (select 1 from public.user_kitchens uk
                  where uk.user_id = auth.uid() and uk.kitchen_id = p_kitchen);
$$;

-- ---------------------------------------------------------------------
-- 12. Row Level Security policies
--     No INSERT policies on evidence / score / audit tables:
--     only the edge service (service role, bypasses RLS) writes them.
-- ---------------------------------------------------------------------
alter table public.kitchens        enable row level security;
alter table public.profiles        enable row level security;
alter table public.user_kitchens   enable row level security;
alter table public.devices         enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.ai_detections   enable row level security;
alter table public.scoring_configs enable row level security;
alter table public.hygiene_scores  enable row level security;
alter table public.violations      enable row level security;
alter table public.audit_records   enable row level security;

-- kitchens
create policy kitchens_select on public.kitchens
  for select to authenticated using (public.has_kitchen_access(id));
create policy kitchens_update on public.kitchens
  for update to authenticated
  using (public.has_kitchen_access(id) and public.current_user_role() in ('operator', 'admin'))
  with check (public.has_kitchen_access(id) and public.current_user_role() in ('operator', 'admin'));
create policy kitchens_admin_insert on public.kitchens
  for insert to authenticated with check (public.current_user_role() = 'admin');
create policy kitchens_admin_delete on public.kitchens
  for delete to authenticated using (public.current_user_role() = 'admin');

-- profiles (users cannot change their own role)
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.current_user_role() = 'admin');
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- user_kitchens
create policy user_kitchens_select on public.user_kitchens
  for select to authenticated
  using (user_id = (select auth.uid()) or public.current_user_role() = 'admin');
create policy user_kitchens_admin_insert on public.user_kitchens
  for insert to authenticated with check (public.current_user_role() = 'admin');
create policy user_kitchens_admin_delete on public.user_kitchens
  for delete to authenticated using (public.current_user_role() = 'admin');

-- read-only evidence / score / audit tables (operator, PHI, admin of that kitchen)
create policy devices_select on public.devices
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
create policy sensor_readings_select on public.sensor_readings
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
create policy ai_detections_select on public.ai_detections
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
create policy hygiene_scores_select on public.hygiene_scores
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
create policy audit_records_select on public.audit_records
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
create policy scoring_configs_select on public.scoring_configs
  for select to authenticated using (true);

-- violations: everyone with access reads; operator/admin may acknowledge/resolve
create policy violations_select on public.violations
  for select to authenticated using (public.has_kitchen_access(kitchen_id));
create policy violations_update on public.violations
  for update to authenticated
  using (public.has_kitchen_access(kitchen_id) and public.current_user_role() in ('operator', 'admin'))
  with check (public.has_kitchen_access(kitchen_id) and public.current_user_role() in ('operator', 'admin'));

-- column-level limit: website users can only change the workflow columns
revoke update on public.violations from authenticated;
grant update (status, acknowledged_by, acknowledged_at, resolved_at)
  on public.violations to authenticated;

-- ---------------------------------------------------------------------
-- 13. Consumer (mobile app, no login) — public views only
--     These views intentionally run with the owner's rights so anon can
--     read ONLY these columns without any access to the base tables.
--     (Supabase's advisor will flag them as "security definer views";
--      that is expected and deliberate here — see SPR05.)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;

create view public.public_kitchen_scores as
select k.id                  as kitchen_id,
       k.code,
       k.name,
       k.location,
       s.overall_score,
       s.personal_score,
       s.food_prep_score,
       s.environmental_score,
       s.computed_at         as last_updated
  from public.kitchens k
  left join lateral (
        select h.overall_score, h.personal_score, h.food_prep_score,
               h.environmental_score, h.computed_at
          from public.hygiene_scores h
         where h.kitchen_id = k.id
         order by h.computed_at desc
         limit 1) s on true
 where k.is_public;

create view public.public_score_history as
select h.kitchen_id,
       date_trunc('hour', h.computed_at)      as hour,
       round(avg(h.overall_score), 1)         as overall_score,
       round(avg(h.personal_score), 1)        as personal_score,
       round(avg(h.food_prep_score), 1)       as food_prep_score,
       round(avg(h.environmental_score), 1)   as environmental_score
  from public.hygiene_scores h
  join public.kitchens k on k.id = h.kitchen_id and k.is_public
 where h.computed_at > now() - interval '7 days'
 group by h.kitchen_id, date_trunc('hour', h.computed_at);

grant select on public.public_kitchen_scores to anon, authenticated;
grant select on public.public_score_history  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 14. Realtime (website live updates; RLS still applies)
--     The consumer app polls the public views instead (views have no realtime).
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.devices,
  public.sensor_readings,
  public.ai_detections,
  public.hygiene_scores,
  public.violations,
  public.audit_records;
