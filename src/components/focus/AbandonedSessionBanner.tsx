import { useState } from 'react'
import type { FocusSession } from '@/types'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'

interface Props {
  session: FocusSession
  onClose: (endContext: string) => Promise<string | null>
}

export default function AbandonedSessionBanner({ session, onClose }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startedAt = new Date(session.started_at)
  const timeStr = startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  async function handleClose(endContext: string) {
    const err = await onClose(endContext)
    if (err) {
      setError(err)
    } else {
      setShowModal(false)
    }
  }

  return (
    <>
      <div className="px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm flex items-start justify-between gap-3 mb-4">
        <span>You had an open session from {timeStr}. Mark it complete?</span>
        <button
          onClick={() => setShowModal(true)}
          className="text-yellow-200 font-medium hover:text-white shrink-0 cursor-pointer underline"
        >
          Close it
        </button>
      </div>
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      {showModal && (
        <SessionCloseModal
          isEarlyExit={true}
          remainingMins={0}
          autoTriggered={false}
          onKeepGoing={() => setShowModal(false)}
          onClose={handleClose}
        />
      )}
    </>
  )
}
