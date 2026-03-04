import type { User } from '@supabase/supabase-js'
import { useWeeklyTasks } from '@/hooks/useWeeklyTasks'

interface ReviewScreenProps {
  user: User
}

export default function ReviewScreen({ user }: ReviewScreenProps) {
  const { days, totalCount, loading, error } = useWeeklyTasks(user)

  if (loading) {
    return <div className="p-6 text-gray-400 text-sm">Loading weekly review…</div>
  }

  if (error) {
    return <div className="p-6 text-red-400 text-sm">{error}</div>
  }

  // Bar chart: one bar per day in Mon→today order (sorted ascending for chart)
  const chartDays = [...days].reverse()
  const maxTasks = Math.max(...chartDays.map(d => d.tasks.length), 1)

  return (
    <div className="p-6 space-y-6">
      {/* Stats bar */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{totalCount}</span>
          <span className="text-gray-400 text-sm">tasks completed this week</span>
        </div>

        {/* Mini bar chart */}
        {chartDays.length > 0 && (
          <div className="flex items-end gap-1.5 h-12">
            {chartDays.map(day => {
              const rawHeight = (day.tasks.length / maxTasks) * 40
              const height = Math.max(4, Math.min(40, rawHeight))
              return (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-sm bg-emerald-500 opacity-80"
                    style={{ height: `${height}px` }}
                    title={`${day.tasks.length} tasks`}
                  />
                  <span className="text-xs text-gray-500 truncate w-full text-center">
                    {day.label === 'Today' || day.label === 'Yesterday'
                      ? day.label.slice(0, 3)
                      : day.label.slice(0, 3)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Day groups */}
      {days.length === 0 ? (
        <p className="text-gray-500 text-sm">No completed tasks recorded yet this week.</p>
      ) : (
        <div className="space-y-5">
          {days.map(day => (
            <div key={day.date}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {day.label} — {day.tasks.length} {day.tasks.length === 1 ? 'task' : 'tasks'}
              </h3>
              <ul className="space-y-1.5">
                {day.tasks.map(task => (
                  <li key={task.id} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-200 text-sm">{task.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
