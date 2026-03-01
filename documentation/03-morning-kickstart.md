# Morning Kickstart & End-of-Day Handoff — `documentation/03-morning-kickstart.md`

## Overview

The morning kickstart and end-of-day handoff are the two most important daily touchpoints. They bookend the working day. Together they solve the ADHD problem of starting blind and finishing with open loops.

Both use the same database table (`handoffs`) and the same Claude API flow — they differ in their prompts and what they surface.

---

## Data Model

```sql
create table handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('morning_kickstart', 'end_of_day', 'transition')),
  content jsonb not null,        -- Structured Claude output
  raw_input text,                -- The brain dump text William typed
  claire_quality_time text check (claire_quality_time in ('yes', 'no', 'partial')),
  claire_blocker text,           -- What got in the way, if asked
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table handoffs enable row level security;
create policy "Users access own handoffs only"
  on handoffs for all using (user_id = auth.uid());

create index handoffs_user_date on handoffs (user_id, date desc);
```

### `content` JSONB structure — Morning Kickstart

```typescript
interface KickstartContent {
  main_focus: string           // The single most important thing today
  must_today: string[]         // Deadlines or commitments — max 3
  if_time: string[]            // Nice to do — max 3
  flagged_promises: string[]   // Promise titles due today or overdue
  yesterday_thread: string | null  // The unfinished thread from last night's handoff
  overcommitted: boolean       // True if Claude thinks the plan is unrealistic
  overcommit_note: string | null   // Plain note if overcommitted is true
  streak_note: string | null   // Natural reference to kickstart streak if relevant
}
```

### `content` JSONB structure — End of Day

```typescript
interface HandoffContent {
  done_today: string[]         // What got completed
  unfinished: string[]         // Open loops being parked
  next_start: string           // The specific next action for tomorrow morning
  context_note: string         // Any important context for tomorrow
  parking_note: string | null  // Anything that needs to be remembered but not actioned
}
```

---

## Morning Kickstart Flow

### Step 1 — Brain dump input

A large text area. Placeholder text: `"What's on your mind? Dump everything — work, home, anything."`

No character limit. No required format. William types whatever is in his head.

A secondary field (collapsible, closed by default): `"Anything from yesterday that isn't finished?"` — pre-populated with `yesterday_thread` from the previous day's end-of-day handoff if one exists.

### Step 2 — Claude processes

POST to `/api/claude` with:
- The brain dump text
- Yesterday's handoff content (fetched from Supabase — most recent `end_of_day` for this user)
- Any active promises with today's or earlier due dates
- Current kickstart streak count

System prompt instructs Claude to return a JSON object matching `KickstartContent`. Be direct, no preamble.

### Step 3 — Display response

Render the structured output:

```
FOCUS TODAY
[main_focus — large, prominent]

MUST DO
• [must_today items]

IF TIME
• [if_time items]

[If flagged_promises not empty:]
PROMISES DUE
• [promise titles]

[If overcommitted:]
⚠ [overcommit_note]

[If streak_note:]
[streak_note — small, subdued text]
```

### Step 4 — Save

On display of results, save to `handoffs` table with `type = 'morning_kickstart'`. Do not wait for user confirmation — save automatically. The user can immediately start working.

---

## End-of-Day Handoff Flow

### Step 1 — Prompted input

Three quick questions, each a text field:

1. `"What did you get done today?"`
2. `"What's unfinished and needs parking?"` 
3. `"What's the very next action to start with tomorrow?"`

All fields are optional — the user can skip any of them and just submit.

### Step 2 — Claude processes

POST to `/api/claude` with all three answers. Claude returns `HandoffContent` JSON. Claude may add a `parking_note` if it spots something in the inputs that should be flagged (e.g. a Kartech reply that was mentioned as unfinished three days in a row).

### Step 3 — Display and save

Show a brief summary. Save to `handoffs` with `type = 'end_of_day'`. 

After saving, if it is a working day, nudge toward Transition mode: `"Handoff saved. Ready to switch off?"` with a Transition mode button.

---

## Business Rules

- **One kickstart per day**: If a `morning_kickstart` handoff already exists for today, show the existing result rather than prompting again. Include a small `"Redo kickstart"` option in case William wants to rerun it (replaces the existing record for today).
- **One end-of-day per day**: Same logic — show existing if present, offer redo.
- **Yesterday's thread**: The `next_start` from the most recent `end_of_day` handoff is passed to today's kickstart as `yesterday_thread`. This is the single most important continuity feature.
- **No handoff yesterday**: If there is no previous end-of-day handoff (first use, or missed day), `yesterday_thread` is null. Claude's output simply omits that section.
- **Overcommitment warning**: Claude flags this if `must_today` + `if_time` + `flagged_promises` adds up to more than can realistically be done in 8 hours. Claude makes the call — no hard rule.
- **Streak**: After saving a kickstart, update the `kickstart` streak in the `streaks` table. See `documentation/09-streaks.md`.

---

## Edge Cases

- **Brain dump is empty**: Allow submission. Claude returns a simplified output based on active promises and yesterday's thread only.
- **Claude API fails**: Show `"Could not process — Claude is unavailable. Your notes have been saved."` Save the raw input to `handoffs.raw_input` with `content = {}` so nothing is lost. Offer a retry button.
- **Very long brain dump (>2000 words)**: Claude handles it. No truncation on the frontend.
- **Submitted at midnight**: Use the date at time of submission. A handoff submitted at 11:55pm and one at 12:05am are on different dates — both are valid.
