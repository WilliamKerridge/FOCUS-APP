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
import { usePromises } from '@/hooks/usePromises'
import AbandonedSessionBanner from '@/components/focus/AbandonedSessionBanner'
import ReEntryPrompt from '@/components/focus/ReEntryPrompt'
import TaskList from '@/components/tasks/TaskList'
import { useTaskList } from '@/hooks/useTaskList'
import ReviewScreen from '@/components/review/ReviewScreen'
import AgendaView from '@/components/calendar/AgendaView'
import ItemDetailCard from '@/components/calendar/ItemDetailCard'
import type { AgendaItem } from '@/components/calendar/AgendaView'
import QuickCaptureFAB from '@/components/capture/QuickCaptureFAB'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

type DesktopView = 'work' | 'handoff' | 'review'

export default function WorkDesktop({ user, onSwitchToTransition }: Props) {
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>()
  const [view, setView] = useState<DesktopView>('work')
  const [showEmailDrop, setShowEmailDrop] = useState(false)
  const [redoingKickstart, setRedoingKickstart] = useState(false)
  const [leftTab, setLeftTab] = useState<'tasks' | 'agenda'>('tasks')
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone, addTask, createCompletedTask, updateTask } = useTaskList(user, ['work', 'waiting_for'])
  const { kickstartDone, endOfDayDone, loading: progressLoading } = useTodayHandoffs(user)
  const { plan, loading: loadingPlan, error: planError, refreshPlan } = useTodayKickstart(user)
  const { items: inboxItems } = useEmailInbox(user)
  const inboxCount = inboxItems.length
  const { abandonedSession, closeAbandoned } = useFocusSession(user)
  const { promises: workPromises, completePromise: completeWorkPromise, updatePromise: updateWorkPromise } = usePromises(user, 'work')
  const { promises: homePromises, completePromise: completeHomePromise, updatePromise: updateHomePromise } = usePromises(user, 'home')
  const allPromises = [...workPromises, ...homePromises].sort((a, b) => a.due_date.localeCompare(b.due_date))

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

  if (view === 'review') {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('work')}
            className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
          >
            ← Back
          </button>
          <h2 className="text-lg font-bold">Weekly Review</h2>
        </div>
        <ReviewScreen user={user} />
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
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          <button onClick={() => setLeftTab('tasks')} className={`flex-1 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${leftTab === 'tasks' ? 'bg-background shadow' : ''}`}>Tasks</button>
          <button onClick={() => setLeftTab('agenda')} className={`flex-1 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${leftTab === 'agenda' ? 'bg-background shadow' : ''}`}>Agenda</button>
        </div>

        {leftTab === 'agenda' && (
          <AgendaView
            items={[
              ...openTasks.map(t => ({ kind: 'task' as const, id: t.id, title: t.title, madeTo: null, dueDate: t.due_date })),
              ...allPromises.map(p => ({ kind: 'promise' as const, id: p.id, title: p.title, madeTo: p.made_to, dueDate: p.due_date })),
            ]}
            onComplete={(item) => {
              if (item.kind === 'task') markDone(item.id)
              else if (workPromises.some(p => p.id === item.id)) completeWorkPromise(item.id)
              else completeHomePromise(item.id)
            }}
            onTap={setSelectedItem}
          />
        )}

        {leftTab === 'tasks' && <>
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
            onItemComplete={createCompletedTask}
            userId={user.id}
            activePromises={allPromises}
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
            onClick={() => setView('review')}
            className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
          >
            Weekly Review
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
        </>}
      </div>

      {/* Right column — doing */}
      <div>
        <FocusPanel
          user={user}
          activeTask={activeTask}
          activeTaskId={activeTaskId}
          onLinkedTaskDone={markDone}
          onSessionDone={(title) => createCompletedTask(title, 'work', 'session')}
        />
      </div>
    </div>

    {selectedItem && (
      <ItemDetailCard
        item={selectedItem}
        onSave={async (changes) => {
          if (selectedItem.kind === 'task') return updateTask(selectedItem.id, changes)
          const fn = workPromises.some(p => p.id === selectedItem.id) ? updateWorkPromise : updateHomePromise
          return fn(selectedItem.id, { ...changes, due_date: changes.due_date ?? undefined })
        }}
        onComplete={() => {
          if (selectedItem.kind === 'task') markDone(selectedItem.id)
          else if (workPromises.some(p => p.id === selectedItem.id)) completeWorkPromise(selectedItem.id)
          else completeHomePromise(selectedItem.id)
          setSelectedItem(null)
        }}
        onClose={() => setSelectedItem(null)}
      />
    )}

    <QuickCaptureFAB
      placeholder="Add a task"
      onCapture={(title, _, dueDate) => addTask(title, 'work', dueDate)}
    />
    </div>
  )
}
