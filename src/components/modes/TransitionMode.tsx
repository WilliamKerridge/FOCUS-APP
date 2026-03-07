// src/components/modes/TransitionMode.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import { usePromises } from '@/hooks/usePromises'
import { useClaireCheckin } from '@/hooks/useClaireCheckin'
import { getToday } from '@/lib/utils'
import type { Mode } from '@/types'

interface Props {
  user: User
  onModeChange: (mode: Mode) => void
}

export default function TransitionMode({ user, onModeChange }: Props) {
  const { promises } = usePromises(user, 'work')
  const { claireContext } = useClaireCheckin(user)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1
  const [parkingInput, setParkingInput] = useState('')
  const [parkingNote, setParkingNote] = useState('')
  const [parkingLoading, setParkingLoading] = useState(false)

  // Step 2
  const [checkedPromises, setCheckedPromises] = useState<boolean[]>([])

  // Step 3
  const [intention, setIntention] = useState('')

  // Step 4
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function advanceFromStep1(note: string) {
    setParkingNote(note)
    const hasPromises = promises.length > 0
    if (hasPromises) {
      setCheckedPromises(promises.map(() => false))
      setStep(2)
    } else {
      setStep(3)
    }
  }

  async function handleParkingContinue() {
    if (!parkingInput.trim()) {
      advanceFromStep1('')
      return
    }
    setParkingLoading(true)
    let note = ''
    try {
      note = (await callClaude([
        { role: 'user', content: `I'm done with work. Open loops: ${parkingInput.trim()}. Give me a one-line parking confirmation.` },
      ])).trim()
    } catch {
      note = parkingInput.trim()
    } finally {
      setParkingLoading(false)
    }
    advanceFromStep1(note)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const eveningPromises = promises
      .filter((_, i) => checkedPromises[i])
      .map(p => p.title)
    const { error } = await supabase.from('handoffs').insert({
      user_id: user.id,
      type: 'transition',
      content: {
        parking_note: parkingNote,
        evening_promises: eveningPromises,
        presence_intention: intention,
      },
      raw_input: parkingInput || 'manual transition',
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
          <textarea
            value={parkingInput}
            onChange={e => setParkingInput(e.target.value)}
            placeholder="Any open loops or unfinished thoughts to park?"
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
          />
          <button
            onClick={handleParkingContinue}
            disabled={parkingLoading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {parkingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {parkingLoading ? 'Parking…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Promises check</h2>
          <p className="text-sm text-muted-foreground">Any of these relevant for tonight?</p>
          <div className="space-y-2">
            {promises.map((p, i) => (
              <label key={p.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedPromises[i] ?? false}
                  onChange={e =>
                    setCheckedPromises(prev => prev.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                  className="mt-0.5"
                />
                <span className="text-sm">
                  {p.title}{p.made_to ? ` — to ${p.made_to}` : ''}
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Presence intention</h2>
          {claireContext && (
            <p className="text-sm text-amber-400/90 italic">{claireContext}</p>
          )}
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
            {parkingNote && (
              <p>
                <span className="text-muted-foreground">Parked: </span>
                {parkingNote}
              </p>
            )}
            {promises.filter((_, i) => checkedPromises[i]).length > 0 && (
              <p>
                <span className="text-muted-foreground">Tonight: </span>
                {promises.filter((_, i) => checkedPromises[i]).map(p => p.title).join(', ')}
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
