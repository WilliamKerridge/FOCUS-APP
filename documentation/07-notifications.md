# Notifications — `documentation/07-notifications.md`

## Overview

FOCUS uses a two-phase notification strategy.

- **Phase 1**: Apple Reminders and Google Calendar via MCP connections. Reliable on iPhone immediately, no additional infrastructure.
- **Phase 2**: Web Push via PWA. Cross-platform, works on Android, branded FOCUS notifications.

**Phase 1 only is in scope for current build.** Do not build the PWA notification layer yet.

---

## Phase 1 — Apple Native Integrations

### How it works

FOCUS does not send its own notifications in Phase 1. Instead, it writes entries into Apple Reminders and Google Calendar via the existing MCP connections. iOS delivers the notification natively — it appears identically to any other Reminders or Calendar alert.

### What gets written and where

| Trigger | What is written | Where |
|---------|----------------|-------|
| 4:00pm on working days | `"FOCUS: Time to transition"` with time-based alert | Apple Reminders |
| 4:30pm (if 4:00pm was dismissed) | `"FOCUS: Transition — second reminder"` | Apple Reminders |
| 48 hours before a promise due_date | `"FOCUS: [promise title] is due [date]"` | Apple Reminders |
| Focus session started | `"[Type] session — [duration] mins"` block | Google Calendar |
| Morning kickstart (optional) | `"Start your morning kickstart"` — at user-defined time | Apple Reminders |

### Transition reminder logic

On each working day, FOCUS must write the 4:00pm reminder. This should happen:
1. When the morning kickstart is completed (write the reminder for today)
2. As a fallback: on first app open of the day on a working day (if kickstart not yet done)

The 4:30pm re-trigger is written only if the user dismisses the 4:00pm reminder. Since Apple Reminders does not report dismissal back to FOCUS, the 4:30pm reminder is written at the same time as the 4:00pm one, with a 30-minute delay — then deleted if the user taps the 4:00pm reminder and actually opens the transition ritual.

**Note:** FOCUS cannot track whether a notification was acted on — only whether it was written. This is a known Phase 1 limitation replaced by PWA in Phase 2.

### Working day check

Before writing any transition reminder, check `profiles.work_days` for the current user. Only write the reminder if today is a working day. No reminder on Saturdays, Sundays, or any day the user has removed from their working days in Settings.

---

## Phase 2 — PWA Web Push

**Do not build until Phase 2 is explicitly started.**

### Architecture

- `vite-plugin-pwa` added to Vite config
- VAPID key pair generated and stored in Vercel environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- New Supabase table: `push_subscriptions` (see spec Section 16.7)
- New Vercel serverless function: `/api/push` — sends Web Push messages
- Vercel Cron job: triggers 4:00pm notification on working days

### iOS requirement

On iPhone, Web Push only works if the app has been installed as a PWA via Safari's "Add to Home Screen". Chrome on iOS does not support PWA installation. The onboarding flow must detect mobile Safari and guide the user through installation before enabling push notifications.

### What Phase 2 replaces

When Phase 2 is built, the Apple Reminders / Google Calendar entries are retired. The Web Push layer takes over all notification responsibilities. The Phase 1 code should be clearly marked and easy to remove.

---

## Business Rules (both phases)

- **No notification on non-working days**: Check `profiles.work_days` before any transition reminder is written or sent
- **No notification during an active focus session**: The transition ritual reminder is delayed until 30 minutes after a focus session ends if the session overlaps the trigger time
- **One transition reminder per day**: Do not write duplicate reminders. Check if today's reminder already exists before writing a new one
- **Morning kickstart nudge is optional**: William has not requested a morning nudge notification by default. It is a Settings toggle, off by default

---

## Edge Cases

- **MCP connection unavailable**: If Apple Reminders or Google Calendar MCP is not accessible, log the failure silently. Do not show an error to the user — the transition reminder is a nudge, not a critical system function.
- **Reminder already exists for today**: Before writing, check if a `"FOCUS: Time to transition"` reminder for today already exists. If it does, skip writing a new one.
- **User dismisses 4:00pm and 4:30pm**: Nothing further happens. The user can open the transition ritual manually any time.
- **Promise deleted before deadline reminder fires**: The Apple Reminders entry will still fire even if the promise has been marked complete or archived. This is a Phase 1 limitation — the reminder cannot be retroactively cancelled in the same way. Phase 2 Web Push can be cancelled.
