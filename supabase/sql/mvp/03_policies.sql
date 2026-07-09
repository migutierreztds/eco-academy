-- ============================================================================
-- Eco Academy — Row Level Security (run THIRD)
-- ============================================================================
-- Rules of the road:
--  * waste_diversion_records: any signed-in user can READ. Nobody writes from
--    the app — data only ever loads via the CSV import (which uses the service
--    role and bypasses RLS). So: read-only for users.
--  * profiles: a user can read and edit ONLY their own row.
-- Safe to re-run.
-- ============================================================================

alter table public.waste_diversion_records enable row level security;
alter table public.profiles                enable row level security;

-- ---- waste_diversion_records: read-only for authenticated users -------------
drop policy if exists "waste read (authenticated)" on public.waste_diversion_records;
create policy "waste read (authenticated)"
  on public.waste_diversion_records
  for select
  to authenticated
  using (true);

-- ---- profiles: each user manages only their own row -------------------------
drop policy if exists "profiles read own"   on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles read own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles insert own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
