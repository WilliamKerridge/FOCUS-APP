import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import { updateStreak } from '@/hooks/useStreak'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent, EndOfDayContent, Handoff } from '@/types'

interface Props {
  user: User
  onBack?: () => void
  onComplete?: () => void
  onSelectTask?: (task: string) => void
}

function buildSystemPrompt(streakCount: number, weeklyTaskCount: number): string {
  const streakContext = streakCount >= 3
    ? `Kickstart streak = ${streakCount} days.`
    : ''
  const weeklyContext = weeklyTaskCount > 0
    ? `Tasks completed this week = ${weeklyTaskCount}.`
    : ''

  return `You are analysing William's morning brain dump. The input is split into a WORK section and a HOME section. Return ONLY valid JSON — no markdown, no explanation.

Shape:
{
  "main_focus": "single most important thing today across both work and home (one sentence, specific)",
  "must_today": ["genuine hard deadline or commitment from either context — max 3"],
  "if_time": ["nice to do, not critical, from either context — max 3"],
  "home_items": ["anything from the home section that needs attention today — max 3, empty array if none"],
  "flagged_promises": ["any promises due today or overdue"],
  "yesterday_thread": "where to start based on yesterday's next_start (one sentence, or null if none)",
  "completed_yesterday": ["tasks completed yesterday from the task list — copy titles exactly, empty array if none provided"],
  "overcommitted": false,
  "overcommit_note": null,
  "streak_note": null
}

Rules:
- Be specific — not "work on email" but "reply to [person] about [topic]"
- must_today: only genuine deadlines from either work or home
- home_items: practical home/personal things to not forget today — keep separate from work focus
- completed_yesterday: only include if yesterday's completed tasks are provided in the context — copy titles verbatim
- overcommitted: true if the combined list is unrealistic for one day
- overcommit_note: plain warning string if overcommitted, otherwise null
- streak_note: ${(streakCount >= 3 || weeklyTaskCount >= 5) ? `brief momentum note if warranted — direct tone. ${streakContext} ${weeklyContext} e.g. "Nine days straight. ${weeklyTaskCount} tasks done this week." — or null` : 'null'}
`
}

export default function MorningKickstart({ user, onBack, onComplete, onSelectTask }: Props) {
  const [workDump, setWorkDump] = useState('')
  const [homeDump, setHomeDump] = useState('')
  const [result, setResult] = useState<KickstartContent | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('handoffs')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('type', 'morning_kickstart')
      .eq('date', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Kickstart load error:', error)
        if (data) {
          setExistingId(data.id as string)
          setResult(data.content as KickstartContent)
        }
        setCheckingExisting(false)
      })
  }, [user.id])

  async function handleStart() {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const rawInput = [
      workDump.trim() ? `WORK:\n${workDump.trim()}` : '',
      homeDump.trim() ? `HOME:\n${homeDump.trim()}` : '',
    ].filter(Boolean).join('\n\n') || 'No input today.'

    try {
      // Date ranges for yesterday and this week
      const now = new Date()
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() + mondayOffset)
      weekStart.setHours(0, 0, 0, 0)
      const yesterdayStart = new Date(now)
      yesterdayStart.setDate(now.getDate() - 1)
      yesterdayStart.setHours(0, 0, 0, 0)
      const yesterdayEnd = new Date(now)
      yesterdayEnd.setDate(now.getDate() - 1)
      yesterdayEnd.setHours(23, 59, 59, 999)

      // Fetch EOD handoff, streak, yesterday's completed tasks, and weekly count in parallel
      const [
        { data: lastEod },
        { data: streakRow },
        { data: yesterdayTasks },
        { count: weekTaskCount },
      ] = await Promise.all([
        supabase
          .from('handoffs')
          .select('content')
          .eq('user_id', user.id)
          .eq('type', 'end_of_day')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .eq('streak_type', 'kickstart')
          .maybeSingle(),
        supabase
          .from('tasks')
          .select('title')
          .eq('user_id', user.id)
          .eq('status', 'done')
          .gte('completed_at', yesterdayStart.toISOString())
          .lte('completed_at', yesterdayEnd.toISOString()),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'done')
          .gte('completed_at', weekStart.toISOString()),
      ])

      const completedYesterdayTitles = (yesterdayTasks ?? []).map((t: { title: string }) => t.title)
      const weeklyTaskCount = weekTaskCount ?? 0

      const yesterdayThread = lastEod
        ? `\n\nYesterday's handoff — next_start: "${(lastEod.content as EndOfDayContent).next_start}"`
        : ''

      const yesterdayCompletedContext = completedYesterdayTitles.length > 0
        ? `\n\nCompleted yesterday:\n${completedYesterdayTitles.map((t: string) => `- ${t}`).join('\n')}`
        : ''

      const streakCount = (streakRow as { current_streak: number } | null)?.current_streak ?? 0
      const systemPrompt = buildSystemPrompt(streakCount, weeklyTaskCount)

      const userMessage = `${rawInput}${yesterdayThread}${yesterdayCompletedContext}`

      const rawText = await callClaude(
        [{ role: 'user', content: userMessage }],
        systemPrompt
      )

      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned) as KickstartContent
      setResult(parsed)

      if (existingId) {
        await supabase
          .from('handoffs')
          .update({ content: parsed, raw_input: rawInput, updated_at: new Date().toISOString() })
          .eq('id', existingId)
      } else {
        const { data: inserted } = await supabase
          .from('handoffs')
          .insert({
            user_id: user.id,
            type: 'morning_kickstart',
            content: parsed,
            raw_input: rawInput,
            date: today,
          })
          .select('id')
          .single()
        if (inserted) setExistingId((inserted as Handoff).id)
      }

      await updateStreak(user.id, 'kickstart')
      onComplete?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Kickstart error:', message)
      setError(`Could not reach Claude: ${message}`)
      if (!existingId) {
        await supabase.from('handoffs').insert({
          user_id: user.id,
          type: 'morning_kickstart',
          content: {},
          raw_input: rawInput,
          date: today,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (checkingExisting) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 rounded-lg bg-secondary" />
        <div className="h-4 w-2/3 rounded-lg bg-secondary" />
        <div className="h-4 w-1/2 rounded-lg bg-secondary" />
      </div>
    )
  }

  if (result && !loading) {
    const isEmpty = !result.main_focus

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

        {isEmpty ? (
          <div className="px-4 py-5 rounded-lg bg-secondary border border-border space-y-3">
            <p className="text-sm text-muted-foreground">
              Something went wrong last time — your kickstart didn't save properly.
            </p>
            <button
              onClick={() => { setResult(null); setWorkDump(''); setHomeDump('') }}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
            >
              Start kickstart
            </button>
          </div>
        ) : (
          <>
        {result.overcommitted && result.overcommit_note && (
          <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm">
            ⚠ {result.overcommit_note}
          </div>
        )}

        <div
          className={`px-4 py-4 rounded-lg bg-primary/10 border border-primary/30 ${onSelectTask ? 'cursor-pointer hover:bg-primary/20 transition-colors' : ''}`}
          onClick={() => onSelectTask?.(result.main_focus)}
        >
          <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">
            Focus today{onSelectTask ? ' — tap to focus' : ''}
          </p>
          <p className="font-semibold text-lg leading-snug">{result.main_focus}</p>
        </div>

        {result.yesterday_thread && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Start here</p>
            <p className="text-sm">{result.yesterday_thread}</p>
          </div>
        )}

        {(result.must_today?.length ?? 0) > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Must today</p>
            <ul className="space-y-1">
              {result.must_today.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-destructive shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(result.if_time?.length ?? 0) > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">If time</p>
            <ul className="space-y-1">
              {result.if_time.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(result.home_items?.length ?? 0) > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Home today</p>
            <ul className="space-y-1">
              {result.home_items.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(result.flagged_promises?.length ?? 0) > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Promises due</p>
            <ul className="space-y-1">
              {result.flagged_promises.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-yellow-400 shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(result.completed_yesterday?.length ?? 0) > 0 && (
          <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Done yesterday</p>
            <ul className="space-y-1">
              {result.completed_yesterday.map((item, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.streak_note && (
          <p className="text-xs text-muted-foreground px-1">{result.streak_note}</p>
        )}

        <button
          onClick={() => { setResult(null); setWorkDump(''); setHomeDump('') }}
          className="w-full py-3 rounded-lg bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
        >
          Redo kickstart
        </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
      )}
      <p className="text-muted-foreground text-sm">What's on your mind? Dump everything.</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
          Work
        </label>
        <textarea
          value={workDump}
          onChange={e => setWorkDump(e.target.value)}
          placeholder="Work tasks, emails, open loops, what's on your mind…"
          rows={5}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-base"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
          Home
        </label>
        <textarea
          value={homeDump}
          onChange={e => setHomeDump(e.target.value)}
          placeholder="Promises, personal tasks, things not to forget…"
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-base"
        />
      </div>

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={handleStart} className="text-sm text-primary hover:underline cursor-pointer">Retry</button>
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Sorting your day…' : 'Start my day'}
      </button>
    </div>
  )
}
