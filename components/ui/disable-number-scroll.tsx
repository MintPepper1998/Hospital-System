"use client"

import { useEffect } from "react"

/**
 * Prevents scroll-wheel from changing values in ALL number inputs across the app.
 * This catches both <Input type="number"> (shared component) and raw <input type="number">.
 * Mounted once in the root layout.
 */
export function DisableNumberScroll() {
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" &&
        (target as HTMLInputElement).type === "number"
      ) {
        ;(target as HTMLInputElement).blur()
      }
    }

    // Use capture phase so it fires before any component-level handlers
    document.addEventListener("wheel", handleWheel, { passive: true, capture: true })
    return () => document.removeEventListener("wheel", handleWheel, { capture: true })
  }, [])

  return null
}
