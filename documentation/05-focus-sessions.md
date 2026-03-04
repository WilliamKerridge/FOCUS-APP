# Focus Sessions — `documentation/05-focus-sessions.md`

## Overview

Focus sessions are declared blocks of deep work. The user states what they are working on, for how long, and what type of work it is. FOCUS holds them to it — gently but firmly — and captures a handoff at the end so re-entry is instant next time.

**Status: Complete (Phase 2).** Built and live in production.

---

## Data Model

```sql
create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('work', 'writing', 'migration')),
  planned_duration_mins integer not null,
  actual_duration_mins integer,          -- Set on close
  start_context text not null,           -- What Claude recorded as the starting point
  end_context text,                      -- Where William got to — becomes next re-entry
  exited_early boolean default false,    -- True if confirmation dialog was used
  started_at timestamptz default now(),
  ended_at timestamptz,
  date date not null default current_date,
  created_at timestamptz default now()
);

alter table focus_sessions enable row level security;
create policy "Users access own sessions only"
  on focus_sessions for all using (user_id = auth.uid());

create index sessions_user_date on focus_sessions (user_id, date desc);
```

---

## Starting a Focus Session

Three inputs required before the session begins:

1. **What are you focusing on?** — free text, required
2. **Session type** — toggle: `Work` / `Writing` / `Migration`
3. **How long?** — selector: 25 min / 45 min / 60 min / 90 min / Custom

On start:
1. Claude is called with the focus topic + type. It returns a concise `start_context`: the one-sentence version of what William is doing and the first physical step. This is saved to `focus_sessions.start_context`.
2. The session UI replaces the normal mode content — full screen focus state
3. A timer counts up (not down — seeing time remaining can create anxiety)
4. All notifications suppressed for the session duration (Apple Reminders: no new ones written during session. Phase 2: Web Push suppressed.)
5. If the transition ritual notification would fire during a session, it is delayed to 30 minutes after the session ends

---

## Focus Session UI

During a session:

```
FOCUSING ON
[topic — large text]

[session type badge]  [time elapsed]

[Finish session button]
```

No other navigation. No mode buttons. The only action is finishing the session.

The transition ritual notification (4:00pm) is suppressed while a focus session is active.

---

## Closing a Focus Session — Enforced

This is a **hard requirement from the spec**: focus sessions are enforced. The user cannot simply close the app or navigate away without a gate.

### At planned end time:

The app shows:
```
Session complete — [planned_duration] mins

Where did you get to?
[text input]

What's the next action?
[text input]

[ Done ]
```

Both fields are optional — the user can submit empty. But the screen must be shown. It cannot be skipped.

### Before planned end time (early exit):

If the user taps "Finish session" before the timer reaches the planned duration:

```
[X] minutes remaining.

[ Keep going ]   [ End session ]
```

"Keep going" dismisses the dialog. "End session" proceeds to the close flow above.

`exited_early = true` is set in the database. This is for pattern data — it is never shown to the user as a failure or flagged.

### On close (both paths):

1. Save `end_context` from user's input
2. Calculate `actual_duration_mins` from `started_at` to `ended_at`
3. Set `exited_early` appropriately
4. Update the focus session streak (see `documentation/09-streaks.md`)
5. Return to the mode the user was in before starting the session
6. The `end_context` becomes the `yesterday_thread` equivalent for the re-entry prompt

---

## Re-entry Prompt

After any interruption (not just focus sessions), the re-entry prompt reconstructs the user's position. This lives in Work Mode as a button: `"Where was I?"`

When tapped, Claude is called with:
- The most recent `end_context` from today's focus sessions
- Today's morning kickstart `main_focus`
- Any task marked as in-progress in the `tasks` table

Claude returns — directly, no preamble:
```
Last position: [what William was doing]
Next action: [the specific physical next step]
```

---

## Session Types and Their Meaning

| Type | When used | Special behaviour |
|------|-----------|-------------------|
| `work` | Cosworth customer service, SAP, Power BI | Standard behaviour |
| `writing` | The Lion's Gambit manuscript | Writing sessions do not count toward the transition ritual notification — if a writing session is active at 4:00pm, the notification is delayed. This is because writing is a separate creative domain that must not be interrupted. |
| `migration` | S/4HANA migration prep, Kartech work | Standard behaviour |

---

## Business Rules

- **Minimum session length**: 25 minutes. Do not allow sessions shorter than this — they undermine the purpose.
- **Maximum session length**: 120 minutes. Longer than this and ADHD hyperfocus becomes unmanaged, not productive. If William selects Custom and enters >120, cap at 120 and note: `"Capped at 2 hours — plan a break after."`
- **Concurrent sessions**: Not possible. If a session is already active, show the active session screen rather than the start flow.
- **Session abandoned (app closed mid-session)**: On next open, detect an open session (no `ended_at`). Show: `"You had an open session from [time]. Mark it complete?"` — offer a quick close flow.
- **Writing sessions and the Lion's Gambit**: FOCUS is explicitly scoped out of the writing workflow. If William is in a Writing session, FOCUS does nothing related to Notion or manuscript content. The session just protects the time.

---

## Edge Cases

- **Focus session at end of day**: If William starts a session at 5:30pm, the transition ritual notification (4:00pm) has already fired. No conflict.
- **Claude unavailable at session start**: Allow the session to start without the `start_context`. Save the raw topic. On close, Claude processes the `end_context` as normal.
- **Session close fields left empty**: Save `end_context = null`. The re-entry prompt will work with the morning kickstart context instead.

---

## Implementation Notes (Phase 2)

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `SessionPanel` | `src/components/focus/SessionPanel.tsx` | Reusable self-contained session UI — embedded in WorkDesktop (desktop), WorkMode (mobile), HomeMode |
| `SessionCloseModal` | `src/components/desktop/SessionCloseModal.tsx` | Enforced close flow. `autoTriggered` prop skips early-exit warning when fired at natural completion |
| `AbandonedSessionBanner` | `src/components/focus/AbandonedSessionBanner.tsx` | Yellow banner shown at top of Work mode when an open session from a previous day is detected |
| `ReEntryPrompt` | `src/components/focus/ReEntryPrompt.tsx` | "Where was I?" button — fetches `end_context` + `main_focus`, calls Claude for two-line re-orientation |
| `FocusPanel` | `src/components/desktop/FocusPanel.tsx` | Thin wrapper used on desktop: streak display + "Now working on" card + SessionPanel |

### Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useFocusSession` | `src/hooks/useFocusSession.ts` | Active session state, timer, start/end/closeAbandoned, abandoned session detection |
| `useReEntryContext` | `src/hooks/useReEntryContext.ts` | Fetches `end_context` from `focus_sessions` + `main_focus` from `handoffs` on demand |

### Spec deviations / known gaps

- **No mode suppression during sessions**: The spec says to suppress navigation while a session is active. Not yet implemented — session UI coexists with mode buttons.
- **Transition ritual delay**: The spec says to delay the 4pm notification if a session is active. Not yet built (notifications not implemented as Push yet).
- **Re-entry uses `tasks` table**: The spec says the re-entry prompt also uses any task marked in-progress from `tasks`. Currently only uses `end_context` + `main_focus`.
- **Double `useFocusSession` on desktop**: WorkDesktop and SessionPanel each call `useFocusSession` independently (two Supabase fetches on mount). Accepted tech debt — fix by lifting state if performance becomes a concern.
