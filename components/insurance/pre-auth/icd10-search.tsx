"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface ICD10SearchProps {
  onSelect: (code: string, description: string) => void
  defaultCode?: string
  defaultDescription?: string
}

export function ICD10Search({ onSelect, defaultCode, defaultDescription }: ICD10SearchProps) {
  const [searchTerm, setSearchTerm] = useState(defaultDescription || defaultCode || "")
  const [results, setResults] = useState<[string, string][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const debouncedSearch = useDebounce(searchTerm, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close dropdown if clicked outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    async function searchICD10() {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setResults([])
        return
      }

      // If the user already selected something and hasn't changed it, don't search again
      if (debouncedSearch === defaultDescription) {
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodeURIComponent(debouncedSearch)}&sf=code,name&df=code,name`)
        if (response.ok) {
          const data = await response.json()
          // data format: [count, [codes], null, [[code, name], [code, name]]]
          if (data && data[3]) {
            setResults(data[3])
            setIsOpen(true)
          }
        }
      } catch (error) {
        console.error("Failed to fetch ICD-10 codes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    searchICD10()
  }, [debouncedSearch, defaultDescription])

  const handleSelect = (code: string, description: string) => {
    setSearchTerm(description)
    setIsOpen(false)
    onSelect(code, description)
  }

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <Label>Search ICD-10 Diagnosis (NIH ClinicalTables)</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Type condition (e.g., Asthma) or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          className="pl-9"
        />
        {isLoading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map(([code, name], index) => (
            <div
              key={`${code}-${index}`}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-0"
              onClick={() => handleSelect(code, name)}
            >
              <p className="font-medium text-blue-700">{code}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
