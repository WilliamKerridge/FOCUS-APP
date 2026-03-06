// src/components/kickstart/ClaireCheckin.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type Quality = 'yes' | 'no' | 'partial'

interface Props {
  onSave: (quality_time: Quality, blocker: string | null) => Promise<string | null>
  onSkip: () => void
  saving: boolean
}

export default function ClaireCheckin({ onSave, onSkip, saving }: Props) {
  const [selected, setSelected] = useState<'partial' | null>(null)
  const [blocker, setBlocker] = useState('')

  function handleOption(quality: Quality) {
    if (quality === 'partial') {
      setSelected('partial')
    } else {
      onSave(quality, null)
    }
  }

  function handleContinue() {
    onSave('partial', blocker.trim() || null)
  }

  if (selected === 'partial') {
    return (
      <div className="space-y-5">
        <p className="text-base font-medium text-foreground">
          How was your evening with Claire yesterday?
        </p>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">What got in the way?</p>
          <textarea
            value={blocker}
            onChange={e => setBlocker(e.target.value)}
            placeholder="What got in the way?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-base"
            autoFocus
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>

        <button
          onClick={() => setSelected(null)}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-base font-medium text-foreground">
        How was your evening with Claire yesterday?
      </p>

      <div className="space-y-3">
        <button
          onClick={() => handleOption('yes')}
          disabled={saving}
          className="w-full py-4 px-5 rounded-lg bg-secondary border border-border text-foreground font-medium text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform hover:bg-secondary/80"
        >
          Quality time
        </button>

        <button
          onClick={() => handleOption('partial')}
          disabled={saving}
          className="w-full py-4 px-5 rounded-lg bg-secondary border border-border text-foreground font-medium text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform hover:bg-secondary/80"
        >
          Partially present
        </button>

        <button
          onClick={() => handleOption('no')}
          disabled={saving}
          className="w-full py-4 px-5 rounded-lg bg-secondary border border-border text-foreground font-medium text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform hover:bg-secondary/80"
        >
          Didn't manage it
        </button>
      </div>

      <button
        onClick={onSkip}
        disabled={saving}
        className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Skip
      </button>
    </div>
  )
}
