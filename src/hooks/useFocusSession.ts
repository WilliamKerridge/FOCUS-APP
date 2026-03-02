// src/hooks/useFocusSession.ts
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { FocusSession, SessionType } from '@/types'

interface UseFocusSessionReturn {
  activeSession: FocusSession | null
  todaySessionCount: number
  elapsedSeconds: number
  loading: boolean
  startSession: (type: SessionType, durationMins: number, startContext: string) => Promise<void>
  endSession: (endContext: string, exitedEarly: boolean) => Promise<void>
}

export function useFocusSession(user: User | null): UseFocusSessionReturn {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [todaySessionCount, setTodaySessionCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load active session and today's count on mount
  useEffect(() => {
    if (!user) { setLoading(false); return }
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .then(({ data }) => {
        const sessions = (data ?? []) as FocusSession[]
        const open = sessions.find(s => !s.ended_at) ?? null
        setActiveSession(open)
        setTodaySessionCount(sessions.filter(s => s.ended_at).length)
        if (open) {
          const started = new Date(open.started_at).getTime()
          setElapsedSeconds(Math.floor((Date.now() - started) / 1000))
        }
        setLoading(false)
      })
  }, [user])

  // Tick timer when session is active
  useEffect(() => {
    if (activeSession && !activeSession.ended_at) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeSession])

  const startSession = useCallback(async (
    type: SessionType,
    durationMins: number,
    startContext: string
  ) => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        type,
        planned_duration_mins: durationMins,
        start_context: startContext,
        date: today,
      })
      .select()
      .single()
    if (data) {
      setActiveSession(data as FocusSession)
      setElapsedSeconds(0)
    }
  }, [user])

  const endSession = useCallback(async (endContext: string, exitedEarly: boolean) => {
    if (!user || !activeSession) return
    const now = new Date().toISOString()
    const actualMins = Math.floor(elapsedSeconds / 60)
    await supabase
      .from('focus_sessions')
      .update({
        end_context: endContext || null,
        ended_at: now,
        actual_duration_mins: actualMins,
        exited_early: exitedEarly,
      })
      .eq('id', activeSession.id)
    setActiveSession(null)
    setElapsedSeconds(0)
    setTodaySessionCount(c => c + 1)
  }, [user, activeSession, elapsedSeconds])

  return { activeSession, todaySessionCount, elapsedSeconds, loading, startSession, endSession }
}
