// src/components/focus/SessionPanel.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { SessionType } from '@/types'
import { useFocusSession } from '@/hooks/useFocusSession'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import SessionCloseModal from '@/components/desktop/SessionCloseModal'
import { formatTime } from '@/lib/utils'

interface Props {
  user: User
  initialTask?: string
  linkedTaskId?: string
  onLinkedTaskDone?: (id: string) => void
  onSessionDone?: (title: string) => void
}

const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'writing', label: 'Writing' },
  { key: 'migration', label: 'Migration' },
]

const DURATIONS = [25, 45, 60, 90]
const MAX_DOTS = 4

export default function SessionPanel({ user, initialTask, linkedTaskId, onLinkedTaskDone, onSessionDone }: Props) {
  const {
    activeSession,
    todaySessionCount,
    elapsedSeconds,
    loading,
    loadError,
    startSession,
    endSession,
  } = useFocusSession(user)

  const { isMobile } = useBreakpoint()

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

  const parsedCustom = parseInt(customDuration, 10)
  const effectiveCustomDuration = isNaN(parsedCustom) || parsedCustom < 25 ? 25 : Math.min(parsedCustom, 120)
  const effectiveDuration = useCustom ? effectiveCustomDuration : duration
  const showCapNote = useCustom && !isNaN(parsedCustom) && parsedCustom > 120

  async function handleStart() {
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
    const sessionTitle = activeSession?.start_context
    const error = await endSession(endContext, isEarlyExit && !autoTriggered)
    if (error) {
      setSessionError(error)
    } else if (linkedTaskId) {
      onLinkedTaskDone?.(linkedTaskId)
    } else if (sessionTitle) {
      onSessionDone?.(sessionTitle)
    }
    setShowCloseModal(false)
    setAutoTriggered(false)
  }

  if (loading) {
    return <div className="animate-pulse h-64 rounded-xl bg-secondary" />
  }

  // Mobile immersive full-screen view when session is active
  if (activeSession && isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          {/* Session type chip */}
          <div className="flex items-center justify-center pt-16 pb-6">
            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold tracking-[0.8px] uppercase">
              {activeSession.type}
            </span>
          </div>

          {/* Task name */}
          <div className="px-8 text-center mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Focusing on
            </p>
            <p className="text-base font-medium leading-snug line-clamp-3">
              {activeSession.start_context}
            </p>
          </div>

          {/* Timer with radial glow */}
          <div className="relative flex items-center justify-center flex-1">
            <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <p className="relative font-fraunces text-7xl font-semibold tabular-nums tracking-tight">
              {formatTime(elapsedSeconds)}
            </p>
          </div>

          {/* Session dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: MAX_DOTS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${i < todaySessionCount ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {todaySessionCount} session{todaySessionCount !== 1 ? 's' : ''} today
            </span>
          </div>

          {/* Finish button */}
          <div className="px-6 pb-12">
            <button
              onClick={handleStop}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base cursor-pointer active:scale-[0.98] transition-transform"
            >
              Finish session
            </button>
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
      </>
    )
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
      <div className={`relative overflow-hidden px-4 py-6 rounded-2xl text-center space-y-4 ${
        activeSession
          ? 'bg-secondary border border-primary/20 shadow-[0_8px_24px_rgba(63,169,245,0.08)]'
          : 'bg-secondary border border-border'
      }`}>
        {/* Radial glow — desktop active only */}
        {activeSession && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
          </div>
        )}

        {/* Session type chip — desktop active only */}
        {activeSession && (
          <div className="relative flex justify-center">
            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold tracking-[0.8px] uppercase">
              {activeSession.type}
            </span>
          </div>
        )}

        <p className={`relative tabular-nums tracking-tight ${
          activeSession
            ? 'font-fraunces text-5xl font-semibold'
            : 'text-4xl font-bold'
        }`}>
          {formatTime(elapsedSeconds)}
        </p>

        {activeSession ? (
          <button
            onClick={handleStop}
            className="relative w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer active:scale-[0.98] transition-transform"
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
        <div className="relative flex items-center justify-center gap-2">
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
