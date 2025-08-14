# Eco Academy + Green Leaders Network — Starter (Expo + Supabase)

This is a minimal starter with Expo Router, Supabase auth/DB, a Library screen, and a basic Admin toggle for publishing lessons.

## Prereqs
- Node.js LTS (use nvm): Node 20 LTS recommended
- Git
- VS Code
- Supabase project (Dev) — grab the URL + anon key

## Setup
```bash
# 1) Clone
git clone <your-repo-url> eco-academy
cd eco-academy

# 2) Install deps
npm install

# 3) Configure env
cp .env.example .env
# put EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY

# 4) Create tables: open Supabase SQL editor and run files in /supabase/sql/
#   - schema.sql
#   - policies.sql
#   - seed.sql

# 5) Run app
npm run start
# press 'w' to open web; scan QR for Expo Go on iOS/Android
```

## Admin route
Visit `/admin` (e.g., http://localhost:8081/admin on web) after signing in to toggle `published` on lessons.

## Build
Use EAS for native builds. Add your EAS secrets and run:
```bash
npm i -D eas-cli
eas login
eas init
eas build --profile preview --platform ios
eas build --profile preview --platform android
```