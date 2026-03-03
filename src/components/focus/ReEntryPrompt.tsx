import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent } from '@/types'

interface Props {
  user: User
}

export default function ReEntryPrompt({ user }: Props) {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReEntry() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const today = new Date().toISOString().split('T')[0]

      const [{ data: sessionData }, { data: kickstartData }] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('end_context')
          .eq('user_id', user.id)
          .eq('date', today)
          .not('end_context', 'is', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('handoffs')
          .select('content')
          .eq('user_id', user.id)
          .eq('type', 'morning_kickstart')
          .eq('date', today)
          .maybeSingle(),
      ])

      const endContext = (sessionData as { end_context: string } | null)?.end_context ?? null
      const mainFocus = (kickstartData?.content as KickstartContent | null)?.main_focus ?? null

      const systemPrompt = `You are FOCUS. William needs to re-orient after an interruption.

Return exactly two lines, no preamble, no blank lines between them:
Last position: [what William was doing]
Next action: [specific physical next step — not vague, not 'continue working on X']`

      const userMessage = [
        mainFocus ? `Today's main focus: ${mainFocus}` : null,
        endContext ? `Last session end context: ${endContext}` : null,
      ].filter(Boolean).join('\n') || 'No context available for today.'

      const text = await callClaude([{ role: 'user', content: userMessage }], systemPrompt)
      setResult(text.trim())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Re-entry error:', message)
      setError('Could not reach Claude — check your last session notes manually.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleReEntry}
        disabled={loading}
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {loading ? 'Finding your place…' : 'Where was I?'}
      </button>

      {result && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
