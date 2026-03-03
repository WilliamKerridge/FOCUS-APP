// src/components/desktop/FocusPanel.tsx
import { Flame } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useStreak } from '@/hooks/useStreak'
import SessionPanel from '@/components/focus/SessionPanel'

interface Props {
  user: User
  activeTask: string | null
}

export default function FocusPanel({ user, activeTask }: Props) {
  const streak = useStreak(user, 'kickstart')

  return (
    <div className="space-y-5">
      {streak && streak.current_streak >= 2 && (
        <div className="flex items-center gap-1.5">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="font-semibold">{streak.current_streak}</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
      )}

      <div className="px-4 py-4 rounded-lg bg-secondary border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          Now working on
        </p>
        {activeTask ? (
          <p className="font-semibold leading-snug">{activeTask}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Select a task from the plan on the left
          </p>
        )}
      </div>

      <SessionPanel user={user} initialTask={activeTask ?? undefined} />
    </div>
  )
}
