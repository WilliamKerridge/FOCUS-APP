import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import MorningKickstart from '@/components/kickstart/MorningKickstart'
import EndOfDayHandoff from '@/components/handoff/EndOfDayHandoff'
import StreakCounter from '@/components/streaks/StreakCounter'
import { useFocusSession } from '@/hooks/useFocusSession'
import AbandonedSessionBanner from '@/components/focus/AbandonedSessionBanner'
import ReEntryPrompt from '@/components/focus/ReEntryPrompt'
import SessionPanel from '@/components/focus/SessionPanel'

type WorkView = 'home' | 'kickstart' | 'handoff'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

export default function WorkMode({ user, onSwitchToTransition }: Props) {
  const [view, setView] = useState<WorkView>('home')
  const [selectedTask, setSelectedTask] = useState<string | undefined>()
  const { abandonedSession, closeAbandoned } = useFocusSession(user)

  function handleSelectTask(task: string) {
    setSelectedTask(task)
    setView('home')
  }

  if (view === 'kickstart') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Morning Kickstart</h2>
        <MorningKickstart user={user} onBack={() => setView('home')} onSelectTask={handleSelectTask} />
      </div>
    )
  }

  if (view === 'handoff') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">End of Day</h2>
        <EndOfDayHandoff user={user} onBack={() => setView('home')} onSwitchToTransition={onSwitchToTransition} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {abandonedSession && (
        <AbandonedSessionBanner session={abandonedSession} onClose={closeAbandoned} />
      )}

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

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Focus session</p>
        <ReEntryPrompt user={user} />
        <div className="mt-4">
          <SessionPanel user={user} initialTask={selectedTask} />
        </div>
      </div>
    </div>
  )
}
