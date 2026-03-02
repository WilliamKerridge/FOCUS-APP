import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  user: User
  profile: Profile
  updateProfile: (updates: Partial<Pick<Profile, 'work_days' | 'transition_time'>>) => Promise<{ error: Error | null }>
}

export default function SettingsPage({ user, profile, updateProfile }: Props) {
  const [workDays, setWorkDays] = useState<string[]>(profile.work_days)
  const [transitionTime, setTransitionTime] = useState(profile.transition_time)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced save
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { error } = await updateProfile({ work_days: workDays, transition_time: transitionTime })
      if (error) {
        setSaveError("Couldn't save — try again.")
        // Revert
        setWorkDays(profile.work_days)
        setTransitionTime(profile.transition_time)
      } else {
        setSaveError(null)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [workDays, transitionTime]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDay(day: string) {
    setWorkDays(prev => {
      // Must keep at least one day
      if (prev.includes(day) && prev.length === 1) return prev
      return prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Working days */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Working days</p>
        <p className="text-xs text-muted-foreground">Controls which days the 4pm transition reminder fires.</p>
        <div className="flex gap-2">
          {DAYS.map(day => {
            const selected = workDays.includes(day)
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`flex-1 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {day.slice(0, 1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Transition time */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Transition time</p>
        <p className="text-xs text-muted-foreground">When your end-of-work reminder fires.</p>
        <input
          type="time"
          value={transitionTime}
          onChange={e => setTransitionTime(e.target.value)}
          min="12:00"
          max="20:00"
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">Changes apply from the next working day.</p>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      {/* Account */}
      <div className="space-y-3 pt-4 border-t border-border">
        <p className="text-sm font-medium">Account</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>

        {showSignOutConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Sign out of FOCUS?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-3 rounded-lg bg-secondary border border-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
