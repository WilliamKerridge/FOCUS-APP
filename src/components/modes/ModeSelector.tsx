import type { Mode } from '@/types'

interface Props {
  current: Mode
  onChange: (mode: Mode) => void
}

const MODES: { key: Mode; label: string }[] = [
  { key: 'work', label: 'WORK' },
  { key: 'transition', label: 'TRANSITION' },
  { key: 'home', label: 'HOME' },
]

export default function ModeSelector({ current, onChange }: Props) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-border">
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors min-h-[44px] cursor-pointer ${
            current === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
