// src/hooks/useEmailInbox.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { EmailInboxItem } from '@/types'

export function useEmailInbox(user: User | null) {
  const [items, setItems] = useState<EmailInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    let cancelled = false

    supabase
      .from('email_inbox')
      .select('*')
      .eq('user_id', user.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load email inbox:', error)
          setLoadError('Failed to load email inbox.')
        }
        setItems((data ?? []) as EmailInboxItem[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  const markReviewed = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase
      .from('email_inbox')
      .update({ reviewed: true })
      .eq('id', id)
    if (error) {
      console.error('Failed to mark reviewed:', error)
      return 'Could not mark as reviewed — try again.'
    }
    setItems(prev => prev.filter(item => item.id !== id))
    return null
  }, [])

  return { items, loading, loadError, markReviewed }
}
