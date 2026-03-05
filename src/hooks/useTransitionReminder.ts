// src/hooks/useTransitionReminder.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function useTransitionReminder(user: User | null) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(isSupported)
    if (!isSupported) { setLoading(false); return }
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(sub !== null)
        setLoading(false)
      })
    })
  }, [user?.id])

  const subscribe = useCallback(async (): Promise<string | null> => {
    if (!user) return 'Not authenticated'
    try {
      const res = await fetch('/api/vapid-public-key')
      const { publicKey } = await res.json() as { publicKey: string }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = sub.toJSON()
      const keys = json.keys as Record<string, string>
      const { error } = await supabase.from('push_subscriptions').upsert(
        { user_id: user.id, endpoint: json.endpoint!, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'user_id,endpoint' }
      )
      if (error) return "Couldn't save subscription"
      setSubscribed(true)
      setPermission('granted')
      return null
    } catch {
      return 'Could not subscribe to notifications'
    }
  }, [user])

  const unsubscribe = useCallback(async (): Promise<string | null> => {
    if (!user) return 'Not authenticated'
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', user.id).eq('endpoint', sub.endpoint)
      }
      setSubscribed(false)
      return null
    } catch {
      return 'Could not unsubscribe'
    }
  }, [user])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
