-- supabase/migrations/006_promises.sql

create table if not exists public.promises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  made_to      text,
  context      text not null check (context in ('work', 'home')),
  due_date     date not null,
  status       text not null default 'active' check (status in ('active', 'completed', 'archived')),
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.promises enable row level security;

create policy "promises: own rows only"
  on public.promises for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index promises_user_status on public.promises (user_id, status);
create index promises_user_due on public.promises (user_id, due_date);
