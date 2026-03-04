// src/components/desktop/KickstartPlanDisplay.tsx
import { useState } from 'react'
import type { KickstartContent } from '@/types'

interface Props {
  plan: KickstartContent
  activeTask?: string | null
  onSelectTask?: (task: string) => void
  onRedo?: () => void
  onItemComplete?: (title: string, context: 'work' | 'home') => void
}

export default function KickstartPlanDisplay({ plan, activeTask, onSelectTask, onRedo, onItemComplete }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggleItem(key: string, title: string, context: 'work' | 'home') {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        onItemComplete?.(title, context)
      }
      return next
    })
  }

  function itemRow(item: string, key: string, bulletColor: string, context: 'work' | 'home') {
    const done = checked.has(key)
    const isActive = item === activeTask
    return (
      <li
        key={key}
        className={`text-sm flex gap-2 rounded px-1 py-0.5 -mx-1 select-none transition-colors ${
          done ? 'opacity-40' : isActive ? 'bg-primary/20' : ''
        }`}
      >
        <button
          onClick={() => toggleItem(key, item, context)}
          className="shrink-0 mt-0.5 cursor-pointer w-4 text-left"
        >
          {done ? <span className="text-green-400">✓</span> : <span className={bulletColor}>•</span>}
        </button>
        <span
          onClick={() => { if (!done) onSelectTask?.(item) }}
          className={`flex-1 ${done ? 'line-through' : onSelectTask ? 'cursor-pointer hover:text-primary' : ''}`}
        >
          {item}
        </span>
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overcommitted warning */}
      {plan.overcommitted && plan.overcommit_note && (
        <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm">
          ⚠ {plan.overcommit_note}
        </div>
      )}

      {/* Focus Today */}
      <div
        className={`px-4 py-4 rounded-lg border transition-colors ${
          plan.main_focus === activeTask
            ? 'bg-primary/20 border-primary/50'
            : 'bg-primary/10 border-primary/30'
        } ${onSelectTask ? 'cursor-pointer hover:bg-primary/15' : ''}`}
        onClick={() => onSelectTask?.(plan.main_focus)}
      >
        <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">
          Focus today{onSelectTask ? ' — tap to focus' : ''}
        </p>
        <p className="font-semibold text-lg leading-snug">{plan.main_focus}</p>
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
            {plan.must_today.map((item, i) => itemRow(item, `must_${i}`, 'text-destructive', 'work'))}
          </ul>
        </div>
      )}

      {/* If time */}
      {(plan.if_time?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">If time</p>
          <ul className="space-y-1">
            {plan.if_time.map((item, i) => itemRow(item, `if_${i}`, 'text-muted-foreground', 'work'))}
          </ul>
        </div>
      )}

      {/* Home today */}
      {(plan.home_items?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Home today</p>
          <ul className="space-y-1">
            {plan.home_items.map((item, i) => itemRow(item, `home_${i}`, 'text-blue-400', 'home'))}
          </ul>
        </div>
      )}

      {/* Flagged promises */}
      {(plan.flagged_promises?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Promises due</p>
          <ul className="space-y-1">
            {plan.flagged_promises.map((item, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-yellow-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Done yesterday */}
      {(plan.completed_yesterday?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Done yesterday</p>
          <ul className="space-y-1">
            {plan.completed_yesterday.map((item, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Streak note */}
      {plan.streak_note && (
        <p className="text-xs text-muted-foreground px-1">{plan.streak_note}</p>
      )}

      {onRedo && (
        <button
          onClick={onRedo}
          className="w-full py-3 rounded-lg bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
        >
          Redo kickstart
        </button>
      )}
    </div>
  )
}
