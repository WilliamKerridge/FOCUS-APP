import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Streak } from '@/types'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

export default function StreakCounter({ user }: Props) {
  const [streak, setStreak] = useState<Streak | null>(null)

  useEffect(() => {
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .eq('streak_type', 'kickstart')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStreak(data as Streak)
      })
  }, [user.id])

  if (!streak || streak.current_streak === 0) return null

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
