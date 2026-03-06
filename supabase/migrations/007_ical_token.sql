alter table profiles
  add column if not exists ical_token uuid not null default gen_random_uuid();
