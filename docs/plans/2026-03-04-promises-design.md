# Promises System — Design

**Date:** 2026-03-04
**Phase:** 3 — Feature 1 of 4
**Status:** Approved

---

## Context

William makes commitments throughout the day — to clients, colleagues, and Claire — but has no way to track them inside FOCUS. They get lost in email threads or forgotten entirely. The promises system captures these commitments, surfaces them daily in the morning kickstart as a standing reminder, and closes the loop when they're fulfilled.

---

## Approach

Option A: Promises as a sub-view in each mode. A "Promises" button in Work mode and Home mode grids opens a context-specific sub-view. Work promises (clients, colleagues) live in Work mode; home promises (Claire, family) live in Home mode. This follows the existing pattern for all other sub-views (Kickstart, End of Day, Email, Weekly Review).

---

## Data Model

New migration `supabase/migrations/006_promises.sql`:

```sql
create table promises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade not null,
  title        text not null,
  made_to      text,
  context      text not null check (context in ('work', 'home')),
  due_date     date not null,
  status       text not null default 'active' check (status in ('active', 'completed', 'archived')),
  completed_at timestamptz,
  created_at   timestamptz default now() not null
);

alter table promises enable row level security;
create policy "Users manage own promises"
  on promises for all using (auth.uid() = user_id);
```

New `Promise` interface in `src/types/index.ts`. The existing `EmailExtractionPromise` type stays separate — it is the shape Claude returns from email extraction, not a DB row.

---

## Capture UI

`src/components/promises/PromisesList.tsx` — shared sub-view, receives `context: 'work' | 'home'` prop.

**Quick-add form (top):**
- "What did you promise?" text input
- "To whom?" text input (optional) — placeholder hints differ by context
- Due date input — defaults to today + 7 days
- "Add promise" button — disabled until title is non-empty

**Active promises list (below form):**
- Sorted: overdue → due today → due this week → due later
- Each row: title, `made_to` if set, due date chip (red=overdue, amber=today, grey=future)
- Tap to complete → optimistic UI, 5-second undo toast
- Archive option via secondary action

**Mode wiring:**
- `WorkMode.tsx` — "Promises" button → `setView('promises')`, renders `<PromisesList context="work" />`
- `HomeMode.tsx` — "Promises" button → `setView('promises')`, renders `<PromisesList context="home" />`

---

## Hook

`src/hooks/usePromises.ts` — `usePromises(user, context)`:
- Fetches active promises for the given context on mount
- Exposes: `promises`, `loading`, `error`, `addPromise`, `completePromise`, `archivePromise`
- `addPromise`: inserts row, optimistic update
- `completePromise`: sets `status='completed'`, `completed_at=now()`, removes from active list
- `archivePromise`: sets `status='archived'`, removes from list

---

## Kickstart Integration

Every morning kickstart surfaces all active promises (both contexts) as a standing section.

**Data flow:**
1. `MorningKickstart` fetches active promises via `usePromises` before calling Claude
2. Promises passed into Claude system prompt as context: active titles + due dates
3. Claude flags overdue/due-today ones in `flagged_promises` array (already in `KickstartContent` type)
4. `KickstartPlanDisplay` renders a **Promises** section with tap-to-complete checkboxes
5. Checking one off calls `completePromise(id)` directly

Section hidden if no active promises exist. Files changed: `MorningKickstart.tsx`, `KickstartPlanDisplay.tsx`, `api/claude.ts`.

---

## Email Extraction Integration

Claude already extracts promises from emails (`EmailExtractionPromise[]`). Currently shown with a "coming in a future update" note.

**EmailDropZone + EmailInboxReview:**
- Remove the placeholder note
- Checked promises saved to `promises` table on save
- `context='work'`, `made_to` from extraction field, `due_date` defaults to today + 7 if null
- `source` recorded as `email_drop` or `email_forward`

No new files — changes to `EmailDropZone.tsx` and `EmailInboxReview.tsx`.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/006_promises.sql` | New — promises table + RLS |
| `src/types/index.ts` | Add `Promise` interface |
| `src/hooks/usePromises.ts` | New — fetch, add, complete, archive |
| `src/components/promises/PromisesList.tsx` | New — sub-view, quick-add + list |
| `src/components/modes/WorkMode.tsx` | Add Promises button + view |
| `src/components/modes/HomeMode.tsx` | Add Promises button + view |
| `src/components/kickstart/MorningKickstart.tsx` | Feed promises into Claude prompt |
| `src/components/kickstart/KickstartPlanDisplay.tsx` | Render Promises section |
| `api/claude.ts` | Add promises context to kickstart system prompt |
| `src/components/email/EmailDropZone.tsx` | Wire promise saves |
| `src/components/email/EmailInboxReview.tsx` | Wire promise saves |

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npm test` — all tests pass
3. Work mode → Promises → add a promise → appears in list with correct due date
4. Home mode → Promises → add a promise → appears separately from work promises
5. Morning kickstart → active promises appear as a section → check one off → marked complete in DB
6. Paste email with promises → extract → promises section shows → save → row in `promises` table
7. Supabase: `promises` row has correct `context`, `made_to`, `due_date`, `status='active'`
