import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Task } from './useTaskList'

export interface DayGroup {
  label: string
  date: string
  tasks: Task[]
}

function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function useWeeklyTasks(user: User | null): {
  days: DayGroup[]
  totalCount: number
  loading: boolean
  error: string | null
} {
  const [days, setDays] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setDays([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const weekStart = getWeekStart()
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    supabase
      .from('tasks')
      .select('id, title, context, priority, status, waiting_for_person, due_date, source, created_at, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', today.toISOString())
      .order('completed_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError('Could not load weekly tasks.')
          setLoading(false)
          return
        }

        const tasks = (data ?? []) as Task[]

        // Build day slots Mon through today
        const dayMap = new Map<string, Task[]>()
        const current = new Date(weekStart)
        const todayStr = toDateStr(new Date())
        while (toDateStr(current) <= todayStr) {
          dayMap.set(toDateStr(current), [])
          current.setDate(current.getDate() + 1)
        }

        // Group tasks by date
        for (const task of tasks) {
          if (!task.completed_at) continue
          const dateStr = task.completed_at.split('T')[0]
          if (dayMap.has(dateStr)) {
            dayMap.get(dateStr)!.push(task)
          }
        }

        // Build DayGroup array, only days with tasks, most recent first
        const result: DayGroup[] = []
        for (const [dateStr, dayTasks] of dayMap.entries()) {
          if (dayTasks.length > 0) {
            result.push({ label: formatDayLabel(dateStr), date: dateStr, tasks: dayTasks })
          }
        }
        result.reverse()

        setDays(result)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  const totalCount = days.reduce((sum, d) => sum + d.tasks.length, 0)

  return { days, totalCount, loading, error }
}
