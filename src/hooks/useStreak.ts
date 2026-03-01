import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Streak, StreakType } from '@/types'
import type { User } from '@supabase/supabase-js'

export function useStreak(user: User | null, type: StreakType = 'kickstart') {
  const [streak, setStreak] = useState<Streak | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .eq('streak_type', type)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStreak(data as Streak)
      })
  }, [user, type])

  return streak
}

export async function updateStreak(userId: string, type: StreakType): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('streak_type', type)
    .maybeSingle()

  if (!existing) {
    await supabase.from('streaks').insert({
      user_id: userId,
      streak_type: type,
      current_streak: 1,
      longest_streak: 1,
      last_completed_date: today,
    })
    return
  }

  if (existing.last_completed_date === today) return

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const isConsecutive = existing.last_completed_date === yesterdayStr
  const newCurrent = isConsecutive ? existing.current_streak + 1 : 1
  const newLongest = Math.max(existing.longest_streak, newCurrent)

  await supabase
    .from('streaks')
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_completed_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
}
