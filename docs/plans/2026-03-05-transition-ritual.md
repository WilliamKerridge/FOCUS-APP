# Transition Ritual Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the TransitionMode placeholder with a 4-step ritual wizard and send Web Push notifications at the user's transition time on working days.

**Architecture:** A service worker at `public/sw.js` handles push events. Push subscriptions are stored in a new `push_subscriptions` Supabase table via a `useTransitionReminder` hook. A Vercel cron runs every 15 minutes to send notifications via the `web-push` package to users whose `transition_time` falls in the current window and who haven't completed their ritual today. `TransitionMode` is rewritten as a 4-step wizard: parking → promises check → presence intention → done.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind + Supabase + Vercel cron + web-push npm package + Browser Push API

---

### Task 1: Manual Setup — DB Migration + VAPID Keys + Env Vars

**No code to write. Follow these steps manually.**

**Files:**
- Create: `supabase/migrations/007_push_subscriptions.sql`

**Step 1: Create the migration file**

```sql
-- supabase/migrations/007_push_subscriptions.sql

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: own rows only"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index push_subscriptions_user on public.push_subscriptions (user_id);
```

**Step 2: Run in Supabase SQL Editor**

Go to https://okepgyhffzogiqnltncr.supabase.co → SQL Editor → paste and run.

**Step 3: Install web-push**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

**Step 4: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy the output — it looks like:
```
Public Key: Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Step 5: Add env vars to Vercel**

In the Vercel dashboard for this project → Settings → Environment Variables, add:
- `VAPID_PUBLIC_KEY` = the public key from Step 4
- `VAPID_PRIVATE_KEY` = the private key from Step 4
- `VAPID_SUBJECT` = `mailto:will1kerridge@gmail.com`
- `CRON_SECRET` = any random string (e.g. generate with `openssl rand -hex 32`)

Also add all four to your local `.env.local` file for development.

**Step 6: Commit migration file**

```bash
git add supabase/migrations/007_push_subscriptions.sql
git commit -m "feat: add push_subscriptions table with RLS"
```

---

### Task 2: Extend TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Read the file**

Read `src/types/index.ts`. Find the `TransitionContent` interface (currently has `parking_note` and `presence_intention` fields).

**Step 2: Add `evening_promises` field and new `PushSubscription` interface**

Replace the existing `TransitionContent` interface:
```typescript
export interface TransitionContent {
  parking_note: string
  evening_promises: string[]   // titles of work promises flagged as relevant tonight
  presence_intention: string
}
```

Add after `UserPromise`:
```typescript
export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errors (the `evening_promises` addition may cause type errors elsewhere — fix any that appear by adding `evening_promises: []` to existing transition handoff inserts in `TransitionMode.tsx`).

**Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: extend TransitionContent with evening_promises, add PushSubscription type"
```

---

### Task 3: Service Worker + VAPID Public Key Endpoint

**Files:**
- Create: `public/sw.js`
- Create: `api/vapid-public-key.ts`

**Step 1: Create the service worker**

```javascript
// public/sw.js

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'FOCUS', {
      body: data.body ?? '',
      icon: '/favicon.ico',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(event.notification.data?.url ?? '/')
    })
  )
})
```

**Step 2: Create the VAPID public key endpoint**

```typescript
// api/vapid-public-key.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' })
}
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

**Step 4: Commit**

```bash
git add public/sw.js api/vapid-public-key.ts
git commit -m "feat: add service worker and VAPID public key endpoint"
```

---

### Task 4: send-transition-notifications API + Tests

**Files:**
- Create: `api/send-transition-notifications.ts`
- Create: `api/send-transition-notifications.test.ts`

**Step 1: Write the failing tests first**

```typescript
// api/send-transition-notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockSendNotification = vi.fn()
const mockFrom = vi.fn()
const mockCreateClient = vi.fn(() => ({ from: mockFrom }))

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: mockSendNotification },
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }))

import handler from './send-transition-notifications'

function makeReq(opts: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'GET',
    headers: { authorization: `Bearer test-secret` },
    ...opts,
  } as VercelRequest
}

function makeRes(): { res: VercelResponse; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json, end: vi.fn() })
  const res = { json, status } as unknown as VercelResponse
  return { res, json, status }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
  vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
  vi.stubEnv('VAPID_SUBJECT', 'mailto:test@test.com')
})

// Helpers for Supabase chain mocks
function makeSelectChain(data: unknown, data2: unknown = []) {
  let callCount = 0
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        // first call: push_subscriptions, second call: handoffs
        then: (fn: (r: unknown) => unknown) => {
          callCount++
          return Promise.resolve(fn(callCount === 1
            ? { data, error: null }
            : { data: data2, error: null }))
        },
        eq: vi.fn().mockReturnThis(),
      })),
    })),
  }
}

describe('send-transition-notifications', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { res, status } = makeRes()
    await handler(makeReq({ headers: {} }), res)
    expect(status).toHaveBeenCalledWith(401)
  })

  it('sends notification when transition_time matches and today is a work day', async () => {
    // Set up: user with transition_time matching current UTC time window
    const now = new Date()
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')
    const transitionTime = `${hh}:${mm}`

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayDay = days[now.getUTCDay()]

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: transitionTime, work_days: [todayDay] },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) }
    })
    mockSendNotification.mockResolvedValue(undefined)

    const { res, json } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).toHaveBeenCalledOnce()
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ sent: 1 }))
  })

  it('does NOT send notification when today is not a work day for the user', async () => {
    const now = new Date()
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')
    const transitionTime = `${hh}:${mm}`

    // Give all days EXCEPT today
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayDay = days[now.getUTCDay()]
    const workDays = days.filter(d => d !== todayDay)

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: transitionTime, work_days: workDays },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) }
    })

    const { res } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('does NOT send when transition handoff already exists today', async () => {
    const now = new Date()
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')
    const transitionTime = `${hh}:${mm}`
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayDay = days[now.getUTCDay()]

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: transitionTime, work_days: [todayDay] },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      // handoffs — return an existing handoff for this user
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [{ user_id: 'u1' }], error: null })) })) })) }
    })

    const { res } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --run api/send-transition-notifications.test.ts
```
Expected: FAIL (module not found)

**Step 3: Implement the handler**

```typescript
// api/send-transition-notifications.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function utcDayAbbrev(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getUTCDay()]
}

function utcMinutes(): number {
  const now = new Date()
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]
  const todayDay = utcDayAbbrev()
  const currentMins = utcMinutes()

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*, profiles!inner(transition_time, work_days)')

  if (error) return res.status(500).json({ error: error.message })

  const { data: doneHandoffs } = await supabase
    .from('handoffs')
    .select('user_id')
    .eq('type', 'transition')
    .eq('date', today)

  const doneUserIds = new Set((doneHandoffs ?? []).map((h: { user_id: string }) => h.user_id))

  let sent = 0
  await Promise.allSettled(
    (subs ?? []).map(async (sub: {
      user_id: string
      endpoint: string
      p256dh: string
      auth: string
      profiles: { transition_time: string; work_days: string[] }
    }) => {
      const { transition_time, work_days } = sub.profiles
      if (!work_days.includes(todayDay)) return
      if (doneUserIds.has(sub.user_id)) return

      const transitionMins = timeToMinutes(transition_time)
      const isFirst = currentMins >= transitionMins && currentMins < transitionMins + 15
      const isSecond = currentMins >= transitionMins + 30 && currentMins < transitionMins + 45
      if (!isFirst && !isSecond) return

      const payload = JSON.stringify(
        isFirst
          ? { title: 'Time to transition', body: 'Park your work and head home.', url: '/' }
          : { title: 'Transition reminder', body: 'Still time to close out the day.', url: '/' }
      )

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    })
  )

  res.json({ sent, total: subs?.length ?? 0 })
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --run api/send-transition-notifications.test.ts
```
Expected: all 4 PASS

**Step 5: Full suite**

```bash
npm test -- --run
```
Expected: all pass

**Step 6: Commit**

```bash
git add api/send-transition-notifications.ts api/send-transition-notifications.test.ts
git commit -m "feat: add send-transition-notifications cron handler with tests"
```

---

### Task 5: vercel.json Cron Config

**Files:**
- Modify: `vercel.json`

**Step 1: Read current vercel.json**

Read `/Users/williamkerridge/Documents/FOCUS/vercel.json`. It currently has:
```json
{
  "functions": {
    "api/claude.ts": {
      "maxDuration": 30
    }
  }
}
```

**Step 2: Add cron entry**

```json
{
  "functions": {
    "api/claude.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/send-transition-notifications",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Step 3: TypeScript check + tests**

```bash
npx tsc --noEmit && npm test -- --run
```
Expected: zero errors, all tests pass

**Step 4: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron for transition notifications every 15 minutes"
```

---

### Task 6: useTransitionReminder Hook + Tests

**Files:**
- Create: `src/hooks/useTransitionReminder.ts`
- Create: `src/hooks/useTransitionReminder.test.ts`

**Step 1: Write failing tests**

```typescript
// src/hooks/useTransitionReminder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

// Mock browser push APIs
const mockGetSubscription = vi.fn()
const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn()
const mockReady = Promise.resolve({
  pushManager: {
    getSubscription: mockGetSubscription,
    subscribe: mockSubscribe,
  },
})

Object.defineProperty(global, 'Notification', {
  value: { permission: 'default' },
  writable: true,
})
Object.defineProperty(navigator, 'serviceWorker', {
  value: { ready: mockReady },
  writable: true,
})
Object.defineProperty(window, 'PushManager', { value: {}, writable: true })

global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ publicKey: 'test-pub-key' }),
})

import { useTransitionReminder } from './useTransitionReminder'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSubscription.mockResolvedValue(null)
})

describe('useTransitionReminder', () => {
  it('sets supported=true and subscribed=false when no subscription exists', async () => {
    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.supported).toBe(true)
    expect(result.current.subscribed).toBe(false)
  })

  it('sets subscribed=true when subscription already exists', async () => {
    mockGetSubscription.mockResolvedValue({ endpoint: 'https://example.com' })
    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.subscribed).toBe(true)
  })

  it('subscribe() calls pushManager.subscribe and saves to supabase', async () => {
    const fakeSub = {
      endpoint: 'https://push.example.com/sub',
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub',
        keys: { p256dh: 'p256', auth: 'authkey' },
      }),
    }
    mockSubscribe.mockResolvedValue(fakeSub)
    const upsertMock = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValue({ upsert: upsertMock })
    mockGetSubscription.mockResolvedValue(null)

    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = 'not-called'
    await act(async () => { err = await result.current.subscribe() })

    expect(err).toBeNull()
    expect(result.current.subscribed).toBe(true)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', endpoint: 'https://push.example.com/sub' }),
      expect.any(Object)
    )
  })

  it('unsubscribe() calls sub.unsubscribe and deletes from supabase', async () => {
    const fakeSub = {
      endpoint: 'https://push.example.com/sub',
      unsubscribe: vi.fn().mockResolvedValue(true),
    }
    mockGetSubscription.mockResolvedValue(fakeSub)
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })
    mockFrom.mockReturnValue({ delete: deleteMock })

    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.subscribed).toBe(true))

    await act(async () => { await result.current.unsubscribe() })

    expect(fakeSub.unsubscribe).toHaveBeenCalled()
    expect(result.current.subscribed).toBe(false)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/hooks/useTransitionReminder.test.ts
```
Expected: FAIL (module not found)

**Step 3: Implement the hook**

```typescript
// src/hooks/useTransitionReminder.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function useTransitionReminder(user: User | null) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(isSupported)
    if (!isSupported) { setLoading(false); return }
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(sub !== null)
        setLoading(false)
      })
    })
  }, [user?.id])

  const subscribe = useCallback(async (): Promise<string | null> => {
    if (!user) return 'Not authenticated'
    try {
      const res = await fetch('/api/vapid-public-key')
      const { publicKey } = await res.json() as { publicKey: string }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = sub.toJSON()
      const keys = json.keys as Record<string, string>
      const { error } = await supabase.from('push_subscriptions').upsert(
        { user_id: user.id, endpoint: json.endpoint!, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'user_id,endpoint' }
      )
      if (error) return "Couldn't save subscription"
      setSubscribed(true)
      setPermission('granted')
      return null
    } catch {
      return 'Could not subscribe to notifications'
    }
  }, [user])

  const unsubscribe = useCallback(async (): Promise<string | null> => {
    if (!user) return 'Not authenticated'
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', user.id).eq('endpoint', sub.endpoint)
      }
      setSubscribed(false)
      return null
    } catch {
      return 'Could not unsubscribe'
    }
  }, [user])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/hooks/useTransitionReminder.test.ts
```
Expected: all 4 PASS

**Step 5: Run full suite**

```bash
npm test -- --run
```

**Step 6: Commit**

```bash
git add src/hooks/useTransitionReminder.ts src/hooks/useTransitionReminder.test.ts
git commit -m "feat: add useTransitionReminder hook with tests"
```

---

### Task 7: TransitionMode Wizard + Tests

**Files:**
- Modify: `src/components/modes/TransitionMode.tsx` (full rewrite)
- Create: `src/components/modes/TransitionMode.test.tsx`

The current component at `src/components/modes/TransitionMode.tsx` only receives `{ user: User }`. We are adding `onModeChange` — App.tsx will be updated in Task 9.

**Step 1: Write failing tests first**

```typescript
// src/components/modes/TransitionMode.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import type { UserPromise } from '@/types'

const mockCallClaude = vi.fn()
const mockFrom = vi.fn()
const mockCompletePromise = vi.fn()

vi.mock('@/lib/claude', () => ({ callClaude: (...args: unknown[]) => mockCallClaude(...args) }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))
vi.mock('@/hooks/usePromises', () => ({
  usePromises: () => ({
    promises: mockPromises,
    loading: false,
    error: null,
    completePromise: mockCompletePromise,
    addPromise: vi.fn(),
    archivePromise: vi.fn(),
  }),
}))

let mockPromises: UserPromise[] = []

import TransitionMode from './TransitionMode'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
  mockPromises = []
})

describe('TransitionMode', () => {
  it('shows Step 1 of 4 on initial render', () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    expect(screen.getByText(/park your work/i)).toBeInTheDocument()
  })

  it('step 1: Continue calls Claude and advances to step 2 when promises exist', async () => {
    mockCallClaude.mockResolvedValue('Work parked. Enjoy your evening.')
    mockPromises = [{
      id: 'p-1', user_id: 'user-1', title: 'Call Alice', made_to: null,
      context: 'work', due_date: '2026-03-05', status: 'active',
      completed_at: null, created_at: '2026-03-05T00:00:00Z',
    }]
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Finish report')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    expect(screen.getByText(/promises check/i)).toBeInTheDocument()
    expect(screen.getByText(/call alice/i)).toBeInTheDocument()
  })

  it('step 1: skips to step 3 when no promises exist', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Something')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
  })

  it('step 3: Continue disabled when intention empty', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('step 4: shows summary and calls supabase insert + onModeChange on done', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    const insertFn = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValue({ insert: insertFn })
    const onModeChange = vi.fn()

    render(<TransitionMode user={fakeUser} onModeChange={onModeChange} />)

    // Step 1 → 3 (no promises)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Finish report')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())

    // Step 3 → 4
    await userEvent.type(screen.getByPlaceholderText(/phone away/i), 'Be present')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument())

    // Step 4 → save
    await userEvent.click(screen.getByRole('button', { name: /done with work/i }))
    await waitFor(() => expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'transition',
        content: expect.objectContaining({ presence_intention: 'Be present' }),
      })
    ))
    expect(onModeChange).toHaveBeenCalledWith('home')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/components/modes/TransitionMode.test.tsx
```
Expected: FAIL

**Step 3: Rewrite TransitionMode**

```typescript
// src/components/modes/TransitionMode.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import { usePromises } from '@/hooks/usePromises'
import { getToday } from '@/lib/utils'
import type { Mode } from '@/types'

interface Props {
  user: User
  onModeChange: (mode: Mode) => void
}

export default function TransitionMode({ user, onModeChange }: Props) {
  const { promises } = usePromises(user, 'work')
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1
  const [parkingInput, setParkingInput] = useState('')
  const [parkingNote, setParkingNote] = useState('')
  const [parkingLoading, setParkingLoading] = useState(false)

  // Step 2
  const [checkedPromises, setCheckedPromises] = useState<boolean[]>([])

  // Step 3
  const [intention, setIntention] = useState('')

  // Step 4
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function advanceFromStep1(note: string) {
    setParkingNote(note)
    const hasPromises = promises.length > 0
    if (hasPromises) {
      setCheckedPromises(promises.map(() => false))
      setStep(2)
    } else {
      setStep(3)
    }
  }

  async function handleParkingContinue() {
    if (!parkingInput.trim()) {
      advanceFromStep1('')
      return
    }
    setParkingLoading(true)
    try {
      const note = await callClaude([
        { role: 'user', content: `I'm done with work. Open loops: ${parkingInput.trim()}. Give me a one-line parking confirmation.` },
      ])
      advanceFromStep1(note.trim())
    } catch {
      advanceFromStep1(parkingInput.trim())
    }
    setParkingLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const eveningPromises = promises
      .filter((_, i) => checkedPromises[i])
      .map(p => p.title)
    const { error } = await supabase.from('handoffs').insert({
      user_id: user.id,
      type: 'transition',
      content: {
        parking_note: parkingNote || parkingInput,
        evening_promises: eveningPromises,
        presence_intention: intention,
      },
      raw_input: parkingInput || 'manual transition',
      date: getToday(),
    })
    if (error) {
      setSaveError("Couldn't save — try again.")
      setSaving(false)
      return
    }
    onModeChange('home')
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
        Step {step} of 4
      </p>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Park your work</h2>
          <textarea
            value={parkingInput}
            onChange={e => setParkingInput(e.target.value)}
            placeholder="Any open loops or unfinished thoughts to park?"
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
          />
          <button
            onClick={handleParkingContinue}
            disabled={parkingLoading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {parkingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {parkingLoading ? 'Parking…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Promises check</h2>
          <p className="text-sm text-muted-foreground">Any of these relevant for tonight?</p>
          <div className="space-y-2">
            {promises.map((p, i) => (
              <label key={p.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedPromises[i] ?? false}
                  onChange={e =>
                    setCheckedPromises(prev => prev.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                  className="mt-0.5"
                />
                <span className="text-sm">
                  {p.title}{p.made_to ? ` — to ${p.made_to}` : ''}
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Presence intention</h2>
          <p className="text-sm text-muted-foreground">How will you be present tonight?</p>
          <input
            type="text"
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="Phone away. Ask Claire about her day."
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            onClick={() => setStep(4)}
            disabled={!intention.trim()}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Continue
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Ready to close out</h2>
          <div className="space-y-3 px-4 py-4 rounded-xl bg-secondary border border-border text-sm">
            {(parkingNote || parkingInput) && (
              <p>
                <span className="text-muted-foreground">Parked: </span>
                {parkingNote || parkingInput}
              </p>
            )}
            {promises.filter((_, i) => checkedPromises[i]).length > 0 && (
              <p>
                <span className="text-muted-foreground">Tonight: </span>
                {promises.filter((_, i) => checkedPromises[i]).map(p => p.title).join(', ')}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Intention: </span>
              {intention}
            </p>
          </div>
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : "I'm done with work →"}
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/components/modes/TransitionMode.test.tsx
```
Expected: all 5 PASS

**Step 5: Run full suite**

```bash
npm test -- --run
```

**Step 6: Commit**

```bash
git add src/components/modes/TransitionMode.tsx src/components/modes/TransitionMode.test.tsx
git commit -m "feat: replace TransitionMode placeholder with 4-step ritual wizard"
```

---

### Task 8: PushPermissionBanner + Tests

**Files:**
- Create: `src/components/common/PushPermissionBanner.tsx`
- Create: `src/components/common/PushPermissionBanner.test.tsx`

**Step 1: Write failing tests**

```typescript
// src/components/common/PushPermissionBanner.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'

const mockSubscribe = vi.fn()

vi.mock('@/hooks/useTransitionReminder', () => ({
  useTransitionReminder: () => ({
    supported: mockSupported,
    permission: mockPermission,
    subscribed: mockSubscribed,
    loading: false,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn(),
  }),
}))

let mockSupported = true
let mockPermission: NotificationPermission = 'default'
let mockSubscribed = false

import PushPermissionBanner from './PushPermissionBanner'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
  mockSupported = true
  mockPermission = 'default'
  mockSubscribed = false
  localStorage.clear()
})

describe('PushPermissionBanner', () => {
  it('renders when supported, permission=default, not subscribed', () => {
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.getByText(/nudge at transition time/i)).toBeInTheDocument()
  })

  it('does not render when already subscribed', () => {
    mockSubscribed = true
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('does not render when permission is granted', () => {
    mockPermission = 'granted'
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('does not render when not supported', () => {
    mockSupported = false
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('calls subscribe on Allow click', async () => {
    mockSubscribe.mockResolvedValue(null)
    render(<PushPermissionBanner user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /allow/i }))
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('hides after Not now click and sets localStorage flag', async () => {
    render(<PushPermissionBanner user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
    expect(localStorage.getItem('push-banner-dismissed')).toBe('1')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/components/common/PushPermissionBanner.test.tsx
```
Expected: FAIL

**Step 3: Implement the component**

```typescript
// src/components/common/PushPermissionBanner.tsx
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useTransitionReminder } from '@/hooks/useTransitionReminder'

const DISMISSED_KEY = 'push-banner-dismissed'

interface Props {
  user: User
}

export default function PushPermissionBanner({ user }: Props) {
  const { supported, permission, subscribed, loading, subscribe } = useTransitionReminder(user)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')
  const [subscribing, setSubscribing] = useState(false)

  if (loading || !supported || permission !== 'default' || subscribed || dismissed) return null

  async function handleAllow() {
    setSubscribing(true)
    await subscribe()
    setSubscribing(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
      <p className="text-sm">Get a nudge at transition time each day?</p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleAllow}
          disabled={subscribing}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          {subscribing ? 'Setting up…' : 'Allow'}
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/components/common/PushPermissionBanner.test.tsx
```
Expected: all 6 PASS

**Step 5: Run full suite**

```bash
npm test -- --run
```

**Step 6: Commit**

```bash
git add src/components/common/PushPermissionBanner.tsx src/components/common/PushPermissionBanner.test.tsx
git commit -m "feat: add PushPermissionBanner with tests"
```

---

### Task 9: Wire into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Read App.tsx**

Read `/Users/williamkerridge/Documents/FOCUS/src/App.tsx` to find:
- The import section at the top
- The line `{currentMode === 'transition' && <TransitionMode user={user} />}`
- The final return statement (the Layout render)

**Step 2: Add imports**

```typescript
import PushPermissionBanner from '@/components/common/PushPermissionBanner'
```

**Step 3: Pass `onModeChange` to TransitionMode**

Find:
```typescript
{currentMode === 'transition' && <TransitionMode user={user} />}
```

Replace with:
```typescript
{currentMode === 'transition' && <TransitionMode user={user} onModeChange={handleModeChange} />}
```

**Step 4: Render PushPermissionBanner above the Layout**

Find the final return in the authenticated render path — something like:
```typescript
return <Layout header={header} modeSelector={modeSelector} nudge={nudge} content={content} />
```

Replace with:
```tsx
return (
  <>
    <PushPermissionBanner user={user} />
    <Layout header={header} modeSelector={modeSelector} nudge={nudge} content={content} />
  </>
)
```

**Step 5: Register the service worker**

Add this near the bottom of App.tsx (inside the component, in a `useEffect` with empty deps), after the existing hooks:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  }
}, [])
```

**Step 6: TypeScript check + tests**

```bash
npx tsc --noEmit && npm test -- --run
```
Expected: zero errors, all tests pass

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire PushPermissionBanner and onModeChange into App.tsx, register service worker"
```

---

### Task 10: Final Verification + Push

**Step 1: TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors

**Step 2: Full test suite**

```bash
npm test -- --run
```
Expected: all tests pass (118 + new tests)

**Step 3: Manual smoke test checklist**

- [ ] App loads → push permission banner appears (if not previously dismissed)
- [ ] Click Allow → browser asks for notification permission → subscription saved in `push_subscriptions` table
- [ ] Work mode → Transition mode → Step 1 of 4 renders (no "coming in Phase 3" placeholder)
- [ ] Step 1: type parking note → Continue → Claude parks it → advances to Step 2 (if active work promises exist) or Step 3 (if none)
- [ ] Step 3: Continue disabled until intention typed
- [ ] Step 4: "I'm done with work →" → saves handoff → switches to Home mode
- [ ] Supabase: `handoffs` row with `type='transition'`, `content.evening_promises`, `content.presence_intention`
- [ ] POST to `/api/send-transition-notifications` with `Authorization: Bearer <CRON_SECRET>` → returns `{ sent: N, total: N }`
- [ ] Vercel dashboard: cron visible and scheduled

**Step 4: Push**

```bash
git push origin main
```

**Step 5: Add Vercel env vars** (if not already done in Task 1)

In Vercel dashboard → Settings → Environment Variables, verify all four are set:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`
