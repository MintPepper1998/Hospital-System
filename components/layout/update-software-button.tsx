"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Check, Download } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * UpdateSoftwareButton — Shows an update/refresh button in the dashboard header.
 * Only renders when running inside Tauri (desktop app).
 * 
 * Clears the WebView2 browsing data cache and reloads to pick up the latest
 * deployment from Amplify.
 */
export function UpdateSoftwareButton() {
  const [isTauri, setIsTauri] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateComplete, setUpdateComplete] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentVersion, setCurrentVersion] = useState("1.0.0")

  useEffect(() => {
    // Detect Tauri environment
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      setIsTauri(true)
    }

    // Fetch current version from the API
    fetch("/api/version")
      .then(res => res.json())
      .then(data => {
        if (data.version) setCurrentVersion(data.version)
      })
      .catch(() => {
        // Ignore — use default version
      })
  }, [])

  const handleUpdate = async () => {
    setIsUpdating(true)

    try {
      // If in Tauri, clear WebView2 cache for a fresh reload
      if (isTauri) {
        try {
          const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow")
          const win = getCurrentWebviewWindow()
          await win.clearAllBrowsingData()
        } catch (err) {
          console.debug("[UpdateSoftware] Could not clear cache:", err)
        }
      }

      // Brief pause so user sees the loading state
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setUpdateComplete(true)

      // Reload after a moment to show the success state
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (err) {
      console.error("[UpdateSoftware] Update failed:", err)
      setIsUpdating(false)
    }
  }

  // Don't render anything outside Tauri
  if (!isTauri) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative text-zinc-500 hover:text-zinc-700 transition-colors focus:outline-none p-2 rounded-full neo-flat bg-[#e0e5ec] active:scale-95 active:shadow-[inset_5px_5px_10px_#b8bcc2,inset_-5px_-5px_10px_#ffffff]"
          title="Update Software"
        >
          <Download className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 overflow-hidden shadow-xl border-slate-200 rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 text-sm">Software Update</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Current version: <span className="font-mono font-bold text-slate-700">v{currentVersion}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            This will refresh the application to load the latest version from the server. 
            All cached data will be cleared.
          </p>

          <button
            onClick={handleUpdate}
            disabled={isUpdating || updateComplete}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
              transition-all duration-200
              ${updateComplete
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : isUpdating
                  ? "bg-blue-50 text-blue-600 border border-blue-200 cursor-wait"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm hover:shadow"
              }
              disabled:opacity-70
            `}
          >
            {updateComplete ? (
              <>
                <Check className="h-4 w-4" />
                Updated! Reloading...
              </>
            ) : isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Update Software
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 border-t border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 font-medium">
            Clears cache &amp; reloads latest version
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
