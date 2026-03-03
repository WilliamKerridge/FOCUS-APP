// src/components/desktop/SessionCloseModal.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  isEarlyExit: boolean
  remainingMins: number
  onKeepGoing: () => void
  onClose: (endContext: string) => Promise<void>
  autoTriggered?: boolean
}

export default function SessionCloseModal({ isEarlyExit, remainingMins, onKeepGoing, onClose, autoTriggered }: Props) {
  const showEarlyExitWarning = isEarlyExit && !autoTriggered
  const [endContext, setEndContext] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleClose() {
    setSaving(true)
    await onClose(endContext)
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-sm bg-secondary border border-border rounded-xl p-6 space-y-4">
        {showEarlyExitWarning && (
          <p className="text-sm text-muted-foreground">
            {remainingMins} minute{remainingMins !== 1 ? 's' : ''} remaining.
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="end-context" className="text-xs text-muted-foreground uppercase tracking-wider font-medium block">
            Where did you get to?
          </label>
          <textarea
            id="end-context"
            value={endContext}
            onChange={e => setEndContext(e.target.value)}
            placeholder="Optional — what's the next action?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          {showEarlyExitWarning && (
            <button
              onClick={onKeepGoing}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
            >
              Keep going
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
