"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

type Preset = "today" | "yesterday" | "7d" | "30d" | "mtd" | "lastMonth" | "qtd" | "fytd" | "custom"

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "mtd", label: "MTD" },
  { id: "lastMonth", label: "Last Month" },
  { id: "qtd", label: "QTD" },
  { id: "fytd", label: "FYTD" },
]

export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const presetParam = searchParams.get("preset") as Preset | null
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")

  const currentPreset = fromParam && toParam ? "custom" : (presetParam || "mtd")

  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (fromParam && toParam) {
      return { from: parseISO(fromParam as string), to: parseISO(toParam as string) }
    }
    return undefined
  })

  const applyPreset = (p: Preset) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("from")
    params.delete("to")
    params.delete("page")
    params.set("preset", p)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const applyCustom = () => {
    if (!date?.from || !date?.to) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete("preset")
    params.delete("page")
    params.set("from", format(date.from, "yyyy-MM-dd"))
    params.set("to", format(date.to, "yyyy-MM-dd"))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-md">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            variant={currentPreset === p.id ? "default" : "ghost"}
            size="sm"
            onClick={() => applyPreset(p.id)}
            className={cn(
              "h-8 text-xs px-3",
              currentPreset === p.id 
                ? "bg-white text-slate-900 shadow-sm hover:bg-white" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "h-10 w-[260px] justify-start text-left font-normal bg-white",
              currentPreset === "custom" && "border-blue-500 ring-1 ring-blue-500",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentPreset === "custom" && date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Custom Range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
          <div className="p-3 border-t border-slate-100 flex justify-end">
            <Button size="sm" onClick={applyCustom} disabled={!date?.from || !date?.to}>
              Apply Custom Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
