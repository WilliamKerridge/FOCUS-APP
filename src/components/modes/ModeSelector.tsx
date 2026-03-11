import { Briefcase, ArrowLeftRight, House } from 'lucide-react'
import type { Mode } from '@/types'

interface Props {
  current: Mode
  onChange: (mode: Mode) => void
}

const MODES: { key: Mode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'work',       label: 'WORK',       Icon: Briefcase      },
  { key: 'transition', label: 'TRANSITION', Icon: ArrowLeftRight  },
  { key: 'home',       label: 'HOME',       Icon: House          },
]

export default function ModeSelector({ current, onChange }: Props) {
  return (
    <nav
      className="flex h-[62px] rounded-[36px] bg-[#1A1A1E] border border-border p-1 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      aria-label="Mode navigation"
    >
      {MODES.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-current={current === key ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] transition-colors min-h-[44px] cursor-pointer ${
            current === key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
          <span className="text-[10px] font-semibold tracking-[0.5px] uppercase leading-none">
            {label}
          </span>
        </button>
      ))}
    </nav>
  )
}
