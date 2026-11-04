"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, User, Loader2, X } from "lucide-react"

export interface PatientResult {
  id: string
  patientId: string
  name: string
  phone: string | null
  gender?: string | null
}

interface PatientSearchProps {
  onSelect: (patient: PatientResult) => void
  selectedPatient?: PatientResult | null
  onClear?: () => void
  disabled?: boolean
}

export function PatientSearch({
  onSelect,
  selectedPatient,
  onClear,
  disabled,
}: PatientSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PatientResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/billing/search-patients?q=${encodeURIComponent(query)}`
        )
        const data = await res.json()
        setResults(data.patients || [])
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (selectedPatient) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-blue-900">
            {selectedPatient.name}
          </p>
          <p className="text-xs text-blue-600">
            {selectedPatient.patientId}
            {selectedPatient.phone ? ` • ${selectedPatient.phone}` : ""}
          </p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded hover:bg-blue-100 text-blue-500"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search patient by name, ID, or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
          disabled={disabled}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              onClick={() => {
                onSelect(patient)
                setQuery("")
                setShowDropdown(false)
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {patient.name}
                </p>
                <p className="text-xs text-gray-500">
                  {patient.patientId}
                  {patient.phone ? ` • ${patient.phone}` : ""}
                  {patient.gender ? ` • ${patient.gender}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && !isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">No patients found</p>
        </div>
      )}
    </div>
  )
}
