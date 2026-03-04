// src/components/desktop/KickstartPlanDisplay.tsx
import { useState } from 'react'
import type { KickstartContent } from '@/types'

interface Props {
  plan: KickstartContent
  activeTask: string | null
  onSelectTask: (task: string) => void
  onRedo?: () => void
}

export default function KickstartPlanDisplay({ plan, activeTask, onSelectTask, onRedo }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggleItem(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function itemRow(item: string, key: string, bullet: React.ReactNode) {
    const done = checked.has(key)
    const isActive = item === activeTask
    return (
      <li
        key={key}
        className={`text-sm flex gap-2 rounded px-1 py-0.5 -mx-1 transition-colors select-none ${
          done ? 'opacity-40' : isActive ? 'bg-primary/20' : 'hover:bg-secondary'
        }`}
      >
        <button
          onClick={() => toggleItem(key)}
          className="shrink-0 mt-0.5 cursor-pointer"
        >
          {done ? <span className="text-green-400">✓</span> : bullet}
        </button>
        <span
          onClick={() => !done && onSelectTask(item)}
          className={`flex-1 ${done ? 'line-through' : 'cursor-pointer'}`}
        >
          {item}
        </span>
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {/* Focus Today */}
      <div
        className={`px-4 py-4 rounded-lg border cursor-pointer transition-colors ${
          plan.main_focus === activeTask
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
            {plan.must_today.map((item, i) =>
              itemRow(item, `must_${i}`, <span className="text-destructive">•</span>)
            )}
          </ul>
        </div>
      )}

      {/* If time */}
      {(plan.if_time?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">If time</p>
          <ul className="space-y-1">
            {plan.if_time.map((item, i) =>
              itemRow(item, `if_${i}`, <span className="text-muted-foreground">•</span>)
            )}
          </ul>
        </div>
      )}

      {/* Home today */}
      {(plan.home_items?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Home today</p>
          <ul className="space-y-1">
            {plan.home_items.map((item, i) =>
              itemRow(item, `home_${i}`, <span className="text-blue-400">•</span>)
            )}
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
