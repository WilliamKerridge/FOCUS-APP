# Focus Sessions — Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Complete focus sessions per spec — extract a reusable `SessionPanel`, add Claude `start_context` call, auto-completion trigger, abandoned session detection, and "Where was I?" re-entry prompt. Wire `SessionPanel` into mobile Work mode and Home mode.

**Architecture:** Extract all session UI from `FocusPanel` into a self-contained `SessionPanel` component that manages its own task input, type, duration, timer, and close flow. `FocusPanel` becomes a thin wrapper. `SessionPanel` is then embedded identically in mobile `WorkMode` and `HomeMode`. New `AbandonedSessionBanner` and `ReEntryPrompt` components handle the remaining spec gaps.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Supabase + `/api/claude` (Vercel serverless)

**Worktree:** `.worktrees/focus-sessions` on branch `feature/focus-sessions`

**Key files to read before starting:**
- `documentation/05-focus-sessions.md` — full spec
- `src/hooks/useFocusSession.ts` — existing hook
- `src/components/desktop/FocusPanel.tsx` — existing panel
- `src/components/desktop/SessionCloseModal.tsx` — existing modal
- `src/components/modes/WorkMode.tsx` — mobile work mode
- `src/components/modes/HomeMode.tsx` — home mode
- `src/components/desktop/WorkDesktop.tsx` — desktop work mode
- `src/types/index.ts` — type definitions
- `src/lib/claude.ts` — `callClaude(messages, systemPrompt)` helper

---

### Task 1: Update `useFocusSession` — Claude `start_context` + abandoned session detection

**Files:**
- Modify: `src/hooks/useFocusSession.ts`

**Context:**
`useFocusSession` currently saves the raw task text as `start_context`. It needs to:
1. Call `/api/claude` on start to generate a one-sentence `start_context`
2. Detect abandoned sessions (open sessions with no `ended_at`) on mount

Read `src/hooks/useFocusSession.ts` fully before making changes.

The Claude call uses `callClaude` from `src/lib/claude.ts`. Signature:
```typescript
callClaude(messages: { role: 'user'; content: string }[], systemPrompt: string): Promise<string>
```

**Step 1: Add `abandonedSession` state and detection**

In `useFocusSession`, after the existing session load `useEffect`, add a second effect that queries for sessions with `ended_at IS NULL`. Use an unmount guard (`cancelled` flag). Only treat it as abandoned if it's not the same as the already-loaded `activeSession`.

```typescript
const [abandonedSession, setAbandonedSession] = useState<FocusSession | null>(null)

// Add after existing load effect:
useEffect(() => {
  let cancelled = false
  async function checkAbandoned() {
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!cancelled && data) setAbandonedSession(data as FocusSession)
  }
  checkAbandoned()
  return () => { cancelled = true }
}, [user.id])
```

**Step 2: Add `closeAbandoned` function**

```typescript
async function closeAbandoned(endContext: string): Promise<string | null> {
  if (!abandonedSession) return null
  const now = new Date().toISOString()
  const actualMins = Math.round(
    (new Date(now).getTime() - new Date(abandonedSession.started_at).getTime()) / 60000
  )
  const { error } = await supabase
    .from('focus_sessions')
    .update({
      ended_at: now,
      actual_duration_mins: actualMins,
      end_context: endContext || null,
      exited_early: true,
    })
    .eq('id', abandonedSession.id)
  if (error) {
    console.error('closeAbandoned error:', error)
    return 'Could not save — try again.'
  }
  setAbandonedSession(null)
  return null
}
```

**Step 3: Update `startSession` to call Claude**

Add the Claude call before the Supabase insert. Import `callClaude` from `@/lib/claude`.

```typescript
import { callClaude } from '@/lib/claude'

// Inside startSession, before the supabase insert:
const systemPrompt = `You are FOCUS. William is starting a focus session.
Session type: ${type}
Topic: ${topic}

Return ONLY valid JSON, no markdown:
{"start_context": "One sentence: what William is doing and the first physical step. Be specific — not 'work on email' but 'open Outlook and reply to [person]'."}

Be direct. No preamble.`

let startContext = topic // fallback
try {
  const raw = await callClaude([{ role: 'user', content: topic }], systemPrompt)
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(cleaned)
  if (typeof parsed.start_context === 'string') startContext = parsed.start_context
} catch {
  // Claude unavailable — use raw topic as fallback per spec
}
```

Then pass `startContext` (not raw `topic`) to the Supabase insert.

**Step 4: Export `abandonedSession` and `closeAbandoned` from the hook return**

```typescript
return {
  activeSession,
  abandonedSession,      // NEW
  todaySessionCount,
  elapsedSeconds,
  loading,
  loadError,
  startSession,
  endSession,
  closeAbandoned,        // NEW
}
```

**Step 5: Verify TypeScript**

```bash
cd /Users/williamkerridge/Documents/FOCUS/.worktrees/focus-sessions
npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add src/hooks/useFocusSession.ts
git commit -m "feat: add Claude start_context call and abandoned session detection to useFocusSession"
```

---

### Task 2: Update `SessionCloseModal` — accept `autoTriggered` prop

**Files:**
- Modify: `src/components/desktop/SessionCloseModal.tsx`

**Context:**
Read `src/components/desktop/SessionCloseModal.tsx` fully before making changes.

When the session timer auto-completes (reaches planned duration), the close modal appears without the user clicking "Finish session". In this case `isEarlyExit` is always `false` and there is no early-exit confirmation step. The modal should skip straight to the "Where did you get to?" form.

Currently, `SessionCloseModal` shows an early-exit warning when `isEarlyExit` is true. When `autoTriggered` is true, it should always show the end-of-session form regardless of `isEarlyExit`.

**Step 1: Add `autoTriggered` prop**

```typescript
interface Props {
  isEarlyExit: boolean
  remainingMins: number
  autoTriggered?: boolean   // NEW — skips early-exit step
  onKeepGoing: () => void
  onClose: (endContext: string) => Promise<void>
}
```

**Step 2: Update the render logic**

Where the component checks `isEarlyExit` to show the "X minutes remaining" confirmation, add:

```typescript
const showEarlyExitWarning = isEarlyExit && !autoTriggered
```

Replace the existing `isEarlyExit` check with `showEarlyExitWarning`.

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/components/desktop/SessionCloseModal.tsx
git commit -m "feat: add autoTriggered prop to SessionCloseModal to skip early-exit step"
```

---

### Task 3: Create `SessionPanel` — reusable self-contained session UI

**Files:**
- Create: `src/components/focus/SessionPanel.tsx`

**Context:**
This is the core task. Extract all session UI logic from `FocusPanel` into a new self-contained component. Read `src/components/desktop/FocusPanel.tsx` fully before writing `SessionPanel`.

`SessionPanel` accepts `user` and optional `initialTask`. When `initialTask` is provided (desktop — task selected from left column), the topic input is pre-filled. When not provided (mobile, home), the input starts empty and the user types their focus topic.

**Step 1: Create the component**

```typescript
// src/components/focus/SessionPanel.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { SessionType } from '@/types'
import { useFocusSession } from '@/hooks/useFocusSession'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'

interface Props {
  user: User
  initialTask?: string
}

const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'writing', label: 'Writing' },
  { key: 'migration', label: 'Migration' },
]

const PRESET_DURATIONS = [25, 45, 60, 90]
const MAX_DOTS = 4

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SessionPanel({ user, initialTask }: Props) {
  const {
    activeSession,
    todaySessionCount,
    elapsedSeconds,
    loading,
    loadError,
    startSession,
    endSession,
  } = useFocusSession(user)

  const [topic, setTopic] = useState(initialTask ?? '')
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [duration, setDuration] = useState(25)
  const [customDuration, setCustomDuration] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [starting, setStarting] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [customNote, setCustomNote] = useState<string | null>(null)

  // Keep topic in sync when initialTask changes (desktop: user clicks different task)
  useEffect(() => {
    if (!activeSession) setTopic(initialTask ?? '')
  }, [initialTask, activeSession])

  const plannedSeconds = (activeSession?.planned_duration_mins ?? duration) * 60
  const isEarlyExit = elapsedSeconds < plannedSeconds

  // Auto-completion: show close modal when timer reaches planned duration
  useEffect(() => {
    if (activeSession && elapsedSeconds >= plannedSeconds && !showCloseModal) {
      setAutoTriggered(true)
      setShowCloseModal(true)
    }
  }, [elapsedSeconds, activeSession, plannedSeconds, showCloseModal])

  function getEffectiveDuration(): number {
    if (useCustom) {
      const val = parseInt(customDuration, 10)
      if (isNaN(val) || val < 25) return 25
      if (val > 120) return 120
      return val
    }
    return duration
  }

  async function handleStart() {
    const effectiveDuration = getEffectiveDuration()
    if (useCustom && parseInt(customDuration, 10) > 120) {
      setCustomNote('Capped at 2 hours — plan a break after.')
    } else {
      setCustomNote(null)
    }
    if (!topic.trim()) return
    setStarting(true)
    setSessionError(null)
    const error = await startSession(sessionType, effectiveDuration, topic.trim())
    if (error) setSessionError(error)
    setStarting(false)
  }

  function handleStop() {
    setAutoTriggered(false)
    setShowCloseModal(true)
  }

  async function handleClose(endContext: string) {
    const error = await endSession(endContext, isEarlyExit && !autoTriggered)
    if (error) setSessionError(error)
    setShowCloseModal(false)
    setAutoTriggered(false)
  }

  if (loading) {
    return <div className="animate-pulse h-48 rounded-xl bg-secondary" />
  }

  return (
    <div className="space-y-4">
      {/* Topic input — hidden during active session */}
      {!activeSession && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
            What are you focusing on?
          </p>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Be specific — 'Reply to Sarah about budget'"
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
      )}

      {/* Active session — show topic */}
      {activeSession && (
        <div className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Focusing on</p>
          <p className="font-semibold leading-snug text-sm">{activeSession.start_context}</p>
        </div>
      )}

      {!activeSession && (
        <>
          {/* Session type */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Session type
            </p>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {SESSION_TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSessionType(key)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    sessionType === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Duration
            </p>
            <div className="flex gap-2">
              {PRESET_DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setUseCustom(false); setCustomNote(null) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                    !useCustom && duration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {d}m
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  useCustom
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <input
                type="number"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
                placeholder="mins (25–120)"
                min={25}
                max={120}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            )}
            {customNote && (
              <p className="text-xs text-muted-foreground mt-1">{customNote}</p>
            )}
          </div>
        </>
      )}

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {sessionError && <p className="text-sm text-destructive">{sessionError}</p>}

      {/* Timer + controls */}
      <div className="px-4 py-6 rounded-xl bg-secondary border border-border text-center space-y-4">
        <p className="text-4xl font-bold tabular-nums tracking-tight">
          {formatTime(elapsedSeconds)}
        </p>

        {activeSession ? (
          <button
            onClick={handleStop}
            className="w-full py-3 rounded-lg border border-border text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground motion-safe:active:scale-95 motion-safe:transition-transform"
          >
            Finish session
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!topic.trim() || starting}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
          >
            {starting && <Loader2 className="h-4 w-4 animate-spin" />}
            {starting ? 'Starting…' : 'Start'}
          </button>
        )}

        {/* Session dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: MAX_DOTS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < todaySessionCount ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            {todaySessionCount} session{todaySessionCount !== 1 ? 's' : ''} today
          </span>
        </div>
      </div>

      {showCloseModal && (
        <SessionCloseModal
          isEarlyExit={isEarlyExit}
          remainingMins={Math.ceil((plannedSeconds - elapsedSeconds) / 60)}
          autoTriggered={autoTriggered}
          onKeepGoing={() => { setShowCloseModal(false); setAutoTriggered(false) }}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/focus/SessionPanel.tsx
git commit -m "feat: create reusable SessionPanel component with auto-completion and custom duration"
```

---

### Task 4: Refactor `FocusPanel` to use `SessionPanel`

**Files:**
- Modify: `src/components/desktop/FocusPanel.tsx`

**Context:**
Read the current `FocusPanel` fully. Replace all session UI (type toggle, duration, timer, start/stop, dots, close modal) with `<SessionPanel>`. Keep the streak display and "Now working on" card — these are desktop-specific and don't belong in `SessionPanel`.

**Step 1: Rewrite `FocusPanel`**

```typescript
// src/components/desktop/FocusPanel.tsx
import { Flame } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useStreak } from '@/hooks/useStreak'
import SessionPanel from '@/components/focus/SessionPanel'

interface Props {
  user: User
  activeTask: string | null
}

export default function FocusPanel({ user, activeTask }: Props) {
  const streak = useStreak(user, 'kickstart')

  return (
    <div className="space-y-5">
      {/* Streak */}
      {streak && streak.current_streak >= 2 && (
        <div className="flex items-center gap-1.5">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="font-semibold">{streak.current_streak}</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
      )}

      {/* Active task — desktop only, selected from left column */}
      <div className="px-4 py-4 rounded-lg bg-secondary border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          Now working on
        </p>
        {activeTask ? (
          <p className="font-semibold leading-snug">{activeTask}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Select a task from the plan on the left
          </p>
        )}
      </div>

      <SessionPanel user={user} initialTask={activeTask ?? undefined} />
    </div>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Manual smoke test**

Run `npm run dev` in the worktree, open the app on desktop (≥768px), go to Work mode. Verify:
- Session panel renders in the right column
- Selecting a task from the left column pre-fills the topic input
- Type toggle and duration selector work
- Start requires a non-empty topic

**Step 4: Commit**

```bash
git add src/components/desktop/FocusPanel.tsx
git commit -m "refactor: FocusPanel is now a thin wrapper around SessionPanel"
```

---

### Task 5: Create `AbandonedSessionBanner`

**Files:**
- Create: `src/components/focus/AbandonedSessionBanner.tsx`

**Context:**
When a session has no `ended_at`, show this banner at the top of Work mode. Uses `SessionCloseModal` for the quick close flow. Gets `abandonedSession` and `closeAbandoned` from `useFocusSession`.

**Step 1: Create the component**

```typescript
// src/components/focus/AbandonedSessionBanner.tsx
import { useState } from 'react'
import type { FocusSession } from '@/types'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'

interface Props {
  session: FocusSession
  onClose: (endContext: string) => Promise<string | null>
}

export default function AbandonedSessionBanner({ session, onClose }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startedAt = new Date(session.started_at)
  const timeStr = startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  async function handleClose(endContext: string) {
    const err = await onClose(endContext)
    if (err) {
      setError(err)
    } else {
      setShowModal(false)
    }
  }

  return (
    <>
      <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm flex items-start justify-between gap-3 mb-4">
        <span>You had an open session from {timeStr}. Mark it complete?</span>
        <button
          onClick={() => setShowModal(true)}
          className="text-yellow-200 font-medium hover:text-white shrink-0 cursor-pointer underline"
        >
          Close it
        </button>
      </div>
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      {showModal && (
        <SessionCloseModal
          isEarlyExit={true}
          remainingMins={0}
          autoTriggered={false}
          onKeepGoing={() => setShowModal(false)}
          onClose={handleClose}
        />
      )}
    </>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/focus/AbandonedSessionBanner.tsx
git commit -m "feat: add AbandonedSessionBanner component for open session recovery"
```

---

### Task 6: Create `ReEntryPrompt`

**Files:**
- Create: `src/components/focus/ReEntryPrompt.tsx`

**Context:**
"Where was I?" button in Work mode. Calls Claude with the most recent `end_context` from today's focus sessions + today's kickstart `main_focus`. Returns direct two-line output, no preamble.

Read `src/lib/claude.ts` for the `callClaude` helper signature.

**Step 1: Create the component**

```typescript
// src/components/focus/ReEntryPrompt.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent, FocusSession } from '@/types'

interface Props {
  user: User
}

export default function ReEntryPrompt({ user }: Props) {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReEntry() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const today = new Date().toISOString().split('T')[0]

      const [{ data: sessionData }, { data: kickstartData }] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('end_context')
          .eq('user_id', user.id)
          .eq('date', today)
          .not('end_context', 'is', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('handoffs')
          .select('content')
          .eq('user_id', user.id)
          .eq('type', 'morning_kickstart')
          .eq('date', today)
          .maybeSingle(),
      ])

      const endContext = (sessionData as Pick<FocusSession, 'end_context'> | null)?.end_context ?? null
      const mainFocus = (kickstartData?.content as KickstartContent | null)?.main_focus ?? null

      const systemPrompt = `You are FOCUS. William needs to re-orient after an interruption.

Return exactly two lines, no preamble, no blank lines between them:
Last position: [what William was doing]
Next action: [specific physical next step — not vague, not 'continue working on X']`

      const userMessage = [
        mainFocus ? `Today's main focus: ${mainFocus}` : null,
        endContext ? `Last session end context: ${endContext}` : null,
      ].filter(Boolean).join('\n') || 'No context available for today.'

      const text = await callClaude([{ role: 'user', content: userMessage }], systemPrompt)
      setResult(text.trim())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Re-entry error:', message)
      setError('Could not reach Claude — check your last session notes manually.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleReEntry}
        disabled={loading}
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {loading ? 'Finding your place…' : 'Where was I?'}
      </button>

      {result && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/focus/ReEntryPrompt.tsx
git commit -m "feat: add ReEntryPrompt — Where was I? Claude call with end_context + main_focus"
```

---

### Task 7: Wire `AbandonedSessionBanner` + `ReEntryPrompt` into `WorkDesktop`

**Files:**
- Modify: `src/components/desktop/WorkDesktop.tsx`

**Context:**
Read `src/components/desktop/WorkDesktop.tsx` fully before modifying.

`WorkDesktop` uses `useFocusSession` indirectly via `FocusPanel` → `SessionPanel`. But `AbandonedSessionBanner` needs `abandonedSession` and `closeAbandoned` from the hook. Don't call `useFocusSession` twice — instead, `SessionPanel` already calls it internally.

The cleanest approach: `WorkDesktop` imports `useFocusSession` directly for abandoned session data, and `SessionPanel` also calls it. Since both use the same user, the hook returns the same Supabase data. The `abandonedSession` state is in the hook instance inside `SessionPanel`, not in `WorkDesktop`.

So: create a local instance of `useFocusSession` in `WorkDesktop` for `abandonedSession` only. The timer/session state is managed inside `SessionPanel`'s own hook instance. The two instances are independent — this is fine because `abandonedSession` is a one-time check on mount, not live-updated.

Add `AbandonedSessionBanner` above the two-column grid. Add `ReEntryPrompt` at the bottom of the left column, below `DailyProgress`.

**Step 1: Modify WorkDesktop**

Import and add:
```typescript
import { useFocusSession } from '@/hooks/useFocusSession'
import AbandonedSessionBanner from '@/components/focus/AbandonedSessionBanner'
import ReEntryPrompt from '@/components/focus/ReEntryPrompt'

// Inside component, add:
const { abandonedSession, closeAbandoned } = useFocusSession(user)
```

Add above the two-column grid (but inside the main return, after email drop overlay check):
```typescript
{abandonedSession && (
  <AbandonedSessionBanner
    session={abandonedSession}
    onClose={closeAbandoned}
  />
)}
```

Add below `DailyProgress` in the left column:
```typescript
<ReEntryPrompt user={user} />
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/desktop/WorkDesktop.tsx
git commit -m "feat: wire AbandonedSessionBanner and ReEntryPrompt into WorkDesktop"
```

---

### Task 8: Wire `SessionPanel` + `AbandonedSessionBanner` into mobile `WorkMode`

**Files:**
- Modify: `src/components/modes/WorkMode.tsx`

**Context:**
Read `src/components/modes/WorkMode.tsx` fully. On mobile, there is no left column. Add `SessionPanel` and `AbandonedSessionBanner` to the existing mobile work mode flow.

`AbandonedSessionBanner` needs its own `useFocusSession` instance in `WorkMode` (same pattern as WorkDesktop Task 7). `SessionPanel` manages its own instance internally.

Add `AbandonedSessionBanner` at the top of the content (after any existing header). Add `SessionPanel` at the bottom — below the kickstart and handoff sections, as an additional section the user scrolls to.

Add a visible section separator with a heading:

```typescript
import SessionPanel from '@/components/focus/SessionPanel'
import AbandonedSessionBanner from '@/components/focus/AbandonedSessionBanner'
import ReEntryPrompt from '@/components/focus/ReEntryPrompt'
import { useFocusSession } from '@/hooks/useFocusSession'

// Inside component:
const { abandonedSession, closeAbandoned } = useFocusSession(user)
```

Add to JSX:
```typescript
{/* At top */}
{abandonedSession && (
  <AbandonedSessionBanner session={abandonedSession} onClose={closeAbandoned} />
)}

{/* At bottom, after existing content */}
<div className="pt-2 border-t border-border">
  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">Focus session</p>
  <ReEntryPrompt user={user} />
  <div className="mt-4">
    <SessionPanel user={user} />
  </div>
</div>
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/modes/WorkMode.tsx
git commit -m "feat: add SessionPanel and AbandonedSessionBanner to mobile WorkMode"
```

---

### Task 9: Wire `SessionPanel` into `HomeMode`

**Files:**
- Modify: `src/components/modes/HomeMode.tsx`

**Context:**
Read `src/components/modes/HomeMode.tsx` fully. Home mode is for personal tasks, writing (Lion's Gambit), and personal focus blocks.

Add `SessionPanel` at the bottom of Home mode, below existing content, with a section heading:

```typescript
import SessionPanel from '@/components/focus/SessionPanel'

// In JSX, at the bottom:
<div className="pt-2 border-t border-border mt-4">
  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">Focus session</p>
  <SessionPanel user={user} />
</div>
```

No `AbandonedSessionBanner` needed in HomeMode — abandoned sessions are a work context concern and are already shown in Work mode.

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/modes/HomeMode.tsx
git commit -m "feat: add SessionPanel to HomeMode for personal focus blocks"
```

---

### Task 10: Final TypeScript check, build verification, and push

**Step 1: Full TypeScript check**

```bash
cd /Users/williamkerridge/Documents/FOCUS/.worktrees/focus-sessions
npx tsc --noEmit
```

Expected: no errors.

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds, no errors.

**Step 3: Manual smoke test checklist**

Open the app locally (`npm run dev`):

- [ ] Desktop (≥768px), Work mode: right column shows `SessionPanel`. Topic input visible. Select a task from the left — topic pre-fills.
- [ ] Desktop, Work mode: "Where was I?" button visible below the kickstart plan. Clicking it shows a loading state then two-line result.
- [ ] Desktop, Work mode: Start a session — timer counts up. At the planned time, close modal appears automatically.
- [ ] Desktop, Work mode: Start a session — click "Finish session" early — early exit warning shown.
- [ ] Mobile (<768px), Work mode: Scroll down — "Focus session" section with `SessionPanel` visible.
- [ ] Home mode: Scroll down — "Focus session" section with `SessionPanel` visible.
- [ ] Session type and duration selectors work in all locations.
- [ ] Custom duration: entering >120 starts a 120-min session with the cap note.

**Step 4: Push branch**

```bash
git push -u origin feature/focus-sessions
```

**Step 5: Use `superpowers:finishing-a-development-branch` to merge**
