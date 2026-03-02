-- supabase/migrations/004_email_inbox.sql

create table email_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sender_email text not null,
  context text not null check (context in ('work', 'home')),
  subject text,
  extraction jsonb,
  flagged boolean default false,
  reviewed boolean default false,
  created_at timestamptz default now()
);

alter table email_inbox enable row level security;
create policy "Users access own inbox only"
  on email_inbox for all using (user_id = auth.uid());

create index email_inbox_user_reviewed on email_inbox (user_id, reviewed, created_at desc);
