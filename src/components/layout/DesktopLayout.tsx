import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  modeSelector: ReactNode
  nudge?: ReactNode
  content: ReactNode
}

export default function DesktopLayout({ header, modeSelector, nudge, content }: Props) {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pb-8 flex flex-col min-h-screen">
        {header}
        {modeSelector}
        {nudge}
        <div className="flex-1 mt-6">{content}</div>
      </div>
    </div>
  )
}
