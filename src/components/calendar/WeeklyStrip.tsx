// src/components/calendar/WeeklyStrip.tsx
import { useMemo } from 'react'
import { getToday } from '@/lib/utils'

interface Props {
  itemDates: (string | null)[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}

export default function WeeklyStrip({ itemDates, selectedDay, onSelectDay }: Props) {
  const days = useMemo(() => {
    const base = new Date(getToday())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      const iso = d.toISOString().split('T')[0]
      return { iso, label: d.toLocaleDateString('en-GB', { weekday: 'short' }), dateNum: d.getDate() }
    })
  }, [])

  const today = getToday()
  const dateSet = useMemo(() => new Set(itemDates.filter(Boolean) as string[]), [itemDates])

  return (
    <div className="flex gap-1 justify-between">
      {days.map(({ iso, label, dateNum }) => {
        const isToday = iso === today
        const isSelected = iso === selectedDay
        const hasDot = dateSet.has(iso)
        return (
          <button
            key={iso}
            onClick={() => onSelectDay(isSelected ? null : iso)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors
              ${isSelected || isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'}`}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
            <span className="text-base font-bold leading-none">{dateNum}</span>
            {hasDot && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
          </button>
        )
      })}
    </div>
  )
}
