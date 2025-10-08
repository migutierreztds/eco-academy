insert into public.schools (name, district, city, state) values
('Brushy Creek Elementary', 'Round Rock ISD', 'Austin', 'TX'),
('Luna Middle School', 'Austin ISD', 'Austin', 'TX')
on conflict do nothing;

-- Lessons
insert into public.lessons (title, description, tags, est_minutes, published)
values
('Intro to Recycling', 'What goes where? A fun primer.', '{"topic":"recycling","TEKS":["112.15.5A"],"grade":"3-5"}', 30, true),
('Zero-Waste Lunch', 'Plan a waste-free lunch day.', '{"topic":"waste","TEKS":["112.16.3C"],"grade":"6-8"}', 45, false);

-- Challenges
insert into public.challenges (title, description, metrics_schema, starts_on, ends_on, published) values
('Recycling Week', 'Track items recycled for one week.', '{"items":"int","photos":true}', now()::date, (now() + interval '14 days')::date, true);