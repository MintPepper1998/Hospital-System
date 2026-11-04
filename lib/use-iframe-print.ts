"use client"

import { useCallback, useState } from "react"

/**
 * Hook to print an OPD page in-place using a hidden iframe.
 * Avoids navigating away from the current page or opening new tabs.
 */
export function useIframePrint() {
  const [isPrinting, setIsPrinting] = useState(false)

  const printUrl = useCallback((url: string) => {
    if (isPrinting) return
    setIsPrinting(true)

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.top = "-10000px"
    iframe.style.left = "-10000px"
    iframe.style.width = "1024px"
    iframe.style.height = "768px"
    iframe.style.border = "none"
    iframe.src = url

    let cleanedUp = false
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      try {
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      } catch {
        /* already removed */
      }
      setIsPrinting(false)
    }

    // Safety timeout in case print dialog never closes or afterprint isn't fired
    const safetyTimer = setTimeout(() => {
      cleanup()
    }, 45000)

    iframe.onload = () => {
      // Small delay to ensure styles and web fonts are fully rendered
      setTimeout(() => {
        try {
          const cw = iframe.contentWindow
          if (cw) {
            const onAfterPrint = () => {
              clearTimeout(safetyTimer)
              // Wait slightly after dialog closes before DOM removal
              setTimeout(cleanup, 500)
            }
            cw.addEventListener("afterprint", onAfterPrint)
            cw.focus()
            cw.print()
          } else {
            cleanup()
            window.location.href = url
          }
        } catch (err) {
          console.error("Iframe print failed:", err)
          cleanup()
          // Fallback: navigate to print page in current tab
          window.location.href = url
        }
      }, 700)
    }

    iframe.onerror = () => {
      clearTimeout(safetyTimer)
      cleanup()
      window.location.href = url
    }

    document.body.appendChild(iframe)
  }, [isPrinting])

  return { printUrl, isPrinting }
}
