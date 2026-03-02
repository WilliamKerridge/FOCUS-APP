import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { checkHandoffExists } from '@/hooks/useHandoff'
import AuthScreen from '@/components/auth/AuthScreen'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import ModeSelector from '@/components/modes/ModeSelector'
import WorkMode from '@/components/modes/WorkMode'
import TransitionMode from '@/components/modes/TransitionMode'
import HomeMode from '@/components/modes/HomeMode'
import SettingsPage from '@/components/settings/SettingsPage'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import type { Mode } from '@/types'

type AppState = 'loading' | 'auth' | 'onboarding' | 'app'

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, updateMode, updateProfile } = useProfile(user)
  const [appState, setAppState] = useState<AppState>('loading')
  const [showSettings, setShowSettings] = useState(false)

  // Nudge when switching Work → Transition without a handoff
  const [handoffNudge, setHandoffNudge] = useState(false)

  useEffect(() => {
    if (authLoading || profileLoading) return

    if (!user) {
      setAppState('auth')
      return
    }

    if (!profile || !profile.onboarding_complete) {
      setAppState('onboarding')
      return
    }

    setAppState('app')
  }, [user, authLoading, profile, profileLoading])

  async function handleModeChange(newMode: Mode) {
    if (!user || !profile) return

    // Nudge on Work → Transition if no end-of-day handoff today
    if (profile.current_mode === 'work' && newMode === 'transition') {
      const today = new Date().toISOString().split('T')[0]
      const exists = await checkHandoffExists(user.id, 'end_of_day', today)
      if (!exists) {
        setHandoffNudge(true)
        // Not a blocker — user can dismiss and switch anyway
      }
    } else {
      setHandoffNudge(false)
    }

    await updateMode(newMode)
  }

  function handleSwitchToTransition() {
    handleModeChange('transition')
  }

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    )
  }

  if (appState === 'auth') return <AuthScreen />

  if (appState === 'onboarding' && user) {
    return (
      <OnboardingFlow
        user={user}
        onComplete={() => setAppState('app')}
      />
    )
  }

  if (appState === 'app' && user && profile) {
    const currentMode = profile.current_mode

    if (showSettings) {
      return (
        <div className="min-h-screen">
          <div className="max-w-md mx-auto px-4 pt-4 pb-8">
            <button
              onClick={() => setShowSettings(false)}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center min-h-[44px] cursor-pointer"
            >
              ← Back
            </button>
            <SettingsPage user={user} profile={profile} updateProfile={updateProfile} />
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen">
        <div className="max-w-md mx-auto px-4 pb-8 flex flex-col min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between py-4">
            <h1 className="text-lg font-bold tracking-wider">FOCUS</h1>
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
            >
              Settings
            </button>
          </div>

          {/* Mode selector */}
          <ModeSelector current={currentMode} onChange={handleModeChange} />

          {/* Handoff nudge (dismissible) */}
          {handoffNudge && (
            <div className="mt-3 px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-sm flex items-start justify-between gap-3">
              <span>You haven't filed a handoff yet — do that before switching off.</span>
              <button
                onClick={() => setHandoffNudge(false)}
                aria-label="Dismiss"
                className="text-yellow-400 hover:text-yellow-200 shrink-0 text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Mode content */}
          <div className="flex-1 mt-6">
            <ErrorBoundary>
              {currentMode === 'work' && (
                <WorkMode user={user} onSwitchToTransition={handleSwitchToTransition} />
              )}
              {currentMode === 'transition' && (
                <TransitionMode user={user} />
              )}
              {currentMode === 'home' && (
                <HomeMode user={user} />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    )
  }

  return null
}
