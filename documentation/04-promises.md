# Promises System — `documentation/04-promises.md`

## Overview

The promises system tracks things William has committed to doing. It is not a task manager — it is a reliability engine. The key distinction: a task is something William wants to do, a promise is something someone else is counting on him to do.

**This is a Phase 2 feature.** Do not build it during Phase 1.

---

## Data Model

```sql
create table promises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  made_to text,                  -- Nullable. e.g. 'Claire', 'Mum', child name. Not prominently shown in v1.
  due_date date,                 -- Nullable soft deadline
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table promises enable row level security;
create policy "Users access own promises only"
  on promises for all using (user_id = auth.uid());

create index promises_user_status on promises (user_id, status, due_date);
```

---

## Capturing a Promise

Minimum friction. One input field: `"What did you promise, and to whom?"`

William types naturally: `"promised to sort the car insurance this week"` or `"told Claire I'd call the plumber"`

Claude (or simple parsing) extracts:
- `title` — the promise itself
- `made_to` — who it was made to, if mentioned (stored but not displayed prominently in v1)
- `due_date` — if a timeframe is mentioned ("this week" = end of current week, "tomorrow" = tomorrow's date)

If a `due_date` cannot be inferred, leave it null. Do not ask William to specify — the promise is captured immediately.

**Where capture is available:**
- Work Mode: quick capture button (for promises made during work calls or emails)
- Home Mode: primary capture entry point
- Email Drop Zone: promises extracted from email content are added here automatically (with confirmation)

---

## Surfacing Promises

Promises are surfaced in three places. They are never pushed aggressively — the tone is always a gentle reminder, not a nag.

| When | What is shown | How |
|------|--------------|-----|
| Morning kickstart | Promises with `due_date` of today or earlier | Included in Claude's kickstart output under `flagged_promises` |
| Transition ritual | All active promises | Claude asks: "Anything you've promised that's relevant to tonight?" |
| On request | All active promises | User taps "What have I promised?" — shows full active list |
| 48 hours before due_date | Gentle flag | Apple Reminders entry written (Phase 1) or Web Push (Phase 2) |

**Sort order for the active promise list:**
1. Overdue (past `due_date`) — shown first, no special styling beyond order
2. Due today
3. Due this week
4. Due later / no due date — alphabetical

---

## Promise Completion Rate (Streak Data)

The rolling 30-day promise completion rate is calculated as:

```
completed in last 30 days / (completed + archived as broken in last 30 days)
```

This is used by the `streaks` system (see `documentation/09-streaks.md`). It is displayed quietly below the promise list — a percentage, no label beyond `"30-day rate"`.

---

## Closing a Promise

When William marks a promise complete:
1. Set `status = 'completed'` and `completed_at = now()`
2. Show a brief acknowledgement — `"Done. Good."` — no fanfare
3. Update the promise completion rate in the streaks table
4. The promise moves off the active list but remains in the database for the track record

**Archiving a promise (didn't happen, no longer relevant):**
- Swipe action or long press → "Archive this"
- Sets `status = 'archived'`
- Archived promises do not count against the completion rate unless explicitly marked as broken (a separate option)
- In v2, this data becomes part of the shared visibility layer for Claire

---

## Business Rules

- **Family category only in v1**: All promises are in a single list. The `made_to` field is stored silently for every promise but not used to filter or display in v1. Do not build category tabs or filters yet.
- **No duplicate detection**: If William enters the same promise twice, allow it. Do not merge or flag duplicates — that complexity is not worth the edge case.
- **No required fields beyond title**: `made_to` and `due_date` are always optional. Never block a capture because a field is empty.
- **Promises survive mode switches**: Active promises are always accessible regardless of current mode.
- **Promises from the Email Drop Zone**: Added with `made_to` set to the email sender if identifiable. Require one-tap confirmation before saving.

---

## Edge Cases

- **Promise marked complete then regretted**: Provide an undo option for 10 seconds after marking complete (a dismissible toast with "Undo"). After that, the completion stands.
- **No active promises**: Show `"No active promises."` — do not show an empty state with suggestions or prompts to add one.
- **Very old promises (90+ days active)**: Surface once in a morning kickstart: `"You have a promise from [X weeks] ago: [title]. Still relevant?"` — offer Complete, Archive, or Dismiss (snooze 7 days).
