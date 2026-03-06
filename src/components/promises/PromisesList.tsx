// src/components/promises/PromisesList.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { usePromises } from '@/hooks/usePromises'
import { getToday, getDefaultDue } from '@/lib/utils'

interface Props {
  user: User
  context: 'work' | 'home'
  onBack: () => void
}

function dueDateLabel(due: string): { text: string; color: string } {
  const today = getToday()
  if (due < today) return { text: due, color: 'text-destructive' }
  if (due === today) return { text: 'Today', color: 'text-amber-400' }
  return { text: due, color: 'text-muted-foreground' }
}

export default function PromisesList({ user, context, onBack }: Props) {
  const { promises, loading, error: loadError, addPromise, completePromise, archivePromise } = usePromises(user, context)
  const [title, setTitle] = useState('')
  const [madeTo, setMadeTo] = useState('')
  const [dueDate, setDueDate] = useState(getDefaultDue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    const err = await addPromise(title.trim(), madeTo.trim() || null, dueDate)
    if (err) {
      setError(err)
    } else {
      setTitle('')
      setMadeTo('')
      setDueDate(getDefaultDue())
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        aria-label="← Back"
        className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
      >
        ← Back
      </button>
      <h2 className="text-lg font-bold">{context === 'work' ? 'Work' : 'Home'} Promises</h2>

      {/* Quick-add form */}
      <div className="space-y-2 px-4 py-4 rounded-xl bg-secondary border border-border">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="What did you promise?"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={madeTo}
            onChange={e => setMadeTo(e.target.value)}
            placeholder={context === 'work' ? 'To whom? (e.g. Alice)' : 'To whom? (e.g. Claire)'}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={saving || !title.trim()}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Add promise
        </button>
      </div>

      {/* List */}
      {loading && <div className="animate-pulse h-16 rounded-xl bg-secondary" />}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loading && promises.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">No active promises.</p>
      )}

      {promises.map(p => {
        const { text, color } = dueDateLabel(p.due_date)
        return (
          <div key={p.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary border border-border">
            <button
              aria-label={`Complete ${p.title}`}
              onClick={() => completePromise(p.id)}
              className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-border hover:border-primary cursor-pointer transition-colors"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{p.title}</p>
              {p.made_to && <p className="text-xs text-muted-foreground">to {p.made_to}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-medium ${color}`}>{text}</span>
              <button
                onClick={() => archivePromise(p.id)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Archive ${p.title}`}
              >
                Archive
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
