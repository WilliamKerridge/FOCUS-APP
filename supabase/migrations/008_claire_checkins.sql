create table claire_checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  date         date not null,
  quality_time text not null check (quality_time in ('yes', 'no', 'partial')),
  blocker      text,
  created_at   timestamptz default now() not null,
  unique (user_id, date)
);

alter table claire_checkins enable row level security;
create policy "Users manage own checkins"
  on claire_checkins for all using (auth.uid() = user_id);
