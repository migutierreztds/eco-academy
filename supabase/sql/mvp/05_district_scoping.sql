-- ============================================================================
-- Eco Academy — district/school scoping + super-admin  (run once)
-- ============================================================================
-- Replaces the earlier "any signed-in user sees everything" rule with:
--   * staff (super-admin)  -> all rows
--   * district account     -> only rows for their district
--   * school account       -> only rows for their one school (private/charter)
-- Scope comes from the account's profile (district, school, is_staff).
-- ============================================================================

drop policy if exists "waste read (authenticated)" on public.waste_diversion_records;
drop policy if exists "waste read (scoped)"        on public.waste_diversion_records;

create policy "waste read (scoped)"
  on public.waste_diversion_records for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.is_staff
          or (p.district = "DISTRICT" and (p.school is null or p.school = "SCHOOL"))
        )
    )
  );

-- Make the dropdown views run with the CALLER's permissions so they only list
-- the districts/schools that caller is allowed to see. This auto-limits the
-- pickers in the app (a district account sees just its district, etc.).
alter view public.view_districts_dropdown set (security_invoker = on);
alter view public.view_schools_dropdown  set (security_invoker = on);
