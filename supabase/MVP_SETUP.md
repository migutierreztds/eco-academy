# Eco Academy — MVP Setup & Monthly Data Guide

This is the step-by-step for standing up a **fresh** Supabase backend and getting
your waste-diversion data into it, then repeating the data load every month.

You do the clicking; the SQL files under `supabase/sql/mvp/` do the heavy lifting.
Work top to bottom the first time. After that, only **Part F** matters each month.

---

## Part A — Clean up Git (one time, ~5 min)

Right now `node_modules/` (27k files) and your `.env` are committed to the repo.
Let's stop tracking them. This does **not** delete the files from your computer.

In Terminal, from the project folder:

```bash
cd ~/Projects/eco-academy
git rm -r --cached node_modules
git rm --cached .env
git add .gitignore
git commit -m "Stop tracking node_modules and .env"
git push
```

✅ Done when `git status` no longer shows a wall of `node_modules/...` lines.

---

## Part B — Create the new Supabase project (one time, ~10 min)

1. Go to https://supabase.com/dashboard → **New project**.
2. Name it `eco-academy` (or `eco-academy-prod`), pick a strong DB password
   (save it in your password manager), region **East US** is fine for Texas.
3. **Plan:** the old project auto-paused after inactivity. To avoid that with real
   users, choose the **Pro** plan (~$25/mo) once you're ready to launch. Free is
   fine while testing — just know it can pause again after ~1 week idle.
4. Wait for it to finish provisioning (~2 min).

---

## Part C — Build the database (one time, ~5 min)

In the new project: left sidebar → **SQL Editor** → **New query**. Then, one at a
time, paste the contents of each file, click **Run**, and confirm "Success":

1. `supabase/sql/mvp/01_tables.sql`  ← creates the tables
2. `supabase/sql/mvp/02_views.sql`   ← creates the dropdown views
3. `supabase/sql/mvp/03_policies.sql`← turns on security

✅ Done when **Table Editor** shows `waste_diversion_records`, `profiles`, and
`staging_waste`.

---

## Part D — Load the data for the first time (~10 min)

We import the big master CSV into the **staging** table, then run one query that
cleans it and moves it into the real table.

1. **Table Editor** → open **`staging_waste`** → **Insert** ▾ → **Import data from CSV**.
2. Upload:
   `~/Documents/Work/Eco Academy/Reports for Wordpress/Master-Green-School-Solutions-2026-6.csv`
3. All 10 CSV columns auto-match the staging table (`staging_waste` includes
   `COMBINED` and `POUNDS/STUDENT` purely to satisfy the importer — the importer
   rejects the file if any CSV header has no matching column). Click **Import**.
   (~30k rows; give it a minute.)
   - *If the browser importer struggles with the full file, see "Big-file fallback" below.*
4. **SQL Editor** → new query → paste `supabase/sql/mvp/04_load_from_staging.sql` → **Run**.
5. Read the result at the bottom. With the current master file you should see
   roughly: `total_rows ≈ 30,600, districts = 17, schools ≈ 539, first_year 2019,
   last_year 2026`. (About 160 in-file duplicate school/months get collapsed, and
   4 junk rows are dropped — that's expected.)

✅ Done when the counts look right and `staging_waste` is empty again.

---

## Part E — Point the app at the new project (one time, ~5 min)

1. In Supabase: **Project Settings** → **API**. Copy two values:
   - **Project URL**
   - **anon public** key
2. In the project, edit the `.env` file to:
   ```
   EXPO_PUBLIC_SUPABASE_URL=<paste Project URL>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<paste anon public key>
   ```
3. Restart the dev server so it picks up the new values:
   ```bash
   npx expo start --clear
   ```
4. Open the web build, sign up a test account, complete onboarding, and open the
   **Waste Diversion** tab. Pick a district + school and confirm numbers appear.

✅ Done when a real school's monthly numbers show up in the app.

> Note: `.env` is no longer tracked by Git (Part A), so these keys stay off GitHub.
> The anon key is safe to ship in the app — the security policies in `03_policies.sql`
> are what actually protect the data.

---

## Part F — The monthly routine (repeat every month, ~5 min)

When you have a new month's report CSV (same column layout as the master):

1. **Table Editor** → `staging_waste` → **Import data from CSV** → upload the new
   month's file (skip `COMBINED` / `POUNDS/STUDENT` as before).
   - You can import either just the new month, or the whole updated master — both
     work, because step 2 upserts (re-importing a month updates, never duplicates).
2. **SQL Editor** → run `supabase/sql/mvp/04_load_from_staging.sql` again.
3. Check the summary counts at the bottom. Done — the app shows the new month
   immediately, no redeploy needed.

That's the whole loop. The staging table auto-clears at the end of step 2, so
you're always starting fresh next month.

---

## Big-file fallback (only if the browser importer chokes on 30k rows)

Use `psql` from Terminal instead (Supabase → **Project Settings → Database →
Connection string** for the URI):

```bash
# 1. load raw CSV straight into staging
psql "<your-connection-string>" -c "\copy public.staging_waste (\"MONTH\",\"YEAR\",\"DISTRICT\",\"NUMBER\",\"SCHOOL\",\"ENROLLMENT\",\"RECYCLE\",\"COMPOST\") from 'Master-Green-School-Solutions-2026-6.csv' with (format csv, header true)"
# (the CSV's COMBINED/POUNDS-STUDENT columns are ignored by naming only the 8 we want)

# 2. run the clean+load transform
psql "<your-connection-string>" -f supabase/sql/mvp/04_load_from_staging.sql
```

---

## Known data-quality notes (already handled, but good to know)

- **`ROUND ROCK ISD` vs `Round Rock ISD`** — merged into one during import.
- **Stray rows** — a blank district, a literal `DISTRICT` header row, blank years,
  and two `2004`-dated rows are dropped automatically (we keep 2019+).
- **`ENROLLMENT` is 0 for most rows** — so the app's "Avg Lbs/Student" metric will
  read as 0/blank for those schools. If per-student numbers matter for the MVP,
  you'll need enrollment figures added to the source data. Nothing else depends on it.
- **Decimal / comma pounds** — values like `1,384.25` are preserved (comma
  stripped, decimal kept). Stored as `double precision` so the app reads them as
  real numbers.
- **`NUMBER` column** — values look like `449/43873`, so it's stored as text. The
  app doesn't use it; it's kept only for reference.
- **In-file duplicates** — ~160 school/month rows appear twice in the source; the
  import keeps the row with the larger total and discards the other.
- **`COMBINED` / `POUNDS/STUDENT` CSV columns** — ignored on purpose; the app
  recomputes both from RECYCLE + COMPOST.
