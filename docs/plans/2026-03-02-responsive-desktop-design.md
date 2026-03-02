# Responsive Desktop Design — FOCUS App

**Date:** 2026-03-02
**Status:** Approved — ready for implementation planning
**Phase:** Phase 2

---

## Overview

FOCUS is currently mobile-only (max-w-md, single column). This design adds a desktop layout at `md:` breakpoint (768px+) that uses the extra screen real estate for a two-column Work mode, surfaces focus sessions as an always-visible panel, and integrates the Email Drop Zone as a full-width overlay.

The mobile experience is unchanged. All responsive changes use Tailwind `md:` prefixes scaling up from the existing mobile-first base.

---

## Approach: Separate Layout Wrapper Components

Create `MobileLayout` and `DesktopLayout` wrapper components. Both consume the same underlying mode components but arrange them differently. This keeps mobile untouched and gives desktop a clean space to grow as gamification and Phase 3 features are added.

A `useBreakpoint` hook (or Tailwind's responsive classes) switches between layouts at `md:` (768px).

---

## 1. Desktop Work Mode — Two-Column Layout

Left column = planning side. Right column = doing side.

```
┌─────────────────────────────────────────────────────────────────┐
│  FOCUS                                              Settings     │
│  [  WORK  ]  [  TRANSITION  ]  [  HOME  ]                       │
├──────────────────────────┬──────────────────────────────────────┤
│                          │                                       │
│  FOCUS TODAY             │  🔥 9 days                           │
│  ┌────────────────────┐  │                                       │
│  │ main_focus text    │  │  NOW WORKING ON                      │
│  └────────────────────┘  │  ┌──────────────────────────────┐   │
│                          │  │  Reply to Sarah about budget  │   │
│  MUST TODAY              │  └──────────────────────────────┘   │
│  • item 1                │                                       │
│  • item 2                │  SESSION TYPE                        │
│                          │  [ Work ][ Writing ][ Migration ]    │
│  IF TIME                 │                                       │
│  • item 1                │  DURATION                            │
│                          │  [ 25 ]  [ 45 ]  [ 60 ]  [ 90 ]    │
│  HOME TODAY              │                                       │
│  • item 1                │  ┌──────────────────────────────┐   │
│                          │  │          00:00                │   │
│  ──────────────────────  │  │        [ Start ]              │   │
│  ✓ FOCUS TODAY           │  │  ● ● ○ ○  2 sessions today   │   │
│  ○ END OF DAY            │  └──────────────────────────────┘   │
│                          │                                       │
│  [ End of Day ]          │                                       │
│  [ Process an email ]    │                                       │
│                          │                                       │
└──────────────────────────┴──────────────────────────────────────┘
```

### Left Column — Planning Side

- Displays today's kickstart result: `main_focus`, `must_today`, `if_time`, `home_items`
- If no kickstart has been run today, shows the Morning Kickstart form instead
- Daily completion indicators at the bottom:
  - `✓ FOCUS TODAY` — ticked when kickstart is complete for the day
  - `✓ END OF DAY` — ticked when end-of-day handoff is complete
- End of Day button at the bottom
- "Process an email" button at the bottom (triggers Email Drop Zone overlay)
- Clicking any task item (must_today, if_time, main_focus) sets it as the active task in the right panel

### Right Column — Doing Side

- Streak counter (`🔥 N days`) — more prominent than mobile, always visible while working
- "Now working on" — shows the selected task. Defaults to `main_focus` if nothing selected
- Session type toggle: Work / Writing / Migration (per `05-focus-sessions.md`)
- Duration selector: 25 / 45 / 60 / 90 min
- Timer counts **up** (not down) — seeing time remaining creates anxiety. This is deliberate per spec.
- Start/pause/stop controls
- Session dots: filled = completed session, empty = remaining. Shows count today.
- Full focus session behaviour per `documentation/05-focus-sessions.md` applies — enforced close flow, early exit confirmation, end context capture

### Desktop Transition and Home Modes

Single wider column for the prototype. No two-column split. Transition and Home content centres at a comfortable reading width (`max-w-2xl`).

---

## 2. Email Drop Zone — Desktop Integration

On desktop, "Process an email" button in the left column opens a **full-width overlay** that sits above both columns, replacing the two-column view temporarily.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Work                                                  │
│                                                                  │
│  PROCESS AN EMAIL                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Paste the email here — the whole thread if needed     │    │
│  │                                                         │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Who is this from / what's the context?  (optional)             │
│  ┌────────────────────────────────────────────────────────┐    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [ Extract actions ]                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

After extraction, transitions to the confirmation screen (per `06-email-dropzone.md`), then closes back to the two-column view.

On mobile: unchanged — accessed via a button inside Work mode as currently spec'd.

---

## 3. Email Forwarding — BCC/Forward to FOCUS

This is the v2 upgrade to the Email Drop Zone paste flow. Instead of manually pasting, William BCCs or forwards emails to a special address and items appear in FOCUS ready for review.

### Architecture

```
Forward/BCC from Outlook or personal email
         ↓
Resend (free inbound tier) receives the email
         ↓
Resend POSTs parsed email to Vercel api/email.ts
         ↓
api/email.ts checks sender address:
  → Work email (not in personal list)  →  context: 'work',  source: 'email_forward'
  → will1kerridge@gmail.com            →  context: 'home',  source: 'email_forward'
  → will1kerridge@aol.com              →  context: 'home',  source: 'email_forward'
  → Unrecognised address               →  context: 'work',  flagged: true
         ↓
Same Claude extraction as paste flow (api/claude.ts)
         ↓
Extracted items held pending review in new `email_inbox` table
         ↓
Badge appears on Work or Home mode indicating items awaiting review
         ↓
William opens review screen, confirms or edits, then saves to tasks/promises tables
```

### Sender Routing

Personal email addresses are configurable in Settings. The default set:
- `will1kerridge@gmail.com` → home context
- `will1kerridge@aol.com` → home context
- Any other sender → work context

If the sender is unrecognised, items are saved to work context with a `flagged: true` field so William can see it came from an unknown address at review time.

### Services Used

| Service | Role | Cost |
|---------|------|------|
| Resend | Inbound email receiving + webhook POST | Free tier |
| Vercel | `api/email.ts` serverless function | Existing |
| Supabase | `email_inbox` table + tasks/promises write | Existing |

### New Table: `email_inbox`

```sql
create table email_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sender_email text not null,
  context text not null check (context in ('work', 'home')),
  subject text,
  extraction jsonb,           -- EmailExtraction shape from 06-email-dropzone.md
  flagged boolean default false,
  reviewed boolean default false,
  created_at timestamptz default now()
);

alter table email_inbox enable row level security;
create policy "Users access own inbox only"
  on email_inbox for all using (user_id = auth.uid());
```

### Business Rules

- Items are **never auto-saved** — the same mandatory confirmation flow from the paste feature applies
- The forwarding address is shown in Settings so it is easy to copy into Outlook contacts
- Personal email addresses are editable in Settings — not hardcoded
- Forwarded email text is not stored — only the structured extraction persists
- If Resend or Claude is unavailable, the raw email subject is saved to `email_inbox` with `extraction: null` — William sees "Could not extract — review manually" at the review screen

---

## 4. Light Gamification (Prototype Scope)

Three elements only. No XP, no levelling, no avatars for the prototype.

### Session Dots
Shown in the right panel on desktop. Filled dot per completed focus session today. Empty dots up to a soft daily target (4 sessions = a full focused day).
```
● ● ● ○  3 sessions today
```

### Streak Counter Placement
On desktop: moved from the Work mode header to the right panel above the timer. Larger, always in view while working. Same data source (`streaks` table, `streak_type = 'kickstart'`).

### Daily Completion Indicators
Bottom of the left column. Quiet visual signal — no animation, no points.
```
✓ FOCUS TODAY    (kickstart complete)
✓ END OF DAY     (handoff complete)
```

### Future Gamification (Post-Prototype)
- XP per completed session and per streak day
- Visual level/progress bar
- Unlockable session types or streak milestones
- These require no schema changes — the data already exists in `streaks` and `focus_sessions`

---

## Files to Create or Modify

| File | Action |
|------|--------|
| `src/components/layout/DesktopLayout.tsx` | Create — two-column desktop wrapper |
| `src/components/layout/MobileLayout.tsx` | Create — mobile wrapper (wraps existing content) |
| `src/components/desktop/WorkDesktop.tsx` | Create — left + right panel for desktop Work mode |
| `src/components/desktop/FocusPanel.tsx` | Create — right panel: task, session type, timer, dots |
| `src/components/desktop/EmailDropOverlay.tsx` | Create — full-width overlay for email drop zone |
| `src/hooks/useBreakpoint.ts` | Create — returns `isMobile` / `isDesktop` |
| `api/email.ts` | Create — Resend webhook receiver |
| `src/App.tsx` | Modify — switch between MobileLayout / DesktopLayout |
| `supabase/migrations/003_email_inbox.sql` | Create — email_inbox table |
| `documentation/06-email-dropzone.md` | Update — add forwarding spec to v2 section |
| `documentation/11-responsive-layout.md` | Create — desktop layout rules and breakpoint guidance |

---

## Implementation Order

1. `useBreakpoint` hook and layout wrappers (MobileLayout / DesktopLayout)
2. Desktop Work mode left column (kickstart plan display + completion indicators)
3. Focus session right panel (FocusPanel — timer, session type, dots)
4. Wire task selection: clicking left panel item sets active task in right panel
5. Email Drop Zone overlay (desktop) + paste flow
6. Email forwarding: `api/email.ts`, Resend setup, `email_inbox` table
7. Settings: forwarding address display + personal email configuration
