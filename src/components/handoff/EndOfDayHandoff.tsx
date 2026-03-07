import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'
import type { EndOfDayContent } from '@/types'
import ClaireCheckin from '@/components/kickstart/ClaireCheckin'
import { useClaireCheckin } from '@/hooks/useClaireCheckin'
import { getToday } from '@/lib/utils'

interface Props {
  user: User
  onBack?: () => void
  onSwitchToTransition?: () => void
}

const EOD_SYSTEM_PROMPT = `William is finishing work. Return ONLY valid JSON, no markdown.

Shape:
{
  "done_today": ["what got completed — be specific"],
  "unfinished": ["open loops being parked"],
  "next_start": "the exact next physical action to start with tomorrow morning — specific, not vague",
  "context_note": "any important context for tomorrow (one sentence or empty string)",
  "parking_note": "flag if something has been unfinished multiple days in a row, otherwise null"
}

Be direct. next_start must be specific: not "continue X" but "open [thing] and do [specific step]".`

export default function EndOfDayHandoff({ user, onBack, onSwitchToTransition }: Props) {
  const [doneToday, setDoneToday] = useState('')
  const [unfinished, setUnfinished] = useState('')
  const [nextStart, setNextStart] = useState('')
  const [result, setResult] = useState<EndOfDayContent | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClaireStep, setShowClaireStep] = useState(false)
  const [claireSaving, setClaireSaving] = useState(false)
  const { saveCheckin } = useClaireCheckin(user)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('handoffs')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('type', 'end_of_day')
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id as string)
          setResult(data.content as EndOfDayContent)
        }
      })
  }, [user.id])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('tasks')
      .select('title')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .gte('completed_at', `${today}T00:00:00Z`)
      .order('completed_at', { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const titles = (data as { title: string }[]).map(t => `- ${t.title}`).join('\n')
        setDoneToday(prev => prev.trim() === '' ? titles : prev)
      })
  }, [user.id])

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const rawInput = `Done today: ${doneToday}\nUnfinished: ${unfinished}\nNext start: ${nextStart}`

    try {
      const rawText = await callClaude(
        [{ role: 'user', content: rawInput }],
        EOD_SYSTEM_PROMPT
      )

      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned) as EndOfDayContent
      setResult(parsed)
      setShowClaireStep(true)

      const today = new Date().toISOString().split('T')[0]

      if (existingId) {
        await supabase
          .from('handoffs')
          .update({ content: parsed, raw_input: rawInput, updated_at: new Date().toISOString() })
          .eq('id', existingId)
      } else {
        await supabase.from('handoffs').insert({
          user_id: user.id,
          type: 'end_of_day',
          content: parsed,
          raw_input: rawInput,
          date: today,
        })
      }
    } catch (err) {
      console.error('End of day error:', err)
      setError('Could not process — Claude is unavailable. Your notes have been saved.')
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('handoffs').insert({
        user_id: user.id,
        type: 'end_of_day',
        content: {},
        raw_input: rawInput,
        date: today,
      })
    } finally {
      setLoading(false)
    }
  }

  if (result && showClaireStep) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">One last thing before you go…</p>
        <ClaireCheckin
          saving={claireSaving}
          onSave={async (quality_time, blocker) => {
            setClaireSaving(true)
            const err = await saveCheckin(getToday(), quality_time, blocker)
            setClaireSaving(false)
            setShowClaireStep(false)
            return err
          }}
          onSkip={() => setShowClaireStep(false)}
        />
      </div>
    )
  }

  if (result) {
    return (
      <div className="space-y-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
          >
            ← Back
          </button>
        )}
        {result.parking_note && (
          <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm">
            ⚠ {result.parking_note}
          </div>
        )}

        <div className="px-4 py-4 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Tomorrow starts</p>
          <p className="text-sm font-medium">{result.next_start}</p>
        </div>

        {result.context_note && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Context</p>
            <p className="text-sm">{result.context_note}</p>
          </div>
        )}

        {(result.done_today?.length ?? 0) > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Done today</p>
            <ul className="space-y-1">
              {result.done_today.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nudge toward Transition mode */}
        {onSwitchToTransition && (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">Handoff saved. Ready to switch off?</p>
            <button
              onClick={onSwitchToTransition}
              className="w-full py-3 rounded-lg bg-secondary border border-border font-medium text-sm cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
            >
              Switch to Transition mode
            </button>
          </div>
        )}

        <button
          onClick={() => { setResult(null); setDoneToday(''); setUnfinished(''); setNextStart('') }}
          className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
        >
          Redo handoff
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
      )}
      <p className="text-muted-foreground text-sm">Park it cleanly so tomorrow starts fast.</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            What did you get done today?
          </label>
          <textarea
            value={doneToday}
            onChange={e => setDoneToday(e.target.value)}
            placeholder="Even partial progress counts"
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            What's unfinished and needs parking?
          </label>
          <textarea
            value={unfinished}
            onChange={e => setUnfinished(e.target.value)}
            placeholder="Open loops, waiting-fors, things mid-way"
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            What's the very next action to start with tomorrow?
          </label>
          <textarea
            value={nextStart}
            onChange={e => setNextStart(e.target.value)}
            placeholder="Be specific — the exact next step"
            rows={2}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={handleSubmit} className="text-sm text-primary hover:underline cursor-pointer">Retry</button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Parking…' : 'Park it'}
      </button>
    </div>
  )
}
