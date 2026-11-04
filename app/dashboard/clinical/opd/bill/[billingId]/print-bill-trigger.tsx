"use client"

import { useEffect } from "react"

export function PrintBillTrigger() {
  useEffect(() => {
    // Small delay to ensure the page is fully rendered before printing
    const timer = setTimeout(() => {
      window.print()
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  return null
}
