"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

export function OPDSearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchText, setSearchText] = useState(defaultValue)
  const debouncedSearch = useDebounce(searchText.trim(), 500)

  useEffect(() => {
    // Build URL preserving existing filters
    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch) {
      params.set("q", debouncedSearch)
    } else {
      params.delete("q")
    }
    // Reset to page 1 on new search
    params.delete("page")

    router.push(`/dashboard/clinical/opd?${params.toString()}`)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
      <Input
        name="q"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="pl-8"
        placeholder="e.g. Ramesh / P00012 / 98xxxx / token"
      />
    </div>
  )
}
