"use client"

import { useEffect } from "react"

/**
 * SplashCloser — emits the "close_splashscreen" event to the Tauri backend
 * once the web content has rendered. This signals the Rust side to close the
 * splash screen window and show the main application window.
 *
 * Falls back gracefully when running in a regular browser (not inside Tauri).
 */
export function SplashCloser() {
  useEffect(() => {
    const closeSplash = async () => {
      try {
        // Check if we're running inside Tauri
        if (typeof window !== "undefined" && "__TAURI__" in window) {
          // Dynamically import Tauri event API (tree-shaken away in web builds)
          const { emit } = await import("@tauri-apps/api/event")
          await emit("close_splashscreen")
        }
      } catch (err) {
        // Silently ignore — we're likely not in a Tauri context
        console.debug("[SplashCloser] Not in Tauri context:", err)
      }
    }

    // Small delay to ensure the page has fully painted before closing splash
    const timer = setTimeout(closeSplash, 300)
    return () => clearTimeout(timer)
  }, [])

  return null
}
