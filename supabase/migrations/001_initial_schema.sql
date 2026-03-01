-- ============================================================
-- FOCUS App — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Profiles table (one row per user, created automatically on signup)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  work_days integer[] not null default '{1,2,3,4,5}',  -- 1=Mon, 7=Sun
  transition_time text not null default '16:00',
  gamification_level text not null default 'subtle',
  tone text not null default 'direct',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  context text,
  priority integer not null default 0,
  status text not null default 'open' check (status in ('open', 'done', 'waiting')),
  waiting_for_person text,
  due_date date,
  source text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Handoffs table (morning kickstarts, end-of-day, transitions)
create table if not exists public.handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('morning_kickstart', 'end_of_day', 'transition')),
  content jsonb not null default '{}',
  raw_input text not null default '',
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Streaks table
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  streak_type text not null default 'kickstart',
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  created_at timestamptz not null default now(),
  unique(user_id, streak_type)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.handoffs enable row level security;
alter table public.streaks enable row level security;

-- Profiles: users can only see and edit their own row
create policy "profiles: own row only"
  on public.profiles for all
  using (id = auth.uid());

-- Tasks: users can only access their own tasks
create policy "tasks: own rows only"
  on public.tasks for all
  using (user_id = auth.uid());

-- Handoffs: users can only access their own handoffs
create policy "handoffs: own rows only"
  on public.handoffs for all
  using (user_id = auth.uid());

-- Streaks: users can only access their own streaks
create policy "streaks: own rows only"
  on public.streaks for all
  using (user_id = auth.uid());

-- ============================================================
-- Trigger: auto-create profile on new user signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
