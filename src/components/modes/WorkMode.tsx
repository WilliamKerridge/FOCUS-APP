import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import MorningKickstart from '@/components/kickstart/MorningKickstart'
import EndOfDayHandoff from '@/components/handoff/EndOfDayHandoff'
import StreakCounter from '@/components/streaks/StreakCounter'

type WorkView = 'home' | 'kickstart' | 'handoff'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

export default function WorkMode({ user, onSwitchToTransition }: Props) {
  const [view, setView] = useState<WorkView>('home')

  if (view === 'kickstart') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView('home')}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold">Morning Kickstart</h2>
        <MorningKickstart user={user} />
      </div>
    )
  }

  if (view === 'handoff') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView('home')}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold">End of Day</h2>
        <EndOfDayHandoff user={user} onSwitchToTransition={onSwitchToTransition} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Work</h2>
        <StreakCounter user={user} />
      </div>

      <div className="grid gap-3">
        <button
          onClick={() => setView('kickstart')}
          className="w-full px-4 py-5 rounded-xl bg-secondary border border-border text-left cursor-pointer motion-safe:active:scale-[0.98] motion-safe:transition-transform"
        >
          <p className="font-semibold">Morning Kickstart</p>
          <p className="text-sm text-muted-foreground mt-0.5">Brain dump → sorted plan</p>
        </button>

        <button
          onClick={() => setView('handoff')}
          className="w-full px-4 py-5 rounded-xl bg-secondary border border-border text-left cursor-pointer motion-safe:active:scale-[0.98] motion-safe:transition-transform"
        >
          <p className="font-semibold">End of Day</p>
          <p className="text-sm text-muted-foreground mt-0.5">Park it, set tomorrow's start</p>
        </button>
      </div>
    </div>
  )
}
