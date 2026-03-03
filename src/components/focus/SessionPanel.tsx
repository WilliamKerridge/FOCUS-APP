// src/components/focus/SessionPanel.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { SessionType } from '@/types'
import { useFocusSession } from '@/hooks/useFocusSession'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'

interface Props {
  user: User
  initialTask?: string
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

export default function SessionPanel({ user, initialTask }: Props) {
  const {
    activeSession,
    todaySessionCount,
    elapsedSeconds,
    loading,
    loadError,
    startSession,
    endSession,
  } = useFocusSession(user)

  const [topic, setTopic] = useState(initialTask ?? '')
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [duration, setDuration] = useState(25)
  const [useCustom, setUseCustom] = useState(false)
  const [customDuration, setCustomDuration] = useState('25')
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [starting, setStarting] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const plannedSeconds = (activeSession?.planned_duration_mins ?? duration) * 60
  const isEarlyExit = elapsedSeconds < plannedSeconds

  // Sync initialTask into topic when no active session
  useEffect(() => {
    if (!activeSession && initialTask !== undefined) {
      setTopic(initialTask)
    }
  }, [initialTask, activeSession])

  // Auto-completion: open close modal when elapsed reaches planned time
  useEffect(() => {
    if (activeSession && elapsedSeconds >= plannedSeconds && !showCloseModal) {
      setAutoTriggered(true)
      setShowCloseModal(true)
    }
  }, [elapsedSeconds, activeSession, plannedSeconds, showCloseModal])

  function getEffectiveDuration(): number {
    if (useCustom) {
      const val = parseInt(customDuration, 10)
      if (isNaN(val) || val < 25) return 25
      if (val > 120) return 120
      return val
    }
    return duration
  }

  async function handleStart() {
    const effectiveDuration = getEffectiveDuration()
    if (!topic.trim()) return
    setStarting(true)
    setSessionError(null)
    const error = await startSession(sessionType, effectiveDuration, topic.trim())
    if (error) setSessionError(error)
    setStarting(false)
  }

  function handleStop() {
    setShowCloseModal(true)
  }

  async function handleClose(endContext: string) {
    const error = await endSession(endContext, isEarlyExit && !autoTriggered)
    if (error) setSessionError(error)
    setShowCloseModal(false)
    setAutoTriggered(false)
  }

  const customDurationNum = parseInt(customDuration, 10)
  const showCapNote = useCustom && !isNaN(customDurationNum) && customDurationNum > 120

  if (loading) {
    return <div className="animate-pulse h-64 rounded-xl bg-secondary" />
  }

  return (
    <div className="space-y-5">
      {/* Topic input — hidden when session active */}
      {!activeSession && (
        <div>
          <label
            htmlFor="session-topic"
            className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block"
          >
            What are you focusing on?
          </label>
          <input
            id="session-topic"
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Describe your focus…"
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
      )}

      {/* Active session topic card — shown when session active */}
      {activeSession && (
        <div className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary uppercase tracking-wider font-medium mb-1">Focusing on</p>
          <p className="font-semibold leading-snug text-sm">{activeSession.start_context}</p>
        </div>
      )}

      {!activeSession && (
        <>
          {/* Session type toggle */}
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

          {/* Duration selector */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Duration
            </p>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setUseCustom(false) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                    !useCustom && duration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {d}m
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  useCustom
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom duration input */}
            {useCustom && (
              <div className="mt-2 space-y-1">
                <input
                  type="number"
                  min={25}
                  max={120}
                  value={customDuration}
                  onChange={e => setCustomDuration(e.target.value)}
                  placeholder="Minutes (25–120)"
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                {showCapNote && (
                  <p className="text-xs text-muted-foreground">
                    Capped at 2 hours — plan a break after.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Errors */}
      {loadError && (
        <p className="text-sm text-destructive">{loadError}</p>
      )}
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
            disabled={!topic.trim() || starting}
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
          autoTriggered={autoTriggered}
          onKeepGoing={() => { setShowCloseModal(false); setAutoTriggered(false) }}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
