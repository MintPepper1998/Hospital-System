"use client"

import { useEffect } from "react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]", error)
  }, [error])

  const isAuthError = error.message?.includes("Unauthorized") || error.message?.includes("signed in")

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
        <div className={`w-14 h-14 ${isAuthError ? "bg-amber-50" : "bg-red-50"} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {isAuthError ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {isAuthError ? "Session Expired" : "Something went wrong"}
        </h2>
        
        <p className="text-sm text-slate-500 mb-6">
          {isAuthError 
            ? "Your login session has expired. Please sign in again to continue."
            : "A temporary error occurred. Click the button below to retry."
          }
        </p>

        <div className="flex gap-3 justify-center">
          {isAuthError ? (
            <button
              onClick={() => window.location.href = "/login"}
              className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              Sign In Again
            </button>
          ) : (
            <>
              <button
                onClick={() => reset()}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                ↻ Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Refresh Page
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
