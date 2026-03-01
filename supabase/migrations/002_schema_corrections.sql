-- ============================================================
-- FOCUS App — Schema Corrections (migration 002)
-- Fixes to align with documentation specs
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ── profiles: fix work_days to text[], add mode + timestamps ──

-- Drop old integer[] column and recreate as text[]
alter table public.profiles
  drop column if exists work_days;

alter table public.profiles
  add column work_days text[] not null default array['Mon','Tue','Wed','Thu','Fri'];

-- Add current_mode (persists across devices)
alter table public.profiles
  add column if not exists current_mode text not null default 'work'
    check (current_mode in ('work', 'transition', 'home'));

alter table public.profiles
  add column if not exists mode_changed_at timestamptz not null default now();

-- Add updated_at
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- ── handoffs: add Claire layer columns + index ──

alter table public.handoffs
  add column if not exists claire_quality_time text
    check (claire_quality_time in ('yes', 'no', 'partial'));

alter table public.handoffs
  add column if not exists claire_blocker text;

alter table public.handoffs
  add column if not exists updated_at timestamptz not null default now();

-- Index for fast date-ordered queries per user
create index if not exists handoffs_user_date
  on public.handoffs (user_id, date desc);

-- ── streaks: add updated_at, expand streak_type check ──

-- Drop old check constraint and recreate with all types
alter table public.streaks
  drop constraint if exists streaks_streak_type_check;

alter table public.streaks
  add constraint streaks_streak_type_check
    check (streak_type in ('kickstart', 'transition', 'focus', 'promise_rate'));

alter table public.streaks
  add column if not exists updated_at timestamptz not null default now();

-- ── tasks: add updated_at ──

alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();
