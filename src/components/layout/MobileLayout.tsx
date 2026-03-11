import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  modeSelector: ReactNode
  nudge?: ReactNode
  content: ReactNode
}

export default function MobileLayout({ header, modeSelector, nudge, content }: Props) {
  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 flex flex-col min-h-screen pb-[95px]">
        {header}
        {nudge}
        <div className="flex-1 mt-6">{content}</div>
      </div>

      {/* Fixed floating bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md px-5 pb-5 pt-3 pointer-events-auto">
          {modeSelector}
        </div>
      </div>
    </div>
  )
}
