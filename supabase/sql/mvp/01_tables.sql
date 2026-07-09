-- ============================================================================
-- Eco Academy — MVP schema (run this FIRST, in the Supabase SQL Editor)
-- ============================================================================
-- Two real tables the app needs, plus one temporary "staging" table used only
-- during CSV import. Column names for waste_diversion_records are UPPERCASE and
-- quoted on purpose: the app code reads r.DISTRICT, r.SCHOOL, r.YEAR, etc.
-- Safe to re-run — everything uses "if not exists".
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) waste_diversion_records — the core MVP dataset (one row per school/month)
--    Pounds are stored as integers so the app's (RECYCLE + COMPOST) math works.
-- ----------------------------------------------------------------------------
create table if not exists public.waste_diversion_records (
  id           uuid primary key default gen_random_uuid(),
  "DISTRICT"   text    not null,
  "NUMBER"     text,                     -- TDS account id, e.g. "449/43873" (text, not a number)
  "SCHOOL"     text    not null,
  "MONTH"      smallint not null,        -- 1..12
  "YEAR"       smallint not null,        -- e.g. 2026
  "ENROLLMENT" integer          default 0,
  "RECYCLE"    double precision default 0,  -- pounds (source has decimals like 1384.25)
  "COMPOST"    double precision default 0,  -- pounds
  created_at   timestamptz default now()
);
-- Note: double precision (not numeric) is deliberate — Supabase returns it to the
-- app as a real JSON number so (RECYCLE + COMPOST) math works. A numeric column
-- would come back as a string and break the leaderboard/impact calculations.

-- One record per school per month. This is the key that makes monthly
-- re-uploads safe: importing the same month twice UPDATES instead of duplicating.
create unique index if not exists waste_records_natural_key
  on public.waste_diversion_records ("DISTRICT", "SCHOOL", "MONTH", "YEAR");

-- Helps the app's lookups (filter by district/school, order by year/month)
create index if not exists waste_records_district_idx on public.waste_diversion_records ("DISTRICT");
create index if not exists waste_records_school_idx   on public.waste_diversion_records ("SCHOOL");
create index if not exists waste_records_period_idx   on public.waste_diversion_records ("YEAR", "MONTH");

-- ----------------------------------------------------------------------------
-- 2) profiles — one row per logged-in user (school official)
--    Columns cover every field the app reads or writes across all screens.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text,                      -- e.g. 'educator','school_admin','community'
  first_name    text,
  last_name     text,
  full_name     text,
  handle        text,
  district      text,                      -- stored as name (matches CSV data)
  school        text,
  district_id   uuid,                       -- legacy, unused; kept nullable
  school_id     uuid,                       -- legacy, unused; kept nullable
  green_leaders boolean default false,
  gln_status    text    default 'none',    -- 'none'|'pending'|'approved'|'revoked'
  gln_joined_at timestamptz,
  is_staff      boolean default false,
  created_at    timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 3) staging_waste — TEMPORARY landing zone for CSV imports (all text).
--    Column names match the CSV headers exactly so the importer auto-maps them.
--    Data is cleaned + moved into waste_diversion_records by 04_load_from_staging.sql
-- ----------------------------------------------------------------------------
create table if not exists public.staging_waste (
  "MONTH"      text,
  "YEAR"       text,
  "DISTRICT"   text,
  "NUMBER"     text,
  "SCHOOL"     text,
  "ENROLLMENT" text,
  "RECYCLE"    text,
  "COMPOST"    text
);
