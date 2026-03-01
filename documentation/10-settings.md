# Settings — `documentation/10-settings.md`

## Overview

The Settings page allows William to adjust his working preferences. It is minimal — only fields that genuinely need to change over time are exposed. There are no cosmetic preferences, theme options, or feature toggles in v1.

Settings are stored in the `profiles` table. All changes sync across devices via Supabase.

---

## Data Model

All settings live in the `profiles` table (see `documentation/01-auth.md` for the full schema). Relevant fields:

| Field | Type | Default | What it controls |
|-------|------|---------|-----------------|
| `work_days` | `text[]` | `['Mon','Tue','Wed','Thu','Fri']` | Which days the 4:00pm transition reminder fires |
| `transition_time` | `time` | `16:00` | The time the transition reminder is scheduled |
| `gamification_level` | `text` | `'subtle'` | Future toggle — locked to 'subtle' in v1 |
| `tone` | `text` | `'direct'` | Future toggle — locked to 'direct' in v1 |

---

## Settings Page Layout

Simple list, no sections needed in v1:

```
SETTINGS

Working days
[Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
(toggleable pills, Mon–Fri active by default)

Transition time
[16:00] (time picker)

---

Account
will1kerridge@gmail.com
[ Sign out ]
```

No save button — changes are saved automatically on change (debounced, 500ms).

---

## Working Days

The `work_days` array controls which days the transition notification fires. Valid values: `'Mon'`, `'Tue'`, `'Wed'`, `'Thu'`, `'Fri'`, `'Sat'`, `'Sun'`.

### Business rules

- At least one day must be selected — do not allow empty array
- Changes take effect immediately — the next occurrence of the removed/added day will be affected
- If today is a day that was just removed, and the transition reminder hasn't fired yet, cancel the pending reminder if possible (Phase 1 limitation: Apple Reminders cannot be cancelled retroactively — note in UI: "Changes apply from tomorrow")

### Common scenarios

- **Holiday period**: William removes Mon–Fri temporarily. No transition reminders during the break.
- **Working weekend**: William adds Saturday. Transition reminder fires on Saturday at the set time.
- **Changed finish time**: William adjusts `transition_time` from 16:00 to 15:30. All subsequent reminders use the new time.

---

## Transition Time

Time picker showing hours and minutes. 24-hour format internally, displayed in 12-hour format (`4:00 PM`) to match iPhone conventions.

Valid range: 12:00–20:00 (noon to 8pm). Outside this range is nonsensical for a work transition.

---

## Sign Out

Tapping "Sign out":
1. Shows confirmation: `"Sign out of FOCUS?"` with `[ Cancel ]` and `[ Sign out ]`
2. On confirm: calls `supabase.auth.signOut()`
3. Redirects to login screen
4. All local state is cleared

No data is deleted — everything remains in Supabase. Signing back in restores everything.

---

## Settings Not Exposed in v1

These are locked to their defaults and not shown in the Settings UI. They may become toggles in a later phase:

| Setting | Locked value | Reason |
|---------|-------------|--------|
| `gamification_level` | `'subtle'` | Agreed for v1, review after 4 weeks |
| `tone` | `'direct'` | Agreed for v1, review after testing |
| Morning kickstart nudge | Off | Not requested — can be added if William wants it |
| Notification method | Apple Reminders (Phase 1) / Web Push (Phase 2) | Determined by phase, not user preference |

---

## Edge Cases

- **All days deselected**: Prevent — at least one day must remain. If William attempts to deselect the last active day, do not allow it. No error message needed — just don't toggle it off.
- **Settings page on iPhone**: The toggle pills for working days must be large enough to tap easily on a small screen. Use minimum 44px touch targets.
- **Time picker conflict**: If the user sets `transition_time` to a time that has already passed today, the reminder is written for tomorrow. Show nothing about this — it is handled silently.
- **Profile update fails**: Show `"Couldn't save — try again."` Revert the UI to the previous value. Do not leave the UI in an inconsistent state.
