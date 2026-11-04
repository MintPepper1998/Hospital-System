"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import { searchMedicines } from "@/app/actions/search"

export interface MedicineStockResult {
  id: string
  name: string
  genericName: string
  strength: string | null
  type: string
  availableStock: number
  sellingPrice: number
  label: string
}

interface MedicineStockSearchProps {
  value: string
  /** Called on every keystroke — the parent must clear its selected medicineId here. */
  onTextChange: (text: string) => void
  onSelect: (medicine: MedicineStockResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
}

/**
 * Autocomplete that searches the pharmacy Medicine master and shows
 * sellable (non-expired) stock and FEFO selling price per unit.
 */
export function MedicineStockSearch({
  value,
  onTextChange,
  onSelect,
  placeholder = "Type 2+ letters to search pharmacy...",
  className = "",
  disabled,
  invalid,
  id,
}: MedicineStockSearchProps) {
  const [results, setResults] = useState<MedicineStockResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const requestRef = useRef(0)

  const runSearch = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const reqId = ++requestRef.current
      setLoading(true)
      try {
        const res = (await searchMedicines(query)) as MedicineStockResult[]
        if (reqId !== requestRef.current) return // stale response
        setResults(res)
        setHighlight(0)
        setOpen(true)
      } catch {
        if (reqId === requestRef.current) setResults([])
      } finally {
        if (reqId === requestRef.current) setLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("mousedown", onDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const choose = (m: MedicineStockResult) => {
    onSelect(m)
    setOpen(false)
    setResults([])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      choose(results[highlight])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          onTextChange(e.target.value)
          runSearch(e.target.value)
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        className={`pr-8 ${invalid ? "border-red-400 focus-visible:ring-red-300" : ""} ${className}`}
      />
      {loading ? (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-[420px] max-w-[90vw] bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No medicine found in pharmacy master</div>
          ) : (
            results.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-xs flex items-center justify-between gap-2 transition-colors ${
                  i === highlight ? "bg-blue-50" : "hover:bg-blue-50"
                }`}
              >
                <div className="min-w-0">
                  <span className="font-medium">{m.name}</span>
                  {m.genericName && m.genericName !== m.name && (
                    <span className="text-muted-foreground ml-1">({m.genericName})</span>
                  )}
                  {m.strength && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                      {m.strength}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-muted-foreground">₹{Number(m.sellingPrice || 0).toFixed(2)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full ${
                      m.availableStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 font-semibold"
                    }`}
                  >
                    {m.availableStock > 0 ? `${m.availableStock} in stock` : "Out of stock"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
