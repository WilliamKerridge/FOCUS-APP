// src/hooks/useTodayKickstart.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent } from '@/types'

interface TodayKickstartResult {
  plan: KickstartContent | null
  loading: boolean
  error: string | null
  refreshPlan: () => void
}

export function useTodayKickstart(user: User | null): TodayKickstartResult {
  const [plan, setPlan] = useState<KickstartContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    let cancelled = false
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('handoffs')
      .select('content')
      .eq('user_id', user.id)
      .eq('type', 'morning_kickstart')
      .eq('date', today)
      .maybeSingle()
      .then(({ data, error: dbError }) => {
        if (cancelled) return
        if (dbError) {
          setError("Couldn't load today's plan — try refreshing.")
          setLoading(false)
          return
        }
        setPlan(data ? (data.content as KickstartContent) : null)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id, fetchCount])

  return { plan, loading, error, refreshPlan: () => setFetchCount(c => c + 1) }
}
