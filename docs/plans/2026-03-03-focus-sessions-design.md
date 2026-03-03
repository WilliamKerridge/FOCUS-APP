# Focus Sessions — Complete Implementation Design

**Date:** 2026-03-03
**Status:** Approved — ready for implementation planning
**Phase:** Phase 2

---

## Goal

Complete the focus session feature per `documentation/05-focus-sessions.md`. Extract the session UI into a reusable `SessionPanel` component that can be embedded in desktop Work mode, mobile Work mode, and Home mode without duplication.

---

## What's Already Built

- `useFocusSession` hook — start/end session, count-up timer, today's session count, load error
- `SessionCloseModal` — early exit confirmation + close flow with text inputs
- `FocusPanel` — desktop right-column wrapper with streak, active task display, type toggle, duration, timer, dots

---

## What's Missing (spec gaps)

1. **Claude call on start** — topic + type → `start_context` (one sentence + first physical step). Saved to DB. If Claude fails, session starts with raw topic as fallback.
2. **Auto-completion trigger** — when `elapsedSeconds >= plannedSeconds`, close modal appears automatically (without user clicking "Finish session").
3. **Abandoned session detection** — on app load, check for sessions with no `ended_at`. Show a banner offering a quick close flow.
4. **"Where was I?" re-entry prompt** — button in Work mode. Calls Claude with last `end_context` + today's `main_focus`. Returns direct two-line output. No preamble.
5. **Custom duration** — add to duration selector. Cap at 120 mins.
6. **Reusable `SessionPanel`** — extracted from `FocusPanel`, embeddable in WorkMode (mobile) and HomeMode.

---

## Architecture

### New component: `src/components/focus/SessionPanel.tsx`

Self-contained session UI. Accepts `user` and optional `initialTask` (pre-filled from the left column on desktop; empty on mobile/home).

**Contains:**
- "What are you focusing on?" text input — editable, pre-filled by `initialTask`
- Session type toggle (Work / Writing / Migration)
- Duration selector (25 / 45 / 60 / 90 / Custom — custom capped at 120)
- Count-up timer
- Start / Finish session buttons
- Session dots
- Auto-completion: `useEffect` watching `elapsedSeconds >= plannedSeconds` → shows `SessionCloseModal` automatically
- Error display

**Props:**
```typescript
interface Props {
  user: User
  initialTask?: string   // Pre-fills the topic input; user can still edit
}
```

### Modified: `src/components/desktop/FocusPanel.tsx`

Becomes a thin wrapper — keeps streak display and "Now working on" panel, delegates to `SessionPanel`:

```
FocusPanel
  ├─ StreakCounter (existing)
  ├─ "Now working on" card (activeTask from left column)
  └─ SessionPanel (initialTask={activeTask})
```

### New component: `src/components/focus/AbandonedSessionBanner.tsx`

Shown at the top of Work mode (desktop + mobile) when an open session is detected. Offers a quick close flow using the existing `SessionCloseModal`.

### New component: `src/components/focus/ReEntryPrompt.tsx`

Button: "Where was I?" in Work mode. On click, calls `/api/claude` with:
- Most recent `end_context` from today's focus sessions
- Today's kickstart `main_focus` (passed as prop or fetched)
- Returns two-line direct output — no preamble

### Modified: `src/hooks/useFocusSession.ts`

- Add `abandonedSession: FocusSession | null` — loaded on mount, cleared when the user closes it
- Add `closeAbandoned(endContext: string)` — closes the abandoned session
- Update `startSession` — call `/api/claude` for `start_context` before writing to DB. Fallback: save raw topic if Claude fails.

### Modified: `src/components/modes/WorkMode.tsx` (mobile)

Add `AbandonedSessionBanner` + `SessionPanel` below the existing kickstart/handoff content.

### Modified: `src/components/modes/HomeMode.tsx`

Add `SessionPanel` — allows starting a session from Home mode (e.g. for writing or personal focus blocks). Same component, no duplication.

### Modified: `src/components/desktop/WorkDesktop.tsx`

Add `AbandonedSessionBanner` above the two-column grid. Wire `ReEntryPrompt` into the left column below the plan display.

---

## Claude prompt for `start_context`

System prompt added to `api/claude.ts` call from `useFocusSession.startSession`:

```
You are FOCUS. William is starting a focus session.
Session type: [work|writing|migration]
Topic: [raw topic text]

Return ONLY valid JSON:
{
  "start_context": "One sentence: what William is doing and where to begin physically."
}

Be direct. No preamble. Specific physical first step (e.g. 'Open the SAP dashboard and check the Kartech migration queue' not 'Start working on the migration').
```

---

## Claude prompt for re-entry

```
You are FOCUS. William needs to re-orient after an interruption.

Today's main focus: [main_focus]
Last session end context: [end_context or 'No session today']

Return exactly two lines, no preamble:
Last position: [what William was doing]
Next action: [specific physical next step]
```

---

## Auto-completion logic

In `SessionPanel`, a `useEffect` watches `elapsedSeconds` and `activeSession`:

```typescript
useEffect(() => {
  if (activeSession && elapsedSeconds >= plannedSeconds && !showCloseModal) {
    setShowCloseModal(true)
  }
}, [elapsedSeconds, activeSession, plannedSeconds, showCloseModal])
```

`SessionCloseModal` receives `isEarlyExit={false}` when auto-triggered — no early exit confirmation shown, goes straight to the "Where did you get to?" form.

---

## Abandoned session detection

`useFocusSession` on mount:
```typescript
// Look for sessions with no ended_at, started today or yesterday
const { data } = await supabase
  .from('focus_sessions')
  .select('*')
  .eq('user_id', user.id)
  .is('ended_at', null)
  .order('started_at', { ascending: false })
  .limit(1)
  .maybeSingle()

if (data) setAbandonedSession(data)
```

`AbandonedSessionBanner` shows above the Work mode content. Tapping "Mark complete" opens `SessionCloseModal`, which calls `closeAbandoned()`.

---

## Files to create or modify

| File | Action |
|------|--------|
| `src/components/focus/SessionPanel.tsx` | Create — reusable session UI |
| `src/components/focus/AbandonedSessionBanner.tsx` | Create — open session prompt |
| `src/components/focus/ReEntryPrompt.tsx` | Create — "Where was I?" button + output |
| `src/components/desktop/FocusPanel.tsx` | Modify — thin wrapper around SessionPanel |
| `src/components/desktop/WorkDesktop.tsx` | Modify — add AbandonedSessionBanner + ReEntryPrompt |
| `src/components/desktop/SessionCloseModal.tsx` | Modify — accept `autoTriggered` prop, skip early-exit step when true |
| `src/hooks/useFocusSession.ts` | Modify — Claude on start, abandonedSession, closeAbandoned |
| `src/components/modes/WorkMode.tsx` | Modify — add AbandonedSessionBanner + SessionPanel |
| `src/components/modes/HomeMode.tsx` | Modify — add SessionPanel |

---

## Business rules (from spec)

- Minimum 25 mins. Enforce in UI — do not allow Start if < 25
- Maximum 120 mins for custom. Cap silently and show note: "Capped at 2 hours — plan a break after."
- No concurrent sessions. If `activeSession` exists, show session view not start form
- `writing` sessions: no special UI difference — type is just recorded in DB
- Early exit: `exited_early = true`. Never shown to user as failure
- Session close fields empty: save `end_context = null`. Re-entry prompt works from kickstart context instead
- Claude unavailable at start: start session with raw topic text as `start_context`
