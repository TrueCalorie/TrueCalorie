-- v2-fuel-coach: additive-only migration.
-- New tables only. No ALTER, no DROP, no changes to existing tables, RLS
-- policies, or triggers. Production v1 runs against this same database and
-- must keep working; reverting the branch leaves these tables inert.

-- ── fuel_briefs ─────────────────────────────────────────────────────────────
-- One row per composed brief (morning / post-run / adjustment).
-- Written server-side via service role; clients read own rows and may only
-- stamp opened_at via the update policy.

create table public.fuel_briefs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  kind               text not null check (kind in ('morning','postrun','adjust')),
  strava_activity_id bigint,
  body               text not null,
  macros             jsonb,
  window_ends_at     timestamptz,
  created_at         timestamptz not null default now(),
  delivered_at       timestamptz,
  opened_at          timestamptz
);

create index fuel_briefs_user_created_idx on public.fuel_briefs (user_id, created_at desc);

-- Webhook retry dedupe: at most one post-run brief per activity per user.
create unique index fuel_briefs_activity_uniq
  on public.fuel_briefs (user_id, strava_activity_id) where strava_activity_id is not null;

alter table public.fuel_briefs enable row level security;

create policy "select own briefs" on public.fuel_briefs
  for select using (auth.uid() = user_id);

create policy "update own briefs" on public.fuel_briefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No client insert/delete policies: the composer writes via service role.

-- ── fuel_checkins ───────────────────────────────────────────────────────────
-- One-tap evening check-in. date is the client-supplied LOCAL date string
-- (toLocalDateStr convention, never toISOString().split('T')[0]).

create table public.fuel_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  response   text not null check (response in ('nailed','mostly','short')),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.fuel_checkins enable row level security;

create policy "select own checkins" on public.fuel_checkins
  for select using (auth.uid() = user_id);

create policy "insert own checkins" on public.fuel_checkins
  for insert with check (auth.uid() = user_id);

create policy "update own checkins" on public.fuel_checkins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── fuel_profiles ───────────────────────────────────────────────────────────
-- v2-only onboarding answers. Sport and weekly volume stay in user_settings;
-- this table exists because user_settings cannot gain columns on this branch.

create table public.fuel_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  dining_situation text check (dining_situation in ('dining_hall','apartment','mixed')),
  typical_week     jsonb,
  updated_at       timestamptz not null default now()
);

alter table public.fuel_profiles enable row level security;

create policy "select own fuel profile" on public.fuel_profiles
  for select using (auth.uid() = user_id);

create policy "insert own fuel profile" on public.fuel_profiles
  for insert with check (auth.uid() = user_id);

create policy "update own fuel profile" on public.fuel_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
