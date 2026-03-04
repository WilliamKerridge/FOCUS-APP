// src/components/desktop/WorkDesktop.tsx
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import KickstartPlanDisplay from '@/components/desktop/KickstartPlanDisplay'
import FocusPanel from '@/components/desktop/FocusPanel'
import DailyProgress from '@/components/desktop/DailyProgress'
import { useTodayHandoffs } from '@/hooks/useTodayHandoffs'
import { useEmailInbox } from '@/hooks/useEmailInbox'
import { useTodayKickstart } from '@/hooks/useTodayKickstart'
import MorningKickstart from '@/components/kickstart/MorningKickstart'
import EndOfDayHandoff from '@/components/handoff/EndOfDayHandoff'
import EmailDropOverlay from '@/components/desktop/EmailDropOverlay'
import { useFocusSession } from '@/hooks/useFocusSession'
import AbandonedSessionBanner from '@/components/focus/AbandonedSessionBanner'
import ReEntryPrompt from '@/components/focus/ReEntryPrompt'
import TaskList from '@/components/tasks/TaskList'
import { useTaskList } from '@/hooks/useTaskList'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

type DesktopView = 'work' | 'handoff'

export default function WorkDesktop({ user, onSwitchToTransition }: Props) {
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>()
  const [view, setView] = useState<DesktopView>('work')
  const [showEmailDrop, setShowEmailDrop] = useState(false)
  const [redoingKickstart, setRedoingKickstart] = useState(false)
  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone } = useTaskList(user, ['work', 'waiting_for'])
  const { kickstartDone, endOfDayDone, loading: progressLoading } = useTodayHandoffs(user)
  const { plan, loading: loadingPlan, error: planError, refreshPlan } = useTodayKickstart(user)
  const { items: inboxItems } = useEmailInbox(user)
  const inboxCount = inboxItems.length
  const { abandonedSession, closeAbandoned } = useFocusSession(user)

  useEffect(() => {
    if (plan && !activeTask) {
      setActiveTask(plan.main_focus)
    }
  }, [plan]) // eslint-disable-line react-hooks/exhaustive-deps

  if (view === 'handoff') {
    return (
      <div className="space-y-4 max-w-lg">
        <h2 className="text-lg font-bold">End of Day</h2>
        <EndOfDayHandoff user={user} onBack={() => setView('work')} onSwitchToTransition={onSwitchToTransition} />
      </div>
    )
  }

  if (showEmailDrop) {
    return <EmailDropOverlay user={user} onClose={() => setShowEmailDrop(false)} />
  }

  return (
    <div className="space-y-4">
    {abandonedSession && (
      <AbandonedSessionBanner session={abandonedSession} onClose={closeAbandoned} />
    )}
    <div className="grid grid-cols-2 gap-8">
      {/* Left column — planning */}
      <div className="space-y-4">
        {planError && <p className="text-sm text-destructive">{planError}</p>}
        {loadingPlan ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 rounded-lg bg-secondary" />
            <div className="h-16 rounded-lg bg-secondary" />
            <div className="h-16 rounded-lg bg-secondary" />
          </div>
        ) : plan?.main_focus && !redoingKickstart ? (
          <KickstartPlanDisplay
            plan={plan}
            activeTask={activeTask}
            onSelectTask={setActiveTask}
            onRedo={() => setRedoingKickstart(true)}
          />
        ) : (
          <div className="space-y-4">
            {plan && !plan.main_focus && !redoingKickstart && (
              <p className="text-sm text-muted-foreground">Your kickstart didn't save properly — redo it below.</p>
            )}
            <MorningKickstart
              user={user}
              onComplete={() => { setRedoingKickstart(false); refreshPlan() }}
            />
          </div>
        )}

        <TaskList
          openTasks={openTasks}
          completedTasks={completedTasks}
          loading={tasksLoading}
          error={tasksError}
          selectedTaskId={activeTaskId}
          onDone={markDone}
          onSelectForFocus={(id, title) => { setActiveTaskId(id); setActiveTask(title) }}
        />

        {/* Bottom actions */}
        <div className="pt-2 space-y-2">
          {!progressLoading && (
            <DailyProgress kickstartDone={kickstartDone} endOfDayDone={endOfDayDone} />
          )}
          <ReEntryPrompt user={user} />
          <button
            onClick={() => setView('handoff')}
            className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform mt-3"
          >
            End of Day
          </button>
          <button
            onClick={() => setShowEmailDrop(true)}
            className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2 relative"
          >
            Process an email
            {inboxCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {inboxCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Right column — doing */}
      <div>
        <FocusPanel
          user={user}
          activeTask={activeTask}
          activeTaskId={activeTaskId}
          onLinkedTaskDone={markDone}
        />
      </div>
    </div>
    </div>
  )
}
