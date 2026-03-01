# Operating Modes — `documentation/02-modes.md`

## Overview

FOCUS has three modes: **Work**, **Transition**, and **Home**. The user switches between them manually — the app never attempts to detect or auto-switch mode. The current mode controls which features and prompts are shown.

---

## Data Model

Current mode is stored in the `profiles` table (not a separate table — mode is per-session state that persists across devices).

```sql
-- Add to profiles table
current_mode text default 'work' check (current_mode in ('work', 'transition', 'home')),
mode_changed_at timestamptz default now()
```

---

## Mode Definitions

| Mode | When used | What is shown |
|------|-----------|---------------|
| `work` | During working hours at Cosworth | Morning kickstart, task list, re-entry prompt, email drop zone, waiting-for tracker, end-of-day handoff |
| `transition` | End of work, ~4:00–4:30pm | Transition ritual flow — park open loops, check promises, set presence intention, confirm mode switch |
| `home` | Evening and weekends | Promise tracker, shared responsibilities, presence check, Claire quality time question, quick capture |

---

## Switching Modes

### User-initiated switch

The three mode buttons are always visible at the top of the app. Tapping a mode button:

1. Updates `profiles.current_mode` and `profiles.mode_changed_at` in Supabase
2. Re-renders the main content area for the new mode
3. Does **not** trigger any prompts or flows automatically — the user initiates those within the mode

### Business rules

- **Work → Transition**: If the user switches to Transition mode, check whether an end-of-day handoff has been completed today. If not, surface a gentle nudge: `"You haven't filed a handoff yet — do that before switching off."` This is a nudge, not a blocker — the user can switch anyway.
- **Transition → Home**: After the transition ritual is marked complete, automatically suggest switching to Home mode. Do not force it.
- **Home → Work**: No special behaviour. Just switch.
- **Any → Any (weekends)**: All mode switches are available on weekends. Home mode is the natural default on weekends but the user can use Work mode for writing sessions.

---

## UI Pattern

Three pill buttons at the top of the screen:

```
[ WORK ]  [ TRANSITION ]  [ HOME ]
```

- Active mode button: solid filled, primary colour
- Inactive mode buttons: outlined, muted
- Buttons are always visible — never hidden or disabled
- On mobile: buttons span full width, equal thirds

---

## Mode Persistence Across Devices

Because mode is stored in `profiles` (Supabase), opening FOCUS on a different device shows the same mode. This is intentional — if William switches to Home mode on his phone, opening the app on his MacBook also shows Home mode.

---

## Edge Cases

- **App opened for the first time each day**: Default to `work` mode on working days (Mon–Fri per `profiles.work_days`), `home` mode on weekends — unless the user was already in a different mode when they last closed the app
- **Transition mode on a weekend**: Allowed. The user may want to do a written decompression ritual on a weekend too
- **Mode changed at timestamp**: Used by the Claire quality time layer to know how long the user has been in Home mode — not displayed to the user directly
