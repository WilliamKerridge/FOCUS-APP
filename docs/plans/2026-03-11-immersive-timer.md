# Immersive Focus Timer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the SessionPanel active-session view into a full-screen immersive timer on mobile and an enhanced visual card on desktop.

**Architecture:** Modify only `src/components/focus/SessionPanel.tsx`. Add `useBreakpoint()` inside the component. Mobile active session → early-return full-screen `fixed inset-0` block. Desktop active session → enhanced timer card in-place. No hook, logic, or parent changes.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS v3, lucide-react, Fraunces font (already loaded via CSS), `useBreakpoint` hook at `@/hooks/useBreakpoint`

---

### Task 1: Add `useBreakpoint` import and mobile immersive view to SessionPanel

**Files:**
- Modify: `src/components/focus/SessionPanel.tsx`

**Step 1: Add `useBreakpoint` import**

At the top of `src/components/focus/SessionPanel.tsx`, add after the existing imports:

```tsx
import { useBreakpoint } from '@/hooks/useBreakpoint'
```

**Step 2: Add `useBreakpoint` call inside the component**

Inside `SessionPanel`, after the existing hook calls (after `useFocusSession`), add:

```tsx
const { isMobile } = useBreakpoint()
```

**Step 3: Add mobile immersive early return**

Insert this block AFTER the `if (loading)` early return (around line 98) and BEFORE the main `return (`:

```tsx
  // Mobile immersive full-screen view when session is active
  if (activeSession && isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          {/* Session type chip */}
          <div className="flex items-center justify-center pt-16 pb-6">
            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold tracking-[0.8px] uppercase">
              {activeSession.type}
            </span>
          </div>

          {/* Task name */}
          <div className="px-8 text-center mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Focusing on
            </p>
            <p className="text-base font-medium leading-snug line-clamp-3">
              {activeSession.start_context}
            </p>
          </div>

          {/* Timer with radial glow */}
          <div className="relative flex items-center justify-center flex-1">
            <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <p className="relative font-fraunces text-7xl font-semibold tabular-nums tracking-tight">
              {formatTime(elapsedSeconds)}
            </p>
          </div>

          {/* Session dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: MAX_DOTS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${i < todaySessionCount ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {todaySessionCount} session{todaySessionCount !== 1 ? 's' : ''} today
            </span>
          </div>

          {/* Finish button */}
          <div className="px-6 pb-12">
            <button
              onClick={handleStop}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base cursor-pointer active:scale-[0.98] transition-transform"
            >
              Finish session
            </button>
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
      </>
    )
  }
```

**Step 4: Run tests**

```bash
cd /Users/williamkerridge/Documents/FOCUS && npm test
```

Expected: all 163 tests pass (no logic changed).

**Step 5: Commit**

```bash
git add src/components/focus/SessionPanel.tsx
git commit -m "feat: immersive full-screen timer on mobile when session active"
```

---

### Task 2: Enhanced desktop timer card

**Files:**
- Modify: `src/components/focus/SessionPanel.tsx`

**What changes:** In the main `return` block, replace the plain `{/* Timer */}` card block with an enhanced version that shows a glow, Fraunces typography, session type chip, and a primary-coloured Finish button when `activeSession` is truthy. The Start button and pre-session UI are unchanged.

**Step 1: Find the Timer block**

In `SessionPanel.tsx`, find this exact block (around line 219 in the original file — now shifted down due to Task 1):

```tsx
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
```

**Step 2: Replace with enhanced version**

```tsx
      {/* Timer */}
      <div className={`relative overflow-hidden px-4 py-6 rounded-2xl text-center space-y-4 ${
        activeSession
          ? 'bg-secondary border border-primary/20 shadow-[0_8px_24px_rgba(63,169,245,0.08)]'
          : 'bg-secondary border border-border'
      }`}>
        {/* Radial glow — desktop active only */}
        {activeSession && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
          </div>
        )}

        {/* Session type chip — desktop active only */}
        {activeSession && (
          <div className="relative flex justify-center">
            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold tracking-[0.8px] uppercase">
              {activeSession.type}
            </span>
          </div>
        )}

        <p className={`relative tabular-nums tracking-tight ${
          activeSession
            ? 'font-fraunces text-5xl font-semibold'
            : 'text-4xl font-bold'
        }`}>
          {formatTime(elapsedSeconds)}
        </p>

        {activeSession ? (
          <button
            onClick={handleStop}
            className="relative w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer active:scale-[0.98] transition-transform"
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
        <div className="relative flex items-center justify-center gap-2">
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
```

**Step 3: Run tests**

```bash
npm test
```

Expected: all 163 tests pass.

**Step 4: Commit and push**

```bash
git add src/components/focus/SessionPanel.tsx
git commit -m "feat: enhanced desktop timer card with glow, Fraunces, and session type chip"
git push
```

---

### Task 3: Manual verification checklist

```bash
npm run dev
```

Check on **mobile** (or DevTools mobile emulation at 390px):
- [ ] Start a session → entire screen replaced by immersive view
- [ ] Session type chip shows (WORK / WRITING / MIGRATION)
- [ ] "Focusing on" + task name visible
- [ ] Timer is large Fraunces serif, ticking
- [ ] Radial glow visible behind timer
- [ ] Session dots correct count
- [ ] "Finish session" taps → SessionCloseModal appears
- [ ] "Keep going" → returns to immersive view
- [ ] Completing session → returns to normal WorkMode/HomeMode

Check on **desktop** (≥768px):
- [ ] Pre-session form unchanged
- [ ] Active session → card shows glow + chip + Fraunces `text-5xl` timer
- [ ] "Finish session" button is cyan, not muted border
- [ ] SessionCloseModal works as before
- [ ] No full-screen takeover on desktop
