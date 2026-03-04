// src/components/desktop/KickstartPlanDisplay.tsx
import type { KickstartContent } from '@/types'

interface Props {
  plan: KickstartContent
  activeTask: string | null
  onSelectTask: (task: string) => void
  onRedo?: () => void
}

export default function KickstartPlanDisplay({ plan, activeTask, onSelectTask, onRedo }: Props) {
  const isActive = (item: string) => item === activeTask

  const taskClass = (item: string) =>
    `text-sm flex gap-2 cursor-pointer rounded px-1 py-0.5 -mx-1 transition-colors ${
      isActive(item)
        ? 'bg-primary/20 text-foreground'
        : 'hover:bg-secondary text-foreground'
    }`

  return (
    <div className="space-y-4">
      {/* Focus Today */}
      <div
        className={`px-4 py-4 rounded-lg border cursor-pointer transition-colors ${
          isActive(plan.main_focus)
            ? 'bg-primary/20 border-primary/50'
            : 'bg-primary/10 border-primary/30 hover:bg-primary/15'
        }`}
        onClick={() => onSelectTask(plan.main_focus)}
      >
        <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Focus today</p>
        <p className="font-semibold leading-snug">{plan.main_focus}</p>
      </div>

      {/* Yesterday thread */}
      {plan.yesterday_thread && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Start here</p>
          <p className="text-sm">{plan.yesterday_thread}</p>
        </div>
      )}

      {/* Must today */}
      {(plan.must_today?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Must today</p>
          <ul className="space-y-1">
            {plan.must_today.map((item, i) => (
              <li key={i} className={taskClass(item)} onClick={() => onSelectTask(item)}>
                <span className="text-destructive shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* If time */}
      {(plan.if_time?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">If time</p>
          <ul className="space-y-1">
            {plan.if_time.map((item, i) => (
              <li key={i} className={taskClass(item)} onClick={() => onSelectTask(item)}>
                <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Home today */}
      {(plan.home_items?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Home today</p>
          <ul className="space-y-1">
            {plan.home_items.map((item, i) => (
              <li key={i} className={taskClass(item)} onClick={() => onSelectTask(item)}>
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {onRedo && (
        <button
          onClick={onRedo}
          className="w-full py-2.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
        >
          Redo kickstart
        </button>
      )}
    </div>
  )
}
