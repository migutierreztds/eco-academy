-- Enable RLS
alter table public.users enable row level security;
alter table public.lessons enable row level security;
alter table public.challenges enable row level security;
alter table public.classrooms enable row level security;
alter table public.activity_logs enable row level security;
alter table public.spotlights enable row level security;
alter table public.grant_apps enable row level security;

-- users
create policy "users self read" on public.users for select using (auth.uid() = id);
create policy "users self update" on public.users for update using (auth.uid() = id);
create policy "users insert self" on public.users for insert with check (auth.uid() = id);

-- lessons (public read when published)
create policy "lessons public read" on public.lessons for select using (published = true);
create policy "lessons admin manage" on public.lessons for all using ((auth.jwt() ->> 'role') = 'admin');

-- challenges
create policy "challenges public read" on public.challenges for select using (published = true);
create policy "challenges admin manage" on public.challenges for all using ((auth.jwt() ->> 'role') = 'admin');

-- classrooms (teacher owns)
create policy "classrooms owner all" on public.classrooms for all using (teacher_id = auth.uid());

-- activity logs
create policy "activity logs select by teacher" on public.activity_logs for select using (
  exists (select 1 from public.classrooms c where c.id = activity_logs.classroom_id and c.teacher_id = auth.uid())
);
create policy "activity logs insert by teacher or self" on public.activity_logs for insert with check (
  auth.uid() = user_id or exists (select 1 from public.classrooms c where c.id = activity_logs.classroom_id and c.teacher_id = auth.uid())
);

-- spotlights
create policy "spotlights submitter read" on public.spotlights for select using (submitter_id = auth.uid());
create policy "spotlights submit" on public.spotlights for insert with check (submitter_id = auth.uid());
create policy "spotlights admin read all" on public.spotlights for select using ((auth.jwt() ->> 'role') = 'admin');

-- grant apps
create policy "grant apps submitter read" on public.grant_apps for select using (submitter_id = auth.uid());
create policy "grant apps submit" on public.grant_apps for insert with check (submitter_id = auth.uid());
create policy "grant apps admin read all" on public.grant_apps for select using ((auth.jwt() ->> 'role') = 'admin');