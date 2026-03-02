import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, Mode } from '@/types'
import type { User } from '@supabase/supabase-js'

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as Profile | null)
        setLoading(false)
      })
  }, [user])

  const updateMode = useCallback(async (mode: Mode) => {
    if (!user) return
    setProfile(prev => prev ? { ...prev, current_mode: mode, mode_changed_at: new Date().toISOString() } : prev)
    await supabase
      .from('profiles')
      .update({ current_mode: mode, mode_changed_at: new Date().toISOString() })
      .eq('id', user.id)
  }, [user])

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'work_days' | 'transition_time' | 'personal_emails'>>) => {
    if (!user) return { error: new Error('Not logged in') }
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : prev)
    }
    return { error }
  }, [user])

  return { profile, loading, updateMode, updateProfile }
}
