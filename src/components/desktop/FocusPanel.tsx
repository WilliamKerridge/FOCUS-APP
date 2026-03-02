// src/components/desktop/FocusPanel.tsx
import { useState } from 'react'
import { Flame, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { SessionType } from '@/types'
import { useFocusSession } from '@/hooks/useFocusSession'
import { useStreak } from '@/hooks/useStreak'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'

interface Props {
  user: User
  activeTask: string | null
}

const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'writing', label: 'Writing' },
  { key: 'migration', label: 'Migration' },
]

const DURATIONS = [25, 45, 60, 90]
const MAX_DOTS = 4

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function FocusPanel({ user, activeTask }: Props) {
  const streak = useStreak(user, 'kickstart')
  const { activeSession, todaySessionCount, elapsedSeconds, loading, startSession, endSession } =
    useFocusSession(user)

  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [duration, setDuration] = useState(25)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [starting, setStarting] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const plannedSeconds = (activeSession?.planned_duration_mins ?? duration) * 60
  const isEarlyExit = elapsedSeconds < plannedSeconds

  async function handleStart() {
    if (!activeTask) return
    setStarting(true)
    setSessionError(null)
    const error = await startSession(sessionType, duration, activeTask)
    if (error) setSessionError(error)
    setStarting(false)
  }

  function handleStop() {
    setShowCloseModal(true)
  }

  async function handleClose(endContext: string) {
    const error = await endSession(endContext, isEarlyExit)
    if (error) setSessionError(error)
    setShowCloseModal(false)
  }

  if (loading) {
    return <div className="animate-pulse h-64 rounded-xl bg-secondary" />
  }

  return (
    <div className="space-y-5">
      {/* Streak */}
      {streak && streak.current_streak >= 2 && (
        <div className="flex items-center gap-1.5">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="font-semibold">{streak.current_streak}</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
      )}

      {/* Active task */}
      <div className="px-4 py-4 rounded-lg bg-secondary border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          Now working on
        </p>
        {activeTask ? (
          <p className="font-semibold leading-snug">{activeTask}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Select a task from the plan on the left
          </p>
        )}
      </div>

      {!activeSession && (
        <>
          {/* Session type */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Session type
            </p>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {SESSION_TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSessionType(key)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    sessionType === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Duration
            </p>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                    duration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Error */}
      {sessionError && (
        <p className="text-sm text-destructive">{sessionError}</p>
      )}

      {/* Timer */}
      <div className="px-4 py-6 rounded-xl bg-secondary border border-border text-center space-y-4">
        <p className="text-4xl font-bold tabular-nums tracking-tight">
          {formatTime(elapsedSeconds)}
        </p>

        {activeSession ? (
          <button
            onClick={handleStop}
            className="w-full py-3 rounded-lg border border-border text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground motion-safe:active:scale-95 motion-safe:transition-transform"
          >
            Finish session
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!activeTask || starting}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform flex items-center justify-center gap-2"
          >
            {starting && <Loader2 className="h-4 w-4 animate-spin" />}
            {starting ? 'Starting…' : 'Start'}
          </button>
        )}

        {/* Session dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: MAX_DOTS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < todaySessionCount ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            {todaySessionCount} session{todaySessionCount !== 1 ? 's' : ''} today
          </span>
        </div>
      </div>

      {showCloseModal && (
        <SessionCloseModal
          isEarlyExit={isEarlyExit}
          remainingMins={Math.ceil((plannedSeconds - elapsedSeconds) / 60)}
          onKeepGoing={() => setShowCloseModal(false)}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
