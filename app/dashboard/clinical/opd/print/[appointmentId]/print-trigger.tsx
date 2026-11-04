"use client"

import { useEffect } from "react"

export function PrintTrigger() {
  useEffect(() => {
    // Skip auto-print when loaded inside an iframe (parent handles printing)
    if (window.self !== window.top) return

    // Small delay to ensure the page is fully rendered before printing
    const timer = setTimeout(() => {
      window.print()
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return null
}

