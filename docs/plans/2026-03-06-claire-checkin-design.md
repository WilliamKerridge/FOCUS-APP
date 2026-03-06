# Claire Quality Time Check-in — Design

**Date:** 2026-03-06
**Phase:** 3 — Feature 3 of 4
**Status:** Approved

---

## Context

William wants to prioritise being genuinely present with Claire in the evenings — not just in the same house, but phone down and attentive. The app currently has no way to track or surface this. The feature adds a morning reflection step ("How was your evening with Claire yesterday?") at the start of the morning kickstart, before the brain dump. Recording it in the morning keeps the phone out of the evening entirely.

---

## Approach

A new first step in the morning kickstart asks William to reflect on the previous evening. One tap — Quality time / Partially present / Didn't manage it. Optional follow-up text if "Partially". Skippable. Saved to a new `claire_checkins` table. Claude receives the last 7 days as context and surfaces patterns naturally in the kickstart plan.

---

## Data Model

New migration `supabase/migrations/008_claire_checkins.sql`:

```sql
create table claire_checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  date         date not null,   -- the evening being reflected on (yesterday)
  quality_time text not null check (quality_time in ('yes', 'no', 'partial')),
  blocker      text,
  created_at   timestamptz default now() not null,
  unique (user_id, date)
);

alter table claire_checkins enable row level security;
create policy "Users manage own checkins"
  on claire_checkins for all using (auth.uid() = user_id);
```

New `ClaireCheckin` interface in `src/types/index.ts`:
```typescript
export interface ClaireCheckin {
  id: string
  user_id: string
  date: string          // 'YYYY-MM-DD' — the evening being reflected on
  quality_time: 'yes' | 'no' | 'partial'
  blocker: string | null
  created_at: string
}
```

---

## Morning Kickstart Step

`MorningKickstart.tsx` gains a new `step` state: `'claire' | 'dump'`.

**Step 1 — Claire check-in** (shown first, before brain dump):
- Heading: *"How was your evening with Claire yesterday?"*
- Three tap buttons: **Quality time** / **Partially present** / **Didn't manage it**
- If "Partially present": optional text input "What got in the way?" + Continue button
- **Skip** link at bottom — moves directly to brain dump step, no save
- On answer: saves to `claire_checkins` (upsert on `user_id, date`), then advances to brain dump

**Step 2 — Brain dump** (existing flow, unchanged)

The check-in step is skipped entirely if:
- Already answered today (fetched on mount alongside existing kickstart check)
- Kickstart already completed today (existing `result` pre-populated from DB)

---

## Hook

`src/hooks/useClaireCheckin.ts` — `useClaireCheckin(user)`:
- Fetches today's check-in (yesterday's date) on mount
- Fetches last 7 days of check-ins for Claude context
- Exposes: `todayCheckin`, `recentCheckins`, `loading`, `saveCheckin(date, quality_time, blocker?)`

---

## Claude Pattern Surfacing

`MorningKickstart.tsx` passes a `claireContext` string to the system prompt when patterns are notable. Built from `recentCheckins` (last 7 days):

| Pattern | Context string added to system prompt |
|---------|--------------------------------------|
| 3+ consecutive `no`/`partial` | `"William has had 3+ evenings without quality time with Claire recently."` |
| 5+ consecutive `yes` | `"William has had 5+ consecutive good evenings with Claire this week."` |
| 3+ consecutive `partial` | `"William has had 3+ partially-present evenings with Claire. Blockers: [list]."` |

Claude surfaces this naturally in the kickstart plan — at most once, in the most natural place. No new UI element needed. The `buildSystemPrompt()` function in `MorningKickstart.tsx` (lines 19-51) is extended to accept and include `claireContext`.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/008_claire_checkins.sql` | New — claire_checkins table + RLS |
| `src/types/index.ts` | Add `ClaireCheckin` interface |
| `src/hooks/useClaireCheckin.ts` | New — fetch, save, pattern detection |
| `src/hooks/useClaireCheckin.test.ts` | New — 4 tests |
| `src/components/kickstart/ClaireCheckin.tsx` | New — step UI component |
| `src/components/kickstart/ClaireCheckin.test.tsx` | New — 5 tests |
| `src/components/kickstart/MorningKickstart.tsx` | Add step state, render ClaireCheckin before brain dump, pass Claire context to system prompt |

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npm test` — all tests pass
3. Morning kickstart → Claire check-in step appears first → tap "Quality time" → advances to brain dump
4. "Partially present" → optional blocker text → Continue → advances
5. Skip → goes straight to brain dump, no row saved
6. Supabase: `claire_checkins` row with correct `date` (yesterday), `quality_time`, `blocker`
7. Answer 3 days with 'no' → next kickstart plan includes Claire awareness note
8. If kickstart already completed today → check-in step skipped on re-open
