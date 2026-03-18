'use client'

import { useEffect } from 'react'

export default function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return

    const timeout = window.setTimeout(() => {
      window.print()
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [enabled])

  return null
}