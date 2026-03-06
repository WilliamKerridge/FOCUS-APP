import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import MorningKickstart from '@/components/kickstart/MorningKickstart'
import EndOfDayHandoff from '@/components/handoff/EndOfDayHandoff'
import StreakCounter from '@/components/streaks/StreakCounter'
import { useFocusSession } from '@/hooks/useFocusSession'
import AbandonedSessionBanner from '@/components/focus/AbandonedSessionBanner'
import ReEntryPrompt from '@/components/focus/ReEntryPrompt'
import SessionPanel from '@/components/focus/SessionPanel'
import TaskList from '@/components/tasks/TaskList'
import { useTaskList } from '@/hooks/useTaskList'
import ReviewScreen from '@/components/review/ReviewScreen'
import EmailDropOverlay from '@/components/desktop/EmailDropOverlay'
import PromisesList from '@/components/promises/PromisesList'
import AgendaView from '@/components/calendar/AgendaView'
import ItemDetailCard from '@/components/calendar/ItemDetailCard'
import type { AgendaItem } from '@/components/calendar/AgendaView'
import { usePromises } from '@/hooks/usePromises'

type WorkView = 'home' | 'kickstart' | 'handoff' | 'review' | 'email' | 'promises' | 'agenda'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

export default function WorkMode({ user, onSwitchToTransition }: Props) {
  const [view, setView] = useState<WorkView>('home')
  const [selectedTask, setSelectedTask] = useState<string | undefined>()
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>()
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const { abandonedSession, closeAbandoned } = useFocusSession(user)
  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone, createCompletedTask, updateTask } = useTaskList(user, ['work', 'waiting_for'])
  const { promises: workPromises, completePromise: completeWorkPromise, updatePromise: updateWorkPromise } = usePromises(user, 'work')

  function handleSelectTask(task: string) {
    setSelectedTask(task)
    setView('home')
  }

  if (view === 'kickstart') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Morning Kickstart</h2>
        <MorningKickstart user={user} onBack={() => setView('home')} onSelectTask={handleSelectTask} onItemComplete={createCompletedTask} />
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

  if (view === 'email') {
    return <EmailDropOverlay user={user} onClose={() => setView('home')} />
  }

  if (view === 'promises') {
    return <PromisesList user={user} context="work" onBack={() => setView('home')} />
  }

  if (view === 'agenda') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('home')} className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer">← Back</button>
          <h2 className="text-lg font-bold">Agenda</h2>
        </div>
        <AgendaView
          items={[
            ...openTasks.map(t => ({ kind: 'task' as const, id: t.id, title: t.title, madeTo: null, dueDate: t.due_date })),
            ...workPromises.map(p => ({ kind: 'promise' as const, id: p.id, title: p.title, madeTo: p.made_to, dueDate: p.due_date })),
          ]}
          onComplete={(item) => {
            if (item.kind === 'task') markDone(item.id)
            else completeWorkPromise(item.id)
          }}
          onTap={setSelectedItem}
        />
        {selectedItem && (
          <ItemDetailCard
            item={selectedItem}
            onSave={async (changes) => {
              if (selectedItem.kind === 'task') return updateTask(selectedItem.id, changes)
              return updateWorkPromise(selectedItem.id, { ...changes, due_date: changes.due_date ?? undefined })
            }}
            onComplete={() => {
              if (selectedItem.kind === 'task') markDone(selectedItem.id)
              else completeWorkPromise(selectedItem.id)
              setSelectedItem(null)
            }}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    )
  }

  if (view === 'review') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('home')}
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

        <button
          onClick={() => setView('review')}
          className="w-full px-4 py-5 rounded-xl bg-secondary border border-border text-left cursor-pointer motion-safe:active:scale-[0.98] motion-safe:transition-transform"
        >
          <p className="font-semibold">Weekly Review</p>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks completed this week</p>
        </button>

        <button
          onClick={() => setView('email')}
          className="w-full px-4 py-5 rounded-xl bg-secondary border border-border text-left cursor-pointer motion-safe:active:scale-[0.98] motion-safe:transition-transform"
        >
          <p className="font-semibold">Email</p>
          <p className="text-sm text-muted-foreground mt-0.5">Process or paste an email</p>
        </button>

        <button
          onClick={() => setView('promises')}
          className="w-full px-4 py-5 rounded-xl bg-secondary border border-border text-left cursor-pointer motion-safe:active:scale-[0.98] motion-safe:transition-transform"
        >
          <p className="font-semibold">Promises</p>
          <p className="text-sm text-muted-foreground mt-0.5">Commitments you've made</p>
        </button>

        <button
          onClick={() => setView('agenda')}
          className="w-full px-4 py-5 rounded-xl bg-secondary border border-border text-left cursor-pointer motion-safe:active:scale-[0.98] motion-safe:transition-transform"
        >
          <p className="font-semibold">Agenda</p>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks & promises by date</p>
        </button>
      </div>

      <TaskList
        openTasks={openTasks}
        completedTasks={completedTasks}
        loading={tasksLoading}
        error={tasksError}
        selectedTaskId={selectedTaskId}
        onDone={markDone}
        onSelectForFocus={(id, title) => { setSelectedTaskId(id); setSelectedTask(title) }}
      />

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Focus session</p>
        <ReEntryPrompt user={user} />
        <div className="mt-4">
          <SessionPanel
            user={user}
            initialTask={selectedTask}
            linkedTaskId={selectedTaskId}
            onLinkedTaskDone={markDone}
            onSessionDone={(title) => createCompletedTask(title, 'work', 'session')}
          />
        </div>
      </div>
    </div>
  )
}
