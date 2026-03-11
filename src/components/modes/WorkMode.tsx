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
import AgendaView from '@/components/calendar/AgendaView'
import ItemDetailCard from '@/components/calendar/ItemDetailCard'
import type { AgendaItem } from '@/components/calendar/AgendaView'
import { usePromises } from '@/hooks/usePromises'

import QuickCaptureFAB from '@/components/capture/QuickCaptureFAB'

type WorkView = 'home' | 'kickstart' | 'handoff' | 'review' | 'email' | 'agenda'

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
  const { openTasks, completedTasks, loading: tasksLoading, error: tasksError, markDone, addTask, createCompletedTask, updateTask } = useTaskList(user, ['work', 'waiting_for'])
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
    <div className="space-y-5">
      {abandonedSession && (
        <AbandonedSessionBanner session={abandonedSession} onClose={closeAbandoned} />
      )}

      {/* Mode header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-fraunces text-2xl font-semibold leading-tight">Work</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <StreakCounter user={user} />
      </div>

      {/* TODAY'S FOCUS hero card */}
      <button
        onClick={() => setView('kickstart')}
        className="w-full text-left p-5 rounded-2xl bg-secondary border border-primary/20 shadow-[0_8px_24px_rgba(63,169,245,0.08)] cursor-pointer active:scale-[0.98] transition-transform"
      >
        <p className="text-[11px] font-semibold text-primary tracking-[0.8px] uppercase mb-2">
          TODAY'S FOCUS
        </p>
        <p className="font-fraunces text-[22px] font-semibold leading-tight mb-1">
          Morning Kickstart
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Brain dump → sorted plan
        </p>
        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-sm font-semibold">
          Begin
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </span>
      </button>

      {/* 2×2 quick action grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {([
          { label: 'End of Day', icon: 'sunset',    view: 'handoff' },
          { label: 'Agenda',     icon: 'calendar',  view: 'agenda'  },
          { label: 'Review',     icon: 'trending',  view: 'review'  },
          { label: 'Email',      icon: 'mail',      view: 'email'   },
        ] as const).map(({ label, icon, view: v }) => (
          <button
            key={v}
            onClick={() => setView(v as WorkView)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-secondary border border-border cursor-pointer hover:bg-secondary/70 active:scale-[0.97] transition-transform"
          >
            <QuickActionIcon name={icon} />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Promises callout pill */}
      {workPromises.length > 0 && (
        <button
          onClick={() => setView('agenda')}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full border border-amber-400/30 bg-amber-400/10 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-400">
            {workPromises.length} active promise{workPromises.length !== 1 ? 's' : ''}
          </span>
          <span className="ml-auto text-xs font-medium text-amber-400">View all →</span>
        </button>
      )}

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

      <QuickCaptureFAB
        placeholder="Add a task"
        onCapture={(title, _, dueDate) => addTask(title, 'work', dueDate)}
      />
    </div>
  )
}

function QuickActionIcon({ name }: { name: string }) {
  const cls = "h-[18px] w-[18px] text-muted-foreground"
  if (name === 'sunset')   return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>
  if (name === 'calendar')  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
  if (name === 'trending')  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  if (name === 'mail')      return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  return null
}
