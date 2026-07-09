-- ============================================================================
-- Eco Academy — clean + load CSV into the real table  (run EVERY import)
-- ============================================================================
-- Prereq: you've just imported a CSV into public.staging_waste (see MVP_SETUP.md).
-- This reads staging_waste, cleans it, and upserts into waste_diversion_records.
-- Running it twice for the same month is harmless (it updates, never duplicates).
--
-- Cleaning handled here:
--   * trims whitespace on district/school
--   * merges the "ROUND ROCK ISD" / "Round Rock ISD" casing duplicate
--   * drops junk rows: blank district, a stray "DISTRICT" header row, blank
--     school, blank/typo years (keeps 2019+), out-of-range months
--   * enrollment: keep digits only, blank -> 0
--   * pounds (RECYCLE/COMPOST): strip thousands commas but KEEP decimals
--     (e.g. "1,384.25" -> 1384.25); blank -> 0
--   * NUMBER kept as text (values like "449/43873")
--   * de-duplicates rows within the file itself (keeps the largest total)
-- ============================================================================

with cleaned as (
  select
    case when upper(trim("DISTRICT")) = 'ROUND ROCK ISD' then 'Round Rock ISD'
         else trim("DISTRICT") end                                            as district,
    nullif(trim("NUMBER"), '')                                                as number,
    trim("SCHOOL")                                                            as school,
    nullif(regexp_replace(coalesce("MONTH",''), '[^0-9]', '', 'g'), '')::int  as month,
    nullif(regexp_replace(coalesce("YEAR",''),  '[^0-9]', '', 'g'), '')::int  as year,
    coalesce(nullif(regexp_replace(coalesce("ENROLLMENT",''), '[^0-9]', '', 'g'), '')::int, 0) as enrollment,
    coalesce(nullif(regexp_replace(coalesce("RECYCLE",''), '[^0-9.]', '', 'g'), '')::double precision, 0) as recycle,
    coalesce(nullif(regexp_replace(coalesce("COMPOST",''), '[^0-9.]', '', 'g'), '')::double precision, 0) as compost
  from public.staging_waste
),
valid as (
  select * from cleaned
  where district is not null and district not in ('', 'DISTRICT')
    and school   is not null and school   <> ''
    and year  between 2019 and 2100
    and month between 1 and 12
),
deduped as (
  -- if the file contains two rows for the same school/month, keep the bigger one
  select distinct on (district, school, month, year) *
  from valid
  order by district, school, month, year, (recycle + compost) desc
)
insert into public.waste_diversion_records
  ("DISTRICT", "NUMBER", "SCHOOL", "MONTH", "YEAR", "ENROLLMENT", "RECYCLE", "COMPOST")
select district, number, school, month, year, enrollment, recycle, compost
from deduped
on conflict ("DISTRICT", "SCHOOL", "MONTH", "YEAR") do update set
  "NUMBER"     = excluded."NUMBER",
  "ENROLLMENT" = excluded."ENROLLMENT",
  "RECYCLE"    = excluded."RECYCLE",
  "COMPOST"    = excluded."COMPOST";

-- Clear the staging table so the next import starts clean.
truncate public.staging_waste;

-- Quick sanity check — how much data do we have now?
select count(*)                as total_rows,
       count(distinct "DISTRICT") as districts,
       count(distinct "SCHOOL")   as schools,
       min("YEAR")             as first_year,
       max("YEAR")             as last_year
from public.waste_diversion_records;
