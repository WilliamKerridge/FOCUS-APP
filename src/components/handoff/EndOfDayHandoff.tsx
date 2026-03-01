import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'
import type { EndOfDayContent } from '@/types'

interface Props {
  user: User
}

const EOD_SYSTEM_PROMPT = `William is finishing work. Return ONLY valid JSON, no markdown.

Shape:
{
  "done": "brief summary of what got done",
  "unfinished": "what's still open",
  "tomorrow_start": "the exact next action for tomorrow morning (specific, physical step)",
  "summary": "one-sentence parking confirmation — direct, no fluff"
}

Be specific about tomorrow_start — not 'continue X' but 'open [thing] and do [specific step]'`

export default function EndOfDayHandoff({ user }: Props) {
  const [done, setDone] = useState('')
  const [unfinished, setUnfinished] = useState('')
  const [tomorrowStart, setTomorrowStart] = useState('')
  const [result, setResult] = useState<EndOfDayContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)

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
          setAlreadyDone(true)
          setResult(data.content as EndOfDayContent)
        }
      })
  }, [user.id])

  async function handleSubmit() {
    if (!done.trim() && !unfinished.trim()) return
    setLoading(true)
    setError(null)

    const rawInput = `Done: ${done}\nUnfinished: ${unfinished}\nTomorrow start: ${tomorrowStart}`

    try {
      const rawText = await callClaude(
        [{ role: 'user', content: rawInput }],
        EOD_SYSTEM_PROMPT
      )

      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned) as EndOfDayContent
      setResult(parsed)

      const today = new Date().toISOString().split('T')[0]
      await supabase.from('handoffs').insert({
        user_id: user.id,
        type: 'end_of_day',
        content: parsed,
        raw_input: rawInput,
        date: today,
      })
    } catch (err) {
      setError('Something went wrong. Try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        {alreadyDone && (
          <p className="text-xs text-muted-foreground">Today's handoff is saved.</p>
        )}
        <div className="px-4 py-4 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Parked</p>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </div>
        <div className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Tomorrow starts</p>
          <p className="text-sm font-medium">{result.tomorrow_start}</p>
        </div>
        {result.unfinished && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Still open</p>
            <p className="text-sm">{result.unfinished}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Park it cleanly so tomorrow starts fast.</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            What did you get done?
          </label>
          <textarea
            value={done}
            onChange={e => setDone(e.target.value)}
            placeholder="Even partial progress counts"
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            What's unfinished?
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
            Where should tomorrow start?
          </label>
          <textarea
            value={tomorrowStart}
            onChange={e => setTomorrowStart(e.target.value)}
            placeholder="Be specific — the exact next step"
            rows={2}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || (!done.trim() && !unfinished.trim())}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 active:scale-95 transition-transform"
      >
        {loading ? 'Parking…' : 'Park it'}
      </button>
    </div>
  )
}
