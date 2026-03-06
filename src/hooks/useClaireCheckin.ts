// src/hooks/useClaireCheckin.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { ClaireCheckin } from '@/types'

function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function buildClaireContext(recent: ClaireCheckin[]): string | null {
  if (recent.length === 0) return null

  const sorted = [...recent].sort((a, b) => b.date.localeCompare(a.date))

  // 5+ consecutive yes
  const firstNonYes = sorted.findIndex(c => c.quality_time !== 'yes')
  if (firstNonYes === -1 && sorted.length >= 5) {
    return `William has had ${sorted.length} consecutive good evenings with Claire this week.`
  }

  // 3+ consecutive partial (all partial, no no or yes)
  const firstNonPartial = sorted.findIndex(c => c.quality_time !== 'partial')
  if (firstNonPartial === -1 && sorted.length >= 3) {
    const blockers = sorted.filter(c => c.blocker).map(c => c.blocker).join(', ')
    return `William has had 3+ partially-present evenings with Claire. Blockers: ${blockers || 'none noted'}.`
  }

  // 3+ consecutive no or partial (not yes)
  const firstYes = sorted.findIndex(c => c.quality_time === 'yes')
  const streak = firstYes === -1 ? sorted.length : firstYes
  if (streak >= 3) {
    return `William has had 3+ evenings without quality time with Claire recently.`
  }

  return null
}

async function fetchTodayCheckin(userId: string, date: string): Promise<ClaireCheckin | null> {
  try {
    const { data } = await supabase
      .from('claire_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()
    return (data as ClaireCheckin) ?? null
  } catch {
    return null
  }
}

async function fetchRecentCheckins(userId: string): Promise<ClaireCheckin[]> {
  try {
    const { data } = await supabase
      .from('claire_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7)
    return (data as ClaireCheckin[]) ?? []
  } catch {
    return []
  }
}

export function useClaireCheckin(user: User) {
  const [todayCheckin, setTodayCheckin] = useState<ClaireCheckin | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<ClaireCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const yday = yesterday()

    Promise.all([
      fetchTodayCheckin(user.id, yday),
      fetchRecentCheckins(user.id),
    ]).then(([today, recent]) => {
      if (cancelled) return
      setTodayCheckin(today)
      setRecentCheckins(recent)
      setLoading(false)
    }).catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [user.id])

  const saveCheckin = useCallback(async (
    date: string,
    quality_time: 'yes' | 'no' | 'partial',
    blocker?: string | null
  ): Promise<string | null> => {
    const row = { user_id: user.id, date, quality_time, blocker: blocker ?? null }
    const { data, error: upsertError } = await supabase
      .from('claire_checkins')
      .upsert(row, { onConflict: 'user_id,date' })
      .select('*')
      .single()
    if (!upsertError) {
      setTodayCheckin(data as ClaireCheckin)
    }
    return upsertError?.message ?? null
  }, [user.id])

  return {
    todayCheckin,
    recentCheckins,
    loading,
    error,
    claireContext: buildClaireContext(recentCheckins),
    saveCheckin,
  }
}
