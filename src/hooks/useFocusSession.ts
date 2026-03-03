// src/hooks/useFocusSession.ts
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'
import type { FocusSession, SessionType } from '@/types'

interface UseFocusSessionReturn {
  activeSession: FocusSession | null
  abandonedSession: FocusSession | null
  todaySessionCount: number
  elapsedSeconds: number
  loading: boolean
  loadError: string | null
  startSession: (type: SessionType, durationMins: number, topic: string) => Promise<string | null>
  endSession: (endContext: string, exitedEarly: boolean) => Promise<string | null>
  closeAbandoned: (endContext: string) => Promise<string | null>
}

export function useFocusSession(user: User | null): UseFocusSessionReturn {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [abandonedSession, setAbandonedSession] = useState<FocusSession | null>(null)
  const [todaySessionCount, setTodaySessionCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closingRef = useRef(false)

  // Load active session and today's count on mount
  useEffect(() => {
    if (!user) { setLoading(false); return }
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .then(({ data, error }) => {
        if (error) {
          setLoadError('Could not load sessions — try refreshing.')
          setLoading(false)
          return
        }
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
  }, [user?.id])

  // Detect abandoned sessions (no ended_at) on mount
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function checkAbandoned() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .is('ended_at', null)
        .lt('date', today)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled && data) setAbandonedSession(data as FocusSession)
    }
    checkAbandoned()
    return () => { cancelled = true }
  }, [user?.id])

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
    topic: string
  ): Promise<string | null> => {
    if (!user) return 'Not logged in'
    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You are FOCUS. William is starting a focus session.
Session type: ${type}
Topic: ${topic}

Return ONLY valid JSON, no markdown:
{"start_context": "One sentence: what William is doing and the first physical step. Be specific — not 'work on email' but 'open Outlook and reply to [person]'."}

Be direct. No preamble.`

    let startContext = topic // fallback if Claude unavailable
    try {
      const raw = await callClaude([{ role: 'user', content: topic }], systemPrompt)
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned) as { start_context?: unknown }
      if (typeof parsed.start_context === 'string') startContext = parsed.start_context
    } catch (err) {
      console.error('Claude start_context call failed, using raw topic:', err)
    }

    const { data, error } = await supabase
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
    if (error) {
      console.error('Start session error:', error)
      return 'Could not start session — try again.'
    }
    if (data) {
      setActiveSession(data as FocusSession)
      setElapsedSeconds(0)
    }
    return null
  }, [user])

  const endSession = useCallback(async (endContext: string, exitedEarly: boolean): Promise<string | null> => {
    if (!user || !activeSession) return 'No active session'
    const now = new Date().toISOString()
    const actualMins = Math.floor(elapsedSeconds / 60)
    const { error } = await supabase
      .from('focus_sessions')
      .update({
        end_context: endContext || null,
        ended_at: now,
        actual_duration_mins: actualMins,
        exited_early: exitedEarly,
      })
      .eq('id', activeSession.id)
    if (error) {
      console.error('End session error:', error)
      return 'Could not save session — try again.'
    }
    setActiveSession(null)
    setElapsedSeconds(0)
    setTodaySessionCount(c => c + 1)
    return null
  }, [user, activeSession, elapsedSeconds])

  const closeAbandoned = useCallback(async (endContext: string): Promise<string | null> => {
    if (!abandonedSession || closingRef.current) return null
    closingRef.current = true
    const now = new Date().toISOString()
    const actualMins = Math.round(
      (new Date(now).getTime() - new Date(abandonedSession.started_at).getTime()) / 60000
    )
    const { error } = await supabase
      .from('focus_sessions')
      .update({
        ended_at: now,
        actual_duration_mins: actualMins,
        end_context: endContext || null,
        exited_early: true,
      })
      .eq('id', abandonedSession.id)
    if (error) {
      console.error('closeAbandoned error:', error)
      closingRef.current = false
      return 'Could not save — try again.'
    }
    setAbandonedSession(null)
    closingRef.current = false
    return null
  }, [abandonedSession])

  return {
    activeSession,
    abandonedSession,
    todaySessionCount,
    elapsedSeconds,
    loading,
    loadError,
    startSession,
    endSession,
    closeAbandoned,
  }
}
