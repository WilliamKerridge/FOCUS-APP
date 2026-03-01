import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import AuthScreen from '@/components/auth/AuthScreen'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import ModeSelector from '@/components/modes/ModeSelector'
import WorkMode from '@/components/modes/WorkMode'
import TransitionMode from '@/components/modes/TransitionMode'
import HomeMode from '@/components/modes/HomeMode'
import type { Mode } from '@/types'

type AppState = 'loading' | 'auth' | 'onboarding' | 'app'

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<Mode>('work')

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSession(session: Session | null) {
    if (!session) {
      setUser(null)
      setAppState('auth')
      return
    }

    setUser(session.user)

    // Check onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!profile || !profile.onboarding_complete) {
      setAppState('onboarding')
    } else {
      setAppState('app')
    }
  }

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    )
  }

  if (appState === 'auth') {
    return <AuthScreen />
  }

  if (appState === 'onboarding' && user) {
    return (
      <OnboardingFlow
        user={user}
        onComplete={() => setAppState('app')}
      />
    )
  }

  if (appState === 'app' && user) {
    return (
      <div className="min-h-screen">
        <div className="max-w-md mx-auto px-4 pt-safe pb-8 min-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between py-4">
            <h1 className="text-lg font-bold tracking-wider">FOCUS</h1>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>

          {/* Mode selector */}
          <ModeSelector current={mode} onChange={setMode} />

          {/* Mode content */}
          <div className="flex-1 mt-6">
            {mode === 'work' && <WorkMode user={user} />}
            {mode === 'transition' && <TransitionMode user={user} />}
            {mode === 'home' && <HomeMode user={user} />}
          </div>
        </div>
      </div>
    )
  }

  return null
}
