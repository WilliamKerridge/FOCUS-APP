// src/hooks/useBreakpoint.ts
import { useEffect, useState } from 'react'

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= 768
  )

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return { isDesktop, isMobile: !isDesktop }
}
