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
      if (err instanceof SyntaxError) {
        setError('Extraction failed — try again or simplify the email.')
      } else {
        setError('Claude is unavailable — copy the key actions manually.')
      }
      // Do NOT clear emailText — user needs to copy manually
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!extraction) return
    setSaving(true)
    setError(null)
    let count = 0

    const actionInserts = extraction.actions
      .filter((_, i) => checkedActions[i])
      .map(a => ({
        user_id: user.id,
        title: a.title,
        context: 'work',
        priority: a.priority === 'must_today' ? 1 : a.priority === 'focus' ? 2 : 3,
        due_date: a.due_date ?? null,
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
      const { error: saveError } = await supabase
        .from('tasks')
        .insert([...actionInserts, ...waitingInserts])
      if (saveError) {
        console.error('Failed to save tasks:', saveError)
        setError("Couldn't save — try again.")
        setSaving(false)
        return
      }
      count = actionInserts.length + waitingInserts.length
    }

    const promiseInserts = extraction.promises
      .filter((_, i) => checkedPromises[i])
      .map(p => ({
        user_id: user.id,
        title: p.title,
        made_to: p.made_to ?? null,
        context: 'work' as const,
        due_date: p.due_date ?? (() => {
          const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
        })(),
        status: 'active' as const,
      }))

    if (promiseInserts.length > 0) {
      const { error: promiseError } = await supabase
        .from('promises')
        .insert(promiseInserts)
      if (promiseError) {
        console.error('Failed to save promises:', promiseError)
        setError("Couldn't save promises — try again.")
        setSaving(false)
        return
      }
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
          Return to Work
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
              <label key={`action-${i}`} className="flex items-start gap-3 cursor-pointer">
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

        {extraction.promises.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Promises</p>
            {extraction.promises.map((p, i) => (
              <label key={`promise-${i}`} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedPromises[i]}
                  onChange={e => setCheckedPromises(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  className="mt-0.5"
                />
                <span className="text-sm">{p.title}{p.made_to ? ` — to ${p.made_to}` : ''}</span>
              </label>
            ))}

          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setView('input'); setError(null) }}
            className="flex-1 py-3 rounded-lg border border-border text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </div>
    )
  }

  // Input view (default)
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
