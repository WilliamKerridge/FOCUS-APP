// src/hooks/usePromises.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { UserPromise } from '@/types'

export function usePromises(user: User | null, context: 'work' | 'home') {
  const [promises, setPromises] = useState<UserPromise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    supabase
      .from('promises')
      .select('*')
      .eq('user_id', user.id)
      .eq('context', context)
      .eq('status', 'active')
      .order('due_date', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError('Could not load promises.')
        setPromises((data ?? []) as UserPromise[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id, context])

  const addPromise = useCallback(async (
    title: string,
    madeTo: string | null,
    dueDate: string
  ): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('promises')
      .insert({ user_id: user!.id, title, made_to: madeTo, context, due_date: dueDate, status: 'active' })
      .select('*')
      .single()
    if (err) return "Couldn't save — try again."
    setPromises(prev =>
      [...prev, data as UserPromise].sort((a, b) => a.due_date.localeCompare(b.due_date))
    )
    return null
  }, [user, context])

  const completePromise = useCallback(async (id: string): Promise<string | null> => {
    setPromises(prev => prev.filter(p => p.id !== id))
    const { error: err } = await supabase
      .from('promises')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
    if (err) return "Couldn't complete — try again."
    return null
  }, [])

  const archivePromise = useCallback(async (id: string): Promise<string | null> => {
    setPromises(prev => prev.filter(p => p.id !== id))
    const { error: err } = await supabase
      .from('promises')
      .update({ status: 'archived' })
      .eq('id', id)
    if (err) return "Couldn't archive — try again."
    return null
  }, [])

  const updatePromise = useCallback(async (
    id: string,
    changes: { title?: string; due_date?: string; made_to?: string | null }
  ): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('promises')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single()
    if (err) return err.message
    if (data) {
      setPromises(prev =>
        prev.map(p => p.id === id ? data as UserPromise : p)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
      )
    }
    return null
  }, [])

  return { promises, loading, error, addPromise, completePromise, archivePromise, updatePromise }
}
