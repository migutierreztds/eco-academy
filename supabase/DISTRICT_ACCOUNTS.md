# District & School Login Accounts

Each district (and a few individual private/charter schools) has one shared login,
mirroring the old WordPress setup. Passwords are **not** stored here — they live
only in Supabase.

## How it works

- Users log in with a **username** (e.g. `austin`), not an email. The app maps it
  to a synthetic email `<username>@ecoacademy.local` behind the scenes
  (see `toLoginEmail` in `app/(auth)/login.tsx`). Staff log in with a real email.
- Each account's `profiles` row carries its scope:
  - **district account** → `district` set, `school` null → sees the whole district.
  - **school account** → `district` = bucket (`Private`/`Charter`), `school` set → sees only that one school.
  - **super-admin** → `is_staff = true` → sees everything.
- The security rule (`supabase/sql/mvp/05_district_scoping.sql`) enforces this at the
  database level, and the dropdown views auto-limit to what each account may see.

## Accounts (username → scope)

| Username | Scope |
|----------|-------|
| alamo_heights | Alamo Heights ISD |
| austin | Austin ISD |
| del_valle | Del Valle ISD |
| eanes | Eanes ISD |
| georgetown | Georgetown ISD |
| hays | Hays CISD (HCISD) |
| lake_travis | Lake Travis ISD |
| nyos | NYOS Charter School |
| pflugerville | Pflugerville ISD |
| san_angelo | San Angelo ISD |
| san_marcos | San Marcos CISD |
| round_rock | Round Rock ISD |
| dripping_springs | Dripping Springs ISD |
| magellan | Private → Magellan International School |
| st_andrews | Private → St. Andrews Episcopal School |
| st_francis | Private → St. Francis School |
| st_michaels | Private → St. Michaels Catholic Academy |
| valor | Private → Valor Public School - Charter |
| valor north | Private → Valor Public School - North |
| hyde_park | Private → Hyde Park Baptist School |
| achieve | Charter → Austin Achieve Public School |
| _migutierrez@texasdisposal.com_ | **super-admin** (all districts) |

## Password resets

District accounts use synthetic emails with no real inbox, so self-service email
reset does NOT work. When a district loses its password, the super-admin resets it
in Supabase → Authentication → Users → (select the account) → reset/change password,
then shares the new one. The login screen's "Forgot password?" tells users to
contact their administrator.

## Adding / changing accounts

Create the auth user in Supabase (Dashboard → Authentication → Add user, with a
synthetic email `<username>@ecoacademy.local`, auto-confirm on), then insert/update
its `profiles` row with the right `district` / `school` / `is_staff`. The
district/school names **must exactly match** the values in `waste_diversion_records`
or the account will see no data.

## Data districts with no dedicated login (super-admin only)

Austin Community College, Brazos ISD, plus leftover Private/Charter schools
(e.g. "Valor Public Schools - Kyle", "Eden Park Academy"). Add logins later if needed.
