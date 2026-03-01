import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent, Handoff } from '@/types'

interface Props {
  user: User
}

const KICKSTART_SYSTEM_PROMPT = `You are analysing William's morning brain dump. Return ONLY valid JSON — no markdown, no explanation.

The JSON shape must be exactly:
{
  "main_focus": "single most important thing today (one sentence)",
  "must_today": ["item1", "item2"],
  "if_time": ["item1", "item2", "item3"],
  "flagged_promises": ["any promises that need attention today"],
  "yesterday_thread": "where to start based on yesterday's unfinished work (one sentence, or empty string if none)",
  "overcommitment_warning": "plain warning string if plan is unrealistic, or null"
}

Rules:
- if_time: max 3 items
- must_today: only genuine hard deadlines or commitments
- Be specific — not 'work on email' but 'reply to [person] about [topic]'
- If yesterday_thread context is provided, reference it`

export default function MorningKickstart({ user }: Props) {
  const [brainDump, setBrainDump] = useState('')
  const [result, setResult] = useState<KickstartContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Check if already done today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('handoffs')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'morning_kickstart')
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => { if (data) setDone(true) })
  }, [user.id])

  async function handleStart() {
    if (!brainDump.trim()) return
    setLoading(true)
    setError(null)

    try {
      // Get yesterday's end-of-day handoff for context
      const { data: lastHandoff } = await supabase
        .from('handoffs')
        .select('content')
        .eq('user_id', user.id)
        .eq('type', 'end_of_day')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const yesterdayContext = lastHandoff
        ? `\n\nYesterday's end-of-day note: ${JSON.stringify(lastHandoff.content as Handoff['content'])}`
        : ''

      const rawText = await callClaude(
        [{ role: 'user', content: `Brain dump:${yesterdayContext}\n\n${brainDump}` }],
        KICKSTART_SYSTEM_PROMPT
      )

      // Strip markdown code fences if present
      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned) as KickstartContent
      setResult(parsed)

      const today = new Date().toISOString().split('T')[0]

      // Save to handoffs
      await supabase.from('handoffs').insert({
        user_id: user.id,
        type: 'morning_kickstart',
        content: parsed,
        raw_input: brainDump,
        date: today,
      })

      // Update streak
      await updateStreak(user.id, today)
    } catch (err) {
      setError('Something went wrong. Try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function updateStreak(userId: string, today: string) {
    const { data: existing } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', 'kickstart')
      .maybeSingle()

    if (!existing) {
      await supabase.from('streaks').insert({
        user_id: userId,
        streak_type: 'kickstart',
        current_streak: 1,
        longest_streak: 1,
        last_completed_date: today,
      })
      return
    }

    const last = existing.last_completed_date
    if (last === today) return // already counted today

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const newStreak = last === yesterdayStr ? existing.current_streak + 1 : 1
    const newLongest = Math.max(newStreak, existing.longest_streak)

    await supabase
      .from('streaks')
      .update({ current_streak: newStreak, longest_streak: newLongest, last_completed_date: today })
      .eq('id', existing.id)
  }

  if (done && !result) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Kickstart already done today.</p>
      </div>
    )
  }

  if (result) {
    return (
      <div className="space-y-4">
        {result.overcommitment_warning && (
          <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm">
            ⚠ {result.overcommitment_warning}
          </div>
        )}

        <div className="px-4 py-4 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Main focus</p>
          <p className="font-semibold text-lg leading-snug">{result.main_focus}</p>
        </div>

        {result.yesterday_thread && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Start here</p>
            <p className="text-sm">{result.yesterday_thread}</p>
          </div>
        )}

        {result.must_today.length > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Must today</p>
            <ul className="space-y-1">
              {result.must_today.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.if_time.length > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">If time</p>
            <ul className="space-y-1">
              {result.if_time.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.flagged_promises.length > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Promises due</p>
            <ul className="space-y-1">
              {result.flagged_promises.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">What's on your mind? Everything — work, home, whatever's floating. Don't filter.</p>
      <textarea
        value={brainDump}
        onChange={e => setBrainDump(e.target.value)}
        placeholder="Brain dump here…"
        rows={8}
        className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-base"
        autoFocus
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleStart}
        disabled={loading || !brainDump.trim()}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 active:scale-95 transition-transform"
      >
        {loading ? 'Sorting your day…' : 'Start my day'}
      </button>
    </div>
  )
}
