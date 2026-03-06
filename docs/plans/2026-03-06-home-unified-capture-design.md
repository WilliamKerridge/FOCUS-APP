# Home Unified Capture — Design

**Date:** 2026-03-06
**Status:** Approved

---

## Context

Home mode currently has two separate capture areas: a quick capture form (saves to `tasks`) and a Promises button (navigates to a full-screen `PromisesList`). At home the distinction between a task and a promise isn't meaningful in the moment — everything is just things to remember or commitments to people. The separate areas create unnecessary friction and decision fatigue.

---

## Approach

Replace both the quick capture form and the Promises button with a single unified capture card. One text input for what to capture, an optional "To?" field (who it's for), and an optional due date. Filling in a person's name automatically makes it a promise — the user never has to choose. The list below shows tasks and promises together, sorted by due date. Applies to both desktop and iPhone (HomeMode is shared).

---

## Capture Card

Single card with three fields:

- **Title** — full-width text input, placeholder "What's on your mind?"
- **To?** — optional, smaller input, placeholder "To whom? (e.g. Claire)"
- **Due date** — optional date picker, same row as To?, no default value
- **Save** button — full width

**Routing logic:**
- `made_to` filled → `addPromise(title, madeTo, dueDate ?? getDefaultDue())` → `promises` table
- `made_to` empty → `addTask(title, 'home', dueDate)` → `tasks` table

Due date is included now so calendar integration (planned for later) has the data it needs.

---

## Unified List

Combines `openTasks` (from `useTaskList`) and active `promises` (from `usePromises`) into a single sorted list:

- Sort by `due_date` ascending, nulls last
- Each row: complete button (circle) + title + optional "to [name]" subtitle + due date label
- Due date colours: red = overdue, amber = today, muted = future, nothing = no date set
- Complete button: tasks → `markDone()`, promises → `completePromise()`
- Completed tasks and completed/archived promises collapse at the bottom (same pattern as existing TaskList)

The existing "Promises" full-screen view and navigation button are removed from Home mode. `PromisesList` component is unchanged — still used in Work mode.

---

## Data Model

No DB changes. Same two tables, same hooks.

`useTaskList` gains one new method:
```typescript
addTask(title: string, context: 'work' | 'home', dueDate?: string | null): Promise<string | null>
```

This replaces the raw `supabase.from('tasks').insert(...)` call currently inline in HomeMode, and feeds the new task back into local state so the list updates immediately without a re-fetch.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTaskList.ts` | Add `addTask(title, context, dueDate?)` method |
| `src/hooks/useTaskList.test.ts` | Add tests for `addTask` |
| `src/components/modes/HomeMode.tsx` | Replace capture form + Promises button with unified capture card + unified list |

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npm test` — all tests pass
3. Type a title with no "To?" → row appears in list as a task (no "to" subtitle)
4. Type a title with "To?" filled → row appears with "to [name]" subtitle, saved to `promises` table
5. Add a due date → label appears on the row in correct colour
6. Tap complete on a task row → disappears from active list
7. Tap complete on a promise row → disappears from active list
8. Desktop and iPhone both show the unified view (no separate file needed)
