import type { User } from '@supabase/supabase-js'
import { useTaskList } from '@/hooks/useTaskList'

interface Props {
  user: User
  contexts: string[]
  title?: string
}

export default function TaskList({ user, contexts, title }: Props) {
  const { tasks, loading, error, markDone } = useTaskList(user, contexts)

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-8 rounded bg-secondary" />
        <div className="h-8 rounded bg-secondary" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (tasks.length === 0) return null

  const workTasks = tasks.filter(t => t.context === 'work')
  const waitingTasks = tasks.filter(t => t.context === 'waiting_for')
  const homeTasks = tasks.filter(t => t.context === 'home')

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {title}
        </p>
      )}

      {workTasks.length > 0 && (
        <ul className="space-y-1">
          {workTasks.map(task => (
            <TaskRow key={task.id} task={task} onDone={() => markDone(task.id)} />
          ))}
        </ul>
      )}

      {homeTasks.length > 0 && (
        <ul className="space-y-1">
          {homeTasks.map(task => (
            <TaskRow key={task.id} task={task} onDone={() => markDone(task.id)} />
          ))}
        </ul>
      )}

      {waitingTasks.length > 0 && (
        <div className="pt-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
            Waiting for
          </p>
          <ul className="space-y-1">
            {waitingTasks.map(task => (
              <TaskRow key={task.id} task={task} onDone={() => markDone(task.id)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, onDone }: { task: import('@/hooks/useTaskList').Task; onDone: () => void }) {
  return (
    <li className="flex items-start gap-3 group">
      <button
        onClick={onDone}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors"
        aria-label={`Mark "${task.title}" as done`}
      >
        <span className="text-xs leading-none opacity-0 group-hover:opacity-100">✓</span>
      </button>
      <span className="text-sm leading-snug">
        {task.title}
        {task.due_date && (
          <span className="text-xs text-muted-foreground ml-1.5">— {task.due_date}</span>
        )}
      </span>
    </li>
  )
}
