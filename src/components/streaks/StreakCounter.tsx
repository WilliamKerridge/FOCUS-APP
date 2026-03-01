import { Flame } from 'lucide-react'
import { useStreak } from '@/hooks/useStreak'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

export default function StreakCounter({ user }: Props) {
  const streak = useStreak(user, 'kickstart')

  // Only show at >= 2 days (per spec)
  if (!streak || streak.current_streak < 2) return null

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Flame className="h-4 w-4 text-orange-400" />
      <span>
        <span className="font-semibold text-foreground">{streak.current_streak}</span>
        {streak.current_streak === 1 ? ' day' : ' days'}
      </span>
    </div>
  )
}
