# Streaks — `documentation/09-streaks.md`

## Overview

Streaks track consecutive days of completing key FOCUS habits. They exist to provide dopamine signalling for an ADHD brain — making abstract habits feel concrete and worth protecting. The implementation is deliberately subtle: counters are visible, but Claude references them naturally in conversation rather than displaying a dashboard.

---

## Data Model

```sql
create table streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  streak_type text not null check (streak_type in ('kickstart', 'transition', 'focus', 'promise_rate')),
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, streak_type)
);

alter table streaks enable row level security;
create policy "Users access own streaks only"
  on streaks for all using (user_id = auth.uid());
```

One row per streak type per user. Created automatically when the user first completes each activity.

---

## Streak Types

| Type | What counts as a completion | Reset condition |
|------|----------------------------|----------------|
| `kickstart` | A `morning_kickstart` handoff saved for today | Missed calendar day (any day of week) |
| `transition` | A `transition` handoff saved, OR transition ritual manually marked complete | Missed calendar day |
| `focus` | At least one `focus_session` with `ended_at` set for today | Missed calendar day |
| `promise_rate` | Not a daily streak — rolling 30-day completion rate (see below) | N/A |

---

## 7-Day Streak Logic (All Days Count)

Streaks run all 7 days. This was an explicit design decision — FOCUS is a whole-life app, not a work-week tool. A missed Saturday breaks the streak the same as a missed Monday.

### Updating a streak on completion

```typescript
async function updateStreak(userId: string, type: StreakType): Promise<void> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('streak_type', type)
    .single()

  if (!streak) {
    // First completion ever — create row
    await supabase.from('streaks').insert({
      user_id: userId,
      streak_type: type,
      current_streak: 1,
      longest_streak: 1,
      last_completed_date: today
    })
    return
  }

  if (streak.last_completed_date === today) {
    // Already completed today — do nothing
    return
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const isConsecutive = streak.last_completed_date === yesterdayStr
  const newCurrent = isConsecutive ? streak.current_streak + 1 : 1
  const newLongest = Math.max(streak.longest_streak, newCurrent)

  await supabase.from('streaks').update({
    current_streak: newCurrent,
    longest_streak: newLongest,
    last_completed_date: today,
    updated_at: new Date().toISOString()
  }).eq('id', streak.id)
}
```

---

## Promise Completion Rate

The `promise_rate` streak type stores a rolling 30-day percentage, not a day count.

```typescript
async function updatePromiseRate(userId: string): Promise<void> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const { data: promises } = await supabase
    .from('promises')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['completed', 'archived'])
    .gte('updated_at', cutoff)

  const completed = promises?.filter(p => p.status === 'completed').length ?? 0
  const total = promises?.length ?? 0
  const rate = total === 0 ? null : Math.round((completed / total) * 100)

  // Store rate in current_streak field (reusing the column for this type)
  await supabase.from('streaks').upsert({
    user_id: userId,
    streak_type: 'promise_rate',
    current_streak: rate ?? 0,
    longest_streak: 0,  // Not meaningful for rate
    last_completed_date: new Date().toISOString().split('T')[0]
  }, { onConflict: 'user_id,streak_type' })
}
```

---

## Displaying Streaks

### What is shown in the UI (Phase 1 — kickstart streak only)

A small counter below the morning kickstart button:

```
🔥 [N] day streak
```

Shown only if `current_streak >= 2`. A streak of 1 is not shown — no point celebrating a single day.

At `current_streak = 0` or 1: no counter shown.

### What Claude references naturally

Claude is passed streak data in the context of the kickstart and handoff API calls. It references them when relevant — not every time.

```
// Passed to Claude in kickstart system prompt context:
"Streak data: kickstart streak = [N] days, transition streak = [M] days, 
 promise rate = [X]% (30-day). Reference these naturally if relevant 
 (e.g. if streak is high, acknowledge it briefly; if promise rate is low, 
 flag it). Do not mention streaks if they are below 3 days."
```

**Tone for streak references (direct, not cheerful):**
- ✓ `"Nine days of morning kickstarts. Keep it up."`
- ✓ `"You've done the transition ritual most days this week."`
- ✗ `"Amazing! You're on a 9-day streak! Keep crushing it! 🔥"`

---

## Phase 1 Scope

In Phase 1, only the `kickstart` streak is built. The others are Phase 2.

| Streak | Phase |
|--------|-------|
| `kickstart` | Phase 1 ✓ |
| `transition` | Phase 2 |
| `focus` | Phase 2 |
| `promise_rate` | Phase 2 |

---

## Edge Cases

- **Completed twice in one day**: The second completion is ignored — `last_completed_date` already matches today.
- **Midnight edge case**: Completions are date-based, not 24-hour rolling. A kickstart at 11:55pm and one at 12:05am are on different dates — both count.
- **Streak of 1 at start**: `current_streak = 1`, `longest_streak = 1`. Not shown in UI.
- **Never completed before**: `streaks` row does not exist. Created on first completion.
- **App not opened for several days**: On next open, the streak will show as broken (current = 1 on completion). No special messaging — just start fresh.
