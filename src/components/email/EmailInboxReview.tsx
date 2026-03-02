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
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    if (extraction) {
      const actionInserts = extraction.actions
        .filter((_, i) => checkedActions[i])
        .map(a => ({
          user_id: user.id,
          title: a.title,
          context: item.context,
          priority: a.priority === 'must_today' ? 1 : a.priority === 'focus' ? 2 : 3,
          due_date: a.due_date ?? null,
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
        const { error: saveError } = await supabase
          .from('tasks')
          .insert([...actionInserts, ...waitingInserts])
        if (saveError) {
          console.error('Failed to save tasks:', saveError)
          setError("Couldn't save — try again.")
          setSaving(false)
          return
        }
      }
    }

    const { error: reviewError } = await supabase
      .from('email_inbox')
      .update({ reviewed: true })
      .eq('id', item.id)

    if (reviewError) {
      console.error('Failed to mark reviewed:', reviewError)
      setError("Couldn't mark as reviewed — try again.")
      setSaving(false)
      return
    }

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
                <label key={`action-${i}`} className="flex items-start gap-3 cursor-pointer">
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
                <label key={`waiting-${i}`} className="flex items-start gap-3 cursor-pointer">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save and mark reviewed'}
      </button>
    </div>
  )
}
