// src/components/desktop/WorkDesktop.tsx
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { KickstartContent } from '@/types'
import { supabase } from '@/lib/supabase'
import KickstartPlanDisplay from '@/components/desktop/KickstartPlanDisplay'
import FocusPanel from '@/components/desktop/FocusPanel'
import DailyProgress from '@/components/desktop/DailyProgress'
import { useTodayHandoffs } from '@/hooks/useTodayHandoffs'
import MorningKickstart from '@/components/kickstart/MorningKickstart'
import EndOfDayHandoff from '@/components/handoff/EndOfDayHandoff'

interface Props {
  user: User
  onSwitchToTransition: () => void
}

type DesktopView = 'work' | 'handoff'

export default function WorkDesktop({ user, onSwitchToTransition }: Props) {
  const [plan, setPlan] = useState<KickstartContent | null>(null)
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [view, setView] = useState<DesktopView>('work')
  const { kickstartDone, endOfDayDone } = useTodayHandoffs(user)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('handoffs')
      .select('content')
      .eq('user_id', user.id)
      .eq('type', 'morning_kickstart')
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const content = data.content as KickstartContent
          setPlan(content)
          setActiveTask(content.main_focus)
        }
        setLoadingPlan(false)
      })
  }, [user.id])

  if (view === 'handoff') {
    return (
      <div className="space-y-4 max-w-lg">
        <button
          onClick={() => setView('work')}
          className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] flex items-center cursor-pointer"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold">End of Day</h2>
        <EndOfDayHandoff user={user} onSwitchToTransition={onSwitchToTransition} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left column — planning */}
      <div className="space-y-4">
        {loadingPlan ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 rounded-lg bg-secondary" />
            <div className="h-16 rounded-lg bg-secondary" />
            <div className="h-16 rounded-lg bg-secondary" />
          </div>
        ) : plan ? (
          <KickstartPlanDisplay
            plan={plan}
            activeTask={activeTask}
            onSelectTask={setActiveTask}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">No kickstart yet today.</p>
            <MorningKickstart user={user} />
          </div>
        )}

        {/* Bottom actions */}
        <div className="pt-2 space-y-2">
          <DailyProgress kickstartDone={kickstartDone} endOfDayDone={endOfDayDone} />
          <button
            onClick={() => setView('handoff')}
            className="w-full py-3 rounded-lg bg-secondary border border-border text-sm font-medium cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform mt-3"
          >
            End of Day
          </button>
        </div>
      </div>

      {/* Right column — doing */}
      <div>
        <FocusPanel user={user} activeTask={activeTask} />
      </div>
    </div>
  )
}
