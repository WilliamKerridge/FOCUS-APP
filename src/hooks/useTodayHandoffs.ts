// src/hooks/useTodayHandoffs.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface TodayHandoffs {
  kickstartDone: boolean
  endOfDayDone: boolean
  loading: boolean
}

export function useTodayHandoffs(user: User | null): TodayHandoffs {
  const [kickstartDone, setKickstartDone] = useState(false)
  const [endOfDayDone, setEndOfDayDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('handoffs')
      .select('type')
      .eq('user_id', user.id)
      .eq('date', today)
      .in('type', ['morning_kickstart', 'end_of_day'])
      .then(({ data }) => {
        const types = (data ?? []).map((r: { type: string }) => r.type)
        setKickstartDone(types.includes('morning_kickstart'))
        setEndOfDayDone(types.includes('end_of_day'))
        setLoading(false)
      })
  }, [user])

  return { kickstartDone, endOfDayDone, loading }
}
