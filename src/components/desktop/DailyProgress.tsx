// src/components/desktop/DailyProgress.tsx
interface Props {
  kickstartDone: boolean
  endOfDayDone: boolean
}

export default function DailyProgress({ kickstartDone, endOfDayDone }: Props) {
  const item = (done: boolean, label: string) => (
    <div className="flex items-center gap-2 text-sm">
      <span className={done ? 'text-primary' : 'text-border'}>
        {done ? '✓' : '○'}
      </span>
      <span className={done ? 'text-muted-foreground line-through' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  )

  return (
    <div className="pt-4 border-t border-border space-y-1.5">
      {item(kickstartDone, 'Focus today')}
      {item(endOfDayDone, 'End of day')}
    </div>
  )
}
