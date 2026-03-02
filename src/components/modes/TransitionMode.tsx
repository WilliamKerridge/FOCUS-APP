import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

export default function TransitionMode({ user }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleTransition() {
    setLoading(true)
    try {
      const text = await callClaude(
        [{ role: 'user', content: "I'm done with work. Give me a one-line parking confirmation and a brief presence intention for this evening." }]
      )
      setMessage(text)

      await supabase.from('handoffs').insert({
        user_id: user.id,
        type: 'transition',
        content: { parking_note: text, presence_intention: '' },
        raw_input: 'manual transition',
        date: new Date().toISOString().split('T')[0],
      })
    } catch (err) {
      console.error(err)
      setMessage("Work is parked. You're done. Be present.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Transition</h2>
        <p className="text-sm text-muted-foreground mt-1">Switch context deliberately.</p>
      </div>

      {message ? (
        <div className="space-y-4">
          <div className="px-4 py-5 rounded-xl bg-secondary border border-border">
            <p className="leading-relaxed">{message}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="w-full py-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
          >
            Reset
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={handleTransition}
            disabled={loading}
            className="w-full py-6 rounded-xl bg-primary text-primary-foreground font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? 'Parking work…' : "I'm done with work"}
          </button>

          <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Full transition ritual — work parking, promises check, presence intention — coming in Phase 3.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
