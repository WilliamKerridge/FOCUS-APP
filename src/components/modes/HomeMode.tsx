// src/components/modes/HomeMode.tsx
import { useState, useMemo, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import SessionPanel from '@/components/focus/SessionPanel'
import { useTaskList } from '@/hooks/useTaskList'
import { usePromises } from '@/hooks/usePromises'
import { getToday, getDefaultDue } from '@/lib/utils'

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
  const [title, setTitle] = useState('')
  const [madeTo, setMadeTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone, addTask } = useTaskList(user, ['home'])
  const { promises, loading: promisesLoading, error: promisesError, addPromise, completePromise } = usePromises(user, 'home')

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

  const doneItems = useMemo(() =>
    completedTasks.map(t => ({ id: t.id, title: t.title })),
    [completedTasks]
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setSaveError(null)
    let err: string | null
    if (madeTo.trim()) {
      const effectiveDue = dueDate || getDefaultDue()
      err = await addPromise(title.trim(), madeTo.trim(), effectiveDue)
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
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
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
