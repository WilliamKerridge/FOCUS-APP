-- supabase/migrations/005_profile_personal_emails.sql
alter table profiles
  add column if not exists personal_emails text[] default '{}'::text[];
