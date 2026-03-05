// src/components/common/PushPermissionBanner.tsx
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useTransitionReminder } from '@/hooks/useTransitionReminder'

const DISMISSED_KEY = 'push-banner-dismissed'

interface Props {
  user: User
}

export default function PushPermissionBanner({ user }: Props) {
  const { supported, permission, subscribed, loading, subscribe } = useTransitionReminder(user)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')
  const [subscribing, setSubscribing] = useState(false)

  if (loading || !supported || permission !== 'default' || subscribed || dismissed) return null

  async function handleAllow() {
    setSubscribing(true)
    await subscribe()
    setSubscribing(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
      <p className="text-sm">Get a nudge at transition time each day?</p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleAllow}
          disabled={subscribing}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          {subscribing ? 'Setting up…' : 'Allow'}
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
