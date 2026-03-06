// src/components/calendar/AgendaView.tsx
import { useMemo } from 'react'
import { getToday } from '@/lib/utils'

export interface AgendaItem {
  kind: 'task' | 'promise'
  id: string
  title: string
  madeTo: string | null
  dueDate: string | null
}

interface Props {
  items: AgendaItem[]
  onComplete: (item: AgendaItem) => void
  onTap: (item: AgendaItem) => void
}

function dateHeading(iso: string): string {
  const today = getToday()
  const d = new Date(today)
  d.setDate(d.getDate() + 1)
  const tomorrow = d.toISOString().split('T')[0]
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ItemRow({ item, onComplete, onTap }: { item: AgendaItem; onComplete: (i: AgendaItem) => void; onTap: (i: AgendaItem) => void }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-2 rounded-lg bg-secondary border border-border cursor-pointer hover:bg-secondary/70"
      onClick={() => onTap(item)}
    >
      <button
        aria-label={`Complete ${item.title}`}
        onClick={e => { e.stopPropagation(); onComplete(item) }}
        className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-border hover:border-primary cursor-pointer transition-colors"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.title}</p>
        {item.madeTo && <p className="text-xs text-muted-foreground">to {item.madeTo}</p>}
      </div>
    </div>
  )
}

export default function AgendaView({ items, onComplete, onTap }: Props) {
  const { dated, undated } = useMemo(() => {
    const withDate = [...items.filter(i => i.dueDate)].sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    const groups = new Map<string, AgendaItem[]>()
    for (const item of withDate) {
      const key = item.dueDate!
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return { dated: groups, undated: items.filter(i => !i.dueDate) }
  }, [items])

  if (dated.size === 0 && undated.length === 0) {
    return <p className="text-sm text-muted-foreground px-1">Nothing scheduled.</p>
  }

  return (
    <div className="space-y-4">
      {[...dated.entries()].map(([date, group]) => (
        <div key={date} className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">{dateHeading(date)}</p>
          {group.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} onComplete={onComplete} onTap={onTap} />)}
        </div>
      ))}
      {undated.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Undated</p>
          {undated.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} onComplete={onComplete} onTap={onTap} />)}
        </div>
      )}
    </div>
  )
}
