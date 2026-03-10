// src/components/modes/TransitionMode.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getToday } from '@/lib/utils'
import type { Mode } from '@/types'

interface Props {
  user: User
  onModeChange: (mode: Mode) => void
}

export default function TransitionMode({ user, onModeChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1 — park open loops (3 plain text inputs)
  const [parkingLoops, setParkingLoops] = useState<[string, string, string]>(['', '', ''])

  // Step 2 — promises nudge (free text)
  const [eveningPromisesNote, setEveningPromisesNote] = useState('')

  // Step 3
  const [intention, setIntention] = useState('')

  // Step 4
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function setLoop(index: 0 | 1 | 2, value: string) {
    setParkingLoops(prev => {
      const next: [string, string, string] = [...prev] as [string, string, string]
      next[index] = value
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('handoffs').insert({
      user_id: user.id,
      type: 'transition',
      content: {
        parking_loops: parkingLoops.filter(Boolean),
        evening_promises_note: eveningPromisesNote.trim() || null,
        presence_intention: intention,
      },
      raw_input: parkingLoops.filter(Boolean).join('; ') || 'manual transition',
      date: getToday(),
    })
    if (error) {
      setSaveError("Couldn't save — try again.")
      setSaving(false)
      return
    }
    onModeChange('home')
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
        Step {step} of 4
      </p>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Park your work</h2>
          <p className="text-sm text-muted-foreground">What's still open?</p>
          <div className="space-y-2">
            <input
              type="text"
              value={parkingLoops[0]}
              onChange={e => setLoop(0, e.target.value)}
              placeholder="e.g. Kartech call pending"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="text"
              value={parkingLoops[1]}
              onChange={e => setLoop(1, e.target.value)}
              placeholder="And? (optional)"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="text"
              value={parkingLoops[2]}
              onChange={e => setLoop(2, e.target.value)}
              placeholder="One more? (optional)"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            Continue
          </button>
          <button
            onClick={() => setStep(2)}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Skip
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Promises check</h2>
          <input
            type="text"
            value={eveningPromisesNote}
            onChange={e => setEveningPromisesNote(e.target.value)}
            placeholder="e.g. Follow up with Claire"
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            {eveningPromisesNote.trim() ? 'Continue' : 'Skip'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Presence intention</h2>
          <p className="text-sm text-muted-foreground">How will you be present tonight?</p>
          <input
            type="text"
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="Phone away. Ask Claire about her day."
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            onClick={() => setStep(4)}
            disabled={!intention.trim()}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Continue
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Ready to close out</h2>
          <div className="space-y-3 px-4 py-4 rounded-xl bg-secondary border border-border text-sm">
            {parkingLoops.filter(Boolean).length > 0 && (
              <div>
                <span className="text-muted-foreground">Parked: </span>
                {parkingLoops.filter(Boolean).map((loop, i) => (
                  <p key={i} className={i > 0 ? 'mt-1' : ''}>{loop}</p>
                ))}
              </div>
            )}
            {eveningPromisesNote.trim() && (
              <p>
                <span className="text-muted-foreground">Tonight: </span>
                {eveningPromisesNote.trim()}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Intention: </span>
              {intention}
            </p>
          </div>
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : "I'm done with work →"}
          </button>
        </div>
      )}
    </div>
  )
}
