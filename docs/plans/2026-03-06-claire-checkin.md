# Claire Check-in Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a morning reflection step to the kickstart asking "How was your evening with Claire yesterday?" — one tap answer, optional blocker text for "partially", skippable, pattern-surfaced to Claude.

**Architecture:** New `claire_checkins` table (separate from handoffs); `useClaireCheckin` hook fetches/saves; `ClaireCheckin` component renders the step; `MorningKickstart` gains `step` state `'claire' | 'dump'` and passes last-7-days context to `buildSystemPrompt`.

**Tech Stack:** Supabase (new table + RLS), React + TypeScript, Vitest + @testing-library/react

> **Note:** `src/types/index.ts` already has `claire_quality_time` and `claire_blocker` on the `Handoff` interface from a previous design iteration. These fields are unused — do NOT remove them (no DB column), just leave them in place.

---

### Task 1: DB Migration (manual step)

**Files:**
- Create: `supabase/migrations/008_claire_checkins.sql`

**Step 1: Create the migration file**

```sql
create table claire_checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  date         date not null,
  quality_time text not null check (quality_time in ('yes', 'no', 'partial')),
  blocker      text,
  created_at   timestamptz default now() not null,
  unique (user_id, date)
);

alter table claire_checkins enable row level security;
create policy "Users manage own checkins"
  on claire_checkins for all using (auth.uid() = user_id);
```

**Step 2: Run it in the Supabase SQL editor at https://okepgyhffzogiqnltncr.supabase.co**

**Step 3: Commit**

```bash
git add supabase/migrations/008_claire_checkins.sql
git commit -m "feat: add claire_checkins migration"
```

---

### Task 2: TypeScript type

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add the interface** after `UserPushSubscription`:

```typescript
export interface ClaireCheckin {
  id: string
  user_id: string
  date: string          // 'YYYY-MM-DD' — the evening being reflected on (yesterday)
  quality_time: 'yes' | 'no' | 'partial'
  blocker: string | null
  created_at: string
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ClaireCheckin type"
```

---

### Task 3: useClaireCheckin hook + tests

**Files:**
- Create: `src/hooks/useClaireCheckin.ts`
- Create: `src/hooks/useClaireCheckin.test.ts`

**Step 1: Write the failing tests first**

```typescript
// src/hooks/useClaireCheckin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useClaireCheckin } from './useClaireCheckin'

const fakeUser = { id: 'user-1' } as User

const yesterday = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
})()

function makeMaybeSingle(data: unknown) {
  return { maybeSingle: () => Promise.resolve({ data, error: null }) }
}

function makeSelect(rows: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              then: (cb: (val: unknown) => void) =>
                Promise.resolve({ data: rows, error: null }).then(cb),
            }),
          }),
        }),
      }),
    }),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('useClaireCheckin', () => {
  it('todayCheckin is null when no row exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'claire_checkins') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ eq: () => makeMaybeSingle(null) }) }),
          }),
        }
      }
      return makeSelect([])
    })

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.todayCheckin).toBeNull()
  })

  it('todayCheckin is set when row exists', async () => {
    const row = { id: 'c1', user_id: 'user-1', date: yesterday, quality_time: 'yes', blocker: null, created_at: '' }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'claire_checkins') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ eq: () => makeMaybeSingle(row) }) }),
          }),
        }
      }
      return makeSelect([])
    })

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.todayCheckin?.quality_time).toBe('yes')
  })

  it('saveCheckin upserts and updates todayCheckin', async () => {
    const upsertMock = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockImplementation((table: string) => {
      if (table === 'claire_checkins') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ eq: () => makeMaybeSingle(null) }) }),
          }),
          upsert: upsertMock,
        }
      }
      return makeSelect([])
    })

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.saveCheckin(yesterday, 'yes', null)
    })

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', date: yesterday, quality_time: 'yes' }),
      expect.any(Object)
    )
    expect(result.current.todayCheckin?.quality_time).toBe('yes')
  })

  it('detects 3+ consecutive no/partial pattern', async () => {
    const recent = [
      { id: '1', user_id: 'user-1', date: '2026-03-04', quality_time: 'no', blocker: null, created_at: '' },
      { id: '2', user_id: 'user-1', date: '2026-03-03', quality_time: 'partial', blocker: 'phone', created_at: '' },
      { id: '3', user_id: 'user-1', date: '2026-03-02', quality_time: 'no', blocker: null, created_at: '' },
    ]
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => makeMaybeSingle(null),
            order: () => ({ limit: () => ({ then: (cb: (val: unknown) => void) => Promise.resolve({ data: recent, error: null }).then(cb) }) }),
          }),
        }),
      }),
    }))

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.claireContext).toContain('3+')
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- useClaireCheckin
```

Expected: 4 failures (module not found).

**Step 3: Write the hook**

```typescript
// src/hooks/useClaireCheckin.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { ClaireCheckin } from '@/types'

function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function buildClaireContext(recent: ClaireCheckin[]): string | null {
  if (recent.length === 0) return null

  const sorted = [...recent].sort((a, b) => b.date.localeCompare(a.date))

  // 5+ consecutive yes
  const consecYes = sorted.findIndex(c => c.quality_time !== 'yes')
  if (consecYes === -1 && sorted.length >= 5) {
    return `William has had ${sorted.length} consecutive good evenings with Claire this week.`
  }

  // 3+ consecutive partial
  const consecPartial = sorted.findIndex(c => c.quality_time !== 'partial')
  if (consecPartial === -1 && sorted.length >= 3) {
    const blockers = sorted.filter(c => c.blocker).map(c => c.blocker).join(', ')
    return `William has had 3+ partially-present evenings with Claire. Blockers: ${blockers || 'none noted'}.`
  }

  // 3+ consecutive no or partial
  const consecNoOrPartial = sorted.findIndex(c => c.quality_time === 'yes')
  const streak = consecNoOrPartial === -1 ? sorted.length : consecNoOrPartial
  if (streak >= 3) {
    return `William has had 3+ evenings without quality time with Claire recently.`
  }

  return null
}

export function useClaireCheckin(user: User) {
  const [todayCheckin, setTodayCheckin] = useState<ClaireCheckin | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<ClaireCheckin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const yday = yesterday()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    Promise.all([
      supabase
        .from('claire_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yday)
        .maybeSingle(),
      supabase
        .from('claire_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7),
    ]).then(([todayRes, recentRes]) => {
      if (todayRes.data) setTodayCheckin(todayRes.data as ClaireCheckin)
      if (recentRes.data) setRecentCheckins(recentRes.data as ClaireCheckin[])
      setLoading(false)
    })
  }, [user.id])

  const saveCheckin = useCallback(async (
    date: string,
    quality_time: 'yes' | 'no' | 'partial',
    blocker: string | null
  ) => {
    const row = { user_id: user.id, date, quality_time, blocker }
    const { error } = await supabase
      .from('claire_checkins')
      .upsert(row, { onConflict: 'user_id,date' })
    if (!error) {
      const checkin: ClaireCheckin = {
        id: '',
        created_at: new Date().toISOString(),
        ...row,
      }
      setTodayCheckin(checkin)
    }
    return error?.message ?? null
  }, [user.id])

  return {
    todayCheckin,
    recentCheckins,
    loading,
    claireContext: buildClaireContext(recentCheckins),
    saveCheckin,
  }
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm test -- useClaireCheckin
```

Expected: 4 passing.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add src/hooks/useClaireCheckin.ts src/hooks/useClaireCheckin.test.ts
git commit -m "feat: add useClaireCheckin hook"
```

---

### Task 4: ClaireCheckin component + tests

**Files:**
- Create: `src/components/kickstart/ClaireCheckin.tsx`
- Create: `src/components/kickstart/ClaireCheckin.test.tsx`

**Step 1: Write failing tests**

```tsx
// src/components/kickstart/ClaireCheckin.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ClaireCheckin from './ClaireCheckin'

const onSave = vi.fn()
const onSkip = vi.fn()

beforeEach(() => vi.clearAllMocks())

describe('ClaireCheckin', () => {
  it('renders the heading and three options', () => {
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    expect(screen.getByText(/how was your evening with claire/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quality time/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /partially present/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /didn't manage it/i })).toBeInTheDocument()
  })

  it('calls onSave with yes when Quality time tapped', async () => {
    onSave.mockResolvedValue(null)
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /quality time/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('yes', null))
  })

  it('calls onSave with no when Didn\'t manage it tapped', async () => {
    onSave.mockResolvedValue(null)
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /didn't manage it/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('no', null))
  })

  it('shows blocker input when Partially present tapped', () => {
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /partially present/i }))
    expect(screen.getByPlaceholderText(/what got in the way/i)).toBeInTheDocument()
  })

  it('calls onSave with partial + blocker text on Continue', async () => {
    onSave.mockResolvedValue(null)
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /partially present/i }))
    fireEvent.change(screen.getByPlaceholderText(/what got in the way/i), { target: { value: 'phone' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('partial', 'phone'))
  })

  it('calls onSkip when Skip tapped', () => {
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalled()
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- ClaireCheckin.test.tsx
```

Expected: 5 failures (module not found).

**Step 3: Write the component**

```tsx
// src/components/kickstart/ClaireCheckin.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  onSave: (quality_time: 'yes' | 'no' | 'partial', blocker: string | null) => Promise<string | null>
  onSkip: () => void
  saving: boolean
}

export default function ClaireCheckin({ onSave, onSkip, saving }: Props) {
  const [selected, setSelected] = useState<'yes' | 'no' | 'partial' | null>(null)
  const [blocker, setBlocker] = useState('')

  async function handleTap(value: 'yes' | 'no' | 'partial') {
    if (value === 'partial') {
      setSelected('partial')
      return
    }
    await onSave(value, null)
  }

  async function handleContinue() {
    await onSave('partial', blocker.trim() || null)
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">How was your evening with Claire yesterday?</p>

      {selected === 'partial' ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
              What got in the way? (optional)
            </label>
            <input
              type="text"
              value={blocker}
              onChange={e => setBlocker(e.target.value)}
              placeholder="What got in the way?"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </div>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>
          <button
            onClick={() => setSelected(null)}
            className="w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer py-2"
          >
            ← Back
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(
            [
              { value: 'yes' as const, label: 'Quality time' },
              { value: 'partial' as const, label: 'Partially present' },
              { value: 'no' as const, label: "Didn't manage it" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleTap(value)}
              disabled={saving}
              className="w-full py-4 rounded-lg bg-secondary border border-border text-foreground font-medium text-base text-left px-5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
            >
              {label}
            </button>
          ))}
          <button
            onClick={onSkip}
            className="w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer py-2 mt-1"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm test -- ClaireCheckin.test.tsx
```

Expected: 5 passing.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add src/components/kickstart/ClaireCheckin.tsx src/components/kickstart/ClaireCheckin.test.tsx
git commit -m "feat: add ClaireCheckin step component"
```

---

### Task 5: Wire into MorningKickstart + Claude context

**Files:**
- Modify: `src/components/kickstart/MorningKickstart.tsx`

**Step 1: Add imports and hook at the top of the component**

At top of file, add:
```typescript
import { useClaireCheckin } from '@/hooks/useClaireCheckin'
import ClaireCheckin from '@/components/kickstart/ClaireCheckin'
```

**Step 2: Add `step` state and hook call** inside the component function, after the existing state declarations:

```typescript
const [step, setStep] = useState<'claire' | 'dump'>('claire')
const [savingCheckin, setSavingCheckin] = useState(false)
const { todayCheckin, claireContext, saveCheckin, loading: checkinLoading } = useClaireCheckin(user)
```

**Step 3: Skip the claire step if already answered or kickstart already done**

In the `useEffect` that checks for existing kickstart, after `setCheckingExisting(false)`, also set the step:
- This is handled by the render guard below — if `todayCheckin` exists or `result` exists, claire step is skipped automatically.

Replace the loading guard render (`if (checkingExisting)`) with:

```tsx
if (checkingExisting || checkinLoading) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-20 rounded-lg bg-secondary" />
      <div className="h-4 w-2/3 rounded-lg bg-secondary" />
      <div className="h-4 w-1/2 rounded-lg bg-secondary" />
    </div>
  )
}
```

**Step 4: Add claire step render** — add this block immediately after the loading guard return and BEFORE the `if (result && !loading)` block:

```tsx
if (step === 'claire' && !todayCheckin && !result) {
  return (
    <div className="space-y-5">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
      )}
      <ClaireCheckin
        saving={savingCheckin}
        onSkip={() => setStep('dump')}
        onSave={async (quality_time, blocker) => {
          setSavingCheckin(true)
          const yday = new Date()
          yday.setDate(yday.getDate() - 1)
          const err = await saveCheckin(yday.toISOString().split('T')[0], quality_time, blocker)
          setSavingCheckin(false)
          if (!err) setStep('dump')
          return err
        }}
      />
    </div>
  )
}
```

**Step 5: Pass `claireContext` to `buildSystemPrompt`**

Change the `buildSystemPrompt` signature:

```typescript
function buildSystemPrompt(streakCount: number, weeklyTaskCount: number, claireContext: string | null): string {
```

In the return template string, add after the streak_note rule:
```
- claire_context: ${claireContext ? `Surface this naturally once, at the most relevant point in the plan: "${claireContext}"` : 'null — omit'}
```

Update the call site (inside `handleStart`):
```typescript
const systemPrompt = buildSystemPrompt(streakCount, weeklyTaskCount, claireContext)
```

**Step 6: Run all tests**

```bash
npm test
```

Expected: all passing (no new tests needed — the existing kickstart tests don't test internal state flow).

**Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 8: Commit**

```bash
git add src/components/kickstart/MorningKickstart.tsx
git commit -m "feat: wire ClaireCheckin into morning kickstart, pass context to Claude"
```

---

### Task 6: Final verification + push

**Step 1: Full test run**

```bash
npm test
```

Expected: all tests pass (count ≥ 103 + 9 new = 112).

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Manual verification checklist**

1. Open morning kickstart → Claire step appears first
2. Tap "Quality time" → advances to brain dump, no blocker input shown
3. Tap "Partially present" → blocker input appears → type text → Continue → advances to brain dump
4. Tap "Skip" → goes straight to brain dump, no DB row
5. Complete the kickstart → check Supabase `claire_checkins` table has row with `date = yesterday`, correct `quality_time`
6. Re-open kickstart same day → Claire step skipped (already answered)
7. In Supabase, set 3 rows with `quality_time = 'no'` for the last 3 days → next kickstart plan includes Claire awareness note

**Step 4: Push**

```bash
git push
```

Expected: Vercel deploys successfully with zero TypeScript errors.
