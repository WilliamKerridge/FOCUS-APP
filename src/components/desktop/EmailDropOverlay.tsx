// src/components/desktop/EmailDropOverlay.tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import EmailDropZone from '@/components/email/EmailDropZone'
import EmailInboxReview from '@/components/email/EmailInboxReview'
import { useEmailInbox } from '@/hooks/useEmailInbox'

interface Props {
  user: User
  onClose: () => void
}

export default function EmailDropOverlay({ user, onClose }: Props) {
  const { items, loading, markReviewed, saveInboxItems } = useEmailInbox(user)
  const [view, setView] = useState<'inbox' | 'drop' | null>(null)

  // Derived: once loading is done, decide initial view
  const resolvedView = view ?? (loading ? null : items.length > 0 ? 'inbox' : 'drop')

  if (loading || resolvedView === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
          >
            ← Back to Work
          </button>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  async function handleSkip(id: string) {
    const isLast = items.length === 1
    await markReviewed(id)
    if (isLast) setView('drop')
  }

  if (resolvedView === 'inbox' && items.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
          >
            ← Back to Work
          </button>
        </div>
        <h2 className="text-lg font-bold">Forwarded emails — {items.length} to review</h2>
        <div className="max-w-2xl space-y-4">
          <EmailInboxReview
            user={user}
            item={items[0]}
            onSave={saveInboxItems}
            onDone={() => {
              if (items.length === 1) setView('drop')
            }}
          />
          <button
            onClick={() => handleSkip(items[0].id)}
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Skip this email
          </button>
          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setView('drop')}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              Paste an email manually →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back to Work
        </button>
      </div>
      <h2 className="text-lg font-bold">Process an email</h2>
      <div className="max-w-2xl space-y-4">
        {items.length > 0 && (
          <button
            onClick={() => setView('inbox')}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            ← Back to inbox ({items.length})
          </button>
        )}
        <EmailDropZone user={user} onDone={onClose} />
      </div>
    </div>
  )
}
