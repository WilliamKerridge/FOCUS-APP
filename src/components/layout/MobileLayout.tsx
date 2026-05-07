import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  modeSelector: ReactNode
  nudge?: ReactNode
  content: ReactNode
}

export default function MobileLayout({ header, modeSelector, nudge, content }: Props) {
  return (
    <div className="min-h-dvh">
      <div
        className="max-w-md mx-auto px-4 flex flex-col min-h-dvh"
        style={{ paddingBottom: 'calc(95px + env(safe-area-inset-bottom, 0px))' }}
      >
        {header}
        {nudge}
        <div className="flex-1 mt-6">{content}</div>
      </div>

      {/* Fixed floating bottom tab bar — z-30 so modals (z-40+) cover it */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <div
          className="w-full max-w-md px-5 pt-3 pointer-events-auto"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          {modeSelector}
        </div>
      </div>
    </div>
  )
}
