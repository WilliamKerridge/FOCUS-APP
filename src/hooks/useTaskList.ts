import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getToday } from '@/lib/utils'

export interface Task {
  id: string
  title: string
  context: string
  priority: number
  status: string
  waiting_for_person: string | null
  due_date: string | null
  source: string | null
  created_at: string
  completed_at: string | null
}

interface UseTaskListResult {
  openTasks: Task[]
  completedTasks: Task[]
  loading: boolean
  error: string | null
  markDone: (id: string) => Promise<void>
  createCompletedTask: (title: string, context: 'work' | 'home', source?: string) => Promise<void>
  refresh: () => void
}

export function useTaskList(
  user: User | null,
  contexts: string[]
): UseTaskListResult {
  const [openTasks, setOpenTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    if (!user || contexts.length === 0) {
      setOpenTasks([])
      setCompletedTasks([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const today = getToday()

    Promise.all([
      supabase
        .from('tasks')
        .select('id, title, context, priority, status, waiting_for_person, due_date, source, created_at, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .in('context', contexts)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('id, title, context, priority, status, waiting_for_person, due_date, source, created_at, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'done')
        .in('context', contexts)
        .gte('completed_at', `${today}T00:00:00Z`)
        .order('completed_at', { ascending: false }),
    ]).then(([openRes, doneRes]) => {
      if (cancelled) return
      if (openRes.error || doneRes.error) {
        setError('Could not load tasks — try refreshing.')
        setLoading(false)
        return
      }
      setOpenTasks((openRes.data ?? []) as Task[])
      setCompletedTasks((doneRes.data ?? []) as Task[])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [user?.id, fetchCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const markDone = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    setOpenTasks(prev => prev.filter(t => t.id !== id))
    const task = openTasks.find(t => t.id === id) ?? completedTasks.find(t => t.id === id)
    if (task) {
      setCompletedTasks(prev => [{ ...task, status: 'done', completed_at: now }, ...prev])
    }
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: now })
      .eq('id', id)
    if (updateError) {
      console.error('Failed to mark task done:', updateError)
      setFetchCount(c => c + 1)
    }
  }, [openTasks, completedTasks])

  const createCompletedTask = useCallback(async (title: string, context: 'work' | 'home', source?: string) => {
    const now = new Date().toISOString()
    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({ user_id: user!.id, title, context, priority: 0, status: 'done', source: source ?? 'kickstart', completed_at: now })
      .select('id, title, context, priority, status, waiting_for_person, due_date, source, created_at, completed_at')
      .single()
    if (insertError) { console.error('Failed to create completed task:', insertError); return }
    if (data) setCompletedTasks(prev => [data as Task, ...prev])
  }, [user])

  return {
    openTasks,
    completedTasks,
    loading,
    error,
    markDone,
    createCompletedTask,
    refresh: () => setFetchCount(c => c + 1),
  }
}
