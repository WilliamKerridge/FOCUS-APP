// src/components/modes/HomeMode.tsx
import { useState, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import SessionPanel from '@/components/focus/SessionPanel'
import { useTaskList } from '@/hooks/useTaskList'
import { usePromises } from '@/hooks/usePromises'
import { getToday, getDefaultDue } from '@/lib/utils'
import WeeklyStrip from '@/components/calendar/WeeklyStrip'
import ItemDetailCard from '@/components/calendar/ItemDetailCard'
import QuickCaptureFAB from '@/components/capture/QuickCaptureFAB'

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
  | { kind: 'task'; id: string; title: string; madeTo: null; dueDate: string | null }
  | { kind: 'promise'; id: string; title: string; madeTo: string | null; dueDate: string }

export default function HomeMode({ user }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null)

  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone, addTask, updateTask } = useTaskList(user, ['home'])
  const { promises, loading: promisesLoading, error: promisesError, addPromise, completePromise, updatePromise } = usePromises(user, 'home')

  const activeItems = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [
      ...openTasks.map(t => ({
        kind: 'task' as const,
        id: t.id,
        title: t.title,
        madeTo: null,
        dueDate: t.due_date,
      })),
      ...promises.map(p => ({
        kind: 'promise' as const,
        id: p.id,
        title: p.title,
        madeTo: p.made_to,
        dueDate: p.due_date,
      })),
    ]
    return items.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  }, [openTasks, promises])

  const visibleItems = selectedDay
    ? activeItems.filter(i => i.dueDate === selectedDay)
    : activeItems

  const doneItems = useMemo(() =>
    completedTasks.map(t => ({ id: t.id, title: t.title })),
    [completedTasks]
  )

  const loading = tasksLoading || promisesLoading
  const loadError = tasksError || promisesError

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Home</h2>
        <p className="text-sm text-muted-foreground mt-1">You're in home mode. Focus on what matters here.</p>
      </div>

      <WeeklyStrip
        itemDates={activeItems.map(i => i.dueDate)}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {loading && <div className="animate-pulse h-16 rounded-xl bg-secondary" />}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loading && visibleItems.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">{selectedDay ? 'Nothing due this day.' : 'Nothing on your list.'}</p>
      )}

      <div className="space-y-2">
        {visibleItems.map(item => {
          const label = dueDateLabel(item.dueDate)
          return (
            <div key={`${item.kind}-${item.id}`} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary border border-border cursor-pointer hover:bg-secondary/70" onClick={() => setSelectedItem(item)}>
              <button
                aria-label={`Complete ${item.title}`}
                onClick={e => { e.stopPropagation(); item.kind === 'task' ? markDone(item.id) : completePromise(item.id) }}
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

      <QuickCaptureFAB
        showMadeTo
        placeholder="What's on your mind?"
        onCapture={async (title, madeTo, dueDate) => {
          if (madeTo) return addPromise(title, madeTo, dueDate ?? getDefaultDue())
          return addTask(title, 'home', dueDate)
        }}
      />

      {selectedItem && (
        <ItemDetailCard
          item={selectedItem}
          onSave={async (changes) => {
            if (selectedItem.kind === 'task') return updateTask(selectedItem.id, changes)
            return updatePromise(selectedItem.id, { ...changes, due_date: changes.due_date ?? undefined, made_to: changes.made_to })
          }}
          onComplete={() => {
            if (selectedItem.kind === 'task') markDone(selectedItem.id)
            else completePromise(selectedItem.id)
            setSelectedItem(null)
          }}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}
