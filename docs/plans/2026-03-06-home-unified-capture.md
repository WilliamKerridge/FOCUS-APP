# Home Unified Capture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Home mode's separate quick capture form and Promises button with a single unified capture card that routes to the correct table automatically, and a unified list showing tasks and promises together.

**Architecture:** `useTaskList` gains an `addTask` method. `HomeMode` replaces its inline capture form + Promises navigation button with a unified capture card (title + optional To? + optional due date) and a merged sorted list. `PromisesList` is untouched — still used in Work mode. No DB changes.

**Tech Stack:** React 18, TypeScript, Supabase, Vitest + @testing-library/react, Tailwind CSS

---

### Task 1: Add `addTask` to `useTaskList`

**Files:**
- Modify: `src/hooks/useTaskList.ts`
- Create: `src/hooks/useTaskList.test.ts`

**Context:** `useTaskList` currently has no method to add a new open task — HomeMode was doing a raw `supabase.from('tasks').insert(...)` directly. We need a proper `addTask` method that inserts the row and updates local state immediately (no re-fetch needed).

**Step 1: Write the failing test**

Create `src/hooks/useTaskList.test.ts`:

```typescript
// src/hooks/useTaskList.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))
vi.mock('@/lib/utils', () => ({ getToday: () => '2026-03-06' }))

import { useTaskList } from './useTaskList'

const fakeUser = { id: 'user-1' } as User

function makeSelectChain(open: unknown[], done: unknown[]) {
  let callCount = 0
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(
        callCount === 1
          ? { data: open, error: null }
          : { data: done, error: null }
      )
    }),
  }
}

function makeInsertChain(returnedRow: unknown) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnedRow, error: null }),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('useTaskList', () => {
  it('fetches open and done tasks on mount', async () => {
    const openTask = { id: 't-1', title: 'Buy milk', context: 'home', priority: 0, status: 'open', waiting_for_person: null, due_date: null, source: 'quick_capture', created_at: '2026-03-06T09:00:00Z', completed_at: null }
    mockFrom.mockReturnValue(makeSelectChain([openTask], []))
    const { result } = renderHook(() => useTaskList(fakeUser, ['home']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.openTasks).toEqual([openTask])
    expect(result.current.completedTasks).toEqual([])
  })

  it('addTask inserts a task and adds it to openTasks', async () => {
    const newTask = { id: 't-2', title: 'Call mum', context: 'home', priority: 0, status: 'open', waiting_for_person: null, due_date: null, source: 'quick_capture', created_at: '2026-03-06T10:00:00Z', completed_at: null }
    mockFrom
      .mockReturnValueOnce(makeSelectChain([], []))
      .mockReturnValueOnce(makeSelectChain([], []))
      .mockReturnValue(makeInsertChain(newTask))

    const { result } = renderHook(() => useTaskList(fakeUser, ['home']))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = 'not-called'
    await act(async () => { err = await result.current.addTask('Call mum', 'home', null) })

    expect(err).toBeNull()
    expect(result.current.openTasks).toContainEqual(expect.objectContaining({ title: 'Call mum' }))
  })

  it('addTask returns error message on failure', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain([], []))
      .mockReturnValueOnce(makeSelectChain([], []))
      .mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
      })

    const { result } = renderHook(() => useTaskList(fakeUser, ['home']))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = null
    await act(async () => { err = await result.current.addTask('Call mum', 'home', null) })
    expect(err).toBe('insert failed')
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- useTaskList
```

Expected: 3 failures (no `addTask` method).

**Step 3: Add `addTask` to `useTaskList.ts`**

Add to the `UseTaskListResult` interface (after `createCompletedTask`):
```typescript
addTask: (title: string, context: 'work' | 'home', dueDate?: string | null) => Promise<string | null>
```

Add the implementation inside the hook (after `createCompletedTask`):
```typescript
const addTask = useCallback(async (
  title: string,
  context: 'work' | 'home',
  dueDate?: string | null
): Promise<string | null> => {
  const { data, error: insertError } = await supabase
    .from('tasks')
    .insert({
      user_id: user!.id,
      title,
      context,
      priority: 0,
      status: 'open',
      source: 'quick_capture',
      due_date: dueDate ?? null,
    })
    .select('id, title, context, priority, status, waiting_for_person, due_date, source, created_at, completed_at')
    .single()
  if (insertError) return insertError.message
  if (data) setOpenTasks(prev => [...prev, data as Task])
  return null
}, [user])
```

Add `addTask` to the return object.

**Step 4: Run tests**

```bash
npm test -- useTaskList
```

Expected: 3 passing.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add src/hooks/useTaskList.ts src/hooks/useTaskList.test.ts
git commit -m "feat: add addTask method to useTaskList"
```

---

### Task 2: Rewrite HomeMode with unified capture + list

**Files:**
- Modify: `src/components/modes/HomeMode.tsx`

**Context:** Replace the separate quick capture form and Promises navigation button with:
1. A unified capture card (title input + optional To? input + optional due date + Save)
2. A merged sorted list of open tasks + active promises below it
3. Completed items (tasks + promises) collapsed at the bottom

The routing logic: if `madeTo` is filled → `addPromise` → promises table; if empty → `addTask` → tasks table.

The merged list sorts by `due_date` ascending, nulls last. Each row shows: complete button + title + optional "to [name]" subtitle + optional due date label.

**Step 1: Read the current file**

Read `src/components/modes/HomeMode.tsx` in full before making any changes.

**Step 2: Replace the file content**

```tsx
// src/components/modes/HomeMode.tsx
import { useState, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import SessionPanel from '@/components/focus/SessionPanel'
import { useTaskList } from '@/hooks/useTaskList'
import { usePromises } from '@/hooks/usePromises'
import { getToday } from '@/lib/utils'

interface Props {
  user: User
}

function dueDateLabel(due: string | null): { text: string; color: string } | null {
  if (!due) return null
  const today = getToday()
  if (due < today) return { text: due, color: 'text-destructive' }
  if (due === today) return { text: 'Today', color: 'text-amber-400' }
  return { text: due, color: 'text-muted-foreground' }
}

type UnifiedItem =
  | { kind: 'task'; id: string; title: string; madeTo: null; dueDate: string | null; done: boolean }
  | { kind: 'promise'; id: string; title: string; madeTo: string | null; dueDate: string; done: boolean }

export default function HomeMode({ user }: Props) {
  const [title, setTitle] = useState('')
  const [madeTo, setMadeTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone, addTask } = useTaskList(user, ['home'])
  const { promises, loading: promisesLoading, error: promisesError, addPromise, completePromise } = usePromises(user, 'home')

  // Merge open tasks + active promises into one sorted list
  const activeItems = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [
      ...openTasks.map(t => ({
        kind: 'task' as const,
        id: t.id,
        title: t.title,
        madeTo: null,
        dueDate: t.due_date,
        done: false,
      })),
      ...promises.map(p => ({
        kind: 'promise' as const,
        id: p.id,
        title: p.title,
        madeTo: p.made_to,
        dueDate: p.due_date,
        done: false,
      })),
    ]
    return items.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  }, [openTasks, promises])

  // Completed tasks (today) + completed promises for the bottom section
  const doneItems = useMemo((): UnifiedItem[] => [
    ...completedTasks.map(t => ({
      kind: 'task' as const,
      id: t.id,
      title: t.title,
      madeTo: null,
      dueDate: t.due_date,
      done: true,
    })),
  ], [completedTasks])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setSaveError(null)
    let err: string | null
    if (madeTo.trim()) {
      err = await addPromise(title.trim(), madeTo.trim(), dueDate || undefined)
    } else {
      err = await addTask(title.trim(), 'home', dueDate || null)
    }
    setSaving(false)
    if (err) {
      setSaveError(err)
    } else {
      setTitle('')
      setMadeTo('')
      setDueDate('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const loading = tasksLoading || promisesLoading
  const loadError = tasksError || promisesError

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Home</h2>
        <p className="text-sm text-muted-foreground mt-1">You're in home mode. Focus on what matters here.</p>
      </div>

      {/* Unified capture card */}
      <form onSubmit={handleSave} className="space-y-3 px-4 py-4 rounded-xl bg-secondary border border-border">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={madeTo}
            onChange={e => setMadeTo(e.target.value)}
            placeholder="To whom? (e.g. Claire)"
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      {/* Unified list */}
      {loading && <div className="animate-pulse h-16 rounded-xl bg-secondary" />}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loading && activeItems.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">Nothing on your list.</p>
      )}

      <div className="space-y-2">
        {activeItems.map(item => {
          const label = dueDateLabel(item.dueDate)
          return (
            <div key={`${item.kind}-${item.id}`} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary border border-border">
              <button
                aria-label={`Complete ${item.title}`}
                onClick={() => item.kind === 'task' ? markDone(item.id) : completePromise(item.id)}
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-border hover:border-primary cursor-pointer transition-colors"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                {item.madeTo && <p className="text-xs text-muted-foreground">to {item.madeTo}</p>}
              </div>
              {label && (
                <span className={`text-xs font-medium shrink-0 ${label.color}`}>{label.text}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Completed today */}
      {doneItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Done today</p>
          {doneItems.map(item => (
            <div key={`done-${item.id}`} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary border border-border opacity-50">
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-border bg-border" />
              <p className="text-sm line-through text-muted-foreground">{item.title}</p>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-border mt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Focus session</p>
        <SessionPanel user={user} />
      </div>
    </div>
  )
}
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 4: Run all tests**

```bash
npm test
```

Expected: all passing (HomeMode has no unit tests — it's verified manually).

**Step 5: Manual spot check**

- Home mode loads without errors
- Capture card shows title input, To? input, date picker
- Type a title only → appears in list as a plain item (no subtitle)
- Type a title + "Claire" in To? → appears with "to Claire" subtitle
- Type a title + due date → appears with coloured date label
- Tap the circle on any item → it moves to "Done today"

**Step 6: Commit**

```bash
git add src/components/modes/HomeMode.tsx
git commit -m "feat: unified capture and list in Home mode"
```

---

### Task 3: Final verification + push

**Step 1: Full test run**

```bash
npm test
```

Expected: all tests passing (count ≥ 157 — 154 existing + 3 new from Task 1).

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Push**

```bash
git push
```

Expected: Vercel deploys cleanly.
