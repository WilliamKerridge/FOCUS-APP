import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { callClaude } from '@/lib/claude'
import type { User } from '@supabase/supabase-js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]

interface Props {
  user: User
  onComplete: () => void
}

export default function OnboardingFlow({ user, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [transitionTime, setTransitionTime] = useState('16:00')
  const [promise, setPromise] = useState('')
  const [claudeMessage, setClaudeMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleDay(day: number) {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  async function handleDone() {
    setLoading(true)
    try {
      // Get Claude's message for today
      const today = new Date().toLocaleDateString('en-GB', { weekday: 'long' })
      const time = transitionTime
      const msg = await callClaude(
        [{ role: 'user', content: `Today is ${today}. My transition time is ${time}. Give me one direct sentence about what ${time} today means for me.` }]
      )
      setClaudeMessage(msg)

      // Save profile
      await supabase.from('profiles').upsert({
        id: user.id,
        work_days: workDays,
        transition_time: transitionTime,
        onboarding_complete: true,
      })

      // Save first promise if provided
      if (promise.trim()) {
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: promise.trim(),
          context: 'home',
          source: 'onboarding',
        })
      }

      setStep(4)
    } catch (err) {
      console.error(err)
      // Still complete onboarding even if Claude fails
      await supabase.from('profiles').upsert({
        id: user.id,
        work_days: workDays,
        transition_time: transitionTime,
        onboarding_complete: true,
      })
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  if (step === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <h2 className="text-2xl font-bold">You're set.</h2>
          {claudeMessage && (
            <p className="text-muted-foreground text-lg leading-relaxed">{claudeMessage}</p>
          )}
          <button
            onClick={onComplete}
            className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg active:scale-95 transition-transform"
          >
            Open FOCUS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-8">

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/40' : 'w-3 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold">FOCUS</h1>
            <p className="text-muted-foreground leading-relaxed">
              Your personal reliability engine. Captures what's on your mind. Tells you what matters now. Helps you show up.
            </p>
            <p className="text-muted-foreground text-sm">
              30 seconds to set up.
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg active:scale-95 transition-transform"
            >
              Let's go
            </button>
          </div>
        )}

        {/* Step 1: Working days */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Your working days</h2>
              <p className="text-muted-foreground text-sm mt-1">When should FOCUS fire your 4pm transition reminder?</p>
            </div>
            <div className="flex gap-2">
              {DAYS.map((day, i) => {
                const dayNum = DAY_NUMBERS[i]
                const selected = workDays.includes(dayNum)
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(dayNum)}
                    className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
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
            <button
              onClick={() => setStep(2)}
              disabled={workDays.length === 0}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Transition time */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Transition time</h2>
              <p className="text-muted-foreground text-sm mt-1">When do you want your end-of-work reminder?</p>
            </div>
            <input
              type="time"
              value={transitionTime}
              onChange={e => setTransitionTime(e.target.value)}
              className="w-full px-4 py-4 rounded-lg bg-secondary border border-border text-foreground text-xl text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => setStep(3)}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold active:scale-95 transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 3: First promise */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Any promises due?</h2>
              <p className="text-muted-foreground text-sm mt-1">Something you've said you'll do — optional, skip if nothing comes to mind.</p>
            </div>
            <textarea
              value={promise}
              onChange={e => setPromise(e.target.value)}
              placeholder="e.g. Sort the car insurance this week"
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <button
              onClick={handleDone}
              disabled={loading}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? 'Setting up…' : "Done — let's go"}
            </button>
            <button
              onClick={handleDone}
              disabled={loading}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
