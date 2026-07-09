-- ============================================================================
-- Eco Academy — dropdown views (run SECOND)
-- ============================================================================
-- The onboarding screen reads these two views:
--   view_districts_dropdown -> column "name"
--   view_schools_dropdown   -> columns "name", "district"
-- They just return the distinct districts/schools present in the data, so the
-- pickers always stay in sync with whatever has been imported.
-- ============================================================================

create or replace view public.view_districts_dropdown as
select distinct "DISTRICT" as name
from public.waste_diversion_records
where "DISTRICT" is not null and "DISTRICT" <> ''
order by name;

create or replace view public.view_schools_dropdown as
select distinct "SCHOOL" as name, "DISTRICT" as district
from public.waste_diversion_records
where "SCHOOL" is not null and "SCHOOL" <> ''
order by district, name;
