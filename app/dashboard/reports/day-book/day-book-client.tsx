"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, Printer, Download } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DayBookClientProps {
    initialDate: Date
}

export function DayBookClient({ initialDate }: DayBookClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [date, setDate] = useState<Date>(initialDate)

    const handleSelectDate = (newDate: Date | undefined) => {
        if (!newDate) return
        setDate(newDate)

        // Format to YYYY-MM-DD to pass via URL
        const formattedDate = format(newDate, "yyyy-MM-dd")
        const params = new URLSearchParams(searchParams)
        params.set("date", formattedDate)
        router.push(`?${params.toString()}`)
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExport = (fmt: "csv" | "excel") => {
        const formattedDate = format(date, "yyyy-MM-dd")
        window.open(`/api/reports/day-book?date=${formattedDate}&format=${fmt}`, "_blank")
    }

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Day Book</h1>
                <p className="text-sm text-slate-500 mt-1">Daily Financial Ledger</p>
            </div>

            <div className="flex items-center gap-3">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[240px] justify-start text-left font-medium bg-white border-slate-200",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleSelectDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <Button variant="outline" className="bg-white" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                </Button>
                <div className="flex items-center gap-1">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-r-none border-r border-emerald-500" onClick={() => handleExport("csv")}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-l-none px-3" onClick={() => handleExport("excel")} title="Export as Excel">
                        XLS
                    </Button>
                </div>
            </div>
        </div>
    )
}
