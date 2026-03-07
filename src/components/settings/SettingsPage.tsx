import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  user: User
  profile: Profile
  updateProfile: (updates: Partial<Pick<Profile, 'work_days' | 'transition_time' | 'personal_emails'>>) => Promise<{ error: Error | null }>
}

export default function SettingsPage({ user, profile, updateProfile }: Props) {
  const [workDays, setWorkDays] = useState<string[]>(profile.work_days)
  const [transitionTime, setTransitionTime] = useState(profile.transition_time)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [personalEmailsDraft, setPersonalEmailsDraft] = useState(
    (profile.personal_emails ?? []).join('\n')
  )
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [icalToken, setIcalToken] = useState(profile.ical_token)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const icalUrl = `https://focus-app-sandy.vercel.app/api/ical?token=${icalToken}`

  async function handleCopy() {
    await navigator.clipboard.writeText(icalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    const newToken = crypto.randomUUID()
    await supabase.from('profiles').update({ ical_token: newToken }).eq('id', user.id)
    setIcalToken(newToken)
    setRegenerating(false)
  }

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

      {/* Email forwarding */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div>
          <p className="text-sm font-semibold">Email forwarding</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forward or BCC emails to this address — FOCUS will extract the actions automatically.
          </p>
        </div>

        <div className="px-4 py-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Your FOCUS address</p>
          <p className="text-sm font-mono select-all">focus@zenmie.resend.app</p>
          <p className="text-xs text-muted-foreground mt-2">
            Emails from your personal addresses below are saved as Home tasks. Everything else is Work.
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            Personal email addresses (one per line)
          </label>
          <textarea
            value={personalEmailsDraft}
            onChange={e => setPersonalEmailsDraft(e.target.value)}
            onBlur={() => {
              const emails = personalEmailsDraft.split('\n').map(s => s.trim()).filter(Boolean)
              void updateProfile({ personal_emails: emails })
            }}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm font-mono"
            placeholder="will1kerridge@gmail.com"
          />
        </div>
      </div>

      {/* Calendar feed */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold">Calendar feed</h3>
        <p className="text-xs text-muted-foreground">Subscribe to this URL in Apple Calendar, Google Calendar, or Outlook to see your tasks and promises with due dates as all-day events.</p>
        <div className="flex gap-2">
          <input readOnly value={icalUrl}
            className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-xs text-muted-foreground focus:outline-none" />
          <button onClick={handleCopy}
            className="px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-medium cursor-pointer whitespace-nowrap">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button onClick={handleRegenerate} disabled={regenerating}
          className="text-xs text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-40">
          {regenerating ? 'Regenerating…' : 'Regenerate (revokes current link)'}
        </button>
      </div>

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
