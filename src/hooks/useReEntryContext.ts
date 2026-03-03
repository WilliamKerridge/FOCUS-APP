// src/hooks/useReEntryContext.ts
import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent } from '@/types'
import { getToday } from '@/lib/utils'

interface ReEntryContext {
  endContext: string | null
  mainFocus: string | null
}

interface UseReEntryContextReturn {
  context: ReEntryContext | null
  loading: boolean
  error: string | null
  fetchContext: () => Promise<ReEntryContext | null>
}

export function useReEntryContext(user: User): UseReEntryContextReturn {
  const [context, setContext] = useState<ReEntryContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContext = useCallback(async (): Promise<ReEntryContext | null> => {
    setLoading(true)
    setError(null)
    try {
      const today = getToday()
      const [{ data: sessionData }, { data: kickstartData }] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('end_context')
          .eq('user_id', user.id)
          .eq('date', today)
          .not('end_context', 'is', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('handoffs')
          .select('content')
          .eq('user_id', user.id)
          .eq('type', 'morning_kickstart')
          .eq('date', today)
          .maybeSingle(),
      ])
      const result: ReEntryContext = {
        endContext: (sessionData as { end_context: string } | null)?.end_context ?? null,
        mainFocus: (kickstartData?.content as KickstartContent | null)?.main_focus ?? null,
      }
      setContext(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('useReEntryContext fetch error:', message)
      setError('Could not load context.')
      return null
    } finally {
      setLoading(false)
    }
  }, [user.id])

  return { context, loading, error, fetchContext }
}
