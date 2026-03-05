# Transition Ritual — Design

**Date:** 2026-03-05
**Phase:** 3 — Feature 2 of 4
**Status:** Approved

---

## Context

The current `TransitionMode` is a Phase 1 placeholder — it captures a work parking note and saves a minimal handoff, with a "coming in Phase 3" message. This design replaces it with a full transition ritual (4-step wizard) and adds Web Push notifications that fire at the user's stored `transition_time` on working days.

---

## Approach

**Option A (chosen):** Full PWA Web Push + Vercel Cron + 4-step ritual wizard.

- Service worker registered on first load handles push events
- Push subscription stored in new `push_subscriptions` table
- Vercel cron runs every 15 minutes, sends notifications to users at their transition time
- Second reminder sent 30 minutes later if ritual not yet completed
- TransitionMode replaced with a 4-step wizard: parking → promises check → presence intention → done

---

## Data Model

New migration `supabase/migrations/007_push_subscriptions.sql`:

```sql
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions: own rows only"
  on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index push_subscriptions_user on push_subscriptions (user_id);
```

No changes to existing tables. Second-reminder logic reads today's `handoffs` row (type='transition') to decide whether to re-notify.

`TransitionContent` type extended:
```typescript
interface TransitionContent {
  parking_note: string
  evening_promises: string[]   // titles of promises flagged as relevant tonight
  presence_intention: string
}
```

---

## Web Push Infrastructure

**VAPID keys** — generated once via `npx web-push generate-vapid-keys`. Stored as Vercel env vars:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto: address)

**`api/vapid-public-key.ts`** — public GET endpoint, returns `{ publicKey }`. Called by the app to subscribe the browser.

**`public/sw.js`** — service worker:
- `push` event: calls `self.registration.showNotification()` with title + body from the push payload
- `notificationclick` event: focuses/opens the app URL, closes the notification

**`src/hooks/useTransitionReminder.ts`** — manages push subscription lifecycle:
- On mount (after auth): checks `Notification.permission` and existing subscription
- Exposes `{ supported, permission, subscribed, subscribe, unsubscribe }`
- `subscribe()`: requests permission → `pushManager.subscribe` → saves to `push_subscriptions` table
- `unsubscribe()`: removes from browser + deletes from table

**`api/send-transition-notifications.ts`** — Vercel cron handler (also callable as POST for testing):
1. Query all `push_subscriptions` joined with `profiles`
2. For each user, check: is today in `work_days`? Does `transition_time` fall in the current 15-min window (first reminder) or 30 min ago (second reminder)?
3. Skip if today's `transition` handoff already exists
4. Send push notification via `web-push` to each of the user's subscriptions
5. Notification payload: `{ title: 'Time to transition', body: 'Park your work and head home.' }` (first) or `{ title: 'Transition reminder', body: 'Still time to close out the day.' }` (second)

**`vercel.json`** — add cron:
```json
{
  "crons": [{
    "path": "/api/send-transition-notifications",
    "schedule": "*/15 * * * *"
  }]
}
```

Push permission prompt shown once in the app (after auth, first visit): *"Get a reminder at your transition time each day?"* with Allow / Not now. Uses `useTransitionReminder` hook.

---

## Transition Ritual Wizard

`TransitionMode.tsx` replaced with a 4-step wizard. Step tracked in local state.

**Step indicator:** `Step N of 4` at top.

**Step 1 — Work Parking**
- Textarea: *"Any open loops or unfinished thoughts to park?"*
- Continue button calls Claude for a one-line parking confirmation
- Result shown; user can edit before proceeding

**Step 2 — Promises Check**
- Fetches active work promises via `usePromises(user, 'work')`
- If none → auto-advance to Step 3 with `evening_promises: []`
- If any → list with checkboxes: *"Any of these relevant for tonight?"*
- Continue saves checked promise titles to local state

**Step 3 — Presence Intention**
- Short text input: *"How will you be present tonight?"*
- Placeholder: *"Phone away. Ask Claire about her day."*
- Continue disabled until non-empty

**Step 4 — Done**
- Summary card: parking note + flagged promises + intention
- *"I'm done with work →"* button saves handoff and switches mode to Home

**Handoff save:** `type: 'transition'`, `content: { parking_note, evening_promises, presence_intention }`, `date: today`.

---

## Push Permission UI

A `PushPermissionBanner` component shown once in `App.tsx` (after auth, after onboarding):
- Shown when `supported && permission === 'default' && !subscribed`
- One-time prompt: *"Get a nudge at transition time each day?"* with Allow / Not now
- "Not now" sets a `localStorage` flag so it doesn't reappear in the same session
- Settings page gets a toggle to subscribe/unsubscribe at any time

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/007_push_subscriptions.sql` | New — push_subscriptions table + RLS |
| `src/types/index.ts` | Extend `TransitionContent` with `evening_promises` + `presence_intention` |
| `public/sw.js` | New — service worker (push + notificationclick) |
| `api/vapid-public-key.ts` | New — returns VAPID public key |
| `api/send-transition-notifications.ts` | New — Vercel cron handler, sends push via web-push |
| `vercel.json` | Add cron schedule |
| `src/hooks/useTransitionReminder.ts` | New — push subscription lifecycle |
| `src/components/TransitionMode.tsx` | Replace placeholder with 4-step wizard |
| `src/components/common/PushPermissionBanner.tsx` | New — one-time push permission prompt |
| `src/App.tsx` | Render PushPermissionBanner after auth |

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npm test` — all tests pass
3. Supabase: `push_subscriptions` table exists with RLS
4. Open app → permission banner appears → Allow → subscription saved in Supabase
5. POST `api/send-transition-notifications` directly → notification arrives on device
6. Work mode → Transition mode → 4-step wizard renders correctly → step 2 skips when no promises → handoff saved with all three fields
7. Vercel: cron visible in dashboard, fires every 15 minutes
