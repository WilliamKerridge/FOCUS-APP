// src/components/desktop/EmailDropOverlay.tsx
import type { User } from '@supabase/supabase-js'
import EmailDropZone from '@/components/email/EmailDropZone'

interface Props {
  user: User
  onClose: () => void
}

export default function EmailDropOverlay({ user, onClose }: Props) {
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
      <div className="max-w-2xl">
        <EmailDropZone user={user} onDone={onClose} />
      </div>
    </div>
  )
}
