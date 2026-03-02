create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('work', 'writing', 'migration')),
  planned_duration_mins integer not null,
  actual_duration_mins integer,
  start_context text not null,
  end_context text,
  exited_early boolean default false,
  started_at timestamptz default now(),
  ended_at timestamptz,
  date date not null default current_date,
  created_at timestamptz default now()
);

alter table focus_sessions enable row level security;
create policy "Users access own sessions only"
  on focus_sessions for all using (user_id = auth.uid());

create index sessions_user_date on focus_sessions (user_id, date desc);
