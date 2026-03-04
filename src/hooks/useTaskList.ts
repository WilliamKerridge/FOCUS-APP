import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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
}

interface UseTaskListResult {
  tasks: Task[]
  loading: boolean
  error: string | null
  markDone: (id: string) => Promise<void>
  refresh: () => void
}

export function useTaskList(
  user: User | null,
  contexts: string[]
): UseTaskListResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    if (!user || contexts.length === 0) {
      setTasks([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('tasks')
      .select('id, title, context, priority, status, waiting_for_person, due_date, source, created_at')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .in('context', contexts)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error: dbError }) => {
        if (cancelled) return
        if (dbError) {
          setError('Could not load tasks — try refreshing.')
          setLoading(false)
          return
        }
        setTasks((data ?? []) as Task[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id, fetchCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const markDone = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id)
    if (updateError) {
      console.error('Failed to mark task done:', updateError)
      setFetchCount(c => c + 1) // re-fetch to restore if update failed
    }
  }, [])

  return { tasks, loading, error, markDone, refresh: () => setFetchCount(c => c + 1) }
}
