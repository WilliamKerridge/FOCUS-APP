import type { Task } from '@/hooks/useTaskList'

interface Props {
  openTasks: Task[]
  completedTasks: Task[]
  loading: boolean
  error: string | null
  selectedTaskId?: string
  onDone: (id: string) => void
  onSelectForFocus?: (id: string, title: string) => void
}

export default function TaskList({
  openTasks,
  completedTasks,
  loading,
  error,
  selectedTaskId,
  onDone,
  onSelectForFocus,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-8 rounded bg-secondary" />
        <div className="h-8 rounded bg-secondary" />
      </div>
    )
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>

  if (openTasks.length === 0 && completedTasks.length === 0) return null

  const workTasks = openTasks.filter(t => t.context !== 'waiting_for')
  const waitingTasks = openTasks.filter(t => t.context === 'waiting_for')

  return (
    <div className="space-y-3">
      {openTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Open tasks
          </p>
          {workTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              selected={task.id === selectedTaskId}
              onDone={() => onDone(task.id)}
              onSelect={onSelectForFocus ? () => onSelectForFocus(task.id, task.title) : undefined}
            />
          ))}
          {waitingTasks.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium pt-2">
                Waiting for
              </p>
              {waitingTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={task.id === selectedTaskId}
                  onDone={() => onDone(task.id)}
                  onSelect={onSelectForFocus ? () => onSelectForFocus(task.id, task.title) : undefined}
                />
              ))}
            </>
          )}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Completed today
          </p>
          {completedTasks.map(task => (
            <div key={task.id} className="flex items-start gap-3 opacity-50">
              <span className="mt-0.5 h-4 w-4 shrink-0 flex items-center justify-center text-primary text-xs">✓</span>
              <span className="text-sm leading-snug line-through text-muted-foreground">{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  selected,
  onDone,
  onSelect,
}: {
  task: Task
  selected: boolean
  onDone: () => void
  onSelect?: () => void
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded px-1 py-0.5 -mx-1 transition-colors ${
        selected ? 'bg-primary/15' : onSelect ? 'hover:bg-secondary cursor-pointer' : ''
      }`}
      onClick={onSelect}
    >
      <button
        onClick={e => { e.stopPropagation(); onDone() }}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors"
        aria-label={`Mark "${task.title}" as done`}
      >
        <span className="text-xs leading-none opacity-0 hover:opacity-100">✓</span>
      </button>
      <span className="text-sm leading-snug flex-1">
        {task.title}
        {task.due_date && (
          <span className="text-xs text-muted-foreground ml-1.5">— {task.due_date}</span>
        )}
      </span>
    </div>
  )
}
