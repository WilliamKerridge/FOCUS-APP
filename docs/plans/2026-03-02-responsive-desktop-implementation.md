# Responsive Desktop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a two-column desktop layout to FOCUS with a focus session panel, email drop zone overlay, and email forwarding via Resend — while leaving the mobile experience completely untouched.

**Architecture:** A `useBreakpoint` hook switches between `MobileLayout` and `DesktopLayout` wrappers in `App.tsx`. Both wrappers consume the same underlying mode components; `DesktopLayout` arranges them into a two-column grid on `md:` screens. Focus sessions, email drop zone, and email forwarding are Phase 2 features built in sequence after the layout shell is proven.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (`md:` breakpoints), Supabase, Vercel serverless functions, Resend (inbound email), Lucide React icons.

**Verification method:** No test framework exists. Each task is verified with `npm run build` (TypeScript compile + Vite build). Manual browser testing uses Chrome DevTools device emulation to check both iPhone (375px) and desktop (1280px) views.

---

## Phase A — Layout Infrastructure

### Task 1: `useBreakpoint` hook

**Files:**
- Create: `src/hooks/useBreakpoint.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/useBreakpoint.ts
import { useEffect, useState } from 'react'

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= 768
  )

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return { isDesktop, isMobile: !isDesktop }
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built in X.XXs` — no TypeScript errors.

**Step 3: Commit**

```bash
git add src/hooks/useBreakpoint.ts
git commit -m "feat: add useBreakpoint hook for responsive layout switching"
```

---

### Task 2: Layout wrapper components

**Files:**
- Create: `src/components/layout/MobileLayout.tsx`
- Create: `src/components/layout/DesktopLayout.tsx`

**Step 1: Create MobileLayout**

```typescript
// src/components/layout/MobileLayout.tsx
import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  modeSelector: ReactNode
  nudge?: ReactNode
  content: ReactNode
}

export default function MobileLayout({ header, modeSelector, nudge, content }: Props) {
  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 pb-8 flex flex-col min-h-screen">
        {header}
        {modeSelector}
        {nudge}
        <div className="flex-1 mt-6">{content}</div>
      </div>
    </div>
  )
}
```

**Step 2: Create DesktopLayout**

```typescript
// src/components/layout/DesktopLayout.tsx
import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  modeSelector: ReactNode
  nudge?: ReactNode
  content: ReactNode
}

export default function DesktopLayout({ header, modeSelector, nudge, content }: Props) {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pb-8 flex flex-col min-h-screen">
        {header}
        {modeSelector}
        {nudge}
        <div className="flex-1 mt-6">{content}</div>
      </div>
    </div>
  )
}
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 4: Commit**

```bash
git add src/components/layout/MobileLayout.tsx src/components/layout/DesktopLayout.tsx
git commit -m "feat: add MobileLayout and DesktopLayout wrapper components"
```

---

### Task 3: Wire App.tsx to use layout wrappers

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import and use layouts in App.tsx**

Replace the main app render (the `if (appState === 'app' && user && profile)` block) with layout-aware rendering. The header, modeSelector, and nudge JSX are extracted into variables and passed to the appropriate layout:

```typescript
// Add imports at top of App.tsx
import { useBreakpoint } from '@/hooks/useBreakpoint'
import MobileLayout from '@/components/layout/MobileLayout'
import DesktopLayout from '@/components/layout/DesktopLayout'
```

```typescript
// Inside the App function, before the render blocks:
const { isDesktop } = useBreakpoint()
```

```typescript
// Replace the main app block:
if (appState === 'app' && user && profile) {
  const currentMode = profile.current_mode

  if (showSettings) {
    return (
      <div className="min-h-screen">
        <div className="max-w-md mx-auto px-4 pt-4 pb-8">
          <button
            onClick={() => setShowSettings(false)}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center min-h-[44px] cursor-pointer"
          >
            ← Back
          </button>
          <SettingsPage user={user} profile={profile} updateProfile={updateProfile} />
        </div>
      </div>
    )
  }

  const header = (
    <div className="flex items-center justify-between py-4">
      <h1 className="text-lg font-bold tracking-wider">FOCUS</h1>
      <button
        onClick={() => setShowSettings(true)}
        className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
      >
        Settings
      </button>
    </div>
  )

  const modeSelector = (
    <ModeSelector current={currentMode} onChange={handleModeChange} />
  )

  const nudge = handoffNudge ? (
    <div className="mt-3 px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm flex items-start justify-between gap-3">
      <span>You haven't filed a handoff yet — do that before switching off.</span>
      <button
        onClick={() => setHandoffNudge(false)}
        aria-label="Dismiss"
        className="text-yellow-400 hover:text-yellow-200 shrink-0 text-lg leading-none cursor-pointer"
      >
        ×
      </button>
    </div>
  ) : undefined

  const content = (
    <ErrorBoundary>
      {currentMode === 'work' && (
        <WorkMode user={user} onSwitchToTransition={handleSwitchToTransition} />
      )}
      {currentMode === 'transition' && <TransitionMode user={user} />}
      {currentMode === 'home' && <HomeMode user={user} />}
    </ErrorBoundary>
  )

  const Layout = isDesktop ? DesktopLayout : MobileLayout

  return <Layout header={header} modeSelector={modeSelector} nudge={nudge} content={content} />
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 3: Manual check**

Open `http://localhost:5173` in Chrome. In DevTools, switch between iPhone 12 Pro (390px) and desktop (1280px). Both should render identically to before — the layout wrappers don't change anything visually yet.

```bash
npm run dev
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App.tsx to MobileLayout/DesktopLayout via useBreakpoint"
```

---

## Phase B — Desktop Work Mode

### Task 4: `KickstartPlanDisplay` component

This is the read-only left column showing today's kickstart result on desktop.

**Files:**
- Create: `src/components/desktop/KickstartPlanDisplay.tsx`

**Step 1: Create the component**

```typescript
// src/components/desktop/KickstartPlanDisplay.tsx
import type { KickstartContent } from '@/types'

interface Props {
  plan: KickstartContent
  activeTask: string | null
  onSelectTask: (task: string) => void
}

export default function KickstartPlanDisplay({ plan, activeTask, onSelectTask }: Props) {
  const isActive = (item: string) => item === activeTask

  const taskClass = (item: string) =>
    `text-sm flex gap-2 cursor-pointer rounded px-1 py-0.5 -mx-1 transition-colors ${
      isActive(item)
        ? 'bg-primary/20 text-foreground'
        : 'hover:bg-secondary text-foreground'
    }`

  return (
    <div className="space-y-4">
      {/* Focus Today */}
      <div
        className={`px-4 py-4 rounded-lg border cursor-pointer transition-colors ${
          isActive(plan.main_focus)
            ? 'bg-primary/20 border-primary/50'
            : 'bg-primary/10 border-primary/30 hover:bg-primary/15'
        }`}
        onClick={() => onSelectTask(plan.main_focus)}
      >
        <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Focus today</p>
        <p className="font-semibold leading-snug">{plan.main_focus}</p>
      </div>

      {/* Yesterday thread */}
      {plan.yesterday_thread && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Start here</p>
          <p className="text-sm">{plan.yesterday_thread}</p>
        </div>
      )}

      {/* Must today */}
      {(plan.must_today?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Must today</p>
          <ul className="space-y-1">
            {plan.must_today.map((item, i) => (
              <li key={i} className={taskClass(item)} onClick={() => onSelectTask(item)}>
                <span className="text-destructive shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* If time */}
      {(plan.if_time?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">If time</p>
          <ul className="space-y-1">
            {plan.if_time.map((item, i) => (
              <li key={i} className={taskClass(item)} onClick={() => onSelectTask(item)}>
                <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Home today */}
      {(plan.home_items?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Home today</p>
          <ul className="space-y-1">
            {plan.home_items.map((item, i) => (
              <li key={i} className={taskClass(item)} onClick={() => onSelectTask(item)}>
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 3: Commit**

```bash
git add src/components/desktop/KickstartPlanDisplay.tsx
git commit -m "feat: add KickstartPlanDisplay component for desktop left column"
```

---

### Task 5: Daily completion indicators + `useTodayHandoffs` hook

**Files:**
- Create: `src/hooks/useTodayHandoffs.ts`
- Create: `src/components/desktop/DailyProgress.tsx`

**Step 1: Create `useTodayHandoffs` hook**

```typescript
// src/hooks/useTodayHandoffs.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface TodayHandoffs {
  kickstartDone: boolean
  endOfDayDone: boolean
  loading: boolean
}

export function useTodayHandoffs(user: User | null): TodayHandoffs {
  const [kickstartDone, setKickstartDone] = useState(false)
  const [endOfDayDone, setEndOfDayDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('handoffs')
      .select('type')
      .eq('user_id', user.id)
      .eq('date', today)
      .in('type', ['morning_kickstart', 'end_of_day'])
      .then(({ data }) => {
        const types = (data ?? []).map((r: { type: string }) => r.type)
        setKickstartDone(types.includes('morning_kickstart'))
        setEndOfDayDone(types.includes('end_of_day'))
        setLoading(false)
      })
  }, [user])

  return { kickstartDone, endOfDayDone, loading }
}
```

**Step 2: Create `DailyProgress` component**

```typescript
// src/components/desktop/DailyProgress.tsx
interface Props {
  kickstartDone: boolean
  endOfDayDone: boolean
}

export default function DailyProgress({ kickstartDone, endOfDayDone }: Props) {
  const item = (done: boolean, label: string) => (
    <div className="flex items-center gap-2 text-sm">
      <span className={done ? 'text-primary' : 'text-border'}>
        {done ? '✓' : '○'}
      </span>
      <span className={done ? 'text-muted-foreground line-through' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  )

  return (
    <div className="pt-4 border-t border-border space-y-1.5">
      {item(kickstartDone, 'Focus today')}
      {item(endOfDayDone, 'End of day')}
    </div>
  )
}
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 4: Commit**

```bash
git add src/hooks/useTodayHandoffs.ts src/components/desktop/DailyProgress.tsx
git commit -m "feat: add useTodayHandoffs hook and DailyProgress component"
```

---

### Task 6: Focus session DB migration + types

**Files:**
- Create: `supabase/migrations/003_focus_sessions.sql`
- Modify: `src/types/index.ts`

**Step 1: Create migration**

```sql
-- supabase/migrations/003_focus_sessions.sql

create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('work', 'writing', 'migration')),
  planned_duration_mins integer not null,
  actual_duration_mins integer,
  start_context text not null,
  end_context text,
  exited_early boolean default false,
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

**Step 2: Run in Supabase SQL Editor**

Go to https://supabase.com/dashboard → SQL Editor → paste and run the migration.

**Step 3: Add types to `src/types/index.ts`**

Add after the existing `Streak` interface:

```typescript
export type SessionType = 'work' | 'writing' | 'migration'

export interface FocusSession {
  id: string
  user_id: string
  type: SessionType
  planned_duration_mins: number
  actual_duration_mins: number | null
  start_context: string
  end_context: string | null
  exited_early: boolean
  started_at: string
  ended_at: string | null
  date: string
  created_at: string
}
```

**Step 4: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 5: Commit**

```bash
git add supabase/migrations/003_focus_sessions.sql src/types/index.ts
git commit -m "feat: add focus_sessions migration and TypeScript types"
```

---

### Task 7: `useFocusSession` hook

**Files:**
- Create: `src/hooks/useFocusSession.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/useFocusSession.ts
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { FocusSession, SessionType } from '@/types'

interface UseFocusSessionReturn {
  activeSession: FocusSession | null
  todaySessionCount: number
  elapsedSeconds: number
  loading: boolean
  startSession: (type: SessionType, durationMins: number, startContext: string) => Promise<void>
  endSession: (endContext: string, exitedEarly: boolean) => Promise<void>
}

export function useFocusSession(user: User | null): UseFocusSessionReturn {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [todaySessionCount, setTodaySessionCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load active session and today's count on mount
  useEffect(() => {
    if (!user) { setLoading(false); return }
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .then(({ data }) => {
        const sessions = (data ?? []) as FocusSession[]
        const open = sessions.find(s => !s.ended_at) ?? null
        setActiveSession(open)
        setTodaySessionCount(sessions.filter(s => s.ended_at).length)
        if (open) {
          const started = new Date(open.started_at).getTime()
          setElapsedSeconds(Math.floor((Date.now() - started) / 1000))
        }
        setLoading(false)
      })
  }, [user])

  // Tick timer when session is active
  useEffect(() => {
    if (activeSession && !activeSession.ended_at) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeSession])

  const startSession = useCallback(async (
    type: SessionType,
    durationMins: number,
    startContext: string
  ) => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        type,
        planned_duration_mins: durationMins,
        start_context: startContext,
        date: today,
      })
      .select()
      .single()
    if (data) {
      setActiveSession(data as FocusSession)
      setElapsedSeconds(0)
    }
  }, [user])

  const endSession = useCallback(async (endContext: string, exitedEarly: boolean) => {
    if (!user || !activeSession) return
    const now = new Date().toISOString()
    const actualMins = Math.floor(elapsedSeconds / 60)
    await supabase
      .from('focus_sessions')
      .update({
        end_context: endContext || null,
        ended_at: now,
        actual_duration_mins: actualMins,
        exited_early: exitedEarly,
      })
      .eq('id', activeSession.id)
    setActiveSession(null)
    setElapsedSeconds(0)
    setTodaySessionCount(c => c + 1)
  }, [user, activeSession, elapsedSeconds])

  return { activeSession, todaySessionCount, elapsedSeconds, loading, startSession, endSession }
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 3: Commit**

```bash
git add src/hooks/useFocusSession.ts
git commit -m "feat: add useFocusSession hook with timer and start/end logic"
```

---

### Task 8: `FocusPanel` component

The right column on desktop: streak, active task, session type, duration, timer, session dots.

**Files:**
- Create: `src/components/desktop/FocusPanel.tsx`

**Step 1: Create the component**

```typescript
// src/components/desktop/FocusPanel.tsx
import { useState } from 'react'
import { Flame, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { SessionType } from '@/types'
import { useFocusSession } from '@/hooks/useFocusSession'
import { useStreak } from '@/hooks/useStreak'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'

interface Props {
  user: User
  activeTask: string | null
}

const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'writing', label: 'Writing' },
  { key: 'migration', label: 'Migration' },
]

const DURATIONS = [25, 45, 60, 90]
const MAX_DOTS = 4

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function FocusPanel({ user, activeTask }: Props) {
  const streak = useStreak(user, 'kickstart')
  const { activeSession, todaySessionCount, elapsedSeconds, loading, startSession, endSession } =
    useFocusSession(user)

  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [duration, setDuration] = useState(25)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [starting, setStarting] = useState(false)

  const plannedSeconds = (activeSession?.planned_duration_mins ?? duration) * 60
  const isEarlyExit = elapsedSeconds < plannedSeconds

  async function handleStart() {
    if (!activeTask) return
    setStarting(true)
    await startSession(sessionType, duration, activeTask)
    setStarting(false)
  }

  function handleStop() {
    setShowCloseModal(true)
  }

  async function handleClose(endContext: string) {
    await endSession(endContext, isEarlyExit)
    setShowCloseModal(false)
  }

  if (loading) {
    return <div className="animate-pulse h-64 rounded-xl bg-secondary" />
  }

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

      {/* Active task */}
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
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                    duration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Timer */}
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
            disabled={!activeTask || starting}
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
          onKeepGoing={() => setShowCloseModal(false)}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
```

**Step 2: Verify build** (will fail — SessionCloseModal not yet created)

```bash
npm run build
```
Expected: error about `SessionCloseModal` not found. That's correct — proceed to next step.

**Step 3: Create `SessionCloseModal`**

```typescript
// src/components/desktop/SessionCloseModal.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  isEarlyExit: boolean
  remainingMins: number
  onKeepGoing: () => void
  onClose: (endContext: string) => Promise<void>
}

export default function SessionCloseModal({ isEarlyExit, remainingMins, onKeepGoing, onClose }: Props) {
  const [endContext, setEndContext] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleClose() {
    setSaving(true)
    await onClose(endContext)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-sm bg-secondary border border-border rounded-xl p-6 space-y-4">
        {isEarlyExit && (
          <p className="text-sm text-muted-foreground">
            {remainingMins} minute{remainingMins !== 1 ? 's' : ''} remaining.
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
            Where did you get to?
          </label>
          <textarea
            value={endContext}
            onChange={e => setEndContext(e.target.value)}
            placeholder="Optional — what's the next action?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          {isEarlyExit && (
            <button
              onClick={onKeepGoing}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
            >
              Keep going
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 5: Commit**

```bash
git add src/components/desktop/FocusPanel.tsx src/components/desktop/SessionCloseModal.tsx
git commit -m "feat: add FocusPanel and SessionCloseModal for desktop work mode"
```

---

### Task 9: `WorkDesktop` — assemble the two-column layout

**Files:**
- Create: `src/components/desktop/WorkDesktop.tsx`
- Modify: `src/App.tsx` (use WorkDesktop on desktop)

**Step 1: Create WorkDesktop**

```typescript
// src/components/desktop/WorkDesktop.tsx
import { useState } from 'react'
import { useState as useStateLocal } from 'react'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent } from '@/types'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import KickstartPlanDisplay from '@/components/desktop/KickstartPlanDisplay'
import FocusPanel from '@/components/desktop/FocusPanel'
import DailyProgress from '@/components/desktop/DailyProgress'
import { useTodayHandoffs } from '@/hooks/useTodayHandoffs'
import MorningKickstart from '@/components/kickstart/MorningKickstart'
import EndOfDayHandoff from '@/components/handoff/EndOfDayHandoff'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

type DesktopView = 'work' | 'handoff'

export default function WorkDesktop({ user, onSwitchToTransition }: Props) {
  const [plan, setPlan] = useState<KickstartContent | null>(null)
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [view, setView] = useState<DesktopView>('work')
  const { kickstartDone, endOfDayDone } = useTodayHandoffs(user)

  // Load today's kickstart result
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('handoffs')
      .select('content')
      .eq('user_id', user.id)
      .eq('type', 'morning_kickstart')
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const content = data.content as KickstartContent
          setPlan(content)
          setActiveTask(content.main_focus)
        }
        setLoadingPlan(false)
      })
  }, [user.id])

  if (view === 'handoff') {
    return (
      <div className="space-y-4 max-w-lg">
        <button
          onClick={() => setView('work')}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold">End of Day</h2>
        <EndOfDayHandoff user={user} onSwitchToTransition={onSwitchToTransition} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left column — planning */}
      <div className="space-y-4">
        {loadingPlan ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 rounded-lg bg-secondary" />
            <div className="h-16 rounded-lg bg-secondary" />
            <div className="h-16 rounded-lg bg-secondary" />
          </div>
        ) : plan ? (
          <KickstartPlanDisplay
            plan={plan}
            activeTask={activeTask}
            onSelectTask={setActiveTask}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">No kickstart yet today.</p>
            <MorningKickstart user={user} />
          </div>
        )}

        {/* Bottom actions */}
        <div className="pt-2 space-y-2">
          <DailyProgress kickstartDone={kickstartDone} endOfDayDone={endOfDayDone} />
          <button
            onClick={() => setView('handoff')}
            className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform mt-3"
          >
            End of Day
          </button>
        </div>
      </div>

      {/* Right column — doing */}
      <div>
        <FocusPanel user={user} activeTask={activeTask} />
      </div>
    </div>
  )
}
```

**Step 2: Modify `src/App.tsx` — use WorkDesktop on desktop in work mode**

Import `WorkDesktop` and `useBreakpoint` is already imported. Inside the `content` variable, replace the `WorkMode` render for desktop:

```typescript
// Add import at top:
import WorkDesktop from '@/components/desktop/WorkDesktop'

// Replace content block:
const content = (
  <ErrorBoundary>
    {currentMode === 'work' && (
      isDesktop
        ? <WorkDesktop user={user} onSwitchToTransition={handleSwitchToTransition} />
        : <WorkMode user={user} onSwitchToTransition={handleSwitchToTransition} />
    )}
    {currentMode === 'transition' && <TransitionMode user={user} />}
    {currentMode === 'home' && <HomeMode user={user} />}
  </ErrorBoundary>
)
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 4: Manual test in browser**

```bash
npm run dev
```

- Desktop (1280px): Work mode should show two columns — kickstart plan on left (or "No kickstart yet" + form), FocusPanel on right
- Mobile (390px): Work mode should show the original single-column view, unchanged

**Step 5: Commit**

```bash
git add src/components/desktop/WorkDesktop.tsx src/App.tsx
git commit -m "feat: add WorkDesktop two-column layout, wire to App.tsx on desktop"
```

---

## Phase C — Email Drop Zone

### Task 10: Email Drop Zone core logic

Read `documentation/06-email-dropzone.md` fully before this task. The drop zone uses the existing Claude API endpoint.

**Files:**
- Create: `src/components/email/EmailDropZone.tsx`

**Step 1: Add `EmailExtraction` type to `src/types/index.ts`**

```typescript
export interface EmailExtractionAction {
  title: string
  priority: 'focus' | 'if_time' | 'must_today'
  due_date: string | null
}

export interface EmailExtractionWaitingFor {
  title: string
  person: string
  time_sensitive: boolean
}

export interface EmailExtractionPromise {
  title: string
  made_to: string | null
  due_date: string | null
}

export interface EmailExtraction {
  actions: EmailExtractionAction[]
  waiting_for: EmailExtractionWaitingFor[]
  promises: EmailExtractionPromise[]
  summary: string
}
```

**Step 2: Create `EmailDropZone` component**

```typescript
// src/components/email/EmailDropZone.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { callClaude } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { EmailExtraction } from '@/types'

const EMAIL_SYSTEM_PROMPT = `Extract actionable items from this email thread. Return ONLY valid JSON.

Shape:
{
  "actions": [{ "title": string, "priority": "focus"|"if_time"|"must_today", "due_date": string|null }],
  "waiting_for": [{ "title": string, "person": string, "time_sensitive": boolean }],
  "promises": [{ "title": string, "made_to": string|null, "due_date": string|null }],
  "summary": "One sentence: what this email is about"
}

Rules:
- actions: things William needs to do
- waiting_for: things blocked on others
- promises: only things William explicitly promised (not promises made to him)
- time_sensitive waiting_for items get priority must_today
- If nothing extractable, return empty arrays and a summary noting why
- Be specific: not "reply to email" but "reply to [person] about [topic]"`

interface Props {
  user: User
  onDone: () => void
}

type DropZoneView = 'input' | 'review' | 'saved'

export default function EmailDropZone({ user, onDone }: Props) {
  const [emailText, setEmailText] = useState('')
  const [contextNote, setContextNote] = useState('')
  const [extraction, setExtraction] = useState<EmailExtraction | null>(null)
  const [checkedActions, setCheckedActions] = useState<boolean[]>([])
  const [checkedWaiting, setCheckedWaiting] = useState<boolean[]>([])
  const [checkedPromises, setCheckedPromises] = useState<boolean[]>([])
  const [view, setView] = useState<DropZoneView>('input')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  async function handleExtract() {
    if (!emailText.trim()) return
    setLoading(true)
    setError(null)

    try {
      const userMessage = contextNote.trim()
        ? `${emailText.trim()}\n\nContext: ${contextNote.trim()}`
        : emailText.trim()

      const raw = await callClaude(
        [{ role: 'user', content: userMessage }],
        EMAIL_SYSTEM_PROMPT
      )
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned) as EmailExtraction

      if (!parsed.actions.length && !parsed.waiting_for.length && !parsed.promises.length) {
        setError(`Nothing actionable found: ${parsed.summary}`)
        setLoading(false)
        return
      }

      setExtraction(parsed)
      setCheckedActions(parsed.actions.map(() => true))
      setCheckedWaiting(parsed.waiting_for.map(() => true))
      setCheckedPromises(parsed.promises.map(() => true))
      setView('review')
    } catch (err) {
      console.error('Email extraction error:', err)
      setError('Claude is unavailable — copy the key actions manually.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!extraction) return
    setSaving(true)
    let count = 0

    const actionInserts = extraction.actions
      .filter((_, i) => checkedActions[i])
      .map(a => ({
        user_id: user.id,
        title: a.title,
        context: 'work',
        priority: a.priority === 'must_today' ? 1 : a.priority === 'focus' ? 2 : 3,
        due_date: a.due_date,
        source: 'email_drop',
        status: 'open',
      }))

    const waitingInserts = extraction.waiting_for
      .filter((_, i) => checkedWaiting[i])
      .map(w => ({
        user_id: user.id,
        title: `${w.person}: ${w.title}`,
        context: 'waiting_for',
        priority: w.time_sensitive ? 1 : 3,
        source: 'email_drop',
        status: 'open',
        waiting_for_person: w.person,
      }))

    if (actionInserts.length + waitingInserts.length > 0) {
      await supabase.from('tasks').insert([...actionInserts, ...waitingInserts])
      count += actionInserts.length + waitingInserts.length
    }

    setSaving(false)
    setSavedCount(count)
    setView('saved')
  }

  if (view === 'saved') {
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-foreground font-medium">{savedCount} item{savedCount !== 1 ? 's' : ''} saved.</p>
        <button onClick={onDone} className="text-sm text-primary hover:underline cursor-pointer">
          Back to Work
        </button>
      </div>
    )
  }

  if (view === 'review' && extraction) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">EMAIL: {extraction.summary}</p>

        {extraction.actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Actions for you</p>
            {extraction.actions.map((a, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedActions[i]}
                  onChange={e => setCheckedActions(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  className="mt-0.5"
                />
                <span className="text-sm">{a.title}{a.due_date ? ` — ${a.due_date}` : ''}</span>
              </label>
            ))}
          </div>
        )}

        {extraction.waiting_for.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Waiting for</p>
            {extraction.waiting_for.map((w, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedWaiting[i]}
                  onChange={e => setCheckedWaiting(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  className="mt-0.5"
                />
                <span className="text-sm">{w.person} — {w.title}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setView('input')}
            className="flex-1 py-3 rounded-lg border border-border text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
          Paste the email here
        </label>
        <textarea
          value={emailText}
          onChange={e => setEmailText(e.target.value)}
          placeholder="Paste the email here — the whole thread if needed."
          rows={8}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
          Who is this from / what's the context? <span className="normal-case text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={contextNote}
          onChange={e => setContextNote(e.target.value)}
          placeholder="e.g. Customer chasing RMA status"
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={handleExtract}
        disabled={loading || !emailText.trim()}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Extracting…' : 'Extract actions'}
      </button>
    </div>
  )
}
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 4: Commit**

```bash
git add src/types/index.ts src/components/email/EmailDropZone.tsx
git commit -m "feat: add EmailDropZone component with Claude extraction and confirmation flow"
```

---

### Task 11: `EmailDropOverlay` and wire into WorkDesktop

**Files:**
- Create: `src/components/desktop/EmailDropOverlay.tsx`
- Modify: `src/components/desktop/WorkDesktop.tsx`

**Step 1: Create `EmailDropOverlay`**

```typescript
// src/components/desktop/EmailDropOverlay.tsx
import type { User } from '@supabase/supabase-js'
import EmailDropZone from '@/components/email/EmailDropZone'

interface Props {
  user: User
  onClose: () => void
}

export default function EmailDropOverlay({ user, onClose }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back to Work
        </button>
      </div>
      <h2 className="text-lg font-bold">Process an email</h2>
      <div className="max-w-2xl">
        <EmailDropZone user={user} onDone={onClose} />
      </div>
    </div>
  )
}
```

**Step 2: Add "Process an email" button and overlay state to WorkDesktop**

In `src/components/desktop/WorkDesktop.tsx`, add `showEmailDrop` state and the overlay:

```typescript
// Add to imports:
import EmailDropOverlay from '@/components/desktop/EmailDropOverlay'

// Add state:
const [showEmailDrop, setShowEmailDrop] = useState(false)

// At the top of the return, before the grid, add:
if (showEmailDrop) {
  return <EmailDropOverlay user={user} onClose={() => setShowEmailDrop(false)} />
}

// In the left column bottom actions, add below the End of Day button:
<button
  onClick={() => setShowEmailDrop(true)}
  className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
>
  Process an email
</button>
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 4: Manual test in browser at 1280px**

```bash
npm run dev
```

- Click "Process an email" → full-width overlay appears
- Paste test text → "Extract actions" button works
- "← Back to Work" → returns to two-column view

**Step 5: Commit**

```bash
git add src/components/desktop/EmailDropOverlay.tsx src/components/desktop/WorkDesktop.tsx
git commit -m "feat: add EmailDropOverlay and wire Process an email button in WorkDesktop"
```

---

## Phase D — Email Forwarding

### Task 12: `email_inbox` migration + types

**Files:**
- Create: `supabase/migrations/004_email_inbox.sql`
- Modify: `src/types/index.ts`

**Step 1: Create migration**

```sql
-- supabase/migrations/004_email_inbox.sql

create table email_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sender_email text not null,
  context text not null check (context in ('work', 'home')),
  subject text,
  extraction jsonb,
  flagged boolean default false,
  reviewed boolean default false,
  created_at timestamptz default now()
);

alter table email_inbox enable row level security;
create policy "Users access own inbox only"
  on email_inbox for all using (user_id = auth.uid());

create index email_inbox_user_reviewed on email_inbox (user_id, reviewed, created_at desc);
```

**Step 2: Run in Supabase SQL Editor**

Go to https://supabase.com/dashboard → SQL Editor → paste and run.

**Step 3: Add `EmailInboxItem` type to `src/types/index.ts`**

```typescript
export interface EmailInboxItem {
  id: string
  user_id: string
  sender_email: string
  context: 'work' | 'home'
  subject: string | null
  extraction: EmailExtraction | null
  flagged: boolean
  reviewed: boolean
  created_at: string
}
```

**Step 4: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 5: Commit**

```bash
git add supabase/migrations/004_email_inbox.sql src/types/index.ts
git commit -m "feat: add email_inbox migration and EmailInboxItem type"
```

---

### Task 13: `api/email.ts` — Resend webhook receiver

**Before starting:** Create a free Resend account at https://resend.com. Enable inbound emails and note your webhook signing secret. Add `RESEND_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables.

**Files:**
- Create: `api/email.ts`

**Step 1: Install Resend SDK**

```bash
npm install resend
```

**Step 2: Create `api/email.ts`**

```typescript
// api/email.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Use service role key to write to email_inbox without user auth context
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PERSONAL_EMAILS = ['will1kerridge@gmail.com', 'will1kerridge@aol.com']

const EMAIL_SYSTEM_PROMPT = `Extract actionable items from this email thread. Return ONLY valid JSON.

Shape:
{
  "actions": [{ "title": string, "priority": "focus"|"if_time"|"must_today", "due_date": string|null }],
  "waiting_for": [{ "title": string, "person": string, "time_sensitive": boolean }],
  "promises": [{ "title": string, "made_to": string|null, "due_date": string|null }],
  "summary": "One sentence: what this email is about"
}

Rules:
- actions: things William needs to do
- waiting_for: things blocked on others
- promises: only things William explicitly promised
- time_sensitive waiting_for items get priority must_today
- If nothing extractable, return empty arrays`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Resend sends parsed email fields in the POST body
    const { from, subject, text, html } = req.body as {
      from: string
      subject: string
      text?: string
      html?: string
    }

    if (!from) {
      return res.status(400).json({ error: 'Missing from field' })
    }

    // Extract sender email from "Name <email@domain>" format
    const senderMatch = from.match(/<(.+?)>/)
    const senderEmail = senderMatch ? senderMatch[1].toLowerCase() : from.toLowerCase()

    // Determine context from sender
    const isPersonal = PERSONAL_EMAILS.includes(senderEmail)
    const context = isPersonal ? 'home' : 'work'
    const flagged = !isPersonal && !senderEmail.includes('cosworth') // flag unknown work senders

    // Use plain text body for extraction, fall back to html
    const emailBody = text || html || subject || 'No body'

    // Get William's user_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (!profile) {
      return res.status(500).json({ error: 'User profile not found' })
    }

    const userId = profile.id

    // Run Claude extraction
    let extraction = null
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: EMAIL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: emailBody }],
      })
      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      extraction = JSON.parse(cleaned)
    } catch (err) {
      console.error('Claude extraction failed:', err)
      // Save to inbox anyway — user will see "Could not extract" at review
    }

    // Save to email_inbox
    await supabase.from('email_inbox').insert({
      user_id: userId,
      sender_email: senderEmail,
      context,
      subject: subject || null,
      extraction,
      flagged,
      reviewed: false,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Email webhook error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 4: Commit**

```bash
git add api/email.ts
git commit -m "feat: add api/email.ts Resend webhook receiver with sender-based context routing"
```

---

### Task 14: Email inbox badge + review screen

**Files:**
- Create: `src/hooks/useEmailInbox.ts`
- Create: `src/components/email/EmailInboxReview.tsx`
- Modify: `src/components/desktop/WorkDesktop.tsx` (badge on "Process an email" button)

**Step 1: Create `useEmailInbox` hook**

```typescript
// src/hooks/useEmailInbox.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { EmailInboxItem } from '@/types'

export function useEmailInbox(user: User | null) {
  const [items, setItems] = useState<EmailInboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('email_inbox')
      .select('*')
      .eq('user_id', user.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as EmailInboxItem[])
        setLoading(false)
      })
  }, [user])

  async function markReviewed(id: string) {
    await supabase.from('email_inbox').update({ reviewed: true }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, markReviewed }
}
```

**Step 2: Create `EmailInboxReview` component**

```typescript
// src/components/email/EmailInboxReview.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { EmailInboxItem } from '@/types'

interface Props {
  user: User
  item: EmailInboxItem
  onDone: () => void
}

export default function EmailInboxReview({ user, item, onDone }: Props) {
  const extraction = item.extraction
  const [checkedActions, setCheckedActions] = useState(
    () => extraction?.actions.map(() => true) ?? []
  )
  const [checkedWaiting, setCheckedWaiting] = useState(
    () => extraction?.waiting_for.map(() => true) ?? []
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    if (extraction) {
      const actionInserts = extraction.actions
        .filter((_, i) => checkedActions[i])
        .map(a => ({
          user_id: user.id,
          title: a.title,
          context: item.context,
          priority: a.priority === 'must_today' ? 1 : a.priority === 'focus' ? 2 : 3,
          due_date: a.due_date,
          source: 'email_forward',
          status: 'open',
        }))

      const waitingInserts = extraction.waiting_for
        .filter((_, i) => checkedWaiting[i])
        .map(w => ({
          user_id: user.id,
          title: `${w.person}: ${w.title}`,
          context: 'waiting_for',
          priority: w.time_sensitive ? 1 : 3,
          source: 'email_forward',
          status: 'open',
          waiting_for_person: w.person,
        }))

      if (actionInserts.length + waitingInserts.length > 0) {
        await supabase.from('tasks').insert([...actionInserts, ...waitingInserts])
      }
    }

    await supabase.from('email_inbox').update({ reviewed: true }).eq('id', item.id)
    setSaving(false)
    onDone()
  }

  return (
    <div className="space-y-4">
      {item.flagged && (
        <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm">
          From unknown sender: {item.sender_email}. Saved as {item.context} task.
        </div>
      )}

      <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">From</p>
        <p className="text-sm">{item.sender_email}</p>
        {item.subject && <p className="text-sm font-medium mt-1">{item.subject}</p>}
      </div>

      {!extraction ? (
        <p className="text-sm text-muted-foreground">
          Could not extract — review the email manually.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{extraction.summary}</p>

          {extraction.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Actions</p>
              {extraction.actions.map((a, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedActions[i]}
                    onChange={e => setCheckedActions(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{a.title}</span>
                </label>
              ))}
            </div>
          )}

          {extraction.waiting_for.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Waiting for</p>
              {extraction.waiting_for.map((w, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedWaiting[i]}
                    onChange={e => setCheckedWaiting(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{w.person} — {w.title}</span>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save and mark reviewed'}
      </button>
    </div>
  )
}
```

**Step 3: Add inbox badge to WorkDesktop "Process an email" button**

In `src/components/desktop/WorkDesktop.tsx`, add the inbox badge:

```typescript
// Add import:
import { useEmailInbox } from '@/hooks/useEmailInbox'

// Add inside component:
const { items: inboxItems } = useEmailInbox(user)
const inboxCount = inboxItems.length

// Replace the "Process an email" button:
<button
  onClick={() => setShowEmailDrop(true)}
  className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2 relative"
>
  Process an email
  {inboxCount > 0 && (
    <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
      {inboxCount}
    </span>
  )}
</button>
```

**Step 4: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 5: Commit**

```bash
git add src/hooks/useEmailInbox.ts src/components/email/EmailInboxReview.tsx src/components/desktop/WorkDesktop.tsx
git commit -m "feat: add email inbox review flow and badge count on Process an email button"
```

---

### Task 15: Settings — forwarding address + personal email config

Read `documentation/10-settings.md` before this task.

**Files:**
- Modify: `src/components/settings/SettingsPage.tsx`
- Modify: `src/types/index.ts` (add `personal_emails` to Profile)

**Step 1: Add `personal_emails` to Profile type**

In `src/types/index.ts`, add `personal_emails` to the `Profile` interface:

```typescript
personal_emails: string[]   // Add after transition_time
```

**Step 2: Add migration for personal_emails column**

```sql
-- supabase/migrations/005_profile_personal_emails.sql
alter table profiles
  add column if not exists personal_emails text[] default array['will1kerridge@gmail.com', 'will1kerridge@aol.com'];
```

Run in Supabase SQL Editor.

**Step 3: Add forwarding section to SettingsPage**

Read the current `src/components/settings/SettingsPage.tsx` first, then add a new section at the bottom of the settings form:

```typescript
{/* Email forwarding section */}
<div className="space-y-3 pt-4 border-t border-border">
  <div>
    <p className="text-sm font-semibold">Email forwarding</p>
    <p className="text-xs text-muted-foreground mt-0.5">
      Forward or BCC emails to this address — FOCUS will extract the actions automatically.
    </p>
  </div>

  <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Your FOCUS address</p>
    <p className="text-sm font-mono select-all">add@[your-resend-domain]</p>
    <p className="text-xs text-muted-foreground mt-2">
      Emails from your personal addresses below are saved as Home tasks. Everything else is Work.
    </p>
  </div>

  <div>
    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
      Personal email addresses (one per line)
    </label>
    <textarea
      value={(profile.personal_emails ?? []).join('\n')}
      onChange={e => {
        const emails = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
        updateProfile({ personal_emails: emails } as Parameters<typeof updateProfile>[0])
      }}
      rows={3}
      className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm font-mono"
      placeholder="will1kerridge@gmail.com"
    />
  </div>
</div>
```

**Step 4: Update `updateProfile` type in `useProfile.ts`**

In `src/hooks/useProfile.ts`, extend the `updateProfile` pick to include `personal_emails`:

```typescript
// Change:
async (updates: Partial<Pick<Profile, 'work_days' | 'transition_time'>>) => {
// To:
async (updates: Partial<Pick<Profile, 'work_days' | 'transition_time' | 'personal_emails'>>) => {
```

**Step 5: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

**Step 6: Commit**

```bash
git add supabase/migrations/005_profile_personal_emails.sql src/types/index.ts src/hooks/useProfile.ts src/components/settings/SettingsPage.tsx
git commit -m "feat: add email forwarding address and personal email config in Settings"
```

---

## Phase E — Push to Vercel

### Task 16: Final push

**Step 1: Run final build and check**

```bash
npm run build
```
Expected: `✓ built` with no errors, no TypeScript warnings.

**Step 2: Manual test checklist in browser before pushing**

At 390px (iPhone):
- [ ] Work mode: single column, unchanged
- [ ] Morning Kickstart works
- [ ] End of Day works
- [ ] Transition and Home modes unchanged

At 1280px (desktop):
- [ ] Work mode: two columns appear
- [ ] Clicking a task on the left sets it in FocusPanel
- [ ] Start session → timer counts up
- [ ] Finish session → close modal appears
- [ ] "Process an email" → full-width overlay
- [ ] Paste email → extraction → review → save
- [ ] Settings shows forwarding address and personal email fields

**Step 3: Push**

```bash
git push origin main
```

Vercel deploys automatically. Check https://focus-app-sandy.vercel.app after ~60 seconds.

**Step 4: Post-deploy: configure Resend**

1. Create account at https://resend.com
2. Enable inbound emails
3. Set webhook URL to `https://focus-app-sandy.vercel.app/api/email`
4. Copy your inbound forwarding address
5. Add `RESEND_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables
6. Update the forwarding address placeholder in `SettingsPage.tsx` with your real Resend address
7. Redeploy: `git push origin main`

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| A | 1–3 | Layout infrastructure — breakpoint hook, wrappers, App.tsx wired |
| B | 4–9 | Desktop Work mode — two columns, kickstart plan, focus timer, session dots |
| C | 10–11 | Email drop zone — paste + extract + confirm, desktop overlay |
| D | 12–15 | Email forwarding — Resend webhook, inbox review, Settings config |
| E | 16 | Deploy to Vercel + Resend setup |
