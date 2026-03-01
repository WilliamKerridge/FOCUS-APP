# Authentication — `documentation/01-auth.md`

## Overview

FOCUS uses Supabase Auth with email and password. There are no social login providers (no Google, no Apple). Authentication is required before any part of the app is accessible — there is no public view.

William's login email: `will1kerridge@gmail.com`

---

## Data Model

### `auth.users` (managed by Supabase — do not modify directly)

Supabase creates and manages this table automatically.

### `profiles` (FOCUS-managed, extends auth.users)

```sql
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  work_days text[] default array['Mon','Tue','Wed','Thu','Fri'],
  transition_time time default '16:00',
  gamification_level text default 'subtle',
  tone text default 'direct',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RLS policy:
```sql
alter table profiles enable row level security;
create policy "Users can only access their own profile"
  on profiles for all using (id = auth.uid());
```

A profile row is created automatically on first sign-up via a Supabase database trigger on `auth.users`.

---

## Auth Behaviour

| Scenario | Behaviour |
|----------|-----------|
| First visit | Login screen shown. No app content visible. |
| Successful login | Redirect to app. Session persisted in browser. |
| Session active (returning visit) | Skip login, go directly to app. |
| Session expired | Redirect to login screen. Do not show an error — just redirect. |
| Incorrect password | Show: `"Email or password incorrect."` — do not specify which is wrong. |
| Password reset requested | Supabase emails `will1kerridge@gmail.com` with reset link. |
| New device | Full login required. Session does not transfer. |
| Manual logout | Clear session, redirect to login. |

---

## Session Handling

Use the Supabase client's `onAuthStateChange` listener in a top-level provider. Every protected route checks for a valid session before rendering.

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

---

## Protected Route Pattern

Every page component that requires auth wraps its content:

```typescript
// If loading — show nothing (avoid flash of unauthenticated content)
// If no user — redirect to /login
// If user — render page
```

---

## Onboarding Gate

After login, check `profiles.onboarding_complete`. If `false`, redirect to the onboarding flow before showing the main app. Once onboarding is complete, set `onboarding_complete = true` and never show it again.

---

## Edge Cases

- **Profile row missing after login** — the trigger should always create it, but if it's absent, create it on first authenticated request rather than throwing an error
- **Session token expired mid-session** — Supabase client auto-refreshes tokens; handle the case where refresh fails by redirecting to login without losing the user's current page input
- **Email not confirmed** — Supabase email confirmation is disabled for this single-user app; skip email verification in Supabase dashboard settings
