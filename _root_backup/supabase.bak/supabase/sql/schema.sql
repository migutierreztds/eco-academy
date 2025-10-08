-- Core schema
create extension if not exists pgcrypto with schema public;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  city text,
  state text,
  created_at timestamptz default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  role text check (role in ('educator','student','parent','admin')) not null default 'educator',
  full_name text,
  school_id uuid references public.schools,
  grade_band text,
  subjects text[],
  created_at timestamptz default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  media jsonb default '[]',
  tags jsonb default '{}'::jsonb,
  est_minutes int,
  published boolean default false,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  metrics_schema jsonb not null,
  starts_on date,
  ends_on date,
  badges jsonb default '[]',
  published boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.users(id) on delete cascade,
  school_id uuid references public.schools,
  name text not null,
  grade_band text,
  class_code text unique not null,
  roster_count int default 0,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  metric_values jsonb not null,
  photo_urls text[] default '{}',
  verified_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  criteria jsonb not null,
  asset_url text,
  created_at timestamptz default now()
);

create table if not exists public.gln_status (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools,
  level text check (level in ('member','bronze','silver','gold')) default 'member',
  checklist jsonb default '[]',
  earned_on date,
  updated_at timestamptz default now()
);

create table if not exists public.spotlights (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references public.users(id),
  school_id uuid references public.schools,
  story text,
  photo_urls text[] default '{}',
  consent boolean default false,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.grant_apps (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references public.users(id),
  program text not null,
  fields jsonb not null,
  status text check (status in ('submitted','review','awarded','declined')) default 'submitted',
  award_amount numeric,
  created_at timestamptz default now()
);